import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FILIAL_ID = '69a88b96aca1474b40187291';
const ANO = 2026;
const SEQ_INICIO_RENUMERACAO = 1232;
const PREFIXO = '110627.2026.10.031';

// Números problemáticos a verificar
const NUMEROS_PROBLEMATICOS = [
  '110627.2026.10.031.000408.001',
  '110627.2026.10.031.000410.001',
  ...Array.from({ length: 45 }, (_, i) =>
    `110627.2026.10.031.${String(421 + i).padStart(6, '0')}.001`
  ),
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
    if (!['super_administrador', 'administrador', 'admin'].includes(user.role) &&
        !['super_administrador', 'administrador'].includes(user.perfil_sistema)) {
      return Response.json({ error: 'Apenas administradores podem executar esta função' }, { status: 403 });
    }

    const relatorio = [];
    let proximoSeq = SEQ_INICIO_RENUMERACAO;

    for (const numero of NUMEROS_PROBLEMATICOS) {
      // Buscar todas as apólices com esse número
      const matches = await base44.asServiceRole.entities.Apolice.filter({ numero_apolice: numero });

      if (!matches || matches.length <= 1) {
        // Sem colisão — pular
        relatorio.push({ numero_original: numero, status: 'sem_colisao', acao: 'nenhuma' });
        continue;
      }

      // Há colisão — manter a primeira (mais antiga por created_date) e renumerar as demais
      const ordenadas = [...matches].sort((a, b) =>
        new Date(a.created_date) - new Date(b.created_date)
      );
      const [manter, ...renumerar] = ordenadas;

      for (const apolice of renumerar) {
        const novoNumero = `${PREFIXO}.${String(proximoSeq).padStart(6, '0')}.001`;
        await base44.asServiceRole.entities.Apolice.update(apolice.id, {
          numero_apolice: novoNumero
        });
        relatorio.push({
          id: apolice.id,
          numero_original: numero,
          numero_novo: novoNumero,
          status: 'renumerada',
          acao: `mantida: ${manter.id} | renumerada: ${apolice.id}`
        });
        proximoSeq++;
      }
    }

    const ultimoSeqUsado = proximoSeq - 1;
    const renumeradas = relatorio.filter(r => r.status === 'renumerada').length;

    if (renumeradas > 0) {
      // Atualizar SequencialApolice
      const seqRegs = await base44.asServiceRole.entities.SequencialApolice.filter({
        filial_id: FILIAL_ID, ano: ANO
      });
      if (seqRegs && seqRegs.length > 0) {
        await base44.asServiceRole.entities.SequencialApolice.update(seqRegs[0].id, {
          ultimo_sequencial: ultimoSeqUsado
        });
      }

      // Atualizar Filial
      await base44.asServiceRole.entities.Filial.update(FILIAL_ID, {
        ultimo_numero_sequencial: ultimoSeqUsado
      });
    }

    return Response.json({
      sucesso: true,
      renumeradas,
      ultimo_sequencial_usado: ultimoSeqUsado,
      relatorio
    });

  } catch (error) {
    console.error('[corrigirNumerosApolice] Erro:', error);
    return Response.json({ sucesso: false, error: error.message }, { status: 500 });
  }
});