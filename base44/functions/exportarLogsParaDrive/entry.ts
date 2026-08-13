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

    // Rate limit para chamadas manuais (sistema automático não tem user)
    const callerUser = await base44.auth.me().catch(() => null);
    if (callerUser) {
      try { checkRateLimit(callerUser.id, 'exportarLogsParaDrive'); } catch (e) {
        return Response.json({ error: e.message }, { status: 429 });
      }
    }

    const { data } = await req.json().catch(() => ({}));

    // Calcular data de referência: se informada usa ela, senão usa ontem
    const refDate = data
      ? new Date(data + 'T00:00:00.000Z')
      : (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); d.setUTCHours(0,0,0,0); return d; })();

    const dataInicio = new Date(refDate);
    dataInicio.setUTCHours(0, 0, 0, 0);
    const dataFim = new Date(refDate);
    dataFim.setUTCHours(23, 59, 59, 999);
    const dataReferencia = dataInicio.toISOString().split('T')[0];

    // Buscar credenciais do Google na entidade ParametrosFechamento
    const parametros = await base44.asServiceRole.entities.ParametrosFechamento.list();
    const getParam = (nome) => parametros.find(p => p.nome === nome)?.valor?.toString() || '';

    const clientId = getParam('GOOGLE_CLIENT_ID');
    const clientSecret = getParam('GOOGLE_CLIENT_SECRET');
    const refreshToken = getParam('GOOGLE_REFRESH_TOKEN');

    if (!clientId || !clientSecret || !refreshToken) {
      return Response.json({ error: 'Credenciais Google não configuradas em ParametrosFechamento' }, { status: 400 });
    }

    // Obter access token via OAuth2
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return Response.json({ error: 'Falha ao obter access token', detalhe: tokenData }, { status: 500 });
    }

    const accessToken = tokenData.access_token;

    // Buscar registros do dia de referência
    const filtroPorData = (registros) =>
      registros.filter(r => {
        if (!r.created_date) return false;
        const d = new Date(r.created_date);
        return d >= dataInicio && d <= dataFim;
      });

    const [logFechamento, fechamentoAssinatura, logDelecao] = await Promise.all([
      base44.asServiceRole.entities.LogFechamento.list(),
      base44.asServiceRole.entities.FechamentoAssinatura.list(),
      base44.asServiceRole.entities.LogDelecao.list(),
    ]);

    const logsDoFechamento = filtroPorData(logFechamento);
    const assinaturasDoFechamento = filtroPorData(fechamentoAssinatura);
    const logsDeDeletacao = filtroPorData(logDelecao);

    const payload = {
      exportado_em: new Date().toISOString(),
      data_referencia: dataReferencia,
      sistema: 'New Seguros',
      total_registros: logsDoFechamento.length + assinaturasDoFechamento.length + logsDeDeletacao.length,
      log_fechamento: logsDoFechamento,
      fechamento_assinatura: assinaturasDoFechamento,
      log_delecao: logsDeDeletacao
    };

    const nomeArquivo = `logs-new-seguros-${dataReferencia}.json`;
    const jsonContent = JSON.stringify(payload, null, 2);
    const FOLDER_ID = '1LaARRWeBM7yvRW7qQ8JMS1W2mtz6QMSg';

    // Montar multipart upload para o Google Drive
    const boundary = 'boundary_logs_new_seguros';
    const metadata = JSON.stringify({
      name: nomeArquivo,
      mimeType: 'application/json',
      parents: [FOLDER_ID]
    });

    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${jsonContent}\r\n` +
      `--${boundary}--`;

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      return Response.json({ error: 'Falha no upload para o Drive', detalhe: uploadData }, { status: 500 });
    }

    // Registrar log da operação
    await base44.asServiceRole.entities.LogFechamento.create({
      fechamento_id: 'sistema',
      acao: 'calculado',
      usuario_id: 'sistema',
      usuario_nome: 'Sistema Automático',
      usuario_email: 'sistema@new-seguros.com.br',
      observacao: `Export automático de logs para Google Drive: ${nomeArquivo}`,
      dados_snapshot: { arquivo: nomeArquivo, drive_file_id: uploadData.id, total_registros: payload.total_registros }
    });

    return Response.json({
      sucesso: true,
      arquivo: nomeArquivo,
      drive_file_id: uploadData.id,
      total_registros: payload.total_registros
    });

  } catch (error) {
    console.error('Erro exportarLogsParaDrive:', error);
    try {
      const b = createClientFromRequest(req);
      const u = await b.auth.me().catch(() => null);
      await registrarErro(b, 'exportarLogsParaDrive', error, u, req);
    } catch (_) {}
    return Response.json({ error: error.message }, { status: 500 });
  }
});