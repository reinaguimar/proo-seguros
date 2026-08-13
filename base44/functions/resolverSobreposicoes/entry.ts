import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !['admin', 'super_administrador', 'administrador'].includes(user.role || user.perfil_sistema)) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { executar = false } = await req.json().catch(() => ({}));

    // 1. Buscar todas as apólices ativas (não canceladas)
    const todas = await base44.asServiceRole.entities.Apolice.list();
    const ativas = todas.filter(a => a.natureza_movimento !== 'Cancelamento');

    // 2. Agrupar SOMENTE por id_objeto (placa).
    // Sobreposição é detectada quando duas apólices ativas têm a mesma placa e períodos sobrepostos,
    // independentemente de filial, segurado (CPF ou CNPJ) ou qualquer outro campo.
    const grupos = new Map();
    for (const a of ativas) {
      if (!a.id_objeto || !a.data_inicio_apolice || !a.data_fim_apolice) continue;
      const chave = a.id_objeto.trim().toUpperCase();
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(a);
    }

    // Mapa de id → apólice para buscas rápidas de origem
    const mapaId = new Map(todas.map(a => [a.id, a]));

    const cancelamentos = [];
    const erros = [];
    let totalGruposAnalisados = 0;
    let totalParesSobrepostos = 0;

    // Helper: extrair EEE (últimos 3 dígitos do número da apólice)
    const extrairEEE = (numero) => {
      if (!numero) return 9999;
      const partes = numero.split('.');
      return parseInt(partes[partes.length - 1], 10) || 9999;
    };

    // Helper: verificar se dois intervalos se sobrepõem
    const sobrepoe = (a, b) => {
      const ai = new Date(a.data_inicio_apolice + 'T00:00:00');
      const af = new Date(a.data_fim_apolice + 'T00:00:00');
      const bi = new Date(b.data_inicio_apolice + 'T00:00:00');
      const bf = new Date(b.data_fim_apolice + 'T00:00:00');
      return ai < bf && bi < af;
    };

    // Helper: verificar continuidade de cadeia (origem.data_fim ≈ apolice.data_inicio, diff <= 5 dias)
    const temContinuidadeValida = (apolice) => {
      if (!apolice.renovacao_de) return false;
      const origem = mapaId.get(apolice.renovacao_de);
      if (!origem || !origem.data_fim_apolice) return false;
      const fimOrigem = new Date(origem.data_fim_apolice + 'T00:00:00');
      const inicioNova = new Date(apolice.data_inicio_apolice + 'T00:00:00');
      const diffDias = Math.abs((inicioNova - fimOrigem) / (1000 * 60 * 60 * 24));
      return diffDias <= 5;
    };

    for (const [, grupo] of grupos) {
      if (grupo.length < 2) continue;
      totalGruposAnalisados++;

      // Detectar todos os pares sobrepostos
      for (let i = 0; i < grupo.length; i++) {
        for (let j = i + 1; j < grupo.length; j++) {
          const A = grupo[i];
          const B = grupo[j];
          if (!sobrepoe(A, B)) continue;

          totalParesSobrepostos++;

          let cancelar = null;
          let manter = null;
          let motivo = '';

          const aContinua = temContinuidadeValida(A);
          const bContinua = temContinuidadeValida(B);

          if (aContinua && !bContinua) {
            manter = A; cancelar = B; motivo = 'continuidade';
          } else if (bContinua && !aContinua) {
            manter = B; cancelar = A; motivo = 'continuidade';
          } else if (aContinua && bContinua) {
            // Ambas têm continuidade — cancelar a com data_inicio mais recente
            const aInicio = new Date(A.data_inicio_apolice);
            const bInicio = new Date(B.data_inicio_apolice);
            if (aInicio >= bInicio) { cancelar = A; manter = B; }
            else { cancelar = B; manter = A; }
            motivo = 'continuidade (ambas válidas, manteve a mais antiga)';
          } else {
            // Regra 2: manter menor EEE
            const eeeA = extrairEEE(A.numero_apolice);
            const eeeB = extrairEEE(B.numero_apolice);
            if (eeeA <= eeeB) { manter = A; cancelar = B; }
            else { manter = B; cancelar = A; }
            motivo = 'sequência (menor EEE mantido)';
          }

          // Verificar se este cancelamento já foi registrado nesta execução
          const jaRegistrado = cancelamentos.some(c => c._cancelar_id === cancelar.id);
          if (jaRegistrado) continue;

          cancelamentos.push({
            _cancelar_id: cancelar.id,
            _manter_id: manter.id,
            // Dados da apólice a CANCELAR
            apolice_cancelada: cancelar.numero_apolice,
            filial_cancelada: cancelar.filial_nome || cancelar.filial_id || '—',
            segurado_cancelada: cancelar.id_segurado || '—',
            placa: cancelar.id_objeto || '—',
            periodo_cancelada: `${cancelar.data_inicio_apolice} → ${cancelar.data_fim_apolice}`,
            // Dados da apólice a MANTER
            apolice_mantida: manter.numero_apolice,
            filial_mantida: manter.filial_nome || manter.filial_id || '—',
            segurado_mantida: manter.id_segurado || '—',
            periodo_mantida: `${manter.data_inicio_apolice} → ${manter.data_fim_apolice}`,
            motivo,
          });
        }
      }
    }

    // 5. Se executar=true, aplicar cancelamentos
    if (executar) {
      for (const c of cancelamentos) {
        try {
          await base44.asServiceRole.entities.Apolice.update(c._cancelar_id, {
            natureza_movimento: 'Cancelamento',
          });
          // Se a mantida ainda está como '01', atualizar para 'Renovação'
          const mantida = mapaId.get(c._manter_id);
          if (mantida && mantida.natureza_movimento === '01') {
            await base44.asServiceRole.entities.Apolice.update(c._manter_id, {
              natureza_movimento: 'Renovação',
            });
          }
        } catch (e) {
          erros.push(`Erro ao cancelar ${c.apolice_cancelada}: ${e.message}`);
        }
      }
    }

    return Response.json({
      sucesso: true,
      executado: executar,
      total_grupos_analisados: totalGruposAnalisados,
      total_pares_sobrepostos: totalParesSobrepostos,
      cancelamentos_aplicados: cancelamentos.map(({ _cancelar_id, _manter_id, ...rest }) => rest),
      erros,
    });

  } catch (error) {
    console.error('Erro resolverSobreposicoes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});