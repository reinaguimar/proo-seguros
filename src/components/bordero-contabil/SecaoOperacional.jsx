import React from "react";

const fmt = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

function LinhaConta({ label, valor, cor, destaque, prefixo }) {
  const corClasse =
    cor === "verde"
      ? "text-green-700"
      : cor === "vermelho"
      ? "text-red-600"
      : "text-slate-600";

  return (
    <div className={`flex items-start justify-between gap-4 py-1.5 ${destaque ? "border-t border-slate-200 mt-1 pt-2.5" : ""}`}>
      <span className={`text-sm ${destaque ? "font-bold text-slate-800" : "text-slate-500"}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold text-right ${destaque ? "text-xl font-bold " + corClasse : corClasse}`}>
        {prefixo ? `${prefixo} ` : ""}{fmt(valor)}
      </span>
    </div>
  );
}

function Card({ titulo, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{titulo}</p>
      {children}
    </div>
  );
}

function Nota({ texto }) {
  return <p className="text-xs text-slate-400 italic mt-2">{texto}</p>;
}

export default function SecaoOperacional({ fechamento }) {
  const H6  = fechamento.premio_emitido_bruto ?? 0;
  const H7  = -(fechamento.sinistros_pagos ?? 0);
  const H8  = H6 + H7;
  const H10 = 0;
  const H11 = 0;
  const H12 = H8 + H10 + H11;
  const H14 = fechamento.inadimplencia ?? 0;
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
  const baseIRPJ = H6 - H17 - H29 + H7 - H26 + H34 + H39;
  const CONFERE = H6 - sinistrosPagos - sinistrosPagos - H23 - H26;
  const divergencia = Math.abs(CONFERE - H29);
  const tpaBase = sinistrosPagos === 0 || H22 >= H21 ? "BASE 2" : "BASE 1";

  return (
    <div className="space-y-4 bordero-operacional-section">
      <div className="flex items-center gap-3 pt-2">
        <span className="text-base font-semibold text-slate-700">📊 Operacional</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Card 1 — Resultado Operacional */}
        <Card titulo="Resultado Operacional">
          <LinhaConta label="(+) Prêmio Emitido" valor={H6} cor="verde" />
          <LinhaConta
            label="(-) Sinistro Pago"
            valor={sinistrosPagos}
            prefixo="-"
            cor={sinistrosPagos > 0 ? "vermelho" : "cinza"}
          />
          <LinhaConta label="Subtotal Operacional" valor={H8} />
          <LinhaConta label="(-) Cancelamentos" valor={H10} cor="cinza" />
          <LinhaConta label="(±) Ajustes" valor={H11} cor="cinza" />
          <LinhaConta
            label="RESULTADO OPERACIONAL"
            valor={H12}
            destaque
            cor={H12 >= 0 ? "verde" : "vermelho"}
          />
          <LinhaConta
            label="(-) PDD (60 dias)"
            valor={H14}
            prefixo={H14 > 0 ? "-" : ""}
            cor={H14 > 0 ? "vermelho" : "cinza"}
          />
        </Card>

        {/* Card 2 — IOF e Critérios TPA */}
        <Card titulo="IOF e Critérios TPA">
          <LinhaConta label="IOF (7,38%)" valor={H17} />
          <LinhaConta label="20% × sinistros pagos" valor={H20} />
          <LinhaConta label="Base de Cálculo 1 (IOF + Sint.)" valor={H21} />
          <LinhaConta label="Base de Cálculo 2 (10,38% × prêmio)" valor={H22} />
          <div className="flex items-start justify-between gap-4 border-t border-slate-200 mt-1 pt-2.5">
            <span className="text-sm font-bold text-slate-800">TPA aplicada</span>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xl font-bold text-blue-700">{fmt(H23)}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {tpaBase}
              </span>
            </div>
          </div>
          <Nota texto="Nota de Débito emitida pela OON — recebimento pelo banco" />
        </Card>

        {/* Card 3 — Remuneração MGA */}
        <Card titulo="Remuneração MGA">
          <LinhaConta label="Comissão MGA (10%)" valor={H26} />
          <Nota texto="Nota Fiscal MGA — retido na MGA (sem pagamento via banco)" />
          <LinhaConta
            label="Profit Sharing"
            valor={H29}
            destaque
            cor={H29 >= 0 ? "verde" : "vermelho"}
          />
          <Nota texto="Nota Fiscal MGA — retido na MGA (sem pagamento via banco)" />
        </Card>

        {/* Card 4 — Capital de Risco */}
        <Card titulo="Capital de Risco">
          <LinhaConta label="Capital Inicial do Período" valor={H33} />
          <LinhaConta label="Necessidade de Cobertura" valor={H34} />
          <div className="border-t border-slate-200 mt-1 pt-2.5 space-y-1">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-bold text-slate-800">Capital de Risco do Período</span>
              <span className={`text-xl font-bold text-right ${H35 > 0 ? "text-green-700" : H35 < 0 ? "text-red-600" : "text-slate-400"}`}>
                {fmt(H35)}
              </span>
            </div>
            <p className="text-xs text-right italic text-slate-400">
              {H35 > 0
                ? "Nota de Débito (OON recebe da MGA)"
                : H35 < 0
                ? "Nota de Crédito (OON devolve à MGA)"
                : "Sem movimentação de capital"}
            </p>
          </div>
        </Card>

        {/* Card 5 — Impactos no Fluxo de Caixa OON */}
        <Card titulo="Impactos no Fluxo de Caixa OON">
          <div className="flex items-start justify-between gap-4 py-1.5">
            <div>
              <p className="text-sm text-slate-500">IOF (saída)</p>
              <p className="text-xs text-slate-400">OON recolhe ao Fisco</p>
            </div>
            <span className="text-sm font-semibold text-red-600 text-right">{fmt(H38)}</span>
          </div>
          <div className="flex items-start justify-between gap-4 py-1.5">
            <div>
              <p className="text-sm text-slate-500">PIS/COFINS (4,65%)</p>
              <p className="text-xs text-slate-400">sobre Resultado Operacional</p>
            </div>
            <span className="text-sm font-semibold text-red-600 text-right">{fmt(H39)}</span>
          </div>
          <div className="flex items-start justify-between gap-4 py-1.5 border-t border-slate-200 mt-1 pt-2.5">
            <div>
              <p className="text-sm font-bold text-slate-800">Base IRPJ/CSLL</p>
              <p className="text-xs text-slate-400">Base estimada</p>
            </div>
            <span className="text-sm font-bold text-slate-700 text-right">{fmt(baseIRPJ)}</span>
          </div>
        </Card>

        {/* Card 6 — CONFERE */}
        <Card titulo="Verificação de Consistência">
          <LinhaConta label="Profit Sharing calculado" valor={H29} />
          <LinhaConta label="Verificação (CONFERE)" valor={CONFERE} />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Resultado</span>
            {divergencia < 0.01 ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                ✓ Cálculo consistente
              </span>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  ⚠ Divergência detectada
                </span>
                <span className="text-xs text-red-500">Diferença: {fmt(divergencia)}</span>
              </div>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}