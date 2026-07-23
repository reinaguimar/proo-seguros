import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Corrige os perfis de todos os usuários que estão sem perfil_sistema definido
// E promove reinaldo.aguimar@oonseguradora.com a Super Administrador

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todos os usuários
    const usuarios = await base44.asServiceRole.entities.User.list();
    
    const atualizacoes = [];
    
    for (const usuario of usuarios) {
      let novoPerfil = usuario.perfil_sistema;
      
      // Se não tem perfil_sistema definido, define como 'usuario'
      if (!novoPerfil) {
        novoPerfil = 'usuario';
      }
      
      // Reinaldo sempre super_administrador
      if (usuario.email === 'reinaldo.aguimar@oonseguradora.com') {
        novoPerfil = 'super_administrador';
      }
      
      // Atualizar se necessário
      if (novoPerfil !== usuario.perfil_sistema || !usuario.ativo) {
        await base44.asServiceRole.entities.User.update(usuario.id, {
          perfil_sistema: novoPerfil,
          ativo: true
        });
        
        atualizacoes.push({
          nome: usuario.full_name,
          email: usuario.email,
          perfil_anterior: usuario.perfil_sistema || 'indefinido',
          perfil_novo: novoPerfil
        });
      }
    }
    
    return Response.json({ 
      sucesso: true, 
      mensagem: `${atualizacoes.length} usuário(s) atualizado(s)`,
      atualizacoes
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});