import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // SEGURANCA: apenas administradores podem listar usuarios (a UI nao e controle de seguranca).
    const __isAdmin = user.role === 'admin' || ['administrador', 'super_administrador'].includes(user.perfil_sistema);
    if (!__isAdmin) {
      return Response.json({ error: 'Acesso negado. Apenas administradores podem listar usuarios.' }, { status: 403 });
    }

    const usuarios = await base44.asServiceRole.entities.User.list();

    return Response.json({ sucesso: true, usuarios });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});