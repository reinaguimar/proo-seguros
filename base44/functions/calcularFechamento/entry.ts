import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { fechamento_id, premio_emitido_bruto, inadimplencia, sinistros_pagos } = await req.json();
    
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
    
    // 2.3 - Prêmio Arrecadado Líquido
    const premio_arrecadado_liquido = premio_emitido_bruto - inadimplencia;
    
    // 4. Remuneração Seguradora
    const remuneracao_minima = premio_emitido_bruto * 0.1038;
    const remuneracao_sinistralidade = sinistros_pagos * 0.40;
    const remuneracao_seguradora = Math.max(remuneracao_minima, remuneracao_sinistralidade);
    
    // 5. Remuneração MGA (PARAMETRIZADO)
    const comissao_fixa = premio_emitido_bruto * (percentual_comissao_mga / 100);
    const lucro_operacional = premio_arrecadado_liquido - sinistros_pagos - remuneracao_seguradora;
    const bonus_variavel = lucro_operacional * (percentual_bonus_mga / 100);
    const remuneracao_mga = comissao_fixa + bonus_variavel;
    
    // 6. Saldo Técnico
    const saldo_tecnico = premio_arrecadado_liquido - sinistros_pagos - remuneracao_seguradora - remuneracao_mga;
    const repasse_seguradora = remuneracao_seguradora + (saldo_tecnico > 0 ? saldo_tecnico : 0);
    const retencao_mga = remuneracao_mga;
    
    // Atualizar o fechamento no banco
    await base44.asServiceRole.entities.FechamentoMensal.update(fechamento_id, {
      premio_emitido_bruto,
      inadimplencia,
      premio_arrecadado_liquido,
      sinistros_pagos,
      remuneracao_minima_seguradora: remuneracao_minima,
      remuneracao_sinistralidade_seguradora: remuneracao_sinistralidade,
      remuneracao_aplicada_seguradora: remuneracao_seguradora,
      comissao_fixa_mga: comissao_fixa,
      lucro_operacional,
      bonus_variavel_mga: bonus_variavel,
      remuneracao_total_mga: remuneracao_mga,
      saldo_tecnico_liquido: saldo_tecnico,
      repasse_seguradora,
      retencao_mga,
      status: 'calculado'
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
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});