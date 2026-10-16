import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // SEGURANCA: carimba o ultimo acesso SEMPRE do proprio chamador (ignora qualquer user_id
    // enviado no corpo), impedindo que um usuario altere o registro de outro.
    await base44.asServiceRole.entities.User.update(user.id, {
      ultimo_acesso: new Date().toISOString()
    });

    return Response.json({ sucesso: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
