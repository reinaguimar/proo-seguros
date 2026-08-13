import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Heart, CheckCircle, AlertTriangle, FileText, Shield, Activity, Clock, Wrench, X, GitMerge } from "lucide-react";
import { format, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatDate = (d) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return "—"; }
};

const truncate = (str, n) => str && str.length > n ? str.slice(0, n) + "..." : (str || "");

export default function SaudeSistema() {
  const [erros, setErros] = useState([]);
  const [logs, setLogs] = useState([]);
  const [apolices, setApolices] = useState([]);
  const [sinistros, setSinistros] = useState([]);
  const [fechamentos, setFechamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvendo, setResolvendo] = useState({});
  const [user, setUser] = useState(null);
  const [corrigindo, setCorrigindo] = useState(false);
  const [relatorioCorrecao, setRelatorioCorrecao] = useState(null);
  const [analisandoSobreposicoes, setAnalisandoSobreposicoes] = useState(false);
  const [executandoSobreposicoes, setExecutandoSobreposicoes] = useState(false);
  const [resultadoSobreposicoes, setResultadoSobreposicoes] = useState(null); // null | {preview: true, ...} | {executado: true, ...}

  useEffect(() => {
    loadAll();
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [errosData, logsData, apolicesData, sinistrosData, fechamentosData] = await Promise.all([
      base44.entities.LogErro.list("-created_date", 20),
      base44.entities.LogFechamento.list("-created_date", 10),
      base44.entities.Apolice.list("-created_date", 5000),
      base44.entities.Sinistro.filter({ status: "aberto" }),
      base44.entities.FechamentoMensal.list("-created_date", 1),
    ]);
    setErros(errosData);
    setLogs(logsData);
    setApolices(apolicesData);
    setSinistros(sinistrosData);
    setFechamentos(fechamentosData);
    setLoading(false);
  };

  const executarCorrecao = async () => {
    setCorrigindo(true);
    try {
      const resp = await base44.functions.invoke('corrigirNumerosApolice', {});
      setRelatorioCorrecao(resp.data);
    } catch (e) {
      setRelatorioCorrecao({ sucesso: false, error: e.message });
    } finally {
      setCorrigindo(false);
    }
  };

  const isAdmin = user?.role === 'admin' ||
    ['super_administrador', 'administrador'].includes(user?.perfil_sistema);

  const analisarSobreposicoes = async () => {
    setAnalisandoSobreposicoes(true);
    setResultadoSobreposicoes(null);
    try {
      const resp = await base44.functions.invoke('resolverSobreposicoes', { executar: false });
      setResultadoSobreposicoes({ ...resp.data, preview: true });
    } catch (e) {
      setResultadoSobreposicoes({ error: e.message, preview: true });
    } finally {
      setAnalisandoSobreposicoes(false);
    }
  };

  const executarSobreposicoes = async () => {
    if (!window.confirm(`Confirma a execução da correção? Esta ação cancelará ${resultadoSobreposicoes?.cancelamentos_aplicados?.length || 0} apólice(s) sobrepostas.`)) return;
    setExecutandoSobreposicoes(true);
    try {
      const resp = await base44.functions.invoke('resolverSobreposicoes', { executar: true });
      setResultadoSobreposicoes({ ...resp.data, preview: false });
    } catch (e) {
      setResultadoSobreposicoes(prev => ({ ...prev, error: e.message }));
    } finally {
      setExecutandoSobreposicoes(false);
    }
  };

  const marcarResolvido = async (id) => {
    setResolvendo(prev => ({ ...prev, [id]: true }));
    await base44.entities.LogErro.update(id, { resolvido: true });
    setErros(prev => prev.map(e => e.id === id ? { ...e, resolvido: true } : e));
    setResolvendo(prev => ({ ...prev, [id]: false }));
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const apolicesHoje = apolices.filter(a => {
    const d = new Date(a.created_date);
    return d >= hoje;
  }).length;

  const ultimoFechamento = fechamentos[0];
  const ultimaExportacao = logs.find(l => l.acao === "EXPORTACAO_DRIVE" || (l.observacao || "").toLowerCase().includes("drive"));

  const errosNaoResolvidos24h = erros.filter(e => {
    if (e.resolvido) return false;
    const d = new Date(e.created_date);
    return d >= subHours(new Date(), 24);
  }).length;

  const STATUS_CORES = {
    rascunho: "bg-slate-100 text-slate-700",
    auditado: "bg-blue-100 text-blue-700",
    aprovado_mga: "bg-purple-100 text-purple-700",
    aprovado_seguradora: "bg-indigo-100 text-indigo-700",
    fechado: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
          <Heart className="w-5 h-5 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saúde do Sistema</h1>
          <p className="text-sm text-slate-500">Observabilidade, erros e indicadores operacionais</p>
        </div>
        {errosNaoResolvidos24h > 0 && (
          <Badge className="ml-2 bg-red-600 text-white">{errosNaoResolvidos24h} erro{errosNaoResolvidos24h > 1 ? "s" : ""} não resolvido{errosNaoResolvidos24h > 1 ? "s" : ""}</Badge>
        )}
        {isAdmin && (
          <Button
            className="ml-auto bg-amber-600 hover:bg-amber-700 gap-2"
            onClick={executarCorrecao}
            disabled={corrigindo}
          >
            <Wrench className="w-4 h-4" />
            {corrigindo ? "Corrigindo..." : "🔧 Corrigir Numeração de Apólices"}
          </Button>
        )}
      </div>

      {/* Modal relatório correção */}
      {relatorioCorrecao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-slate-900">Relatório de Correção de Numeração</h3>
              <button onClick={() => setRelatorioCorrecao(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {!relatorioCorrecao.sucesso ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  Erro: {relatorioCorrecao.error}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{relatorioCorrecao.renumeradas}</p>
                      <p className="text-xs text-green-600">Apólices renumeradas</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{relatorioCorrecao.ultimo_sequencial_usado}</p>
                      <p className="text-xs text-blue-600">Último sequencial usado</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left p-2 border border-slate-200">Número Original</th>
                          <th className="text-left p-2 border border-slate-200">Número Novo</th>
                          <th className="text-left p-2 border border-slate-200">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(relatorioCorrecao.relatorio || []).filter(r => r.status !== 'sem_colisao').map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 border border-slate-200 font-mono">{r.numero_original}</td>
                            <td className="p-2 border border-slate-200 font-mono text-green-700">{r.numero_novo || '—'}</td>
                            <td className="p-2 border border-slate-200">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                r.status === 'renumerada' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                              }`}>{r.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t">
              <Button onClick={() => setRelatorioCorrecao(null)} variant="outline" className="w-full">Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Indicadores de Uso */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> Indicadores de Uso
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Apólices hoje</p>
              {loading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold text-blue-600">{apolicesHoje}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Sinistros abertos</p>
              {loading ? <Skeleton className="h-8 w-16" /> : (
                <p className="text-3xl font-bold text-orange-600">{sinistros.length}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Último fechamento</p>
              {loading ? <Skeleton className="h-8 w-32" /> : ultimoFechamento ? (
                <div className="mt-1 space-y-1">
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CORES[ultimoFechamento.status] || "bg-slate-100 text-slate-700"}`}>
                    {ultimoFechamento.status}
                  </span>
                  <p className="text-xs text-slate-400">{ultimoFechamento.competencia_mes}/{ultimoFechamento.competencia_ano}</p>
                </div>
              ) : <p className="text-sm text-slate-400">Nenhum</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Última exportação Drive</p>
              {loading ? <Skeleton className="h-8 w-32" /> : ultimaExportacao ? (
                <p className="text-sm font-semibold text-slate-700">{formatDate(ultimaExportacao.created_date)}</p>
              ) : <p className="text-sm text-slate-400">Nenhuma</p>}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Erros Recentes */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" /> Erros Recentes
          {errosNaoResolvidos24h > 0 && (
            <Badge className="bg-red-500 text-white text-xs">{errosNaoResolvidos24h}</Badge>
          )}
        </h2>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : erros.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhum erro registrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {erros.map(erro => (
                      <TableRow key={erro.id} className={erro.resolvido ? "opacity-50" : ""}>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(erro.created_date)}</TableCell>
                        <TableCell><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{erro.funcao}</code></TableCell>
                        <TableCell className="text-sm text-slate-700 max-w-xs">{truncate(erro.mensagem, 80)}</TableCell>
                        <TableCell className="text-xs text-slate-500">{erro.usuario_email || erro.usuario_id || "—"}</TableCell>
                        <TableCell>
                          {erro.resolvido
                            ? <Badge variant="secondary" className="bg-green-100 text-green-700">Resolvido</Badge>
                            : <Badge variant="secondary" className="bg-red-100 text-red-700">Pendente</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          {!erro.resolvido && (
                            <Button size="sm" variant="outline" disabled={resolvendo[erro.id]}
                              onClick={() => marcarResolvido(erro.id)}
                              className="text-xs h-7">
                              {resolvendo[erro.id] ? "..." : "Marcar resolvido"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Correção de Sobreposições */}
      {isAdmin && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-violet-500" /> Correção de Sobreposições
          </h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Detecta apólices ativas com vigências sobrepostas para a mesma placa — independentemente de filial ou segurado (CPF/CNPJ). Resolve automaticamente mantendo a cadeia correta de renovações.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-violet-200 text-violet-700 hover:bg-violet-50 gap-2"
                  onClick={analisarSobreposicoes}
                  disabled={analisandoSobreposicoes || executandoSobreposicoes}
                >
                  {analisandoSobreposicoes ? <><span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> Analisando...</> : <><GitMerge className="w-4 h-4" /> Analisar Sobreposições</>}
                </Button>
                {resultadoSobreposicoes?.preview && !resultadoSobreposicoes?.error && (resultadoSobreposicoes?.cancelamentos_aplicados?.length > 0) && (
                  <Button
                    className="bg-red-600 hover:bg-red-700 gap-2"
                    onClick={executarSobreposicoes}
                    disabled={executandoSobreposicoes}
                  >
                    {executandoSobreposicoes ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Executando...</> : <><Wrench className="w-4 h-4" /> Executar Correção ({resultadoSobreposicoes.cancelamentos_aplicados.length})</>}
                  </Button>
                )}
                {resultadoSobreposicoes && (
                  <Button variant="ghost" size="sm" onClick={() => setResultadoSobreposicoes(null)} className="text-slate-400">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {resultadoSobreposicoes?.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">Erro: {resultadoSobreposicoes.error}</div>
              )}

              {resultadoSobreposicoes && !resultadoSobreposicoes.error && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-center">
                      <p className="text-xl font-bold text-slate-700">{resultadoSobreposicoes.total_grupos_analisados}</p>
                      <p className="text-xs text-slate-500">Grupos analisados</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
                      <p className="text-xl font-bold text-amber-700">{resultadoSobreposicoes.total_pares_sobrepostos}</p>
                      <p className="text-xs text-amber-500">Pares sobrepostos</p>
                    </div>
                    <div className={`border rounded-lg px-4 py-2 text-center ${resultadoSobreposicoes.preview ? 'bg-violet-50 border-violet-200' : 'bg-green-50 border-green-200'}`}>
                      <p className={`text-xl font-bold ${resultadoSobreposicoes.preview ? 'text-violet-700' : 'text-green-700'}`}>
                        {resultadoSobreposicoes.cancelamentos_aplicados?.length || 0}
                      </p>
                      <p className={`text-xs ${resultadoSobreposicoes.preview ? 'text-violet-500' : 'text-green-500'}`}>
                        {resultadoSobreposicoes.preview ? 'Para cancelar (preview)' : 'Cancelamentos aplicados'}
                      </p>
                    </div>
                  </div>

                  {resultadoSobreposicoes.cancelamentos_aplicados?.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide" colSpan={4}>
                              ❌ Apólice a Cancelar
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide border-l-2 border-slate-300" colSpan={4}>
                              ✅ Apólice Mantida
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide border-l-2 border-slate-300">Motivo</th>
                          </tr>
                          <tr className="bg-slate-100 border-t border-slate-200">
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500">Número</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500">Placa</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500">Segurado</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500">Filial / Período</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500 border-l-2 border-slate-300">Número</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500">Placa</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500">Segurado</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500">Filial / Período</th>
                            <th className="px-3 py-1.5 text-left font-medium text-slate-500 border-l-2 border-slate-300">Regra</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {resultadoSobreposicoes.cancelamentos_aplicados.map((c, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-2 font-mono text-red-700 whitespace-nowrap">{c.apolice_cancelada}</td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">{c.placa}</td>
                              <td className="px-3 py-2 font-mono text-slate-600">{c.segurado_cancelada}</td>
                              <td className="px-3 py-2 text-slate-500">
                                <div className="font-medium">{c.filial_cancelada}</div>
                                <div className="text-slate-400">{c.periodo_cancelada}</div>
                              </td>
                              <td className="px-3 py-2 font-mono text-green-700 whitespace-nowrap border-l-2 border-slate-200">{c.apolice_mantida}</td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-800">{c.placa}</td>
                              <td className="px-3 py-2 font-mono text-slate-600">{c.segurado_mantida}</td>
                              <td className="px-3 py-2 text-slate-500">
                                <div className="font-medium">{c.filial_mantida}</div>
                                <div className="text-slate-400">{c.periodo_mantida}</div>
                              </td>
                              <td className="px-3 py-2 text-slate-600 border-l-2 border-slate-200 max-w-[140px]">{c.motivo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                      <p className="text-sm text-green-700">Nenhuma sobreposição detectada. Carteira saudável!</p>
                    </div>
                  )}

                  {resultadoSobreposicoes.erros?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                      {resultadoSobreposicoes.erros.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Logs de Auditoria Recentes */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" /> Logs de Auditoria Recentes
        </h2>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Nenhum log de auditoria</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{formatDate(log.created_date)}</TableCell>
                        <TableCell><code className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{log.acao}</code></TableCell>
                        <TableCell className="text-sm text-slate-700">{log.usuario_nome || log.usuario_email || log.usuario_id || "—"}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-400">{log.ip_address || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}