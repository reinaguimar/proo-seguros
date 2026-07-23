import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// FUNÇÃO DE BOOTSTRAP - Promover o primeiro Super Administrador
// USE APENAS UMA VEZ para criar o primeiro super admin
// Após isso, use a interface de gestão de usuários

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Verificar se já existe algum super admin
    const usuarios = await base44.asServiceRole.entities.User.list();
    const superAdminExiste = usuarios.some(u => u.perfil_sistema === 'super_administrador');
    
    if (superAdminExiste) {
      return Response.json({ 
        error: 'Já existe um Super Administrador no sistema. Use a interface de gestão de usuários para promover outros.' 
      }, { status: 400 });
    }
    
    // Promover o usuário atual a super admin
    await base44.asServiceRole.entities.User.update(user.id, {
      perfil_sistema: 'super_administrador',
      ativo: true
    });
    
    return Response.json({ 
      sucesso: true, 
      mensagem: `Usuário ${user.full_name} (${user.email}) promovido a Super Administrador!`,
      usuario: user.email
    });
    
  } catch (error) {
    console.error('Erro ao promover super admin:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});