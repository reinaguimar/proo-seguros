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
  // Limpar entradas antigas (> 2 min)
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

    try { checkRateLimit(user.id, 'calcularFechamento'); } catch (e) {
      return Response.json({ error: e.message }, { status: 429 });
    }
    
    const { fechamento_id, premio_emitido_bruto, inadimplencia, sinistros_pagos, iof_total_mes, breakdown_por_filial } = await req.json();
    
    if (!fechamento_id) {
      return Response.json({ error: 'ID do fechamento obrigatório' }, { status: 400 });
    }
    
    // Buscar o fechamento
    const fechamento = await base44.asServiceRole.entities.FechamentoMensal.get(fechamento_id);
    
    if (!fechamento) {
      return Response.json({ error: 'Fechamento não encontrado' }, { status: 404 });
    }
    
    const percentual_comissao_mga = fechamento.percentual_comissao_mga || 10;
    const percentual_bonus_mga = fechamento.percentual_bonus_mga || 3.8;

    // Buscar todos os fechamentos anteriores ao atual (qualquer status exceto rascunho)
    const todosFechamentos = await base44.asServiceRole.entities.FechamentoMensal.list();
    const anterioresOrdenados = todosFechamentos
      .filter(f => f.id !== fechamento_id && f.status !== 'rascunho')
      .filter(f => {
        if (f.competencia_ano < fechamento.competencia_ano) return true;
        if (f.competencia_ano === fechamento.competencia_ano && f.competencia_mes < fechamento.competencia_mes) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.competencia_ano !== b.competencia_ano) return a.competencia_ano - b.competencia_ano;
        return a.competencia_mes - b.competencia_mes;
      });

    // Capital aportado = cr_atualizado do último fechamento anterior, ou 50.000 se for o primeiro
    const ultimoFechamento = anterioresOrdenados[anterioresOrdenados.length - 1];
    const CR_CAPITAL_APORTADO = ultimoFechamento?.cr_atualizado || 50000;

    // CR — janela de 2 meses: mês atual + 1 mês anterior fechado (status = 'fechado')
    const anterioresFechados = anterioresOrdenados.filter(f => f.status === 'fechado');
    const mesAnteriorFechado = anterioresFechados.length > 0 ? anterioresFechados[anterioresFechados.length - 1] : null;
    const premios_acumulados = (mesAnteriorFechado?.premio_emitido_bruto || 0) + premio_emitido_bruto;
    const sinistros_acumulados = (mesAnteriorFechado?.sinistros_pagos || 0) + sinistros_pagos;

    // 2.3 - Prêmio Arrecadado Líquido
    const premio_arrecadado_liquido = premio_emitido_bruto - inadimplencia;
    
    // 4. Remuneração Seguradora
    // 4.1: MAX(R$ 5.000,00 fixo, 10,38% do prêmio emitido bruto)
    const remuneracao_minima = Math.max(5000, premio_emitido_bruto * 0.1038);
    // 4.2: IOF total do mês + 20% dos sinistros pagos
    const iof_mes = iof_total_mes || 0;
    const remuneracao_sinistralidade = iof_mes + sinistros_pagos * 0.20;
    const remuneracao_seguradora = Math.max(remuneracao_minima, remuneracao_sinistralidade);
    
    // 5. Remuneração MGA
    const comissao_fixa = premio_emitido_bruto * (percentual_comissao_mga / 100);
    // 6. Retenção MGA = prêmio bruto - remuneração seguradora (sem deduzir sinistros aqui)
    const retencao_mga = premio_emitido_bruto - remuneracao_seguradora;
    // 5.2 - Lucro operacional = retenção - comissão fixa - sinistros pagos
    const lucro_operacional = retencao_mga - comissao_fixa - sinistros_pagos;
    // 5.4 = 5.1 + 5.2
    const remuneracao_mga = comissao_fixa + lucro_operacional;
    
    // 6. Saldo Técnico
    const saldo_tecnico = premio_arrecadado_liquido - sinistros_pagos - remuneracao_seguradora - remuneracao_mga;
    const repasse_seguradora = remuneracao_seguradora + (saldo_tecnico > 0 ? saldo_tecnico : 0);

    // 7. Capital de Risco (CR) - janela 2 meses (mês atual + 1 anterior fechado)
    // CR = 1.12 × √[(0.17 × Σprêmios_2m)² + (0.44 × Σsinistros_2m)²]
    const cr_necessidade_capital = 1.12 * Math.sqrt(
      Math.pow(0.17 * premios_acumulados, 2) + Math.pow(0.44 * sinistros_acumulados, 2)
    );
    const cr_diferenca = CR_CAPITAL_APORTADO - cr_necessidade_capital;
    const cr_saldo_positivo = cr_diferenca > 0 ? cr_diferenca : 0;
    const cr_necessidade_aporte = cr_diferenca < 0 ? Math.abs(cr_diferenca) : 0;
    // 6.5 = 6.1 + 6.4 (se saldo positivo, 6.4=0, logo 6.5=6.1; se negativo, 6.5=6.1+6.4=6.2)
    const cr_atualizado = CR_CAPITAL_APORTADO + cr_necessidade_aporte;
    
    // Atualizar o fechamento no banco
    await base44.asServiceRole.entities.FechamentoMensal.update(fechamento_id, {
      premio_emitido_bruto,
      iof_total_mes: iof_mes,
      inadimplencia,
      premio_arrecadado_liquido,
      sinistros_pagos,
      remuneracao_minima_seguradora: remuneracao_minima,
      remuneracao_sinistralidade_seguradora: remuneracao_sinistralidade,
      remuneracao_aplicada_seguradora: remuneracao_seguradora,
      comissao_fixa_mga: comissao_fixa,
      lucro_operacional: lucro_operacional,
      bonus_variavel_mga: 0,
      remuneracao_total_mga: remuneracao_mga,
      saldo_tecnico_liquido: saldo_tecnico,
      repasse_seguradora,
      retencao_mga,
      cr_premio_acum_3m: Math.round(premios_acumulados * 100) / 100,
      cr_sinistros_acum_3m: Math.round(sinistros_acumulados * 100) / 100,
      cr_capital_aportado: CR_CAPITAL_APORTADO,
      cr_necessidade_capital: Math.round(cr_necessidade_capital * 100) / 100,
      cr_saldo_positivo: Math.round(cr_saldo_positivo * 100) / 100,
      cr_necessidade_aporte: Math.round(cr_necessidade_aporte * 100) / 100,
      cr_atualizado: Math.round(cr_atualizado * 100) / 100,
      status: 'calculado',
      detalhes_calculo: {
        ...(fechamento.detalhes_calculo || {}),
        breakdown_por_filial: breakdown_por_filial || (fechamento.detalhes_calculo?.breakdown_por_filial || null)
      }
    });
    
    // Registrar log
    await base44.asServiceRole.entities.LogFechamento.create({
      fechamento_id,
      acao: 'calculado',
      usuario_id: user.id,
      usuario_nome: user.full_name,
      usuario_email: user.email,
      observacao: 'Fechamento calculado com sucesso'
    });
    
    return Response.json({
      sucesso: true,
      mensagem: 'Fechamento calculado com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao calcular fechamento:', error);
    try {
      const b = createClientFromRequest(req);
      const u = await b.auth.me().catch(() => null);
      await registrarErro(b, 'calcularFechamento', error, u, req);
    } catch (_) {}
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});