import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try { checkRateLimit(user.id, 'registrarLogFechamento'); } catch (e) {
      return Response.json({ error: e.message }, { status: 429 });
    }
    
    const { fechamento_id, acao, observacao, dados_snapshot: snapshotFromRequest } = await req.json();
    
    if (!fechamento_id || !acao) {
      return Response.json({ error: 'Dados obrigatórios' }, { status: 400 });
    }
    
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                       req.headers.get('x-real-ip') ||
                       'unknown';

    // Auto-preencher dados_snapshot do fechamento se não fornecido
    let dados_snapshot = snapshotFromRequest;
    if (!dados_snapshot || Object.keys(dados_snapshot).length === 0) {
      try {
        const f = await base44.asServiceRole.entities.FechamentoMensal.get(fechamento_id);
        dados_snapshot = {
          premio_emitido_bruto: f.premio_emitido_bruto,
          sinistros_pagos: f.sinistros_pagos,
          remuneracao_total_mga: f.remuneracao_total_mga,
          repasse_seguradora: f.repasse_seguradora,
          status: f.status
        };
      } catch (_) { dados_snapshot = {}; }
    }
    
    const log = await base44.entities.LogFechamento.create({
      fechamento_id,
      acao,
      usuario_id: user.id,
      usuario_nome: user.full_name || user.email,
      usuario_email: user.email,
      observacao: observacao || '',
      ip_address,
      dados_snapshot: dados_snapshot || {}
    });
    
    return Response.json({ sucesso: true, log });
    
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});