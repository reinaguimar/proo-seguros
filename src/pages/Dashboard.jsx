import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  FileText, RefreshCw, CheckCircle2, Calendar,
  DollarSign, CalendarDays, AlertTriangle, BarChart3,
  Shield, Building2, ChevronDown, ChevronUp, ExternalLink,
  Bell, Plus, ClipboardList
} from "lucide-react";
import { format, addDays, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePermissoes } from "../components/auth/usePermissoes";

// ── Formatação monetária ────────────────────────────────────────────────────
const fmtBRL = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// ── Status configs ──────────────────────────────────────────────────────────
const SINISTRO_STATUS = {
  aberto:     { label: "Aberto",     cls: "bg-gray-100 text-gray-700" },
  em_analise: { label: "Em Análise", cls: "bg-blue-100 text-blue-700" },
  aprovado:   { label: "Aprovado",   cls: "bg-green-100 text-green-700" },
  em_reparo:  { label: "Em Reparo",  cls: "bg-amber-100 text-amber-700" },
  concluido:  { label: "Concluído",  cls: "bg-emerald-100 text-emerald-700" },
  negado:     { label: "Negado",     cls: "bg-red-100 text-red-700" },
};

const FECHAMENTO_STATUS = {
  rascunho:            { label: "Rascunho",    cls: "bg-gray-100 text-gray-600" },
  auditado:            { label: "Auditado",    cls: "bg-yellow-100 text-yellow-700" },
  calculado:           { label: "Calculado",   cls: "bg-blue-100 text-blue-700" },
  aprovado_mga:        { label: "Aprov. MGA",  cls: "bg-purple-100 text-purple-700" },
  aprovado_seguradora: { label: "Aprov. Seg.", cls: "bg-indigo-100 text-indigo-700" },
  fechado:             { label: "Fechado",     cls: "bg-emerald-100 text-emerald-700" },
};

// ── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, variant = "default" }) {
  const variants = {
    default:  { card: "bg-white border-gray-100",    icon: "bg-gray-100 text-gray-500",   val: "text-gray-900" },
    attention:{ card: "bg-amber-50 border-amber-200", icon: "bg-amber-100 text-amber-600", val: "text-amber-700" },
    critical: { card: "bg-red-50 border-red-200",    icon: "bg-red-100 text-red-500",     val: "text-red-700" },
    positive: { card: "bg-green-50 border-green-200", icon: "bg-green-100 text-green-600", val: "text-green-700" },
  };
  const v = variants[variant] || variants.default;
  return (
    <div className={`${v.card} rounded-xl border shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition-shadow duration-200`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${v.icon}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs font-medium text-gray-500 tracking-wide uppercase">{label}</p>
      <p className={`text-2xl font-bold leading-snug break-words ${v.val}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ emoji, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base">{emoji}</span>
      <h2 className="text-base font-semibold text-gray-700">{title}</h2>
      <div className="flex-1 h-px bg-gray-200 ml-1" />
    </div>
  );
}

// ── Badge inline ────────────────────────────────────────────────────────────
function StatusPill({ label, cls }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user: currentUser, loading: loadingPermissions } = usePermissoes();

  const [allApolices, setAllApolices] = useState([]);
  const [allSinistros, setAllSinistros] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filialCtx, setFilialCtx] = useState("consolidado");
  const [breakdownAberto, setBreakdownAberto] = useState(true);

  const filiaisPermitidas = currentUser?.filiais_permitidas || [];
  const isGlobal = filiaisPermitidas.length === 0;
  const isUmaFilial = filiaisPermitidas.length === 1;
  const showSeletor = isGlobal || filiaisPermitidas.length >= 2;

  useEffect(() => {
    if (!loadingPermissions && currentUser) loadData();
  }, [loadingPermissions, currentUser?.id]);

  useEffect(() => {
    if (isUmaFilial && filiaisPermitidas.length === 1) setFilialCtx(filiaisPermitidas[0]);
  }, [isUmaFilial]);

  const loadData = async () => {
    setIsLoading(true);
    const [apolices, sinistros, filiaisData, fechamentosData] = await Promise.all([
      base44.entities.Apolice.filter({ natureza_movimento: { $ne: "Cancelamento" } }),
      base44.entities.Sinistro.list(),
      base44.entities.Filial.filter({ ativo: true }),
      base44.entities.FechamentoMensal.list("-competencia_ano", 12).catch(() => []),
    ]);
    const filiaisVisiveis = isGlobal ? filiaisData : filiaisData.filter(f => filiaisPermitidas.includes(f.id));
    setAllApolices(apolices);
    setAllSinistros(sinistros);
    setFiliais(filiaisVisiveis);
    setFechamentos(fechamentosData);
    setIsLoading(false);
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30 = addDays(hoje, 30);
  const em15 = addDays(hoje, 15);
  const ha7  = subDays(hoje, 7);

  // ── Filtered by context ─────────────────────────────────────────────────
  // Cancelamentos já excluídos na query (natureza_movimento != "Cancelamento")
  const apolices = useMemo(() => {
    if (filialCtx === "consolidado")
      return isGlobal
        ? allApolices
        : allApolices.filter(a => filiaisPermitidas.includes(a.filial_id));
    return allApolices.filter(a => a.filial_id === filialCtx);
  }, [allApolices, filialCtx, isGlobal]);

  const sinistros = useMemo(() => {
    if (filialCtx === "consolidado")
      return isGlobal ? allSinistros : allSinistros.filter(s => filiaisPermitidas.includes(s.filial_id));
    return allSinistros.filter(s => s.filial_id === filialCtx);
  }, [allSinistros, filialCtx, isGlobal]);

  // ── Fechamento mais recente ─────────────────────────────────────────────
  const fechamentoRecente = useMemo(() => {
    const lista = [...fechamentos].sort((a, b) => {
      if (a.competencia_ano !== b.competencia_ano) return b.competencia_ano - a.competencia_ano;
      return b.competencia_mes - a.competencia_mes;
    });
    return lista.find(f => ['calculado','auditado','aprovado_mga','aprovado_seguradora','fechado'].includes(f.status))
      || lista[0] || null;
  }, [fechamentos]);

  const mesAtualFechamento = useMemo(() =>
    fechamentos.find(f => f.competencia_mes === (hoje.getMonth() + 1) && f.competencia_ano === hoje.getFullYear()),
    [fechamentos]
  );

  // ── BLOCO 1: Carteira ───────────────────────────────────────────────────
  const kpiCarteira = useMemo(() => {
    const vencendo30 = apolices.filter(a => {
      if (!a.data_fim_apolice) return false;
      const d = new Date(a.data_fim_apolice);
      return d >= hoje && d <= em30 && !a.cancelada_para_revisao;
    }).length;
    return {
      total: apolices.length,
      renovadas: apolices.filter(a => a.renovada === true).length,
      saoRenovacoes: apolices.filter(a => (a.numero_renovacao || 0) > 0).length,
      vencendo30,
    };
  }, [apolices]);

  // ── BLOCO 2: Financeiro ─────────────────────────────────────────────────
  const kpiFinanceiro = useMemo(() => {
    const premioBruto = apolices.reduce((s, a) => s + (a.premio_bruto_total || 0), 0);
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);
    const premioMes = apolices
      .filter(a => { const d = new Date(a.data_movimento || ""); return d >= inicioMes && d <= fimMes; })
      .reduce((s, a) => s + (a.premio_bruto_total || 0), 0);
    const inadimplencia = fechamentoRecente?.inadimplencia || 0;
    const sinistralidade = (() => {
      const f = [...fechamentos]
        .sort((a,b) => b.competencia_ano - a.competencia_ano || b.competencia_mes - a.competencia_mes)
        .find(f => ['calculado','auditado','aprovado_mga','aprovado_seguradora','fechado'].includes(f.status));
      if (!f) return null;
      if (!f.premio_emitido_bruto) return 0;
      return (f.sinistros_pagos / f.premio_emitido_bruto) * 100;
    })();
    return { premioBruto, premioMes, inadimplencia, sinistralidade };
  }, [apolices, fechamentoRecente, fechamentos]);

  // ── BLOCO 3: Sinistros ──────────────────────────────────────────────────
  const kpiSinistros = useMemo(() => {
    const emAberto = sinistros.filter(s => ['aberto','em_analise','aprovado','em_reparo'].includes(s.status));
    const pipeline = Object.keys(SINISTRO_STATUS).map(st => ({
      status: st,
      count: sinistros.filter(s => s.status === st).length,
      valor: sinistros.filter(s => s.status === st).reduce((s, sin) => s + (sin.valor_inicial || 0), 0),
    }));
    return {
      total: sinistros.length,
      emAberto: emAberto.length,
      valorAberto: emAberto.reduce((s, sin) => s + (sin.valor_inicial || 0), 0),
      pipeline,
    };
  }, [sinistros]);

  // ── BLOCO 4: Breakdown por filial ───────────────────────────────────────
  const breakdownFiliais = useMemo(() => {
    return filiais.map(f => {
      const apolicesF = allApolices.filter(a => a.filial_id === f.id);
      const ini = startOfMonth(hoje), fim = endOfMonth(hoje);
      const premio = apolicesF.reduce((s, a) => s + (a.premio_bruto_total || 0), 0);
      const iof = apolicesF.reduce((s, a) => s + (a.iof || 0), 0);
      const premioMes = apolicesF
        .filter(a => { const d = new Date(a.data_movimento || ""); return d >= ini && d <= fim; })
        .reduce((s, a) => s + (a.premio_bruto_total || 0), 0);
      return { ...f, qtd: apolicesF.length, premio, iof, premioMes };
    });
  }, [filiais, allApolices]);

  // ── BLOCO 5: Alertas ───────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const vencendo15 = apolices
      .filter(a => {
        if (!a.data_fim_apolice) return false;
        const d = new Date(a.data_fim_apolice);
        return d >= hoje && d <= em15 && !a.renovada && !a.cancelada_para_revisao;
      })
      .sort((a, b) => new Date(a.data_fim_apolice) - new Date(b.data_fim_apolice))
      .slice(0, 5);
    const semAtualizacao = sinistros.filter(s =>
      !['concluido','negado'].includes(s.status) && new Date(s.data_abertura) < ha7
    ).length;
    return { vencendo15, semAtualizacao };
  }, [apolices, sinistros]);

  const tituloDash = isUmaFilial && filiais.length === 1
    ? `Dashboard — ${filiais[0]?.nome}` : "Dashboard";
  const mesNome = format(hoje, "MMMM", { locale: ptBR });
  const mesAnoLabel = format(hoje, "MMMM yyyy", { locale: ptBR });

  // Sinistralidade display & variant
  const { sinistralidade } = kpiFinanceiro;
  const sinistralDisplay = sinistralidade === null ? "—"
    : `${sinistralidade.toFixed(1).replace(".", ",")}%`;
  const sinistralVariant = sinistralidade === null ? "default"
    : sinistralidade < 30 ? "positive"
    : sinistralidade < 60 ? "attention"
    : "critical";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-10 bg-gray-50 min-h-screen">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tituloDash}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            {currentUser?.nome && ` · Olá, ${currentUser.nome.split(" ")[0]}`}
          </p>
        </div>
        <Link to={createPageUrl("NovaApolice")}>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1" /> Nova Apólice
          </Button>
        </Link>
      </div>

      {/* ── SELETOR DE FILIAL (pills) ────────────────────────────────── */}
      {showSeletor && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilialCtx("consolidado")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filialCtx === "consolidado" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Consolidado
          </button>
          {filiais.map(f => (
            <button
              key={f.id}
              onClick={() => setFilialCtx(f.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filialCtx === f.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.nome}
              {f.tipo === "matriz" && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filialCtx === f.id ? "bg-white/20" : "bg-blue-100 text-blue-600"}`}>
                  Matriz
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── BLOCO 1: CARTEIRA ───────────────────────────────────────── */}
      <section>
        <SectionHeader emoji="📋" title="Carteira de Apólices" />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard label="Total de Apólices" value={kpiCarteira.total} sub="apólices emitidas" icon={ClipboardList} />
          <KpiCard label="Apólices Renovadas" value={kpiCarteira.renovadas} sub="tiveram renovação iniciada" icon={RefreshCw} />
          <KpiCard label="Renovações Ativas" value={kpiCarteira.saoRenovacoes} sub="são renovações de anteriores" icon={CheckCircle2} variant="positive" />
          <KpiCard
            label="Vencendo em 30 dias"
            value={`${kpiCarteira.vencendo30}${
              kpiCarteira.total > 0 ? ` (${Math.round(kpiCarteira.vencendo30 / kpiCarteira.total * 100)}% da carteira)` : ''
            }`}
            sub="Inclui renovadas e não renovadas — data_fim nos próximos 30 dias"
            icon={Calendar}
            variant={kpiCarteira.vencendo30 >= 10 ? "critical" : kpiCarteira.vencendo30 > 0 ? "attention" : "default"}
          />
        </div>
      </section>

      {/* ── BLOCO 2: FINANCEIRO ─────────────────────────────────────── */}
      <section>
        <SectionHeader emoji="💰" title="Financeiro" />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard label="Prêmio Bruto Total" value={fmtBRL(kpiFinanceiro.premioBruto)} sub="carteira total" icon={DollarSign} />
          <KpiCard label="Prêmio do Mês" value={fmtBRL(kpiFinanceiro.premioMes)} sub={mesAnoLabel} icon={CalendarDays} />
          <KpiCard
            label="Inadimplência"
            value={fmtBRL(kpiFinanceiro.inadimplencia)}
            sub={fechamentoRecente ? `fechamento ${fechamentoRecente.competencia_mes}/${fechamentoRecente.competencia_ano}` : "sem fechamento"}
            icon={AlertTriangle}
            variant={kpiFinanceiro.inadimplencia > 0 ? "critical" : "positive"}
          />
          <KpiCard
            label="Sinistralidade"
            value={sinistralDisplay}
            sub={fechamentoRecente ? `fechamento ${fechamentoRecente.competencia_mes}/${fechamentoRecente.competencia_ano}` : "sem dados"}
            icon={BarChart3}
            variant={sinistralVariant}
          />
        </div>
      </section>

      {/* ── BLOCO 3: SINISTROS ──────────────────────────────────────── */}
      <section>
        <SectionHeader emoji="⚠️" title="Sinistros" />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Total de Sinistros" value={kpiSinistros.total} sub="registrados" icon={Shield} />
          <KpiCard
            label="Em Aberto"
            value={kpiSinistros.emAberto}
            sub="aberto + análise + aprovado + reparo"
            icon={AlertTriangle}
            variant={kpiSinistros.emAberto >= 5 ? "critical" : kpiSinistros.emAberto > 0 ? "attention" : "default"}
          />
          <KpiCard
            label="Valor em Aberto"
            value={fmtBRL(kpiSinistros.valorAberto)}
            sub="exposição financeira atual"
            icon={DollarSign}
            variant={kpiSinistros.valorAberto > 0 ? "attention" : "default"}
          />
        </div>

        {/* Pipeline */}
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Qtd</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {kpiSinistros.pipeline.map(({ status, count, valor }) => (
                <tr key={status} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <StatusPill label={SINISTRO_STATUS[status].label} cls={SINISTRO_STATUS[status].cls} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{count}</td>
                  <td className="px-4 py-3 text-right text-gray-500 text-sm">{fmtBRL(valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── BLOCO 4: FECHAMENTOS ────────────────────────────────────── */}
      <section>
        <SectionHeader emoji="📅" title="Fechamento Mensal" />
        <div className="mt-4 grid lg:grid-cols-2 gap-4">
          {/* Fechamento mais recente */}
          {fechamentoRecente ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fechamento mais recente</p>
                  <p className="font-bold text-gray-800 text-lg mt-0.5">
                    {fechamentoRecente.competencia_mes}/{fechamentoRecente.competencia_ano}
                  </p>
                </div>
                <StatusPill
                  label={FECHAMENTO_STATUS[fechamentoRecente.status]?.label || fechamentoRecente.status}
                  cls={FECHAMENTO_STATUS[fechamentoRecente.status]?.cls || "bg-gray-100 text-gray-600"}
                />
              </div>
              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Prêmio emitido bruto</span>
                  <span className="font-semibold text-gray-800">{fmtBRL(fechamentoRecente.premio_emitido_bruto)}</span>
                </div>
                {fechamentoRecente.inadimplencia > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Inadimplência</span>
                    <span className="font-semibold text-red-600">{fmtBRL(fechamentoRecente.inadimplencia)}</span>
                  </div>
                )}
                {fechamentoRecente.repasse_seguradora > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Repasse seguradora</span>
                    <span className="font-semibold">{fmtBRL(fechamentoRecente.repasse_seguradora)}</span>
                  </div>
                )}
              </div>
              <Link to={createPageUrl("Fechamentos")}>
                <button className="w-full text-sm font-medium text-blue-600 border border-blue-200 rounded-lg py-2 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver detalhes
                </button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-5 flex flex-col items-center justify-center text-gray-400 gap-2">
              <CalendarDays className="w-8 h-8 opacity-30" />
              <p className="text-sm">Nenhum fechamento encontrado</p>
            </div>
          )}

          {/* Fechamento mês atual */}
          {mesAtualFechamento ? (
            <div className="bg-green-50 rounded-xl border border-green-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-green-800">Fechamento de {mesNome}</p>
                <StatusPill
                  label={FECHAMENTO_STATUS[mesAtualFechamento.status]?.label}
                  cls={FECHAMENTO_STATUS[mesAtualFechamento.status]?.cls || ""}
                />
              </div>
              <p className="text-2xl font-bold text-green-900 break-words mb-3">
                {fmtBRL(mesAtualFechamento.premio_emitido_bruto)}
              </p>
              <Link to={createPageUrl("Fechamentos")}>
                <button className="text-sm font-medium text-green-700 border border-green-300 rounded-lg px-4 py-1.5 hover:bg-green-100 transition-colors flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" /> Ver detalhes
                </button>
              </Link>
            </div>
          ) : (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="font-semibold text-amber-800">Fechamento de {mesNome} não iniciado</p>
              </div>
              <p className="text-sm text-amber-700 mb-3">O fechamento do mês atual ainda não foi criado.</p>
              <Link to={createPageUrl("Fechamentos")}>
                <button className="text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-1.5 transition-colors flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Criar Fechamento
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Breakdown por filial */}
        {!isUmaFilial && (
          <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setBreakdownAberto(p => !p)}
            >
              <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Visão por Filial</span>
              {breakdownAberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {breakdownAberto && (
              <table className="w-full">
                <thead className="bg-gray-50 border-t border-gray-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Filial</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Apólices</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Prêmio Bruto</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">IOF</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Prêmio do Mês</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {breakdownFiliais.map(f => (
                    <tr
                      key={f.id}
                      onClick={() => setFilialCtx(f.id)}
                      className={`cursor-pointer hover:bg-blue-50/40 transition-colors ${filialCtx === f.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-800">{f.nome}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill
                          label={f.tipo === "matriz" ? "Matriz" : "Sub-Rep."}
                          cls={f.tipo === "matriz" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-700">{f.qtd}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{fmtBRL(f.premio)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-400">{fmtBRL(f.iof)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{fmtBRL(f.premioMes)}</td>
                    </tr>
                  ))}
                  {breakdownFiliais.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhuma filial</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      {/* ── BLOCO 5: ALERTAS ────────────────────────────────────────── */}
      <section>
        <SectionHeader emoji="🔔" title="Alertas" />
        <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-1">

          {/* Vencendo em 15 dias */}
          <div className="flex items-center gap-3 py-2 border-b border-gray-50">
            <span className="text-base">📌</span>
            <p className="text-sm text-gray-700 flex-1">Apólices vencendo em até 15 dias</p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${alertas.vencendo15.length > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
              {alertas.vencendo15.length}
            </span>
          </div>
          {alertas.vencendo15.map(a => (
            <div key={a.id} className="flex items-center gap-3 py-1.5 pl-8 border-b border-gray-50 last:border-0">
              <Link to={createPageUrl(`ApoliceDetalhes?id=${a.id}`)} className="font-mono text-blue-600 hover:underline text-xs flex-1">
                {a.numero_apolice}
              </Link>
              <span className="text-xs text-gray-400">{a.filial_nome}</span>
              <span className="text-xs font-medium text-amber-600">{format(new Date(a.data_fim_apolice), "dd/MM/yyyy")}</span>
            </div>
          ))}
          {kpiCarteira.vencendo30 > 5 && (
            <div className="pl-8 pt-1">
              <Link to={createPageUrl("RenovacoesApolices")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Ver todas ({kpiCarteira.vencendo30} vencendo em 30 dias)
              </Link>
            </div>
          )}

          {/* Sinistros sem atualização */}
          <div className="flex items-center gap-3 py-2 border-b border-gray-50">
            <span className="text-base">⏱️</span>
            <p className="text-sm text-gray-700 flex-1">Sinistros sem atualização há +7 dias</p>
            <Link to={createPageUrl("Sinistros")}>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer ${alertas.semAtualizacao > 0 ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-gray-100 text-gray-500"}`}>
                {alertas.semAtualizacao}
              </span>
            </Link>
          </div>

          {/* Fechamento do mês */}
          <div className="flex items-center gap-3 py-2">
            <span className="text-base">{mesAtualFechamento ? "✅" : "❗"}</span>
            <p className="text-sm text-gray-700 flex-1">
              {mesAtualFechamento ? `Fechamento de ${mesNome} iniciado` : `Fechamento de ${mesNome} não iniciado`}
            </p>
            {!mesAtualFechamento && (
              <Link to={createPageUrl("Fechamentos")}>
                <button className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-0.5 rounded-full transition-colors">
                  Criar
                </button>
              </Link>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}