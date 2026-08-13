import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data } = await req.json().catch(() => ({}));

    // Se não informado, usa ontem
    const refDate = data
      ? new Date(data + 'T00:00:00.000Z')
      : (() => { const d = new Date(); d.setUTCDate(d.getUTCDate() - 1); d.setUTCHours(0,0,0,0); return d; })();

    const dataInicio = new Date(refDate);
    dataInicio.setUTCHours(0, 0, 0, 0);

    const dataFim = new Date(refDate);
    dataFim.setUTCHours(23, 59, 59, 999);

    const dataReferencia = dataInicio.toISOString().split('T')[0];

    // Buscar todos os registros de cada entidade
    const [logFechamento, fechamentoAssinatura, logDelecao] = await Promise.all([
      base44.asServiceRole.entities.LogFechamento.list(),
      base44.asServiceRole.entities.FechamentoAssinatura.list(),
      base44.asServiceRole.entities.LogDelecao.list(),
    ]);

    const filtroPorData = (registros) =>
      registros.filter(r => {
        if (!r.created_date) return false;
        const d = new Date(r.created_date);
        return d >= dataInicio && d <= dataFim;
      });

    const logsDoFechamento = filtroPorData(logFechamento);
    const assinaturasDoFechamento = filtroPorData(fechamentoAssinatura);
    const logsDeDeleção = filtroPorData(logDelecao);

    const resultado = {
      exportado_em: new Date().toISOString(),
      data_referencia: dataReferencia,
      total_registros: logsDoFechamento.length + assinaturasDoFechamento.length + logsDeDeleção.length,
      log_fechamento: logsDoFechamento,
      fechamento_assinatura: assinaturasDoFechamento,
      log_delecao: logsDeDeleção,
    };

    return Response.json(resultado);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});