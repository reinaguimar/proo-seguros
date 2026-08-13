import React from "react";

const MESES = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const fmt = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BorderoImpressao({ fechamento }) {
  if (!fechamento) return null;

  const f = fechamento;

  return (
    <div style={{
      width: '794px',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: '11px',
      color: '#1a1a1a',
      backgroundColor: '#fff',
      lineHeight: '1.5',
    }}>

      {/* CABEÇALHO */}
      <div style={{ backgroundColor: '#1d4ed8', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>OON SEGURADORA SA</div>
          <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.9 }}>43.249.519/0001-10</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>SUSEP 15414.627418/2021-15</div>
        </div>
        <div style={{ width: '60px', height: '60px', backgroundColor: '#4ade80', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#fff', fontWeight: '900', fontSize: '14px' }}>OON</span>
        </div>
      </div>
      <div style={{ height: '6px', backgroundColor: '#4ade80' }} />

      {/* TÍTULO */}
      <div style={{ textAlign: 'center', padding: '14px 38px 8px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>OON SEGURADORA S/A &nbsp;|&nbsp; CNPJ: 43.249.519/0001-10</div>
        <div style={{ fontSize: '13px', fontWeight: '700', fontStyle: 'italic' }}>BORDERÔ MENSAL DE MOVIMENTAÇÃO OPERACIONAL E FINANCEIRA</div>
        <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#555' }}>DOCUMENTO DE PRESTAÇÃO DE CONTAS: REPRESENTANTE (MGA) → SEGURADORA</div>
      </div>

      <div style={{ padding: '0 38px 20px' }}>

        {/* SEÇÃO 1 */}
        <Section title="1. IDENTIFICAÇÃO DAS PARTES">
          <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '14px 18px' }}>
            <div style={{ textAlign: 'center', fontWeight: '700', marginBottom: '10px', fontSize: '12px' }}>
              Competência (Mês/Ano): {String(f.competencia_mes).padStart(2, '0')} / {f.competencia_ano}
            </div>
            <Row label="SEGURADORA:" value="OON SEGURADORA S.A" bold />
            <Row label="CNPJ:" value="43.249.519/0001-10" />
            <div style={{ height: '8px' }} />
            <Row label="REPRESENTANTE (MGA):" value="NEW SOLUÇÕES LTDA - ME" bold />
            <Row label="CNPJ:" value="13.995.255/0001-83" />
          </div>
        </Section>

        {/* SEÇÃO 2 */}
        <Section title="2. DEMONSTRATIVO DE PRÊMIOS">
          <Table rows={[
            { item: '2.1', desc: 'Prêmio Emitido Bruto: Base para comissões e remuneração mínima da seguradora.', val: `R$ ${fmt(f.premio_emitido_bruto)}` },
            { item: '2.2', desc: 'Inadimplência / PDD (> 60 dias): Prêmios vencidos.', val: `R$ ${fmt(f.inadimplencia)}` },
            { item: '2.3', desc: 'Prêmio Arrecadado Líquido: Montante disponível (2.1 – 2.2).', val: `R$ ${fmt(f.premio_arrecadado_liquido)}`, highlight: true },
          ]} />
        </Section>

        {/* SEÇÃO 3 */}
        <Section title="3. GESTÃO DE SINISTROS">
          <Table rows={[
            { item: '3.1', desc: 'Sinistros Avisados no Mês (Informativo):', val: `R$ ${fmt(f.sinistros_avisados)}` },
            { item: '3.2', desc: 'Sinistros Pagos pelo Representante: Pagos por conta e ordem da Seguradora.', val: `R$ ${fmt(f.sinistros_pagos)}`, highlight: true },
          ]} />
        </Section>

        {/* SEÇÃO 4 */}
        <Section title="4. APURAÇÃO DA REMUNERAÇÃO DA SEGURADORA">
          <div style={{ fontStyle: 'italic', fontSize: '10px', color: '#555', marginBottom: '6px' }}>
            O valor aplicado será o MAIOR entre os itens 4.1 e 4.2 abaixo:
          </div>
          <Table rows={[
            { item: '4.1', desc: 'Remuneração mínima sobre o prêmio (10,38% × Prêmio Emitido 2.1)', val: `R$ ${fmt(f.remuneracao_minima_seguradora)}` },
            { item: '4.2', desc: 'Remuneração por Sinistralidade: (IOF do mês + 20% × Sinistros Pagos 3.2).', val: `R$ ${fmt(f.remuneracao_sinistralidade_seguradora)}` },
            { item: '4.3', desc: 'Remuneração Aplicada da Seguradora no mês:', val: `R$ ${fmt(f.remuneracao_aplicada_seguradora)}`, highlight: true },
          ]} />
        </Section>

        {/* SEÇÃO 5 */}
        <Section title="5. APURAÇÃO DA REMUNERAÇÃO DO REPRESENTANTE (MGA)">
          <Table rows={[
            { item: '5.1', desc: `Comissão Fixa: (${f.percentual_comissao_mga || 10}% sobre o Prêmio Emitido 2.1).`, val: `R$ ${fmt(f.comissao_fixa_mga)}` },
            { item: '5.2', desc: 'Lucro Operacional (LO): [Prêmio Arrecadado (2.3)] – [Sinistros Pagos (3.2)] – [Remuneração Seguradora (4.3)].', val: `R$ ${fmt(f.lucro_operacional)}` },
            { item: '5.3', desc: 'Remuneração Total do Representante: (Comissão 5.1 + Lucro Operacional 5.2).', val: `R$ ${fmt(f.remuneracao_total_mga)}`, highlight: true },
          ]} />
        </Section>

        {/* SEÇÃO 6 - FLUXO FINANCEIRO */}
        <Section title="6. RESUMO DO FLUXO FINANCEIRO E REPASSE" dataPdfBreak>
          <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ backgroundColor: '#f3f4f6', padding: '8px 12px', fontWeight: '700', textAlign: 'center', borderBottom: '1px solid #d1d5db', fontSize: '11px' }}>
              Demonstração do Saldo Técnico do Mês / Composição do Saldo
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#e5e7eb' }}>
                  <th style={th}>Item</th>
                  <th style={th}>Descrição da Movimentação</th>
                  <th style={{ ...th, textAlign: 'right' }}>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={4} style={{ ...td, textAlign: 'center', fontWeight: '700', verticalAlign: 'top', paddingTop: '10px' }}>6.1</td>
                  <td style={td}>Prêmio emitido (2.1) – inadimplência/PDD (&gt;60 dias) (2.2) = <strong>Prêmio Arrecadado (2.3)</strong></td>
                  <td style={{ ...td, textAlign: 'right' }}>R$ {fmt(f.premio_arrecadado_liquido)}</td>
                </tr>
                <tr>
                  <td style={td}>(–) Sinistros Pagos pelo Representante (3.2)</td>
                  <td style={{ ...td, textAlign: 'right' }}>R$ {fmt(f.sinistros_pagos)}</td>
                </tr>
                <tr>
                  <td style={td}>(–) Remuneração da Seguradora (4.3)</td>
                  <td style={{ ...td, textAlign: 'right' }}>R$ {fmt(f.remuneracao_aplicada_seguradora)}</td>
                </tr>
                <tr>
                  <td style={{ ...td, fontWeight: '700' }}>(=) SALDO TÉCNICO LÍQUIDO NO PERÍODO</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: '700' }}>R$ {fmt(f.saldo_tecnico_liquido)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: '6px', fontWeight: '600', fontSize: '11px' }}>6.2 Repasse Final para a SEGURADORA</div>
          <Table rows={[
            { item: '6.2', desc: 'Remuneração da Seguradora (4.3) + Saldo Técnico (6.1, se positivo e for da seguradora):', val: `R$ ${fmt(f.repasse_seguradora)}`, highlight: true },
          ]} />

          <div style={{ marginBottom: '6px', fontWeight: '600', fontSize: '11px', marginTop: '8px' }}>6.3 Retenção pelo REPRESENTANTE</div>
          <Table rows={[
            { item: '6.3', desc: 'O Representante retém o valor de sua remuneração (5.4) via compensação direta.', val: `R$ ${fmt(f.retencao_mga)}`, highlight: true },
          ]} />
        </Section>

        {/* SEÇÃO CR - Capital de Risco */}
        <Section title="7. CAPITAL DE RISCO (CR)">
          <Table rows={[
            { item: '7.1', desc: 'Capital Aportado:', val: `R$ ${fmt(f.cr_capital_aportado || 50000)}` },
            { item: '7.2', desc: 'Necessidade de CR (1,12 × √[(0,17 × Prêmios Acum.)² + (0,44 × Sinistros Acum.)²]):', val: `R$ ${fmt(f.cr_necessidade_capital)}` },
            { item: '7.3', desc: 'Saldo de CR (positivo):', val: `R$ ${fmt(f.cr_saldo_positivo)}` },
            { item: '7.4', desc: 'Necessidade de Aporte (se negativo):', val: `R$ ${fmt(f.cr_necessidade_aporte)}` },
            { item: '7.5', desc: 'CR Atualizado:', val: `R$ ${fmt(f.cr_atualizado)}`, highlight: true },
          ]} />
        </Section>

        {/* SEÇÃO 8 - DECLARAÇÃO */}
        <Section title="8. DECLARAÇÃO E CONFORMIDADE">
          <p style={{ margin: '0 0 16px 0', textAlign: 'justify', lineHeight: '1.7' }}>
            Declaramos que os valores informados neste borderô refletem, com exatidão, a movimentação de prêmios, sinistros, remunerações e repasses da carteira administrada no período acima indicado, em conformidade com o Contrato de Representação de Seguros (MGA) e com a regulamentação SUSEP aplicável.
          </p>
          <div style={{ fontWeight: '700', marginBottom: '24px' }}>Assinaturas:</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '32px' }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderBottom: '1px solid #333', marginBottom: '8px', height: '40px' }} />
              <div style={{ fontWeight: '600' }}>Pela REPRESENTANTE (MGA)</div>
              <div style={{ marginTop: '6px', color: '#555' }}>Data: ____/____/_____</div>
            </div>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ borderBottom: '1px solid #333', marginBottom: '8px', height: '40px' }} />
              <div style={{ fontWeight: '600' }}>Pela SEGURADORA</div>
              <div style={{ marginTop: '6px', color: '#555' }}>Data: ____/____/_____</div>
            </div>
          </div>
        </Section>

      </div>

      {/* RODAPÉ */}
      <div style={{ borderTop: '1px solid #d1d5db', padding: '8px 38px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666', marginTop: '8px' }}>
        <span>OON SEGURADORA S/A</span>
        <span>CNPJ: 43.249.519/0001-10</span>
      </div>
    </div>
  );
}

const th = {
  padding: '8px 10px',
  textAlign: 'center',
  fontWeight: '600',
  fontSize: '11px',
  borderRight: '1px solid #d1d5db',
};

const td = {
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb',
  borderRight: '1px solid #e5e7eb',
  fontSize: '11px',
  verticalAlign: 'middle',
};

function Section({ title, children, dataPdfBreak }) {
  return (
    <div style={{ marginTop: '16px' }} data-pdf-break={dataPdfBreak ? "true" : undefined}>
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
      <span style={{ fontWeight: '700', minWidth: '180px' }}>{label}</span>
      <span style={{ fontWeight: bold ? '600' : 'normal' }}>{value}</span>
    </div>
  );
}

function Table({ rows }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
      <thead>
        <tr style={{ backgroundColor: '#e5e7eb' }}>
          <th style={{ ...th, width: '60px' }}>Item</th>
          <th style={th}>Descrição da Movimentação</th>
          <th style={{ ...th, width: '130px', textAlign: 'right', borderRight: 'none' }}>Valor (R$)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ backgroundColor: row.highlight ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#fafafa') }}>
            <td style={{ ...td, textAlign: 'center', fontWeight: '700' }}>{row.item}</td>
            <td style={{ ...td, fontWeight: row.highlight ? '600' : 'normal' }}>{row.desc}</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: row.highlight ? '700' : 'normal', borderRight: 'none', color: row.highlight ? '#15803d' : '#1a1a1a' }}>{row.val}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}