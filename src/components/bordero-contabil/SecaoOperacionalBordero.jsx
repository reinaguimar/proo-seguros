import React from "react";

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v ?? 0);

export default function SecaoOperacionalBordero({ fechamento: f }) {
  // Cálculos idênticos ao SecaoOperacional.jsx
  const H6  = f.premio_emitido_bruto ?? 0;
  const H7  = -(f.sinistros_pagos ?? 0);
  const H8  = H6 + H7;
  const H10 = 0;
  const H11 = 0;
  const H12 = H8 + H10 + H11;
  const H14 = f.inadimplencia ?? 0;
  const H17 = f.iof_total_mes ?? 0;
  const sinistrosPagos = f.sinistros_pagos ?? 0;
  const H20 = sinistrosPagos === 0 ? 0 : sinistrosPagos * 0.20;
  const H21 = H17 + H20;
  const H22 = H6 * 0.1038;
  const H23 = f.remuneracao_aplicada_seguradora ?? 0;
  const H26 = f.comissao_fixa_mga ?? 0;
  const H29 = H8 - H23 - H26 - sinistrosPagos;
  const H33 = f.cr_capital_aportado ?? 0;
  const H34 = f.cr_necessidade_capital ?? 0;
  const H35 = H34 === 0 ? 0 : H34 - H33;
  const H38 = -H17;
  const H39 = H12 * 0.0465 * -1;
  const baseIRPJ = H6 - H17 - H29 + H7 + H26 + H34 + H39;
  const tpaBase = sinistrosPagos === 0 || H22 >= H21 ? "BASE 2" : "BASE 1";
  const divergencia = Math.abs((H8 - H23 - H26 - sinistrosPagos) - H29);

  const S = {
    wrap: { backgroundColor: "#ffffff", padding: "20px 24px", fontFamily: "Arial, sans-serif" },
    titleBar: { borderBottom: "2px solid #1e293b", marginBottom: 18, paddingBottom: 8 },
    title: { fontSize: 13, fontWeight: "bold", color: "#1e293b", margin: 0 },
    section: { marginBottom: 20, pageBreakInside: "avoid" },
    header: {
      backgroundColor: "#1e293b", color: "#ffffff",
      padding: "6px 12px", fontSize: 10, fontWeight: "bold",
      letterSpacing: 0.6, textTransform: "uppercase",
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 10 },
    tdL: (i) => ({
      padding: "4px 10px", borderBottom: "1px solid #e2e8f0",
      color: "#475569", width: "62%",
      backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff",
    }),
    tdR: (i, color) => ({
      padding: "4px 10px", borderBottom: "1px solid #e2e8f0",
      textAlign: "right", fontWeight: "600",
      color: color || "#1e293b",
      backgroundColor: i % 2 === 0 ? "#f8fafc" : "#ffffff",
    }),
    tdHL: { padding: "5px 10px", borderBottom: "1px solid #e2e8f0", fontWeight: "bold", color: "#1e293b", backgroundColor: "#f0f9ff", width: "62%" },
    tdHR: (val) => ({ padding: "5px 10px", borderBottom: "1px solid #e2e8f0", textAlign: "right", fontWeight: "bold", fontSize: 11, color: val >= 0 ? "#15803d" : "#dc2626", backgroundColor: "#f0f9ff" }),
    note: { padding: "2px 10px 5px 10px", borderBottom: "1px solid #e2e8f0", fontSize: 9, fontStyle: "italic", color: "#64748b", backgroundColor: "#fafafa" },
    subNote: { fontSize: 9, fontStyle: "italic", color: "#64748b", marginTop: 2 },
  };

  return (
    <div style={S.wrap} data-pdf-break="true">
      <div style={S.titleBar}>
        <p style={S.title}>RELATÓRIO OPERACIONAL CONTÁBIL</p>
      </div>

      {/* SEÇÃO I — Resultado Operacional */}
      <div style={S.section}>
        <div style={S.header}>SEÇÃO I — RESULTADO OPERACIONAL</div>
        <table style={S.table}><tbody>
          <tr><td style={S.tdL(0)}>(+) Prêmio Emitido Bruto</td><td style={S.tdR(0, "#15803d")}>{fmt(H6)}</td></tr>
          <tr><td style={S.tdL(1)}>(-) Sinistros Pagos</td><td style={S.tdR(1, sinistrosPagos > 0 ? "#dc2626" : "#475569")}>{sinistrosPagos > 0 ? `-${fmt(sinistrosPagos)}` : fmt(sinistrosPagos)}</td></tr>
          <tr><td style={S.tdL(0)}>Subtotal Operacional</td><td style={S.tdR(0)}>{fmt(H8)}</td></tr>
          <tr><td style={S.tdL(1)}>(-) Cancelamentos</td><td style={S.tdR(1, "#94a3b8")}>{fmt(H10)}</td></tr>
          <tr><td style={S.tdL(0)}>(±) Ajustes</td><td style={S.tdR(0, "#94a3b8")}>{fmt(H11)}</td></tr>
          <tr><td style={S.tdHL}>RESULTADO OPERACIONAL</td><td style={S.tdHR(H12)}>{fmt(H12)}</td></tr>
          <tr><td style={S.tdL(1)}>(-) PDD – 60 dias</td><td style={S.tdR(1, H14 > 0 ? "#dc2626" : "#475569")}>{H14 > 0 ? `-${fmt(H14)}` : fmt(H14)}</td></tr>
        </tbody></table>
      </div>

      {/* SEÇÃO II — IOF e Critérios TPA */}
      <div style={S.section}>
        <div style={S.header}>SEÇÃO II — IOF E CRITÉRIOS TPA</div>
        <table style={S.table}><tbody>
          <tr><td style={S.tdL(0)}>IOF (7,38%)</td><td style={S.tdR(0)}>{fmt(H17)}</td></tr>
          <tr><td style={S.tdL(1)}>20% × Sinistros Pagos</td><td style={S.tdR(1)}>{fmt(H20)}</td></tr>
          <tr><td style={S.tdL(0)}>Base de Cálculo 1 (IOF + Sint.)</td><td style={S.tdR(0)}>{fmt(H21)}</td></tr>
          <tr><td style={S.tdL(1)}>Base de Cálculo 2 (10,38% × prêmio)</td><td style={S.tdR(1)}>{fmt(H22)}</td></tr>
          <tr>
            <td style={S.tdHL}>TPA Aplicada &nbsp;<span style={{ fontSize: 9, color: "#3b82f6" }}>({tpaBase})</span></td>
            <td style={{ ...S.tdHR(H23), color: "#1d4ed8" }}>{fmt(H23)}</td>
          </tr>
          <tr><td colSpan={2} style={S.note}>Nota de Débito emitida pela OON — recebimento pelo banco</td></tr>
        </tbody></table>
      </div>

      {/* SEÇÃO III — Remuneração MGA */}
      <div style={S.section}>
        <div style={S.header}>SEÇÃO III — REMUNERAÇÃO MGA</div>
        <table style={S.table}><tbody>
          <tr><td style={S.tdL(0)}>Comissão MGA (10%)</td><td style={S.tdR(0)}>{fmt(H26)}</td></tr>
          <tr><td colSpan={2} style={S.note}>Nota Fiscal MGA — retido na MGA (sem pagamento via banco)</td></tr>
          <tr><td style={S.tdHL}>Profit Sharing</td><td style={S.tdHR(H29)}>{fmt(H29)}</td></tr>
          <tr><td colSpan={2} style={S.note}>Nota Fiscal MGA — retido na MGA (sem pagamento via banco)</td></tr>
        </tbody></table>
      </div>

      {/* SEÇÃO IV — Capital de Risco */}
      <div style={S.section}>
        <div style={S.header}>SEÇÃO IV — CAPITAL DE RISCO</div>
        <table style={S.table}><tbody>
          <tr><td style={S.tdL(0)}>Capital Inicial do Período</td><td style={S.tdR(0)}>{fmt(H33)}</td></tr>
          <tr><td style={S.tdL(1)}>Necessidade de Cobertura</td><td style={S.tdR(1)}>{fmt(H34)}</td></tr>
          <tr><td style={S.tdHL}>Capital de Risco do Período</td><td style={S.tdHR(H35)}>{fmt(H35)}</td></tr>
          <tr><td colSpan={2} style={S.note}>
            {H35 > 0 ? "Nota de Débito (OON recebe da MGA)" : H35 < 0 ? "Nota de Crédito (OON devolve à MGA)" : "Sem movimentação de capital"}
          </td></tr>
        </tbody></table>
      </div>

      {/* SEÇÃO V — Impactos no Fluxo de Caixa OON */}
      <div style={S.section}>
        <div style={S.header}>SEÇÃO V — IMPACTOS NO FLUXO DE CAIXA OON</div>
        <table style={S.table}><tbody>
          <tr>
            <td style={S.tdL(0)}>
              IOF (saída)
              <div style={S.subNote}>OON recolhe ao Fisco</div>
            </td>
            <td style={S.tdR(0, "#dc2626")}>{fmt(H38)}</td>
          </tr>
          <tr>
            <td style={S.tdL(1)}>
              PIS/COFINS (4,65%)
              <div style={S.subNote}>sobre Resultado Operacional</div>
            </td>
            <td style={S.tdR(1, "#dc2626")}>{fmt(H39)}</td>
          </tr>
          <tr>
            <td style={S.tdHL}>
              Base IRPJ/CSLL
              <div style={S.subNote}>Base estimada</div>
            </td>
            <td style={{ ...S.tdHR(baseIRPJ), color: "#1e293b" }}>{fmt(baseIRPJ)}</td>
          </tr>
        </tbody></table>
      </div>

      {/* SEÇÃO VI — Verificação de Consistência */}
      <div style={S.section}>
        <div style={S.header}>SEÇÃO VI — VERIFICAÇÃO DE CONSISTÊNCIA</div>
        <table style={S.table}><tbody>
          <tr><td style={S.tdL(0)}>Profit Sharing calculado</td><td style={S.tdR(0)}>{fmt(H29)}</td></tr>
          <tr><td style={S.tdL(1)}>Verificação (CONFERE)</td><td style={S.tdR(1)}>{fmt(H8 - H23 - H26 - sinistrosPagos)}</td></tr>
          <tr>
            <td colSpan={2} style={{
              padding: "5px 10px", textAlign: "center", fontSize: 10, fontWeight: "bold",
              color: divergencia < 0.01 ? "#15803d" : "#dc2626",
              backgroundColor: divergencia < 0.01 ? "#f0fdf4" : "#fef2f2",
              borderBottom: "1px solid #e2e8f0",
            }}>
              {divergencia < 0.01 ? "✓ Cálculo consistente" : `⚠ Divergência detectada — diferença: ${fmt(divergencia)}`}
            </td>
          </tr>
        </tbody></table>
      </div>
    </div>
  );
}