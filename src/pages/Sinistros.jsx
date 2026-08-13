import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { usePermissoes } from "../components/auth/usePermissoes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { maskPII } from "../utils/maskPII";
import { 
  Search, 
  PlusCircle, 
  Download, 
  Shield,
  DollarSign,
  TrendingUp,
  FileText,
  AlertTriangle,
  Eye,
  Edit,
  RefreshCw
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const PRODUTOS_INFO = {
  FR: { nome: "Furto e Roubo", color: "bg-red-100 text-red-800" },
  COL_PARCIAL: { nome: "Colisão Parcial", color: "bg-blue-100 text-blue-800" },
  COL_TOTAL: { nome: "Colisão Total", color: "bg-purple-100 text-purple-800" },
  INCENDIO: { nome: "Incêndio", color: "bg-orange-100 text-orange-800" },
  RCFV: { nome: "RCF-V", color: "bg-green-100 text-green-800" }
};

const STATUS_INFO = {
  aberto: { nome: "Aberto", color: "bg-yellow-100 text-yellow-800" },
  em_analise: { nome: "Em Análise", color: "bg-blue-100 text-blue-800" },
  aprovado: { nome: "Aprovado", color: "bg-green-100 text-green-800" },
  em_reparo: { nome: "Em Reparo", color: "bg-purple-100 text-purple-800" },
  concluido: { nome: "Concluído", color: "bg-slate-100 text-slate-800" },
  negado: { nome: "Negado", color: "bg-red-100 text-red-800" }
};

export default function Sinistros() {
  const { user: currentUser, loading: loadingPermissions } = usePermissoes();
  const [sinistros, setSinistros] = useState([]);
  const [filteredSinistros, setFilteredSinistros] = useState([]);
  const [gastosMap, setGastosMap] = useState({});
  const [apolicesMap, setApolicesMap] = useState({});
  const [filiais, setFiliais] = useState([]);
  const [filialCtx, setFilialCtx] = useState("todas");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    produto: "all",
    periodo: "all",
    filial: "all"
  });

  const filiaisPermitidas = currentUser?.filiais_permitidas || [];
  const isGlobal = filiaisPermitidas.length === 0;
  const isUmaFilial = filiaisPermitidas.length === 1;
  const showSeletor = isGlobal || filiaisPermitidas.length >= 2;

  useEffect(() => {
    if (!loadingPermissions) {
      loadSinistros();
      base44.entities.Filial.filter({ ativo: true }).then(all => {
        const vis = isGlobal ? all : all.filter(f => filiaisPermitidas.includes(f.id));
        setFiliais(vis);
        if (isUmaFilial && filiaisPermitidas.length === 1) setFilialCtx(filiaisPermitidas[0]);
      }).catch(() => {});
    }
  }, [loadingPermissions, currentUser?.id]);

  useEffect(() => {
    applyFilters();
  }, [sinistros, searchTerm, filters, filialCtx, isGlobal, filiaisPermitidas.join(',')]);

  const loadSinistros = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const sinistrosData = await base44.entities.Sinistro.list("-created_date");
      setSinistros(sinistrosData);

      let hasPartialError = false;

      // Carregar gastos para cada sinistro (resiliente — allSettled)
      const gastosResults = await Promise.allSettled(
        sinistrosData.map(async (sinistro) => {
          try {
            const gastos = await base44.entities.GastoSinistro.filter({ id_sinistro: sinistro.id });
            return { id: sinistro.id, gastos };
          } catch (e) {
            throw e;
          }
        })
      );
      const gastosMapObj = {};
      gastosResults.forEach((res) => {
        if (res.status === 'fulfilled') {
          gastosMapObj[res.value.id] = res.value.gastos;
        } else {
          hasPartialError = true;
        }
      });
      setGastosMap(gastosMapObj);

      // Carregar apólices para pegar as placas (resiliente — allSettled)
      const apolicesIds = [...new Set(sinistrosData.map(s => s.id_apolice).filter(Boolean))];
      const apolicesResults = await Promise.allSettled(
        apolicesIds.map(async (id) => {
          try {
            return await base44.entities.Apolice.get(id);
          } catch (e) {
            throw e;
          }
        })
      );
      const apolicesMapObj = {};
      apolicesResults.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          apolicesMapObj[res.value.id] = res.value;
        } else {
          hasPartialError = true;
        }
      });
      setApolicesMap(apolicesMapObj);

      if (hasPartialError) {
        setError('partial');
      }
    } catch (error) {
      console.error("Erro ao carregar sinistros:", error);
      setError('total');
    } finally {
      setIsLoading(false);
    }
  };

  // Ref sempre aponta para a versão mais recente de loadSinistros
  const loadSinistrosRef = useRef(loadSinistros);
  loadSinistrosRef.current = loadSinistros;

  // Recarrega a lista quando a janela volta a ter foco (ex: voltar de editar/detalhes)
  useEffect(() => {
    const handleFocus = () => {
      if (!loadingPermissions) loadSinistrosRef.current();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadingPermissions]);

  const applyFilters = () => {
    let filtered = [...sinistros];

    // Filtro automático por filiais permitidas
    if (!isGlobal) {
      filtered = filtered.filter(s => filiaisPermitidas.includes(s.filial_id));
    }
    // Filtro pela pill
    if (filialCtx !== "todas") {
      filtered = filtered.filter(s => s.filial_id === filialCtx);
    }

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(sinistro => 
        sinistro.numero_sinistro?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sinistro.numero_apolice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sinistro.cpf_segurado?.includes(searchTerm) // Assuming cpf_segurado now holds either CPF or CNPJ
      );
    }

    // Filtro de status
    if (filters.status !== "all") {
      filtered = filtered.filter(sinistro => sinistro.status === filters.status);
    }

    // Filtro de produto
    if (filters.produto !== "all") {
      filtered = filtered.filter(sinistro => sinistro.produto_sinistrado === filters.produto);
    }

    // (filial já filtrada pelas pills acima)

    // Filtro de período
    if (filters.periodo !== "all") {
      const now = new Date();
      const startDate = new Date();
      
      if (filters.periodo === "thisMonth") {
        startDate.setDate(1);
      } else if (filters.periodo === "last3Months") {
        // Correctly get the date for 3 months ago (start of that month)
        const dateThreeMonthsAgo = subMonths(now, 3);
        startDate.setFullYear(dateThreeMonthsAgo.getFullYear());
        startDate.setMonth(dateThreeMonthsAgo.getMonth());
        startDate.setDate(1);
      } else if (filters.periodo === "thisYear") {
        startDate.setMonth(0, 1); // January 1st of current year
      }
      
      // Reset time to start of day for comparison
      startDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter(sinistro => {
        const sinistroDate = new Date(sinistro.data_sinistro);
        sinistroDate.setHours(0, 0, 0, 0); // Reset time for comparison
        return sinistroDate >= startDate;
      });
    }

    setFilteredSinistros(filtered);
  };

  const calcularTotalGastos = (sinistroId) => {
    const gastos = gastosMap[sinistroId] || [];
    return gastos.reduce((total, gasto) => total + (gasto.valor_total || 0), 0);
  };

  const calcularEstatisticas = () => {
    const total = filteredSinistros.length;
    const abertos = filteredSinistros.filter(s => s.status === 'aberto' || s.status === 'em_analise').length;
    const valorTotal = filteredSinistros.reduce((sum, s) => sum + (s.valor_inicial || 0), 0);
    const gastosTotal = filteredSinistros.reduce((sum, s) => sum + calcularTotalGastos(s.id), 0);

    return { total, abertos, valorTotal, gastosTotal };
  };

  const handleExport = () => {
    const csvContent = [
      ["Número", "Apólice", "Placa", "CPF/CNPJ", "Dt_Ocorr_Sinistro", "Dt_Av_Sinistro", "Tipo de Sinistro", "Estimat_Inicial", "Franquia", "Previsão Indenização", "Gastos Reais", "Movimentação"],
      ...filteredSinistros.map(sinistro => [
        sinistro.numero_sinistro || "",
        sinistro.numero_apolice || "",
        apolicesMap[sinistro.id_apolice]?.id_objeto || "-",
        sinistro.cpf_segurado || "",
        format(new Date(sinistro.data_sinistro), "dd/MM/yyyy", { locale: ptBR }),
        sinistro.data_abertura ? format(new Date(sinistro.data_abertura), "dd/MM/yyyy", { locale: ptBR }) : "",
        PRODUTOS_INFO[sinistro.produto_sinistrado]?.nome || "",
        `R$ ${(sinistro.valor_inicial || 0).toFixed(2)}`,
        `R$ ${(sinistro.franquia || 0).toFixed(2)}`,
        `R$ ${(sinistro.valor_inicial || 0).toFixed(2)}`,
        `R$ ${calcularTotalGastos(sinistro.id).toFixed(2)}`,
        STATUS_INFO[sinistro.status]?.nome || ""
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sinistros_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = calcularEstatisticas();

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-orange-600" />
              Sinistros
            </h1>
            <p className="text-slate-600 text-lg">
              {filteredSinistros.length} de {sinistros.length} sinistros
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredSinistros.length === 0}
              className="hover:bg-green-50 border-green-200 text-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Link to={createPageUrl("NovoSinistro")}>
              <Button className="bg-orange-600 hover:bg-orange-700 shadow-lg">
                <PlusCircle className="w-4 h-4 mr-2" />
                Novo Sinistro
              </Button>
            </Link>
          </div>
        </div>

        {/* Banner de erro de carregamento */}
        {error && (
          <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Não foi possível carregar todos os sinistros. Alguns dados podem estar incompletos.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadSinistros()}
              className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white shadow-sm border-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total de Sinistros</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  )}
                </div>
                <FileText className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-yellow-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Em Aberto</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-yellow-600">{stats.abertos}</p>
                  )}
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Valor Total Estimado</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total em Gastos</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-green-600">
                      R$ {stats.gastosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seletor de Filial (pills) */}
        {showSeletor && filiais.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilialCtx("todas")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filialCtx === "todas" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >Todas</button>
            {filiais.map(f => (
              <button key={f.id} onClick={() => setFilialCtx(f.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filialCtx === f.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >{f.nome}</button>
            ))}
          </div>
        )}
        {isUmaFilial && filiais.length === 1 && (
          <div><span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">Filial: {filiais[0]?.nome}</span></div>
        )}

        {/* Filtros */}
        <Card className="shadow-sm border-orange-100">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por número, apólice ou CPF/CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-200 focus:border-orange-500"
                  />
                </div>
              </div>

              <Select 
                value={filters.status}
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="em_reparo">Em Reparo</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="negado">Negado</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.produto}
                onValueChange={(value) => setFilters({...filters, produto: value})}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Produtos</SelectItem>
                  <SelectItem value="FR">Furto e Roubo</SelectItem>
                  <SelectItem value="COL_PARCIAL">Colisão Parcial</SelectItem>
                  <SelectItem value="COL_TOTAL">Colisão Total</SelectItem>
                  <SelectItem value="INCENDIO">Incêndio</SelectItem>
                  <SelectItem value="RCFV">RCF-V</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.periodo}
                onValueChange={(value) => setFilters({...filters, periodo: value})}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Períodos</SelectItem>
                  <SelectItem value="thisMonth">Este Mês</SelectItem>
                  <SelectItem value="last3Months">Últimos 3 Meses</SelectItem>
                  <SelectItem value="thisYear">Este Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="shadow-sm border-orange-100">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSinistros.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                {sinistros.length === 0 ? (
                  <>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhum sinistro registrado</h3>
                    <p className="text-slate-500 max-w-sm mx-auto mb-6">Quando um sinistro for aberto, ele aparecerá aqui com status, produto sinistrado e histórico de gastos.</p>
                    <Link to={createPageUrl('NovoSinistro')}>
                      <Button className="bg-orange-600 hover:bg-orange-700">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Registrar Primeiro Sinistro
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhum sinistro encontrado</h3>
                    <p className="text-slate-500">Tente ajustar os filtros ou registre um novo sinistro.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">Número</TableHead>
                      <TableHead className="font-semibold text-slate-700">Filial</TableHead>
                      <TableHead className="font-semibold text-slate-700">Apólice</TableHead>
                      <TableHead className="font-semibold text-slate-700">Placa</TableHead>
                      <TableHead className="font-semibold text-slate-700">CPF/CNPJ</TableHead>
                      <TableHead className="font-semibold text-slate-700">Dt_Ocorr_Sinistro</TableHead>
                      <TableHead className="font-semibold text-slate-700">Dt_Av_Sinistro</TableHead>
                      <TableHead className="font-semibold text-slate-700">Tipo de Sinistro</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Estimat_Inicial</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Franquia</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Valor Indenização</TableHead>
                      <TableHead className="font-semibold text-slate-700">Movimentação</TableHead>
                      <TableHead className="font-semibold text-slate-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSinistros.map((sinistro) => {
                      const gastosReais = calcularTotalGastos(sinistro.id);
                      const previsao = sinistro.valor_inicial || 0;
                      return (
                        <TableRow key={sinistro.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono font-semibold text-sm">
                            {sinistro.numero_sinistro}
                          </TableCell>
                          <TableCell>
                            {sinistro.filial_nome ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                filiais.find(f => f.id === sinistro.filial_id)?.tipo === 'matriz'
                                  ? 'border border-blue-200 bg-blue-50 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>{sinistro.filial_nome}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {sinistro.numero_apolice}
                          </TableCell>
                          <TableCell className="font-mono text-sm font-semibold">
                            {maskPII(apolicesMap[sinistro.id_apolice]?.id_objeto)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {maskPII(sinistro.cpf_segurado)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(sinistro.data_sinistro), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {sinistro.data_abertura ? format(new Date(sinistro.data_abertura), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={PRODUTOS_INFO[sinistro.produto_sinistrado]?.color}>
                              {PRODUTOS_INFO[sinistro.produto_sinistrado]?.nome}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            R$ {previsao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-700">
                            R$ {(sinistro.franquia || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-slate-500">Prev: R$ {previsao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              <span className={`text-sm font-semibold ${gastosReais > previsao ? 'text-red-600' : 'text-green-600'}`}>
                                Real: R$ {gastosReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={STATUS_INFO[sinistro.status]?.color}>
                              {STATUS_INFO[sinistro.status]?.nome}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Link to={createPageUrl(`SinistroDetalhes?id=${sinistro.id}`)}>
                                <Button size="sm" variant="outline" className="hover:bg-blue-50">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Ver
                                </Button>
                              </Link>
                              <Link to={createPageUrl(`EditarSinistro?id=${sinistro.id}`)}>
                                <Button size="sm" variant="outline" className="hover:bg-orange-50 border-orange-200 text-orange-700">
                                  <Edit className="w-3 h-3 mr-1" />
                                  Editar
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}