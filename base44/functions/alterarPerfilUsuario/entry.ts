import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ALTERAR PERFIL DE USUÁRIO - Apenas super admin

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Verificar permissão mínima
    const perfilCaller = user.perfil_sistema || user.role;
    if (!['super_administrador', 'administrador'].includes(perfilCaller)) {
      return Response.json({ 
        error: 'Apenas Administradores ou Super Administradores podem alterar perfis' 
      }, { status: 403 });
    }
    
    const { usuario_id, novo_perfil } = await req.json();
    
    if (!usuario_id || !novo_perfil) {
      return Response.json({ error: 'Dados obrigatórios' }, { status: 400 });
    }
    
    // Validar perfil
    const perfisValidos = ['usuario', 'gerente', 'administrador', 'auditor', 'super_administrador'];
    if (!perfisValidos.includes(novo_perfil)) {
      return Response.json({ error: 'Perfil inválido' }, { status: 400 });
    }
    
    // Buscar usuário
    const usuarioAlvo = await base44.asServiceRole.entities.User.get(usuario_id);
    
    if (!usuarioAlvo) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Administradores não podem alterar Superadministradores
    if (usuarioAlvo.perfil_sistema === 'super_administrador' && perfilCaller !== 'super_administrador') {
      return Response.json({ 
        error: 'Operação não permitida: administradores não podem alterar Superadministradores.' 
      }, { status: 403 });
    }
    
    const perfil_anterior = usuarioAlvo.perfil_sistema;
    
    // Atualizar perfil
    await base44.asServiceRole.entities.User.update(usuario_id, {
      perfil_sistema: novo_perfil
    });
    
    // Registrar log (se entidade LogSistema existir)
    try {
      await base44.asServiceRole.entities.LogFechamento.create({
        fechamento_id: 'SISTEMA',
        acao: 'alteracao_perfil',
        usuario_id: user.id,
        usuario_nome: user.full_name,
        observacao: `Perfil de ${usuarioAlvo.full_name} alterado de ${perfil_anterior} para ${novo_perfil}`
      });
    } catch (e) {
      // Log opcional, não falha se não existir
    }
    
    return Response.json({ 
      sucesso: true,
      mensagem: `Perfil de ${usuarioAlvo.full_name} alterado com sucesso.`,
      usuario: {
        id: usuarioAlvo.id,
        nome: usuarioAlvo.full_name,
        email: usuarioAlvo.email,
        perfil_anterior,
        perfil_novo: novo_perfil
      }
    });
    
  } catch (error) {
    console.error('Erro ao alterar perfil:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});