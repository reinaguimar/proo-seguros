import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Qualquer usuário autenticado pode listar — controle de acesso é feito na UI
    const usuarios = await base44.asServiceRole.entities.User.list();

    return Response.json({ sucesso: true, usuarios });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});