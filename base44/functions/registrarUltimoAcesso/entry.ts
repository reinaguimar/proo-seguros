import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return Response.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Atualiza o campo ultimo_acesso do usuário com a data/hora atual
    await base44.asServiceRole.entities.User.update(user_id, {
      ultimo_acesso: new Date().toISOString()
    });

    return Response.json({ sucesso: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});