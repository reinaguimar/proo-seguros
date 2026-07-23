import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ÚNICA FONTE DE VERDADE - Busca permissões do banco de dados
// Frontend e backend usam esta função

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Se usuário inativo, retorna sem permissões
    if (user.ativo === false) {
      return Response.json({ 
        usuario: {
          id: user.id,
          nome: user.full_name,
          email: user.email,
          perfil: user.perfil_sistema,
          ativo: false
        },
        permissoes: {},
        tem_acesso: false
      });
    }
    
    // Buscar perfil no banco (ÚNICA FONTE DE VERDADE)
    const perfis = await base44.asServiceRole.entities.Perfil.filter({ 
      nome: user.perfil_sistema || 'usuario'
    });
    
    if (perfis.length === 0) {
      return Response.json({ 
        error: 'Perfil não encontrado. Execute inicializarPerfis.' 
      }, { status: 404 });
    }
    
    const perfil = perfis[0];
    
    return Response.json({ 
      sucesso: true,
      usuario: {
        id: user.id,
        nome: user.full_name,
        email: user.email,
        perfil: user.perfil_sistema,
        perfil_descricao: perfil.descricao,
        ativo: user.ativo !== false,
        role: user.role // Mantém compatibilidade
      },
      permissoes: perfil.permissoes,
      tem_acesso: true
    });
    
  } catch (error) {
    console.error('Erro ao obter permissões:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});