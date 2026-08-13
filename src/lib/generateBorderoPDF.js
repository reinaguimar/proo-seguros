export function generateBorderoPDF(record) {
  return new Promise(function(resolve, reject) {
    function loadScripts(cb) {
      if (window.__pmLoaded) { cb(); return; }
      var s1 = document.createElement('script');
      s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
      s1.onload = function() {
        var s2 = document.createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js';
        s2.onload = function() { window.__pmLoaded = true; cb(); };
        s2.onerror = function() { reject(new Error('Erro ao carregar fontes do pdfmake.')); };
        document.head.appendChild(s2);
      };
      s1.onerror = function() { reject(new Error('Erro ao carregar pdfmake. Verifique conexão.')); };
      document.head.appendChild(s1);
    }
    loadScripts(function() {
      try { gerarBordero(record); resolve(); }
      catch(e) { reject(e); }
    });
  });
}

function gerarBordero(record) {
  var AZ  = '#1462F5';
  var VDB = '#00E569';
  var AZT = '#1462F5';
  var VDR = '#00C853';
  var VM  = '#C62828';
  var VDL = '#F1F8E9';
  var CZ  = '#BDBDBD';
  var CZL = '#F5F5F5';
  var CZR = '#616161';
  var TB  = '#BDBDBD';
  var W   = '#FFFFFF';

  var CNPJ_OON  = '43.249.519/0001-10';
  var SUSEP_NUM = '15414.627418/2021-15';
  var CNPJ_MGA  = '13.995.255/0001-83';

  // ── DADOS DO BANCO ────────────────────────────────────────────────────────
  var H6  = parseFloat(record.premio_emitido_bruto)  || 0;
  var H7  = -(parseFloat(record.sinistros_pagos)       || 0);
  var H17 = parseFloat(record.iof_total_mes)          || 0;
  var H33 = parseFloat(record.cr_capital_aportado)    || 0;
  var H34 = parseFloat(record.cr_necessidade_capital) || 0;
  var filialNome = record.filial_nome || 'NEW SOLUÇÕES LTDA - ME';

  // ── FÓRMULAS (H29 calculado do zero — NUNCA usa record.lucro_operacional) ──
  var H8  = H6 + H7;
  var H12 = H8;
  var H20 = Math.abs(H7) * 0.20;
  var H21 = H17 + H20;
  var H22 = H6 * 0.1038;
  var H23 = (H7 === 0) ? H22 : Math.max(H21, H22);
  var H26 = H6 * 0.10;
  var H29 = H8 - H23 - H26;
  var H35 = Math.max(0, H34 - H33);
  var H39 = -(H12 * 0.0465);
  var H41 = H6 - H17 - H29 + H7 - H26 + H34 + H39;
  var H42 = H41 * 0.30;
  var H43 = H41 - H42;
  var psVerif = H6 - (Math.abs(H7) + H23 + H26);

  // ── COMPETÊNCIA ───────────────────────────────────────────────────────────
    var mes = String(record.competencia_mes || 0).padStart(2,'0');
    var ano = String(record.competencia_ano || '????');
    var competencia = (record.competencia_mes && record.competencia_ano) ? mes + '/' + ano : '??/????';

  // ── FORMATAÇÃO ────────────────────────────────────────────────────────────
  function fmt(v) {
    var n = Math.abs(v);
    var s = n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
    return (v < 0 ? '-R$ ' : 'R$ ') + s;
  }
  function fmtAbs(v) {
    return 'R$ ' + Math.abs(v).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  var TB_LAYOUT = {
    hLineWidth: function(){ return 0.5; },
    vLineWidth: function(){ return 0.5; },
    hLineColor: function(){ return TB; },
    vLineColor: function(){ return TB; }
  };

  function secTitle(num, label) {
    return {
      table: { widths: [3, '*'],
        body: [[
          { text: '', fillColor: '#00E569', border: [false,false,false,false], margin:[0,0,0,0] },
          { text: num + '. ' + label, fontSize: 9, bold: true,
            border: [false,false,false,false], margin: [5, 2, 0, 2] }
        ]]
      }, layout: 'noBorders', margin: [0, 8, 0, 3]
    };
  }

  function secHdr(title) {
    return {
      table: { widths: ['*', 90],
        body: [[
          { text: title, fontSize: 8.5, bold: true, color: W, fillColor: AZT,
            border:[false,false,false,false], colSpan: 2 }, {}
        ]]
      }, layout: 'noBorders', margin: [0, 5, 0, 0]
    };
  }

  function r3(item, desc, val, highlight) {
    var isNeg = (typeof val === 'number') && val < 0;
    var fv = (typeof val === 'number') ? fmt(val) : (val || '');
    return [
      { text: item, fontSize: 8.5, alignment: 'center' },
      { text: desc, fontSize: 8.5 },
      { text: fv, fontSize: 8.5, alignment: 'right',
        color: isNeg ? VM : (highlight ? VDR : '#212121'),
        bold: highlight || false,
        fillColor: highlight ? VDL : undefined }
    ];
  }
  function r3abs(item, desc, val) {
    return [
      { text: item, fontSize: 8.5, alignment: 'center', bold: true },
      { text: desc, fontSize: 8.5, bold: true },
      { text: fmtAbs(val), fontSize: 8.5, alignment: 'right', bold: true, color: VM, fillColor: VDL }
    ];
  }
  function r3h(item, desc, val) { return r3(item, desc, val, true); }
  function r3hdr(t1, t2, t3) {
    return [
      { text: t1||'Item', fontSize: 8.5, bold: true, fillColor: CZ },
      { text: t2||'Descrição da Movimentação', fontSize: 8.5, bold: true, fillColor: CZ, alignment: 'center' },
      { text: t3||'Valor (R$)', fontSize: 8.5, bold: true, fillColor: CZ, alignment: 'center' }
    ];
  }

  function r2(desc, val) {
    var isNeg = (typeof val === 'number') && val < 0;
    return [
      { text: desc, fontSize: 8.5 },
      { text: (typeof val === 'number') ? fmt(val) : (val||''),
        fontSize: 8.5, alignment: 'right', color: isNeg ? VM : '#212121' }
    ];
  }
  function r2h(desc, val) {
    var c = (typeof val === 'number' && val < 0) ? VM : VDR;
    return [
      { text: desc, fontSize: 8.5, bold: true },
      { text: (typeof val === 'number') ? fmt(val) : (val||''),
        fontSize: 8.5, alignment: 'right', bold: true, color: c, fillColor: VDL }
    ];
  }
  function r2neg(desc, val) {
    return [
      { text: desc, fontSize: 8.5 },
      { text: fmt(-Math.abs(val)), fontSize: 8.5, alignment: 'right', color: VM }
    ];
  }
  function r2e(desc) {
    return [
      { text: desc, fontSize: 8, color: '#9E9E9E', italics: true },
      { text: '', fontSize: 8 }
    ];
  }

  function buildLogoBase64() {
    var cv = document.createElement('canvas');
    cv.width = 260; cv.height = 100;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#1462F5';
    ctx.fillRect(0, 0, 260, 100);
    ctx.fillStyle = '#00E569';
    ctx.font = 'bold 54px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('oon', 130, 65);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '11px Arial';
    ctx.letterSpacing = '5px';
    ctx.fillText('seguradora', 133, 86);
    return cv.toDataURL('image/png');
  }

  function buildHeader(currentPage, pageCount, pageSize) {
    return [
      {
        table: { widths: ['*', 90],
          body: [[
            { stack: [
                { text: 'OON SEGURADORA SA', fontSize: 14, bold: true, color: W },
                { text: CNPJ_OON, fontSize: 9, color: W, margin: [0,2,0,0] },
                { text: 'SUSEP ' + SUSEP_NUM, fontSize: 9, color: W }
              ], margin: [28, 10, 0, 8]
            },
            { image: buildLogoBase64(), width: 90, alignment: 'right', margin: [0, 5, 20, 5] }
          ]]
        }, layout: 'noBorders', fillColor: AZ, margin: [0, 0, 0, 0]
      },
      { canvas: [{ type: 'rect', x: 0, y: 0, w: pageSize.width, h: 6, color: VDB }] }
    ];
  }

  function buildFooter(currentPage, pageCount) {
    return {
      table: { widths: ['*', '*', '*'],
        body: [[
          { text: 'OON SEGURADORA S/A', fontSize: 7, color: CZR },
          { text: 'CNPJ: ' + CNPJ_OON, fontSize: 7, color: CZR, alignment: 'center' },
          { text: 'Processo SUSEP Nº: ' + SUSEP_NUM, fontSize: 7, color: CZR, alignment: 'right' }
        ]]
      }, layout: 'noBorders', margin: [28, 5, 28, 0]
    };
  }

  var content = [];

  content.push({ text: 'OON SEGURADORA S/A   |   CNPJ: ' + CNPJ_OON,
    fontSize: 7, color: CZR, alignment: 'center', margin: [0,0,0,2] });
  content.push({ text: 'BORDERÔ MENSAL DE MOVIMENTAÇÃO OPERACIONAL E FINANCEIRA',
    fontSize: 11, bold: true, alignment: 'center', margin: [0,2,0,2] });
  content.push({ text: 'DOCUMENTO DE PRESTAÇÃO DE CONTAS: REPRESENTANTE (MGA) — SEGURADORA',
    fontSize: 8.5, italics: true, alignment: 'center', color: CZR, margin: [0,0,0,8] });

  content.push(secTitle('1', 'IDENTIFICAÇÃO DAS PARTES'));
  content.push({
    table: { widths: ['*','*'],
      body: [
        [{ text:'Competência (Mês/Ano):', fontSize:8.5, bold:true, fillColor:CZL },
         { text:competencia, fontSize:8.5, alignment:'center', bold:true }],
        [{ text:'SEGURADORA:', fontSize:8.5, bold:true, fillColor:CZL },
         { text:'OON SEGURADORA S.A', fontSize:8.5 }],
        [{ text:'CNPJ.:', fontSize:8.5, bold:true, fillColor:CZL },
         { text:CNPJ_OON, fontSize:8.5 }],
        [{ text:'REPRESENTANTE (MGA):', fontSize:8.5, bold:true, fillColor:CZL },
         { text:filialNome, fontSize:8.5 }],
        [{ text:'CNPJ.:', fontSize:8.5, bold:true, fillColor:CZL },
         { text:CNPJ_MGA, fontSize:8.5 }]
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,6]
  });

  content.push(secTitle('2', 'DEMONSTRATIVO DE PRÊMIOS'));
  content.push({
    table: { widths:[30,'*',90],
      body: [
        r3hdr(),
        r3('2.1','Prêmio Emitido Bruto: Base para comissões e remuneração mínima da seguradora.',H6),
        r3('2.2','Inadimplência / PDD (> 60 dias): Prêmios vencidos.',0),
        r3h('2.3','Prêmio Arrecadado Líquido: Montante disponível (2.1 – 2.2).',H6)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,6]
  });

  content.push(secTitle('3', 'GESTÃO DE SINISTROS'));
  content.push({
    table: { widths:[30,'*',90],
      body: [
        r3hdr(),
        r3('3.1','Sinistros Avisados no Mês (Informativo):',0),
        r3abs('3.2','Sinistros Pagos pelo Representante: Pagos por conta e ordem da Seguradora.',H7)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,6]
  });

  content.push(secTitle('4', 'APURAÇÃO DA REMUNERAÇÃO DA SEGURADORA'));
  content.push({ text:'O valor aplicado será o MAIOR entre os itens 4.1 e 4.2',
    fontSize:8, italics:true, color:CZR, margin:[0,0,0,3] });
  content.push({
    table: { widths:[30,'*',90],
      body: [
        r3hdr(),
        r3('4.1','Remuneração mínima sobre o prêmio (10,38% × Prêmio Emitido 2.1):',H22),
        r3('4.2','Remuneração por Sinistralidade: (IOF do mês + 20% × Sinistros Pagos 3.2):',H21),
        r3h('4.3','Remuneração Aplicada da Seguradora no mês:',H23)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,6]
  });

  content.push(secTitle('5', 'APURAÇÃO DA REMUNERAÇÃO DO REPRESENTANTE (MGA)'));
  content.push({
    table: { widths:[30,'*',90],
      body: [
        r3hdr(),
        r3('5.1','Comissão Fixa: (10% sobre o Prêmio Emitido 2.1):',H26),
        r3h('5.2','Lucro Operacional (L/O): [Prêmio Arrecadado (2.3)] – [Sinistros Pagos (3.2)] – [Remuneração Seguradora (4.3)]:',H29),
        r3h('5.3','Remuneração Total do Representante: (Comissão 5.1 + Lucro Operacional 5.2).', H26+H29)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,6]
  });

  content.push(secTitle('6', 'RESUMO DO FLUXO FINANCEIRO E REPASSE'));
  content.push({ text:'Demonstração do Saldo Técnico do Mês / Composição do Saldo',
    fontSize:8.5, bold:true, alignment:'center', margin:[0,0,0,3] });
  content.push({
    table: { widths:[30,'*',90],
      body: [
        r3hdr(),
        r3('6.1','Prêmio emitido (2.1) − inadimplência/PDD (>60 dias) (2.2) = Prêmio Arrecadado (2.3)',H6),
        [{ text:'', fontSize:8.5 },
         { text:'(–) Sinistros Pagos pelo Representante (3.2)', fontSize:8.5, color:CZR },
         { text:fmtAbs(H7), fontSize:8.5, alignment:'right' }],
        [{ text:'', fontSize:8.5 },
         { text:'(–) Remuneração da Seguradora (4.3)', fontSize:8.5, color:CZR },
         { text:fmt(H23), fontSize:8.5, alignment:'right' }],
        [{ text:'', fontSize:8.5 },
         { text:'(=) SALDO TÉCNICO LÍQUIDO NO PERÍODO', fontSize:8.5, bold:true },
         { text:'R$ 0,00', fontSize:8.5, alignment:'right', bold:true, color:VDR, fillColor:VDL }]
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,4]
  });
  content.push({ text:'6.2 Repasse Final para a SEGURADORA', fontSize:8.5, bold:true, margin:[0,4,0,2] });
  content.push({
    table: { widths:[30,'*',90],
      body: [
        r3hdr(),
        r3h('6.2','Remuneração da Seguradora (4.3) + Saldo Técnico (6.1, se positivo e for da seguradora):',H23)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,4]
  });
  content.push({ text:'6.3 Retenção pelo REPRESENTANTE', fontSize:8.5, bold:true, margin:[0,4,0,2] });
  content.push({
    table: { widths:[30,'*',90],
      body: [
        r3hdr(),
        r3h('6.3','O Representante retém o valor de sua remuneração (5.4) via compensação direta.', H26+H29)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,6]
  });

  content.push(secTitle('7', 'CAPITAL DE RISCO (CR)'));
  content.push({
    table: { widths:[30,'*',90],
      body: [
        r3hdr(),
        r3('7.1','Capital Aportado:',H33),
        r3('7.2','Necessidade de CR (1,12 × √[(0,17 × Prêmios Acum.)² + (0,44 × Sinistros Acum.)²]):',H34),
        r3('7.3','Saldo de CR (positivo):',0),
        r3('7.4','Necessidade de Aporte (se negativo):',H35),
        r3h('7.5','CR Atualizado:',H34)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,6]
  });

  content.push(secTitle('8', 'DECLARAÇÃO E CONFORMIDADE'));
  content.push({ text:'Declaramos que os valores informados neste borderô refletem, com exatidão, a movimentação de prêmios, sinistros, remunerações e repasses da carteira administrada no período acima indicado, em conformidade com o Contrato de Representação de Seguros (MGA) e com a regulamentação SUSEP aplicável.',
    fontSize:8.5, margin:[0,0,0,8] });
  content.push({ text:'Assinaturas:', fontSize:9, bold:true, margin:[0,0,0,4] });
  content.push({ canvas:[{ type:'line', x1:0, y1:0, x2:515, y2:0, lineWidth:0.5, lineColor:TB }] });
  content.push({ text:'', margin:[0,0,0,65] });
  content.push({
    table: { widths:['*','*'],
      body: [[
        { stack:[
            { canvas:[{ type:'line', x1:20, y1:0, x2:235, y2:0, lineWidth:0.8, lineColor:'#616161' }] },
            { text:'Pela REPRESENTANTE (MGA)', fontSize:8.5, bold:true, alignment:'center', margin:[0,5,0,2] },
            { text:'Data: ____/____/_____', fontSize:8.5, color:CZR, alignment:'center' }
          ]},
        { stack:[
            { canvas:[{ type:'line', x1:20, y1:0, x2:235, y2:0, lineWidth:0.8, lineColor:'#616161' }] },
            { text:'Pela SEGURADORA', fontSize:8.5, bold:true, alignment:'center', margin:[0,5,0,2] },
            { text:'Data: ____/____/_____', fontSize:8.5, color:CZR, alignment:'center' }
          ]}
      ]]
    }, layout:'noBorders'
  });

  // ── PÁGINA 3 — RELATÓRIO OPERACIONAL CONTÁBIL ─────────────────────────────────────────────────────────────────────────────────────────────────────
  content.push({ text:'', pageBreak:'before' });
  content.push({ text:'RELATÓRIO OPERACIONAL CONTÁBIL',
    fontSize:11, bold:true, margin:[0,0,0,3] });
  content.push({ canvas:[{ type:'line', x1:0, y1:0, x2:515, y2:0, lineWidth:1.5, lineColor:'#1565C0' }],
    margin:[0,0,0,6] });

  content.push(secHdr('SEÇÃO I — RESULTADO OPERACIONAL'));
  content.push({
    table: { widths:['*',90],
      body: [
        r2('(+) Prêmio Emitido Bruto', H6),
        r2neg('(-) Sinistros Pagos', H7),
        r2('Subtotal Operacional', H8),
        r2('(-) Cancelamentos', 0),
        r2('(±) Ajustes', 0),
        r2h('RESULTADO OPERACIONAL', H12),
        r2('(-) PDD – 60 dias', 0)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,0]
  });

  content.push(secHdr('SEÇÃO II — IOF E CRITÉRIOS TPA'));
  content.push({
    table: { widths:['*',90],
      body: [
        r2('IOF (7,38%)', H17),
        r2('20% × Sinistros Pagos', H20),
        r2('Base de Cálculo 1 (IOF + Sint.)', H21),
        r2('Base de Cálculo 2 (10,38% × prêmio)', H22),
        r2h('TPA Aplicada (BASE 2)', H23),
        r2e('Nota de Débito emitida pela OON — recebimento pelo banco')
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,0]
  });

  content.push(secHdr('SEÇÃO III — REMUNERAÇÃO MGA'));
  content.push({
    table: { widths:['*',90],
      body: [
        r2('Comissão MGA (10%)', H26),
        r2e('Nota Fiscal MGA — retido na MGA (sem pagamento via banco)'),
        r2h('Profit Sharing', H29),
        r2e('Nota Fiscal MGA — retido na MGA')
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,0]
  });

  content.push(secHdr('SEÇÃO IV — CAPITAL DE RISCO'));
  content.push({
    table: { widths:['*',90],
      body: [
        r2('Capital Inicial do Período', H33),
        r2('Necessidade de Cobertura', H34),
        r2h('Capital de Risco do Período', H35),
        r2e('Nota de Débito (OON recebe da MGA)')
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,0]
  });

  content.push(secHdr('SEÇÃO V — IMPACTOS NO FLUXO DE CAIXA OON'));
  content.push({
    table: { widths:['*',90],
      body: [
        r2neg('IOF (saída) — OON recolhe ao Fisco', H17),
        [{ text:'PIS/COFINS (4,65%) — sobre Resultado Operacional', fontSize:8.5 },
         { text:fmt(H39), fontSize:8.5, alignment:'right', color:VM }],
        r2h('Base IRPJ/CSLL (estimada)', H41),
        [{ text:'IRPJ + CSLL (30% estimado)', fontSize:8.5 },
         { text:fmt(-H42), fontSize:8.5, alignment:'right', color:VM }],
        r2h('Lucro Líquido Estimado pós-IR', H43)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,0]
  });

  var psOk = Math.abs(H29 - psVerif) < 0.01;
  content.push(secHdr('SEÇÃO VI — VERIFICAÇÃO DE CONSISTÊNCIA'));
  content.push({
    table: { widths:['*',90],
      body: [
        r2('Profit Sharing calculado', H29),
        r2('Verificação (CONFERE)', psVerif)
      ]
    }, layout: TB_LAYOUT, margin:[0,0,0,8]
  });
  content.push({
    text: psOk ? '✓   Cálculo consistente' : '⚠   Divergência detectada — revisar fechamento',
    fontSize:10, bold:true, alignment:'center',
    color: psOk ? VDR : VM
  });

  var fileName = 'Bordero_' + competencia.replace('/', '_') + '_' +
    filialNome.replace(/[^a-zA-Z0-9]/g, '_') + '.pdf';

  var docDefinition = {
    pageSize: 'A4',
    pageMargins: [28, 80, 28, 40],
    header: buildHeader,
    footer: buildFooter,
    content: content,
    defaultStyle: { font: 'Roboto', fontSize: 9 }
  };

  window.pdfMake.createPdf(docDefinition).download(fileName);
}
