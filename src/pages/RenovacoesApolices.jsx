import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  Search, 
  RefreshCw, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";


const PRODUTOS_LABELS = {
  FR: "F&R",
  COL_PARCIAL: "Col.P",
  COL_TOTAL: "Col.T",
  INCENDIO: "Inc.",
  RCFV: "RCF-V"
};

const PRODUTOS_COLORS = {
  FR: "bg-red-100 text-red-700 border-red-200",
  COL_PARCIAL: "bg-blue-100 text-blue-700 border-blue-200",
  COL_TOTAL: "bg-purple-100 text-purple-700 border-purple-200",
  INCENDIO: "bg-orange-100 text-orange-700 border-orange-200",
  RCFV: "bg-green-100 text-green-700 border-green-200"
};

export default function RenovacoesApolices() {
  const [apolices, setApolices] = useState([]);
  const [filteredApolices, setFilteredApolices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("nao_renovadas");

  useEffect(() => {
    loadApolices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [apolices, searchTerm, filtroStatus]);

  const loadApolices = async () => {
    try {
      setIsLoading(true);
      const data = await base44.entities.Apolice.filter({ natureza_movimento: { $ne: "Cancelamento" } }, "-data_fim_apolice");
      setApolices(data);
    } catch (error) {
      console.error("Erro ao carregar apólices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...apolices];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(apolice => 
        apolice.numero_apolice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apolice.id_segurado?.includes(searchTerm) ||
        apolice.id_beneficiario?.includes(searchTerm)
      );
    }

    // Filtro de status de renovação
    if (filtroStatus === "nao_renovadas") {
      filtered = filtered.filter(a => !a.renovada);
    } else if (filtroStatus === "renovadas") {
      filtered = filtered.filter(a => a.renovada);
    }

    // Ordenar por data de vencimento (mais próximas primeiro)
    filtered.sort((a, b) => {
      const dateA = new Date(a.data_fim_apolice);
      const dateB = new Date(b.data_fim_apolice);
      return dateA - dateB;
    });

    setFilteredApolices(filtered);
  };

  const getUrgenciaColor = (apolice) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dataFim = new Date(apolice.data_fim_apolice);
    dataFim.setHours(0, 0, 0, 0);
    const diasParaVencer = differenceInDays(dataFim, now);

    if (apolice.renovada) return "bg-green-50";
    if (diasParaVencer < 0) return "bg-red-50";
    if (diasParaVencer <= 3) return "bg-orange-50";
    if (diasParaVencer <= 7) return "bg-yellow-50";
    return "bg-white";
  };

  const getUrgenciaBadge = (apolice) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dataFim = new Date(apolice.data_fim_apolice);
    dataFim.setHours(0, 0, 0, 0);
    const diasParaVencer = differenceInDays(dataFim, now);

    if (apolice.renovada) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">✓ Renovada</Badge>;
    }
    if (diasParaVencer < 0) {
      return <Badge className="bg-red-100 text-red-800 border-red-200">⚠ Vencida há {Math.abs(diasParaVencer)}d</Badge>;
    }
    if (diasParaVencer === 0) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">🔥 Vence HOJE</Badge>;
    }
    if (diasParaVencer <= 3) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200">⚠ Vence em {diasParaVencer}d</Badge>;
    }
    if (diasParaVencer <= 7) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">🔔 Vence em {diasParaVencer}d</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Vence em {diasParaVencer}d</Badge>;
  };

  const calcularEstatisticas = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const naoRenovadas = apolices.filter(a => 
      !a.renovada && 
      !a.cancelada_para_revisao && 
      a.status !== 'cancelada'
    );

    const vencidas = naoRenovadas.filter(a => {
      const dataFim = new Date(a.data_fim_apolice);
      dataFim.setHours(0, 0, 0, 0);
      return dataFim < now;
    });

    const venceHoje = naoRenovadas.filter(a => {
      const dataFim = new Date(a.data_fim_apolice);
      dataFim.setHours(0, 0, 0, 0);
      return differenceInDays(dataFim, now) === 0;
    });

    const proximos7 = naoRenovadas.filter(a => {
      const dataFim = new Date(a.data_fim_apolice);
      dataFim.setHours(0, 0, 0, 0);
      const dias = differenceInDays(dataFim, now);
      return dias >= 0 && dias <= 7;
    });

    const renovadas = apolices.filter(a => a.renovada);

    const taxaRenovacao = apolices.length > 0 
      ? ((renovadas.length / apolices.length) * 100).toFixed(1)
      : 0;

    return {
      vencidas: vencidas.length,
      venceHoje: venceHoje.length,
      proximos7: proximos7.length,
      renovadas: renovadas.length,
      taxaRenovacao
    };
  };

  const stats = calcularEstatisticas();

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-8 h-8 text-green-600" />
              Renovações de Apólices
            </h1>
            <p className="text-slate-600">
              Gerencie renovações e acompanhe vencimentos
            </p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-semibold uppercase">Vencidas</p>
                  <p className="text-2xl font-bold text-red-700">{stats.vencidas}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-semibold uppercase">Vence Hoje</p>
                  <p className="text-2xl font-bold text-orange-700">{stats.venceHoje}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-semibold uppercase">Próximos 7 dias</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.proximos7}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-semibold uppercase">Renovadas</p>
                  <p className="text-2xl font-bold text-green-700">{stats.renovadas}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase">Taxa Renovação</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.taxaRenovacao}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-sm border-blue-100">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Busca */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por número, CPF/CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filtro de Status */}
              <Select 
                value={filtroStatus} 
                onValueChange={setFiltroStatus}
              >
                <SelectTrigger className="w-40 border-slate-200 focus:border-blue-500">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="nao_renovadas">Não renovadas</SelectItem>
                  <SelectItem value="renovadas">Renovadas</SelectItem>
                </SelectContent>
              </Select>

              {/* Botão Atualizar */}
              <Button 
                onClick={loadApolices}
                variant="outline"
                className="hover:bg-blue-50 border-blue-200"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <Card className="shadow-sm border-blue-100">
          <CardHeader className="border-b border-blue-100">
            <CardTitle>
              {filteredApolices.length} apólice(s) encontrada(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredApolices.length === 0 ? (
              <div className="p-12 text-center">
                <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  Nenhuma apólice encontrada
                </h3>
                <p className="text-slate-500">
                  Tente ajustar os filtros de busca.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">Número</TableHead>
                      <TableHead className="font-semibold text-slate-700">Segurado</TableHead>
                      <TableHead className="font-semibold text-slate-700">Vigência</TableHead>
                      <TableHead className="font-semibold text-slate-700">Vencimento</TableHead>
                      <TableHead className="font-semibold text-slate-700">Produtos</TableHead>
                      <TableHead className="font-semibold text-slate-700">Prêmio</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApolices.map((apolice) => (
                      <TableRow key={apolice.id} className={`transition-colors ${getUrgenciaColor(apolice)}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-semibold">{apolice.numero_apolice}</span>
                            {apolice.numero_renovacao > 0 && (
                              <span className="text-xs text-green-600">Renov. #{apolice.numero_renovacao}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium text-slate-700">{apolice.id_segurado}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-600">
                            {apolice.data_inicio_apolice ? format(new Date(apolice.data_inicio_apolice + 'T00:00:00'), "dd/MM/yyyy") : "—"} - {apolice.data_fim_apolice ? format(new Date(apolice.data_fim_apolice + 'T00:00:00'), "dd/MM/yyyy") : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getUrgenciaBadge(apolice)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {(apolice.produtos || []).map(produto => (
                              <Badge 
                                key={produto}
                                variant="secondary"
                                className={`text-xs px-1.5 py-0.5 ${PRODUTOS_COLORS[produto]}`}
                              >
                                {PRODUTOS_LABELS[produto]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-900">
                            R$ {(apolice.premio_bruto_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {apolice.renovada ? (
                            <Link 
                              to={createPageUrl(`ApoliceDetalhes?id=${apolice.id_apolice_renovacao}`)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Ver nova apólice →
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-500">Pendente</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link to={createPageUrl(`ApoliceDetalhes?id=${apolice.id}`)} target="_blank">
                              <Button size="sm" variant="outline" className="hover:bg-slate-50">
                                <Eye className="w-3 h-3 mr-1" />
                                Ver
                              </Button>
                            </Link>
                            {!apolice.renovada && (
                              <Link to={createPageUrl(`RenovarApolice?id=${apolice.id}`)}>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Renovar
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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