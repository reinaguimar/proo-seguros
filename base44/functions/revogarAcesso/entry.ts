import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function registrarErro(base44, funcao, error, user, req) {
  try {
    await base44.asServiceRole.entities.LogErro.create({
      funcao,
      mensagem: error.message || String(error),
      stack: error.stack || '',
      usuario_id: user?.id || 'desconhecido',
      usuario_email: user?.email || '',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      contexto: JSON.stringify({ timestamp: new Date().toISOString() }),
      resolvido: false
    });
  } catch (e) {
    console.error('[registrarErro] Falha ao salvar LogErro:', e);
  }
}

const rateLimitMap = new Map();
function checkRateLimit(userId, fnName, limit = 10, windowSec = 60) {
  const now = Date.now();
  const key = `${userId}_${fnName}`;
  for (const [k, v] of rateLimitMap.entries()) {
    if (now - v.windowStart > 120000) rateLimitMap.delete(k);
  }
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.windowStart > windowSec * 1000) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return;
  }
  if (entry.count >= limit) {
    throw new Error('Limite de requisições atingido. Aguarde 1 minuto antes de tentar novamente.');
  }
  entry.count++;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();

    if (!caller) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try { checkRateLimit(caller.id, 'revogarAcesso'); } catch (e) {
      return Response.json({ error: e.message }, { status: 429 });
    }

    // Apenas super_administrador ou administrador podem revogar acessos
    const perfilCaller = caller.perfil_sistema || caller.role;
    if (!['super_administrador', 'administrador'].includes(perfilCaller)) {
      return Response.json({ error: 'Sem permissão para revogar acessos.' }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId) {
      return Response.json({ error: 'userId obrigatório' }, { status: 400 });
    }

    // Buscar dados do usuário alvo
    const targetUser = await base44.asServiceRole.entities.User.get(userId);
    if (!targetUser) {
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Impedir revogar a si mesmo
    if (userId === caller.id) {
      return Response.json({ error: 'Você não pode revogar seu próprio acesso.' }, { status: 400 });
    }

    // Impedir revogar outro super_administrador (se não for super_admin)
    if (targetUser.perfil_sistema === 'super_administrador' && perfilCaller !== 'super_administrador') {
      return Response.json({ error: 'Apenas super_administradores podem revogar outros super_administradores.' }, { status: 403 });
    }

    // Desativar o usuário
    await base44.asServiceRole.entities.User.update(userId, { ativo: false, is_active: false });

    // Registrar log de segurança no LogFechamento com acao 'alteracao_perfil' para reaproveitar a entidade
    await base44.asServiceRole.entities.LogFechamento.create({
      fechamento_id: 'sistema',
      acao: 'alteracao_perfil',
      usuario_id: caller.id,
      usuario_nome: caller.full_name || caller.email,
      usuario_email: caller.email,
      observacao: `REVOGACAO_ACESSO: Acesso do usuário "${targetUser.full_name || targetUser.email}" (ID: ${userId}) revogado por "${caller.full_name || caller.email}"`,
      dados_snapshot: {
        tipo: 'REVOGACAO_ACESSO',
        usuario_revogado_id: userId,
        usuario_revogado_nome: targetUser.full_name,
        usuario_revogado_email: targetUser.email,
        revogado_por_id: caller.id,
        revogado_por_nome: caller.full_name,
        data_revogacao: new Date().toISOString()
      }
    });

    return Response.json({
      sucesso: true,
      mensagem: `Acesso de "${targetUser.full_name || targetUser.email}" revogado com sucesso.`
    });

  } catch (error) {
    console.error('Erro ao revogar acesso:', error);
    try {
      const b = createClientFromRequest(req);
      const u = await b.auth.me().catch(() => null);
      await registrarErro(b, 'revogarAcesso', error, u, req);
    } catch (_) {}
    return Response.json({ sucesso: false, error: error.message }, { status: 500 });
  }
});