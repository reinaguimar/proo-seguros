import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const PRAZO_DIAS = 30;

// Soma dias a uma data "YYYY-MM-DD" sem deslocamento de fuso horário.
const somarDias = (dataStr: string, dias: number): string => {
  if (!dataStr) return dataStr;
  const [y, m, d] = dataStr.split('T')[0].split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
  dt.setDate(dt.getDate() + dias);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem executar esta correção' }, { status: 403 });

    const todas = [];
    let skip = 0;
    const limit = 100;
    while (true) {
      const lote = await base44.asServiceRole.entities.Apolice.list(null, limit, skip);
      if (!lote || lote.length === 0) break;
      todas.push(...lote);
      if (lote.length < limit) break;
      skip += limit;
    }

    let corrigidas = 0;
    let jaCorretas = 0;
    const detalhes = [];

    for (const ap of todas) {
      const inicio = ap.data_inicio_apolice;
      if (!inicio) { detalhes.push({ id: ap.id, numero: ap.numero_apolice, status: 'sem_data_inicio' }); continue; }

      const fimEsperado = somarDias(inicio, PRAZO_DIAS);
      const fimAtual = ap.data_fim_apolice ? ap.data_fim_apolice.split('T')[0] : null;
      const fimCobAtual = ap.data_fim_cobertura ? ap.data_fim_cobertura.split('T')[0] : null;

      const precisaFim = fimAtual !== fimEsperado;
      const precisaCob = fimCobAtual !== fimEsperado;

      if (!precisaFim && !precisaCob) { jaCorretas++; continue; }

      const update: Record<string, string> = {};
      if (precisaFim) update.data_fim_apolice = fimEsperado;
      if (precisaCob) update.data_fim_cobertura = fimEsperado;

      await base44.asServiceRole.entities.Apolice.update(ap.id, update);
      corrigidas++;
      detalhes.push({
        id: ap.id,
        numero: ap.numero_apolice,
        inicio,
        fim_anterior: fimAtual,
        fim_novo: fimEsperado,
      });
    }

    return Response.json({
      sucesso: true,
      total_apolices: todas.length,
      corrigidas,
      ja_corretas: jaCorretas,
      detalhes: detalhes.slice(0, 50),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}