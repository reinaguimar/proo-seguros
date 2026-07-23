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
    
    // Filtrar apólices CRIADAS na competência (created_date)
    let apolicesCompetencia = todasApolices.filter(apolice => {
      if (!apolice.created_date) return false;
      const dataCriacao = new Date(apolice.created_date);
      return dataCriacao >= dataInicio && dataCriacao <= dataFim;
    });

    // DEDUPLICAÇÃO: Excluir canceladas e deduplicar por numero_apolice
    apolicesCompetencia = apolicesCompetencia.filter(a => !a.cancelada_para_revisao);
    
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

    // Calcular prêmio emitido bruto
    const premioEmitidoBruto = apolicesCompetencia.reduce((sum, a) => 
      sum + (a.premio_bruto_total || 0), 0
    );

    // Calcular inadimplência (apólices DO MÊS vencidas há mais de 60 dias)
    const hoje = new Date();
    const data60DiasAtras = new Date(hoje);
    data60DiasAtras.setDate(hoje.getDate() - 60);

    const apolicesVencidas = apolicesCompetencia.filter(apolice => {
      if (!apolice.data_fim_apolice) return false;
      const dataFimApolice = new Date(apolice.data_fim_apolice);
      return dataFimApolice < data60DiasAtras && !apolice.renovada;
    });

    const inadimplencia = apolicesVencidas.reduce((sum, a) => 
      sum + (a.premio_bruto_total || 0), 0
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
        inadimplencia: Math.round(inadimplencia * 100) / 100,
        sinistros_avisados: Math.round(sinistrosAvisados * 100) / 100,
        sinistros_pagos: Math.round(sinistrosPagos * 100) / 100,
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