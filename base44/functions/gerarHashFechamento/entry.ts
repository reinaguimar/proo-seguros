import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { fechamento } = await req.json();
    
    if (!fechamento) {
      return Response.json({ error: 'Fechamento obrigatório' }, { status: 400 });
    }
    
    // Criar representação canônica do fechamento
    const dadosCanonicados = {
      competencia: `${fechamento.competencia_mes}/${fechamento.competencia_ano}`,
      premio_emitido_bruto: fechamento.premio_emitido_bruto,
      inadimplencia: fechamento.inadimplencia,
      premio_arrecadado_liquido: fechamento.premio_arrecadado_liquido,
      sinistros_pagos: fechamento.sinistros_pagos,
      remuneracao_seguradora: fechamento.remuneracao_aplicada_seguradora,
      remuneracao_mga: fechamento.remuneracao_total_mga,
      saldo_tecnico: fechamento.saldo_tecnico_liquido,
      usuario: user.email,
      timestamp: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(dadosCanonicados, Object.keys(dadosCanonicados).sort());
    
    // Gerar hash SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return Response.json({ 
      sucesso: true, 
      hash: hashHex,
      dados_canonicados: dadosCanonicados
    });
    
  } catch (error) {
    console.error('Erro ao gerar hash:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});