import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const MESES = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const fmt = (v) => (v == null ? 0 : v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PrintCSS = `
@media print {
  @page { size: A4; margin: 1.5cm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-size: 10pt; }
  .no-print { display: none !important; }
}
`;

const th = { padding: '8px 10px', textAlign: 'center', fontWeight: '600', fontSize: '11px', borderRight: '1px solid #d1d5db' };
const td = { padding: '8px 10px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontSize: '11px', verticalAlign: 'middle' };

function Section({ title, children }) {
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontWeight: '700', fontSize: '12px', marginBottom: '8px', borderLeft: '3px solid #1d4ed8', paddingLeft: '8px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
      <span style={{ fontWeight: '700', minWidth: '200px' }}>{label}</span>
      <span style={{ fontWeight: bold ? '600' : 'normal' }}>{value}</span>
    </div>
  );
}

function TableRows({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db', overflow: 'hidden' }}>
      <thead>
        <tr style={{ backgroundColor: '#e5e7eb' }}>
          <th style={{ ...th, width: '60px' }}>Item</th>
          <th style={th}>Descrição</th>
          <th style={{ ...th, width: '150px', textAlign: 'right', borderRight: 'none' }}>Valor (R$)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ backgroundColor: row.highlight ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#fafafa') }}>
            <td style={{ ...td, textAlign: 'center', fontWeight: '700' }}>{row.item}</td>
            <td style={{ ...td, fontWeight: row.highlight ? '600' : 'normal' }}>{row.desc}</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: row.highlight ? '700' : 'normal', borderRight: 'none', color: row.negative ? '#dc2626' : (row.highlight ? '#15803d' : '#1a1a1a') }}>{row.val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function BorderoFilial() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const filialCodigo = params.get('filial_codigo');
        const fechamentoId = params.get('fechamento_id');

        if (!filialCodigo || !fechamentoId) {
          setError("Parâmetros insuficientes na URL.");
          return;
        }

        const [fechamento, filiais] = await Promise.all([
          base44.entities.FechamentoMensal.get(fechamentoId),
          base44.entities.Filial.filter({ codigo_filial: filialCodigo }),
        ]);

        const filial = filiais[0] || null;
        const mes = fechamento.competencia_mes;
        const ano = fechamento.competencia_ano;

        // Buscar apólices da filial no mês/ano do fechamento
        const todasApolices = await base44.entities.Apolice.filter({
          filial_id: filial?.id,
          natureza_movimento: { $ne: "Cancelamento" }
        });

        // Filtrar por data_inicio_apolice dentro do mês/ano do fechamento
        const inicio = new Date(ano, mes - 1, 1);
        const fim = new Date(ano, mes, 0); // último dia do mês
        const apolices = todasApolices.filter(a => {
          if (!a.data_inicio_apolice) return false;
          const d = new Date(a.data_inicio_apolice);
          return d >= inicio && d <= fim;
        });

        // ── Cálculos do mês atual ─────────────────────────────────────
        const premioBruto = apolices.reduce((s, a) => s + (a.premio_bruto_total || 0), 0);
        const iofTotal = apolices.reduce((s, a) => s + (a.iof || 0), 0);

        // ── Base acumulada para CR (CNSP 381/2020, Art. 29) ──────────────
        // Buscar os 2 fechamentos imediatamente anteriores ao atual (mesma filial implícita)
        const todosFechamentos = await base44.entities.FechamentoMensal.list('-competencia_ano', 50);
        const fechamentosAnteriores = todosFechamentos
          .filter(f =>
            f.id !== fechamentoId && (
              f.competencia_ano < ano ||
              (f.competencia_ano === ano && f.competencia_mes < mes)
            )
          )
          .sort((a, b) =>
            b.competencia_ano !== a.competencia_ano
              ? b.competencia_ano - a.competencia_ano
              : b.competencia_mes - a.competencia_mes
          )
          .slice(0, 1); // 1 mês anterior + mês atual = janela de 2 meses

        // Helper: extrair valor de um fechamento histórico para esta filial
        const FILIAL_UNICA_CODIGO = "10"; // fallback: New Soluções era único operador antes do breakdown
        const extrairValorFilial = (f, campo) => {
          const breakdown = f.detalhes_calculo?.breakdown_por_filial;
          if (!breakdown) {
            // Sem breakdown: tudo pertencia à filial "10"
            return filialCodigo === FILIAL_UNICA_CODIGO ? (f[campo] || 0) : 0;
          }
          const entrada = Object.values(breakdown).find(e =>
            e.filial_id === filial?.id || e.filial_nome === filial?.nome || e.filial_codigo === filialCodigo
          );
          if (!entrada) return 0;
          // Aceitar nomes alternativos dos campos no breakdown
          if (campo === 'premio_emitido_bruto') return entrada.premio_bruto || entrada.premioBruto || 0;
          if (campo === 'sinistros_pagos')       return entrada.sinistros_pagos || entrada.sinistrosPagos || 0;
          return 0;
        };

        const premiosHistoricos   = fechamentosAnteriores.map(f => extrairValorFilial(f, 'premio_emitido_bruto'));
        const sinistrosHistoricos = fechamentosAnteriores.map(f => extrairValorFilial(f, 'sinistros_pagos'));

        // Sinistros do mês atual (busca nos GastoSinistro pagos desta filial no mês)
        const gastosDoMes = await base44.entities.GastoSinistro.filter({ status_pagamento: 'pago' });
        const sinistrosMesAtual = gastosDoMes
          .filter(g => {
            if (!g.data_pagamento) return false;
            const d = new Date(g.data_pagamento);
            return d.getFullYear() === ano && (d.getMonth() + 1) === mes;
          })
          .reduce((s, g) => s + (g.valor_total || 0), 0);

        // P_2m e S_2m: soma do 1 mês histórico + mês atual (janela de 2 meses)
        const premioAcum3m   = premiosHistoricos.reduce((s, v) => s + v, 0) + premioBruto;
        const sinistrosAcum3m = sinistrosHistoricos.reduce((s, v) => s + v, 0) + sinistrosMesAtual;

        const inadimplencia = 0;
        const sinistrosAvisados = 0;
        const sinistrosPagos = sinistrosMesAtual; // sinistros pagos no mês atual desta filial

        const premioLiquido = premioBruto - inadimplencia;

        // 4.1, 4.2, 4.3
        const remMinima = premioBruto * 0.1038;
        const remSinistralidade = iofTotal + sinistrosPagos;
        const remAplicada = Math.max(remMinima, remSinistralidade);

        // 5.1, 5.2, 5.3
        const comissaoFixa = premioBruto * 0.10;
        const retencaoMga = premioBruto - remAplicada;
        const lucroOp = retencaoMga - comissaoFixa - sinistrosPagos;
        const remTotalMga = comissaoFixa + lucroOp;

        // 6
        const repasseSeguradora = remAplicada;

        // 7 — CR: fórmula quadrática CNSP 381/2020, Art. 29
        // P_2m e S_2m = janela deslizante dos últimos 2 meses
        const crCapitalAportado = fechamento.cr_capital_aportado || 0; // 7.1
        const crNecessidade = 1.12 * Math.sqrt(
          Math.pow(0.17 * premioAcum3m, 2) + Math.pow(0.44 * sinistrosAcum3m, 2)
        ); // 7.2
        const saldoTecnico = crCapitalAportado - crNecessidade;         // 6.1 — pode ser negativo
        const crSaldoPositivo    = Math.max(saldoTecnico, 0);           // 7.3
        const crNecessidadeAporte = Math.max(-saldoTecnico, 0);         // 7.4
        const crAtualizado = crNecessidade;                              // 7.5

        setData({
          filial, fechamento, apolices, mes, ano,
          premioAcum3m, sinistrosAcum3m,
          premioBruto, iofTotal, inadimplencia, premioLiquido,
          sinistrosAvisados, sinistrosPagos,
          remMinima, remSinistralidade, remAplicada,
          comissaoFixa, lucroOp, remTotalMga,
          saldoTecnico, repasseSeguradora, retencaoMga,
          crCapitalAportado, crNecessidade, crSaldoPositivo, crNecessidadeAporte, crAtualizado,
        });
      } catch (err) {
        setError("Erro ao carregar dados: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error || "Dados não encontrados."}</p>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const { filial, fechamento, mes, ano,
    premioAcum3m, sinistrosAcum3m,
    premioBruto, inadimplencia, premioLiquido,
    sinistrosAvisados, sinistrosPagos,
    remMinima, remSinistralidade, remAplicada,
    comissaoFixa, lucroOp, remTotalMga,
    saldoTecnico, repasseSeguradora, retencaoMga,
    crCapitalAportado, crNecessidade, crSaldoPositivo, crNecessidadeAporte, crAtualizado,
  } = data;

  const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <style>{PrintCSS}</style>

      {/* Ações */}
      <div className="no-print max-w-4xl mx-auto flex items-center gap-3 mb-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <Button onClick={() => window.print()} className="bg-blue-700 hover:bg-blue-800 text-white">
          <Printer className="w-4 h-4 mr-2" /> Imprimir / Exportar PDF
        </Button>
      </div>

      {/* Documento */}
      <div style={{
        maxWidth: '794px',
        margin: '0 auto',
        backgroundColor: '#fff',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: '11px',
        color: '#1a1a1a',
        lineHeight: '1.5',
        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
      }}>

        {/* CABEÇALHO */}
        <div style={{ backgroundColor: '#1a3a5c', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>OON SEGURADORA SA</div>
            <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>43.249.519/0001-10</div>
            <div style={{ fontSize: '11px', opacity: 0.9 }}>SUSEP 15414.627418/2021-15</div>
          </div>
          <div style={{ width: '60px', height: '60px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: '900', fontSize: '14px' }}>OON</span>
          </div>
        </div>
        <div style={{ height: '6px', backgroundColor: '#22c55e' }} />

        {/* TÍTULO */}
        <div style={{ textAlign: 'center', padding: '14px 24px 8px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>OON SEGURADORA S/A &nbsp;|&nbsp; CNPJ: 43.249.519/0001-10</div>
          <div style={{ fontSize: '13px', fontWeight: '700', fontStyle: 'italic' }}>BORDERÔ MENSAL DE MOVIMENTAÇÃO OPERACIONAL E FINANCEIRA</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#555' }}>PARTICIPAÇÃO POR REPRESENTANTE</div>
        </div>

        <div style={{ padding: '0 24px 20px' }}>

          {/* SEÇÃO 1 */}
          <Section title="1. IDENTIFICAÇÃO DAS PARTES">
            <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '14px 18px' }}>
              <div style={{ textAlign: 'center', fontWeight: '700', marginBottom: '10px', fontSize: '12px' }}>
                Competência (Mês/Ano): {String(mes).padStart(2, '0')} / {ano} — {MESES[mes]} de {ano}
              </div>
              <Row label="SEGURADORA:" value="OON SEGURADORA S.A" bold />
              <Row label="CNPJ:" value="43.249.519/0001-10" />
              <div style={{ height: '8px' }} />
              <Row label="REPRESENTANTE (MGA):" value={filial?.nome || '—'} bold />
              <Row label="CNPJ:" value={filial?.cnpj || '—'} />
              <div style={{ height: '8px' }} />
              <Row label="Qtd. Apólices no mês:" value={String(data.apolices.length)} />
            </div>
          </Section>

          {/* SEÇÃO 2 */}
          <Section title="2. DEMONSTRATIVO DE PRÊMIOS">
            <TableRows rows={[
              { item: '2.1', desc: 'Prêmio Emitido Bruto: Base para comissões e remuneração mínima da seguradora.', val: `R$ ${fmt(premioBruto)}` },
              { item: '2.2', desc: 'Inadimplência / PDD: Prêmios vencidos.', val: `R$ ${fmt(inadimplencia)}` },
              { item: '2.3', desc: 'Prêmio Arrecadado Líquido (2.1 – 2.2).', val: `R$ ${fmt(premioLiquido)}`, highlight: true },
            ]} />
          </Section>

          {/* SEÇÃO 3 */}
          <Section title="3. GESTÃO DE SINISTROS">
            <TableRows rows={[
              { item: '3.1', desc: 'Sinistros Avisados no Mês (Informativo):', val: `R$ ${fmt(sinistrosAvisados)}` },
              { item: '3.2', desc: 'Sinistros Pagos pelo Representante (por conta e ordem da Seguradora):', val: `R$ ${fmt(sinistrosPagos)}`, highlight: true },
            ]} />
          </Section>

          {/* SEÇÃO 4 */}
          <Section title="4. APURAÇÃO DA REMUNERAÇÃO DA SEGURADORA">
            <div style={{ fontStyle: 'italic', fontSize: '10px', color: '#555', marginBottom: '6px' }}>
              O valor aplicado será o MAIOR entre os itens 4.1 e 4.2 abaixo:
            </div>
            <TableRows rows={[
              { item: '4.1', desc: 'Remuneração mínima sobre o prêmio (10,38% × Prêmio Emitido 2.1)', val: `R$ ${fmt(remMinima)}` },
              { item: '4.2', desc: 'Remuneração por Sinistralidade: (IOF do mês + Sinistros Pagos 3.2)', val: `R$ ${fmt(remSinistralidade)}` },
              { item: '4.3', desc: 'Remuneração Aplicada da Seguradora no mês: MAX(4.1, 4.2)', val: `R$ ${fmt(remAplicada)}`, highlight: true },
              { item: '4.4', desc: 'Recuperação de Sinistros: Sinistros pagos no mês (3.2)', val: `R$ ${fmt(sinistrosPagos)}` },
              { item: '4.5', desc: 'Total Repasse OON: (4.3 + 4.4)', val: `R$ ${fmt(remAplicada + sinistrosPagos)}`, highlight: true },
            ]} />
          </Section>

          {/* SEÇÃO 5 */}
          <Section title="5. APURAÇÃO DA REMUNERAÇÃO DO REPRESENTANTE (MGA)">
            <TableRows rows={[
              { item: '5.1', desc: 'Comissão Fixa: (10% sobre o Prêmio Emitido 2.1)', val: `R$ ${fmt(comissaoFixa)}` },
              { item: '5.2', desc: 'Lucro Operacional: [Prêmio Arrecadado (2.3)] – [Sinistros Pagos (3.2)] – [Remuneração Seguradora (4.3)] – [Comissão Fixa (5.1)]', val: `R$ ${fmt(lucroOp)}` },
              { item: '5.3', desc: 'Remuneração Total do Representante: (5.1 + 5.2)', val: `R$ ${fmt(remTotalMga)}`, highlight: true },
            ]} />
          </Section>

          {/* SEÇÃO 6 */}
          <Section title="6. RESUMO DO FLUXO FINANCEIRO E REPASSE">
            <TableRows rows={[
              { item: '6.1', desc: 'Saldo de Capital de Risco: Capital Aportado (7.1) – CR Necessário (7.2)', val: `R$ ${fmt(saldoTecnico)}`, highlight: true, negative: saldoTecnico < 0 },
              { item: '6.2', desc: 'Repasse à Seguradora: Remuneração Aplicada (4.3)', val: `R$ ${fmt(repasseSeguradora)}`, highlight: true },
              { item: '6.3', desc: 'Retenção pelo Representante: [Prêmio Emitido (2.1)] – [Rem. Seguradora (4.3)]', val: `R$ ${fmt(retencaoMga)}`, highlight: true },
            ]} />
          </Section>

          {/* VERIFICAÇÃO DE BALANCEAMENTO */}
          {(() => {
            const totalRepasseOON = remAplicada + sinistrosPagos;
            const soma = totalRepasseOON + remTotalMga;
            const ok = Math.abs(soma - premioLiquido) < 0.01;
            return (
              <div style={{ marginTop: '12px', padding: '10px 14px', border: `1px solid ${ok ? '#22c55e' : '#dc2626'}`, borderRadius: '6px', backgroundColor: ok ? '#f0fdf4' : '#fef2f2' }}>
                <div style={{ fontWeight: '700', fontSize: '11px', marginBottom: '4px', color: ok ? '#15803d' : '#991b1b' }}>
                  {ok ? '✓ BALANCEAMENTO CONFERIDO' : '✗ BALANCEAMENTO DIVERGENTE'}
                </div>
                <div style={{ fontSize: '10px' }}>
                  (4.5) Total Repasse OON: R$ {fmt(totalRepasseOON)} + (5.3) Rem. Total MGA: R$ {fmt(remTotalMga)} = R$ {fmt(soma)} &nbsp;|&nbsp;
                  (2.3) Prêmio Arrecadado: R$ {fmt(premioLiquido)} &nbsp;→&nbsp;
                  <span style={{ fontWeight: '600', color: ok ? '#15803d' : '#991b1b' }}>
                    {ok ? 'OK: 4.5 + 5.3 = 2.3 ✓' : `Divergência: R$ ${fmt(soma - premioLiquido)}`}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* SEÇÃO 7 */}
          <Section title="7. CAPITAL DE RISCO (CR)">
            <TableRows rows={[
              { item: '7.1', desc: 'Capital Aportado:', val: `R$ ${fmt(crCapitalAportado)}` },
              { item: '7.2', desc: `Necessidade de CR: 1,12 × √[(P_2m × 0,17)² + (S_2m × 0,44)²] (CNSP 381/2020, Art. 29) | P_2m (acum. 2m): R$ ${fmt(premioAcum3m)} | S_2m (acum. 2m): R$ ${fmt(sinistrosAcum3m)}`, val: `R$ ${fmt(crNecessidade)}` },
              { item: '7.3', desc: 'Saldo CR Positivo: MAX(0, 7.1 – 7.2)', val: `R$ ${fmt(crSaldoPositivo)}` },
              { item: '7.4', desc: 'Necessidade de Aporte: MAX(0, 7.2 – 7.1)', val: `R$ ${fmt(crNecessidadeAporte)}` },
              { item: '7.5', desc: 'CR Atualizado (= 7.2): Este valor será o Capital Aportado no próximo mês para esta filial.', val: `R$ ${fmt(crAtualizado)}`, highlight: true },
            ]} />
          </Section>

          {/* SEÇÃO 8 */}
          <Section title="8. DECLARAÇÃO E CONFORMIDADE">
            <p style={{ margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
              Declaramos que os valores informados neste borderô refletem, com exatidão, a movimentação de prêmios, sinistros, remunerações e repasses da carteira administrada no período acima indicado, em conformidade com o Contrato de Representação de Seguros (MGA) e com a regulamentação SUSEP aplicável.
            </p>
            <div style={{ fontWeight: '700', marginBottom: '24px' }}>Assinaturas:</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '32px' }}>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <div style={{ borderBottom: '1px solid #333', marginBottom: '8px', height: '40px' }} />
                <div style={{ fontWeight: '600' }}>Pela REPRESENTANTE (MGA)</div>
                <div style={{ fontWeight: '600', marginTop: '4px', fontSize: '10px' }}>{filial?.nome || '—'}</div>
                <div style={{ marginTop: '6px', color: '#555' }}>Data: ____/____/_____</div>
              </div>
              <div style={{ textAlign: 'center', width: '45%' }}>
                <div style={{ borderBottom: '1px solid #333', marginBottom: '8px', height: '40px' }} />
                <div style={{ fontWeight: '600' }}>Pela SEGURADORA</div>
                <div style={{ fontWeight: '600', marginTop: '4px', fontSize: '10px' }}>OON SEGURADORA S.A.</div>
                <div style={{ marginTop: '6px', color: '#555' }}>Data: ____/____/_____</div>
              </div>
            </div>
          </Section>

        </div>

        {/* RODAPÉ */}
        <div style={{ borderTop: '1px solid #d1d5db', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666', marginTop: '8px' }}>
          <span>OON SEGURADORA S/A | CNPJ: 43.249.519/0001-10</span>
          <span>Gerado em {now}</span>
        </div>

      </div>
    </div>
  );
}