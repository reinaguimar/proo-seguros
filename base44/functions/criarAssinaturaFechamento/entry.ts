import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

async function sha256hex(data) {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try { checkRateLimit(user.id, 'criarAssinaturaFechamento'); } catch (e) {
      return Response.json({ error: e.message }, { status: 429 });
    }

    const { fechamento_id, tipo_assinatura, dados_fechamento } = await req.json();

    if (!fechamento_id || !tipo_assinatura) {
      return Response.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       req.headers.get('x-real-ip') ||
                       'unknown';

    const timestamp = new Date().toISOString();
    const docPayload = JSON.stringify(dados_fechamento || {});

    const hash_documento = await sha256hex(docPayload);
    const hash_assinatura = await sha256hex(hash_documento + user.id + timestamp);

    const assinatura = await base44.entities.FechamentoAssinatura.create({
      fechamento_id,
      tipo_assinatura,
      usuario_id: user.id,
      usuario_nome: user.full_name || user.email,
      usuario_email: user.email,
      data_assinatura: timestamp,
      hash_documento,
      hash_assinatura,
      metodo_assinatura: 'sha256',
      ip_address
    });

    return Response.json({ sucesso: true, assinatura });
  } catch (error) {
    console.error('Erro ao criar assinatura:', error);
    return Response.json({ sucesso: false, error: error.message }, { status: 500 });
  }
});