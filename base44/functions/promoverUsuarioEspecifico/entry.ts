import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Promover usuário específico a Super Administrador
// USE APENAS UMA VEZ

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const EMAIL_ALVO = 'reinaldo.aguimar@oonseguradora.com';
    
    // Buscar todos os usuários
    const usuarios = await base44.asServiceRole.entities.User.list();
    const usuario = usuarios.find(u => u.email === EMAIL_ALVO);
    
    if (!usuario) {
      return Response.json({ 
        error: `Usuário ${EMAIL_ALVO} não encontrado` 
      }, { status: 404 });
    }
    
    // Promover a super admin
    await base44.asServiceRole.entities.User.update(usuario.id, {
      perfil_sistema: 'super_administrador',
      ativo: true
    });
    
    return Response.json({ 
      sucesso: true, 
      mensagem: `Usuário ${usuario.full_name} (${EMAIL_ALVO}) promovido a Super Administrador!`,
      usuario: {
        id: usuario.id,
        nome: usuario.full_name,
        email: usuario.email,
        perfil: 'super_administrador'
      }
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});