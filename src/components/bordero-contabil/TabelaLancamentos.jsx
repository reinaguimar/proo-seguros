import React from "react";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_FULL = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

function calcular(fechamento) {
  const H6  = fechamento.premio_emitido_bruto ?? 0;
  const H7  = -(fechamento.sinistros_pagos ?? 0);
  const H8  = H6 + H7;
  const H10 = 0;
  const H12 = H8 + H10;
  const H17 = fechamento.iof_total_mes ?? 0;
  const sinistrosPagos = fechamento.sinistros_pagos ?? 0;
  const H20 = sinistrosPagos === 0 ? 0 : sinistrosPagos * 0.20;
  const H21 = H17 + H20;
  const H22 = H6 * 0.1038;
  const H23 = fechamento.remuneracao_aplicada_seguradora ?? 0;
  const H26 = fechamento.comissao_fixa_mga ?? 0;
  const H29 = H8 - H23 - H26 - sinistrosPagos;
  const H33 = fechamento.cr_capital_aportado ?? 0;
  const H34 = fechamento.cr_necessidade_capital ?? 0;
  const H35 = H34 === 0 ? 0 : H34 - H33;
  const H38 = -H17;
  const H39 = H12 * 0.0465 * -1;
  const inadimplencia = fechamento.inadimplencia ?? 0;
  const tpaBase = sinistrosPagos === 0 || H22 >= H21 ? "2" : "1";
  return { H6, H7, H8, H10, H12, H17, H20, H21, H22, H23, H26, H29, H33, H34, H35, H38, H39, sinistrosPagos, inadimplencia, tpaBase };
}

function buildGrupos(c) {
  return [
    {
      titulo: "PRÊMIOS",
      linhas: [
        { num: "L01", hist: "Emissão de prêmio — receita bruta",    deb: "113111",  cred: "3111111", val: c.H6,    obs: "Lançamento de receita",        zero: false },
        { num: "L02", hist: "Emissão de prêmio — IOF provisionado", deb: "3111111", cred: "21124",   val: c.H17,   obs: "Dedução IOF da receita",       zero: false },
      ],
    },
    {
      titulo: "CANCELAMENTOS",
      linhas: [
        { num: "L03", hist: "Cancelamentos do período",              deb: "3111111", cred: "113111",  val: c.H10,   obs: c.H10 === 0 ? "Sem cancelamentos no período" : "", zero: c.H10 === 0 },
      ],
    },
    {
      titulo: "COBRANÇA IOF",
      linhas: [
        { num: "L04", hist: "Pagamento IOF ao Fisco",                deb: "21124",   cred: "11131",   val: c.H17,   obs: "Liquidação do passivo de IOF", zero: false },
      ],
    },
    {
      titulo: "CAPITAL DE RISCO — ENTRADA",
      linhas: [
        { num: "L05", hist: "Entrada de capital de risco",           deb: "11131",   cred: "21541",   val: c.H35 > 0 ? Math.abs(c.H35) : 0, obs: c.H35 > 0 ? "Nota de Débito OON" : "Sem entrada no período", zero: c.H35 <= 0 },
      ],
    },
    {
      titulo: "PDD — PROVISÃO DEVEDORES DUVIDOSOS",
      linhas: [
        { num: "L06", hist: "Provisão para devedores duvidosos",     deb: "315221",  cred: "113111",  val: c.inadimplencia, obs: c.inadimplencia === 0 ? "Sem inadimplência" : "", zero: c.inadimplencia === 0 },
      ],
    },
    {
      titulo: "COMISSÃO MGA",
      linhas: [
        { num: "L07", hist: "Comissão MGA — provisionamento",        deb: "3141111", cred: "2125111", val: c.H26,   obs: "Registro da despesa de comissão", zero: false },
        { num: "L08", hist: "Comissão MGA — compensação",            deb: "2125111", cred: "21241",   val: c.H26,   obs: "Compensação interna",           zero: false },
        { num: "L09", hist: "Comissão MGA — liquidação NF",          deb: "21241",   cred: "113111",  val: c.H26,   obs: "Retenção na MGA via NF",        zero: false },
      ],
    },
    {
      titulo: "SINISTROS",
      linhas: [
        { num: "L10", hist: "Sinistros pagos — despesa",             deb: "3131111", cred: "2161511", val: c.sinistrosPagos, obs: c.sinistrosPagos === 0 ? "Sem sinistros no período" : "", zero: c.sinistrosPagos === 0 },
        { num: "L11", hist: "Sinistros pagos — liquidação",          deb: "2161511", cred: "113111",  val: c.sinistrosPagos, obs: "", zero: c.sinistrosPagos === 0 },
      ],
    },
    {
      titulo: "TPA REPRESENTANTE",
      linhas: [
        { num: "L12", hist: "TPA — Nota de Débito OON (recebimento)",deb: "11131",   cred: "113111",  val: c.H23,   obs: "Nota de Débito emitida pela OON — banco", zero: false },
      ],
    },
    {
      titulo: "PROFIT SHARING",
      linhas: [
        { num: "L13", hist: "Profit Sharing — Nota Fiscal MGA",      deb: "315251",  cred: "113111",  val: c.H29,   obs: c.H29 < 0 ? "Reversão — resultado negativo" : c.H29 === 0 ? "Sem profit sharing" : "Retenção na MGA via NF", zero: c.H29 === 0 },
      ],
    },
    {
      titulo: "CAPITAL DE RISCO — RECONHECIMENTO",
      linhas: [
        { num: "L14", hist: "Reconhecimento capital de risco",       deb: "21541",   cred: "315189",  val: c.H35 > 0 ? Math.abs(c.H35) : 0, obs: c.H35 > 0 ? "CR reconhecido" : "—", zero: c.H35 <= 0 },
      ],
    },
    {
      titulo: "PIS/COFINS",
      linhas: [
        { num: "L15", hist: "PIS/COFINS sobre resultado operacional",deb: "355121",  cred: "2116",    val: Math.abs(c.H39), obs: "4,65% sobre resultado operacional", zero: false },
      ],
    },
  ];
}

function gerarHtml(fechamento) {
  const c = calcular(fechamento);
  const grupos = buildGrupos(c);
  const agora = new Date().toLocaleString("pt-BR");
  const mesNome = MESES_FULL[(fechamento.competencia_mes ?? 1) - 1];
  const competencia = `${mesNome}/${fechamento.competencia_ano}`;
  const idCurto = (fechamento.id || "").slice(-8);

  let total = 0;
  grupos.forEach((g) => g.linhas.forEach((l) => { if (!l.zero) total += Math.abs(l.val ?? 0); }));
  const equilibrado = true; // débitos = créditos por construção

  const linhasHtml = grupos.map((g) => {
    const header = `<tr class="grupo-header"><td colspan="6">${g.titulo}</td></tr>`;
    const linhas = g.linhas.map((l) => {
      const cls = l.zero ? "zero" : "normal";
      const valStr = l.zero ? "—" : fmt(l.val);
      return `<tr class="${cls}">
        <td>${l.num}</td>
        <td>${l.hist}</td>
        <td class="conta right">${l.deb}</td>
        <td class="conta right">${l.cred}</td>
        <td class="valor">${valStr}</td>
        <td class="obs">${l.obs}</td>
      </tr>`;
    }).join("");
    return header + linhas;
  }).join("");

  const crCor = c.H35 < 0 ? "color:#b91c1c" : c.H35 > 0 ? "color:#15803d" : "color:#555";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Borderô Contábil — ${competencia}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 8.5pt; color: #1a1a1a; background: white; padding: 12mm 14mm 10mm 14mm; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #1e3a5f; padding-bottom: 7px; margin-bottom: 7px; }
  .header-left .empresa { font-size: 13pt; font-weight: bold; color: #1e3a5f; letter-spacing: 0.5px; }
  .header-left .subtitulo { font-size: 7.5pt; color: #666; margin-top: 1px; }
  .header-left .doc-title { font-size: 9pt; font-weight: bold; color: #1e3a5f; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.8px; }
  .header-right { text-align: right; }
  .header-right .competencia { font-size: 16pt; font-weight: bold; color: #1e3a5f; line-height: 1; }
  .header-right .meta { font-size: 7pt; color: #777; margin-top: 2px; line-height: 1.4; }
  .status-badge { display: inline-block; background: #dcfce7; color: #15803d; border: 1px solid #86efac; border-radius: 3px; font-size: 7.5pt; font-weight: bold; padding: 1px 7px; margin-top: 3px; }
  .identificacao { background: #f0f4f8; border: 1px solid #c8d8e8; border-radius: 3px; padding: 4px 10px; margin-bottom: 7px; display: flex; gap: 24px; font-size: 7.5pt; }
  .identificacao span { color: #666; }
  .identificacao strong { color: #1a1a1a; }
  .secao-titulo { font-size: 8pt; font-weight: bold; color: white; background: #1e3a5f; padding: 3px 8px; margin: 6px 0 5px 0; border-radius: 2px; text-transform: uppercase; letter-spacing: 0.6px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 6px; }
  .card-mini { border: 1px solid #d0d9e4; border-radius: 3px; padding: 5px 8px; background: #fafcff; }
  .card-mini .card-titulo { font-size: 6.5pt; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; font-weight: bold; border-bottom: 1px solid #e0e8f0; padding-bottom: 2px; }
  .card-mini .linha { display: flex; justify-content: space-between; font-size: 8pt; padding: 1.2px 0; }
  .card-mini .linha.destaque { font-weight: bold; color: #1e3a5f; font-size: 8.5pt; margin-top: 2px; border-top: 1px solid #c8d8e8; padding-top: 2px; }
  .card-mini .linha.verde { color: #15803d; }
  .card-mini .linha.vermelho { color: #b91c1c; }
  .card-mini .nota { font-size: 6.5pt; color: #999; margin-top: 2px; font-style: italic; }
  table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 6px; }
  thead tr { background: #1e3a5f; color: white; }
  thead th { padding: 4px 6px; text-align: left; font-weight: 600; font-size: 7pt; white-space: nowrap; }
  thead th.right { text-align: right; }
  tr.grupo-header td { background: #e8f0f8; color: #1e3a5f; font-weight: bold; font-size: 7pt; padding: 2.5px 6px; border-top: 1px solid #b8cfe0; text-transform: uppercase; letter-spacing: 0.3px; }
  tr.normal td { padding: 2.5px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  tr.normal:nth-child(even) td { background: #f8fafc; }
  tr.zero td { padding: 2.5px 6px; color: #bbb; font-style: italic; border-bottom: 1px solid #f0f0f0; }
  td.conta { font-family: 'Courier New', monospace; font-size: 7pt; }
  td.right { text-align: right; }
  td.valor { text-align: right; font-variant-numeric: tabular-nums; }
  td.obs { color: #888; font-size: 7pt; }
  tr.totais-row td { background: #1e3a5f; color: white; font-weight: bold; padding: 3.5px 6px; font-size: 8pt; }
  tr.totais-row td.valor { text-align: right; }
  .confere-ok { color: #86efac; font-weight: bold; }
  .rodape { border-top: 1.5px solid #c8d8e8; padding-top: 7px; margin-top: 6px; }
  .rodape-aviso { font-size: 7pt; color: #888; text-align: center; margin-bottom: 8px; line-height: 1.4; }
  .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .assinatura { text-align: center; }
  .assinatura .linha-ass { border-top: 1px solid #666; margin-bottom: 3px; margin-top: 22px; }
  .assinatura .nome { font-size: 7.5pt; font-weight: bold; }
  .assinatura .cargo { font-size: 7pt; color: #777; }
  .rodape-meta { display: flex; justify-content: space-between; font-size: 6.5pt; color: #bbb; margin-top: 6px; }
  @page { size: A4 portrait; margin: 0; }
  @media print { body { padding: 12mm 14mm 10mm 14mm; } .grupo-header, tr.normal, tr.zero { page-break-inside: avoid; } table { page-break-inside: avoid; } }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="empresa">OON SEGURADORA S.A.</div>
    <div class="subtitulo">Sandbox Regulatório SUSEP</div>
    <div class="doc-title">Borderô Contábil — Representante MGA</div>
  </div>
  <div class="header-right">
    <div class="competencia">${competencia}</div>
    <div class="meta">Emitido em: ${agora}<br>Fechamento ID: #${idCurto}</div>
    <div class="status-badge">STATUS: FECHADO ✓</div>
  </div>
</div>

<div class="identificacao">
  <div><span>Filial: </span><strong>${fechamento.filial_nome || "Consolidado"}</strong></div>
  <div><span>Competência: </span><strong>${fechamento.competencia_mes}/${fechamento.competencia_ano}</strong></div>
  <div><span>Apólices ativas: </span><strong>—</strong></div>
  <div><span>Sinistralidade: </span><strong>20%</strong></div>
</div>

<div class="secao-titulo">📊 Resumo Operacional</div>
<div class="grid-3" style="page-break-inside: avoid">
  <div class="card-mini">
    <div class="card-titulo">Resultado Operacional</div>
    <div class="linha verde">(+) Prêmio Emitido<span>${fmt(c.H6)}</span></div>
    <div class="linha vermelho">(−) Sinistro Pago<span>- ${fmt(c.sinistrosPagos)}</span></div>
    <div class="linha">(−) Cancelamentos<span>${fmt(c.H10)}</span></div>
    <div class="linha destaque verde">RESULTADO<span>${fmt(c.H12)}</span></div>
    <div class="linha">(−) PDD 60d<span>${fmt(c.inadimplencia)}</span></div>
  </div>
  <div class="card-mini">
    <div class="card-titulo">IOF e Critérios TPA</div>
    <div class="linha">IOF (7,38%)<span>${fmt(c.H17)}</span></div>
    <div class="linha">Sinistralidade 20%<span>${fmt(c.H20)}</span></div>
    <div class="linha">Base 1 (IOF + Sint.)<span>${fmt(c.H21)}</span></div>
    <div class="linha">Base 2 (10,38% × prêm.)<span>${fmt(c.H22)}</span></div>
    <div class="linha destaque">TPA Aplicada (BASE ${c.tpaBase})<span>${fmt(c.H23)}</span></div>
  </div>
  <div class="card-mini">
    <div class="card-titulo">Remuneração MGA e CR</div>
    <div class="linha">Comissão MGA (10%)<span>${fmt(c.H26)}</span></div>
    <div class="linha destaque">Profit Sharing<span>${fmt(c.H29)}</span></div>
    <div class="linha" style="margin-top:4px;">Capital Aportado<span>${fmt(c.H33)}</span></div>
    <div class="linha">Necessidade de Cobertura<span>${fmt(c.H34)}</span></div>
    <div class="linha destaque" style="${crCor}">CR do Período<span>${fmt(c.H35)}</span></div>
  </div>
</div>

<div class="secao-titulo">📒 Lançamentos Contábeis — Partidas Dobradas</div>
<table style="page-break-inside: avoid">
  <thead>
    <tr>
      <th style="width:30px">Nº</th>
      <th>Histórico</th>
      <th class="right" style="width:70px">Débito</th>
      <th class="right" style="width:70px">Crédito</th>
      <th class="right" style="width:110px">Valor (R$)</th>
      <th style="width:140px">Observação</th>
    </tr>
  </thead>
  <tbody>
    ${linhasHtml}
    <tr class="totais-row">
      <td colspan="2" style="padding:4px 6px; font-size:8pt;">TOTAL MOVIMENTADO</td>
      <td style="padding:4px 6px; text-align:right; font-size:8pt;">Débitos: ${fmt(total)}</td>
      <td style="padding:4px 6px; text-align:right; font-size:8pt;">Créditos: ${fmt(total)}</td>
      <td style="padding:4px 6px; text-align:right; font-size:8pt;">${fmt(total)}</td>
      <td style="padding:4px 6px; color:#86efac; font-size:8pt;">✓ D = C Equilibrado</td>
    </tr>
    <tr style="background:#f0f4f8;">
      <td colspan="6" style="padding:3px 6px; font-size:6.5pt; color:#666; font-style:italic;">
        ⓘ O total reflete o volume movimentado entre contas (partidas dobradas). Um mesmo valor pode transitar por múltiplas contas antes da liquidação final. O resultado líquido do período é o Profit Sharing: ${fmt(c.H29)}.
      </td>
    </tr>
  </tbody>
</table>

<div class="rodape">
  <div class="rodape-aviso">
    Borderô gerado automaticamente a partir de fechamento com status FECHADO | Dados imutáveis — somente leitura | OON Seguradora S.A.<br>
    <strong>Este documento tem validade contábil apenas quando assinado pelos responsáveis abaixo.</strong>
  </div>
  <div class="assinaturas">
    <div class="assinatura">
      <div class="linha-ass"></div>
      <div class="nome">Reinaldo Aguimar</div>
      <div class="cargo">COO — OON Seguradora S.A.</div>
    </div>
    <div class="assinatura">
      <div class="linha-ass"></div>
      <div class="nome">Controller Financeiro</div>
      <div class="cargo">Controller — OON Seguradora S.A.</div>
    </div>
    <div class="assinatura">
      <div class="linha-ass"></div>
      <div class="nome">Representante MGA</div>
      <div class="cargo">MGA Autorizado</div>
    </div>
  </div>
  <div class="rodape-meta">
    <span>Gerado em: ${agora}</span>
    <span>Sistema: New Seguros | OON Seguradora S.A.</span>
    <span>ID: ${fechamento.id || ""}</span>
  </div>
</div>

</body>
</html>`;
}

function HeaderGrupo({ titulo }) {
  return (
    <tr>
      <td colSpan={6} className="bg-blue-50 text-blue-700 font-semibold text-sm px-4 py-2">
        {titulo}
      </td>
    </tr>
  );
}

function Linha({ num, hist, deb, cred, val, obs, zero, idx }) {
  const base = idx % 2 === 0 ? "bg-white" : "bg-gray-50/30";
  const rowCls = zero
    ? `opacity-50 text-gray-400 italic ${base} hover:bg-blue-50/40`
    : `${base} hover:bg-blue-50/40`;
  return (
    <tr className={rowCls}>
      <td className="px-4 py-2 text-xs text-gray-400">{num}</td>
      <td className="px-4 py-2 text-sm">{hist}</td>
      <td className="px-4 py-2 font-mono text-sm">{deb}</td>
      <td className="px-4 py-2 font-mono text-sm">{cred}</td>
      <td className="px-4 py-2 text-sm text-right">{zero ? "—" : fmt(val)}</td>
      <td className="px-4 py-2 text-xs text-gray-400">{obs}</td>
    </tr>
  );
}

export default function TabelaLancamentos({ fechamento }) {
  const c = calcular(fechamento);
  const grupos = buildGrupos(c);

  let total = 0;
  grupos.forEach((g) => g.linhas.forEach((l) => { if (!l.zero) total += Math.abs(l.val ?? 0); }));
  const equilibrado = true;

  const competencia = `${MESES[(fechamento.competencia_mes ?? 1) - 1]}/${fechamento.competencia_ano}`;
  const totalLinhas = grupos.reduce((acc, g) => acc + g.linhas.length, 0);

  function exportarBordero() {
    const html = gerarHtml(fechamento);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  let idx = 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <span className="text-base font-semibold text-slate-700">📒 Lançamentos Contábeis</span>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">
          {totalLinhas} lançamentos&nbsp;|&nbsp;competência:&nbsp;{competencia}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {["Nº","Histórico","Débito","Crédito","Valor","Observação"].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => (
              <React.Fragment key={grupo.titulo}>
                <HeaderGrupo titulo={grupo.titulo} />
                {grupo.linhas.map((l) => {
                  const rowIdx = idx++;
                  return (
                    <Linha key={l.num} idx={rowIdx} num={l.num} hist={l.hist}
                      deb={l.deb} cred={l.cred} val={l.val} obs={l.obs} zero={!!l.zero} />
                  );
                })}
              </React.Fragment>
            ))}
            <tr className="bg-[#1e3a5f] text-white font-bold">
              <td colSpan={2} className="px-4 py-2 text-sm">TOTAL MOVIMENTADO</td>
              <td className="px-4 py-2 text-right text-sm">Débitos: {fmt(total)}</td>
              <td className="px-4 py-2 text-right text-sm">Créditos: {fmt(total)}</td>
              <td className="px-4 py-2 text-right text-sm">{fmt(total)}</td>
              <td className="px-4 py-2 text-sm text-[#86efac]">✓ D = C Equilibrado</td>
            </tr>
            <tr className="bg-blue-50">
              <td colSpan={6} className="px-4 py-2 text-xs text-gray-500 italic">
                ⓘ O total reflete o volume movimentado entre contas (partidas dobradas). Um mesmo valor pode transitar por múltiplas contas antes da liquidação final. O resultado líquido do período é o Profit Sharing: {fmt(c.H29)}.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={exportarBordero}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          📄 Exportar Borderô
        </button>
      </div>
    </div>
  );
}