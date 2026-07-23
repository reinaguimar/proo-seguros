import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// INATIVAR USUÁRIO - Mantém todos os dados e rastreabilidade

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Verificar permissão (só super admin pode inativar)
    if (user.perfil_sistema !== 'super_administrador') {
      return Response.json({ 
        error: 'Apenas Super Administradores podem inativar usuários' 
      }, { status: 403 });
    }
    
    const { usuario_id, motivo } = await req.json();
    
    if (!usuario_id) {
      return Response.json({ error: 'ID do usuário obrigatório' }, { status: 400 });
    }
    
    // Não pode inativar a si mesmo
    if (usuario_id === user.id) {
      return Response.json({ 
        error: 'Você não pode inativar seu próprio usuário' 
      }, { status: 400 });
    }
    
    // Buscar usuário
    const usuarioAlvo = await base44.asServiceRole.entities.User.get(usuario_id);
    
    if (!usuarioAlvo) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    
    // Inativar (NÃO DELETA - apenas marca como inativo)
    await base44.asServiceRole.entities.User.update(usuario_id, {
      ativo: false,
      data_inativacao: new Date().toISOString(),
      inativado_por: user.id,
      motivo_inativacao: motivo || 'Não informado'
    });
    
    // ✅ GARANTIA DE RASTREABILIDADE:
    // - full_name e email permanecem no registro do User
    // - created_by em Apolices/Sinistros/Fechamentos permanece inalterado
    // - Logs mostram nome/email do usuário inativo
    // - Nenhum dado é deletado
    
    return Response.json({ 
      sucesso: true,
      mensagem: `Usuário ${usuarioAlvo.full_name} inativado com sucesso.`,
      usuario_inativado: {
        id: usuarioAlvo.id,
        nome: usuarioAlvo.full_name,
        email: usuarioAlvo.email
      }
    });
    
  } catch (error) {
    console.error('Erro ao inativar usuário:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});