import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, BookOpen, Lock } from "lucide-react";
import SecaoOperacional from "@/components/bordero-contabil/SecaoOperacional";
import TabelaLancamentos from "@/components/bordero-contabil/TabelaLancamentos";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const ALLOWED_ROLES = ["admin", "financeiro", "controller", "coo"];

function registrarLog(fechamento, currentUser) {
  const mes = String(fechamento.competencia_mes).padStart(2, "0");
  base44.entities.LogFechamento.create({
    fechamento_id: fechamento.id,
    acao: "bordero_contabil_visualizado",
    usuario_id: currentUser?.id || currentUser?._id || "",
    usuario_nome: currentUser?.full_name || currentUser?.nome || "",
    usuario_email: currentUser?.email || "",
    ip_address: null,
    observacao: JSON.stringify({
      competencia: `${fechamento.competencia_ano}-${mes}`,
      filial_nome: fechamento.filial_nome,
      premio_emitido_bruto: fechamento.premio_emitido_bruto,
    }),
  }).catch((e) => console.warn("[BorderoContabil] log falhou:", e));
}

export default function BorderoContabil() {
  const [fechamentos, setFechamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Carregar usuário
  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => setCurrentUser(null));
  }, []);

  // Carregar fechamentos
  useEffect(() => {
    base44.entities.FechamentoMensal
      .filter({ status: "fechado" })
      .then((lista) => {
        const ordenada = [...lista].sort((a, b) =>
          b.competencia_ano !== a.competencia_ano
            ? b.competencia_ano - a.competencia_ano
            : b.competencia_mes - a.competencia_mes
        );
        setFechamentos(ordenada);
        if (ordenada.length > 0) setSelecionado(ordenada[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Audit trail: log ao selecionar competência
  useEffect(() => {
    if (selecionado && currentUser) {
      registrarLog(selecionado, currentUser);
    }
  }, [selecionado?.id, currentUser?.id]);

  const labelPill = (f) => `${MESES[f.competencia_mes - 1]}/${f.competencia_ano}`;

  // E3 — Proteção de acesso
  const hasAccess = currentUser && (
    ALLOWED_ROLES.includes(currentUser.role) ||
    (currentUser.filiais_permitidas && currentUser.filiais_permitidas.length === 0)
  );

  // Aguardar carregamento do usuário antes de verificar acesso
  if (!currentUser && !loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (currentUser && !hasAccess) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center max-w-sm space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            O Borderô Contábil está disponível apenas para perfis: Financeiro, Controller e COO.
            Solicite acesso ao administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bordero-nav-section flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Borderô Contábil</h1>
            <p className="text-sm text-slate-500">
              Lançamentos contábeis dos fechamentos aprovados e encerrados
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-10 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando fechamentos...
          </div>
        )}

        {/* Vazio */}
        {!loading && fechamentos.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            Nenhum fechamento encerrado disponível.
          </div>
        )}

        {/* Conteúdo */}
        {!loading && fechamentos.length > 0 && (
          <>
            {/* Pills de competência */}
            <div className="bordero-nav-section flex flex-wrap gap-2">
              {fechamentos.map((f) => {
                const ativa = selecionado?.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelecionado(f)}
                    className={
                      ativa
                        ? "px-4 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white"
                        : "px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }
                  >
                    {labelPill(f)}
                  </button>
                );
              })}
            </div>

            {/* Seção Operacional */}
            {selecionado && (
              <div className="bordero-operacional-section">
                <SecaoOperacional fechamento={selecionado} />
              </div>
            )}

            {/* Lançamentos Contábeis + Rodapé */}
            {selecionado && (
              <div className="bordero-lancamentos-section space-y-0">
                <TabelaLancamentos fechamento={selecionado} />

                {/* E1 — Rodapé regulatório */}
                <RodapeRegulatorio fechamento={selecionado} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function RodapeRegulatorio({ fechamento }) {
  const mesNome = MESES_FULL[(fechamento.competencia_mes ?? 1) - 1];
  const competencia = `${mesNome}/${fechamento.competencia_ano}`;
  const idCurto = (fechamento.id || "").slice(-8);
  const geradoEm = new Date().toLocaleString("pt-BR");

  return (
    <div className="bordero-footer bg-gray-50 border border-gray-200 rounded-b-xl p-4 mt-4">
      <div className="flex justify-between items-start text-xs text-gray-500 gap-2 flex-wrap">
        <span>Gerado em: {geradoEm}</span>
        <span>Competência: {competencia}</span>
        <span>ID Fechamento: ...{idCurto}</span>
      </div>
      <p className="text-xs text-gray-400 text-center mt-1">
        Borderô gerado automaticamente a partir de fechamento com status: FECHADO | Dados imutáveis — somente leitura | OON Seguradora S.A.
      </p>
      <p className="text-xs text-gray-400 text-center mt-0.5">
        Este documento tem validade contábil apenas quando assinado digitalmente pelo COO e pelo Controller Financeiro
      </p>
    </div>
  );
}