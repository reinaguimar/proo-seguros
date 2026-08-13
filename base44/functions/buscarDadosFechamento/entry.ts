import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { competencia_mes, competencia_ano } = await req.json();

    // Calcular datas de início e fim da competência
    const dataInicio = new Date(competencia_ano, competencia_mes - 1, 1);
    const dataFim = new Date(competencia_ano, competencia_mes, 0);
    const dataInicioStr = dataInicio.toISOString().split('T')[0];
    const dataFimStr = dataFim.toISOString().split('T')[0];

    // Buscar todas as apólices
    const todasApolices = await base44.asServiceRole.entities.Apolice.list();
    
    // Filtrar apólices pela data_inicio_apolice na competência (igual ao Dashboard)
    let apolicesCompetencia = todasApolices.filter(apolice => {
      if (!apolice.data_inicio_apolice) return false;
      return apolice.data_inicio_apolice >= dataInicioStr && apolice.data_inicio_apolice <= dataFimStr;
    });

    // DEDUPLICAÇÃO: Excluir canceladas e deduplicar por numero_apolice
    apolicesCompetencia = apolicesCompetencia.filter(a =>
      !a.cancelada_para_revisao &&
      a.natureza_movimento !== 'Cancelamento' &&
      a.status !== 'cancelada'
    );
    
    const apolicesMap = new Map();
    apolicesCompetencia.forEach(apolice => {
      const numero = apolice.numero_apolice;
      if (!apolicesMap.has(numero)) {
        apolicesMap.set(numero, apolice);
      } else {
        // Se já existe, manter o mais recente (por updated_date ou created_date)
        const existente = apolicesMap.get(numero);
        const dataExistente = new Date(existente.updated_date || existente.created_date);
        const dataAtual = new Date(apolice.updated_date || apolice.created_date);
        if (dataAtual > dataExistente) {
          apolicesMap.set(numero, apolice);
        }
      }
    });
    
    apolicesCompetencia = Array.from(apolicesMap.values());

    // Breakdown por filial — ADICIONADO após dedup existente, não substitui nada
    const breakdownPorFilial = Array.from(
      apolicesCompetencia.reduce((map, ap) => {
        const key = ap.filial_id || 'sem_filial';
        if (!map.has(key)) {
          map.set(key, {
            filial_id: key,
            filial_nome: ap.filial_nome || '',
            filial_codigo: ap.filial_codigo || '',
            qtd_apolices: 0,
            premio_bruto: 0,
            iof: 0
          });
        }
        const entry = map.get(key);
        entry.qtd_apolices += 1;
        entry.premio_bruto += ap.premio_bruto_total ?? 0;
        entry.iof += ap.iof ?? 0;
        return map;
      }, new Map()).values()
    );

    // Calcular prêmio emitido bruto e IOF total do mês
    const premioEmitidoBruto = apolicesCompetencia.reduce((sum, a) => 
      sum + (a.premio_bruto_total || 0), 0
    );
    const iofTotalMes = apolicesCompetencia.reduce((sum, a) => 
      sum + (a.iof || 0), 0
    );

    // Buscar todos os sinistros
    const todosSinistros = await base44.asServiceRole.entities.Sinistro.list();
    
    // Filtrar sinistros da competência
    const sinistrosCompetencia = todosSinistros.filter(sinistro => {
      if (!sinistro.data_sinistro) return false;
      const data = new Date(sinistro.data_sinistro);
      return data >= dataInicio && data <= dataFim;
    });

    const sinistrosAvisados = sinistrosCompetencia.reduce((sum, s) => 
      sum + (s.valor_inicial || 0), 0
    );

    // Buscar gastos de sinistros pagos na competência
    const todosGastos = await base44.asServiceRole.entities.GastoSinistro.list();
    
    const gastosPagosCompetencia = todosGastos.filter(gasto => {
      if (!gasto.datas_pagamento || gasto.datas_pagamento.length === 0) return false;
      
      // Verificar se alguma data de pagamento está na competência
      return gasto.datas_pagamento.some(dataPagamento => {
        const data = new Date(dataPagamento);
        return data >= dataInicio && data <= dataFim;
      });
    });

    const sinistrosPagos = gastosPagosCompetencia.reduce((sum, g) => 
      sum + (g.valor_total || 0), 0
    );

    return Response.json({
      sucesso: true,
      dados: {
        premio_emitido_bruto: Math.round(premioEmitidoBruto * 100) / 100,
        iof_total_mes: Math.round(iofTotalMes * 100) / 100,
        inadimplencia: 0,
        sinistros_avisados: Math.round(sinistrosAvisados * 100) / 100,
        sinistros_pagos: Math.round(sinistrosPagos * 100) / 100,
        breakdown_por_filial: breakdownPorFilial,
        estatisticas: {
          total_apolices: apolicesCompetencia.length,
          total_sinistros: sinistrosCompetencia.length,
          total_gastos: gastosPagosCompetencia.length
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return Response.json({ 
      error: error.message || 'Erro ao buscar dados do fechamento' 
    }, { status: 500 });
  }
});