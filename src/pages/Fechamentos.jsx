import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  PlusCircle, 
  Search, 
  FileText, 
  Clock, 
  CheckCircle, 
  Lock,
  Eye,
  Calendar
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "../components/fechamento/StatusBadge";
import { podeCriarFechamento } from "../components/fechamento/permissoes";

export default function Fechamentos() {
  const [fechamentos, setFechamentos] = useState([]);
  const [filteredFechamentos, setFilteredFechamentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAno, setFiltroAno] = useState("todos");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [fechamentos, searchTerm, filtroStatus, filtroAno]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const data = await base44.entities.FechamentoMensal.list("-created_date");
      setFechamentos(data);
    } catch (error) {
      console.error("Erro ao carregar fechamentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...fechamentos];

    if (searchTerm) {
      filtered = filtered.filter(f =>
        `${f.competencia_mes}/${f.competencia_ano}`.includes(searchTerm) ||
        f.auditor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filtroStatus !== "todos") {
      filtered = filtered.filter(f => f.status === filtroStatus);
    }

    if (filtroAno !== "todos") {
      filtered = filtered.filter(f => f.competencia_ano === parseInt(filtroAno));
    }

    setFilteredFechamentos(filtered);
  };

  const calcularEstatisticas = () => {
    return {
      rascunho: fechamentos.filter(f => f.status === 'rascunho').length,
      auditado: fechamentos.filter(f => f.status === 'auditado').length,
      aprovado_mga: fechamentos.filter(f => f.status === 'aprovado_mga').length,
      fechado: fechamentos.filter(f => f.status === 'fechado' || f.status === 'aprovado_seguradora').length
    };
  };

  const stats = calcularEstatisticas();
  const anosDisponiveis = [...new Set(fechamentos.map(f => f.competencia_ano))].sort((a, b) => b - a);

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Fechamentos Mensais
            </h1>
            <p className="text-slate-600">
              Borderô de prestação de contas mensal
            </p>
          </div>
          {user && podeCriarFechamento(user) && (
            <Link to={createPageUrl("NovoFechamento")}>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                <PlusCircle className="w-4 h-4 mr-2" />
                Novo Fechamento
              </Button>
            </Link>
          )}
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase">Rascunho</p>
                  <p className="text-2xl font-bold text-gray-700">{stats.rascunho}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-semibold uppercase">Auditado</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.auditado}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-semibold uppercase">Aguardando</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.aprovado_mga}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-semibold uppercase">Fechado</p>
                  <p className="text-2xl font-bold text-green-700">{stats.fechado}</p>
                </div>
                <Lock className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="shadow-sm border-blue-100">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar por competência ou auditor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-200"
                  />
                </div>
              </div>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="auditado">Auditado</SelectItem>
                  <SelectItem value="aprovado_mga">Aprovado MGA</SelectItem>
                  <SelectItem value="aprovado_seguradora">Aprovado Seguradora</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {anosDisponiveis.map(ano => (
                    <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="shadow-sm border-blue-100">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredFechamentos.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">
                  Nenhum fechamento encontrado
                </h3>
                <p className="text-slate-500 mb-4">
                  Ajuste os filtros ou crie um novo fechamento.
                </p>
                {user && podeCriarFechamento(user) && (
                  <Link to={createPageUrl("NovoFechamento")}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Criar Primeiro Fechamento
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-slate-700">Competência</TableHead>
                      <TableHead className="font-semibold text-slate-700">Status</TableHead>
                      <TableHead className="font-semibold text-slate-700">Auditor</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Prêmio Bruto</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Saldo Técnico</TableHead>
                      <TableHead className="font-semibold text-slate-700">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFechamentos.map((fechamento) => (
                      <TableRow key={fechamento.id} className="hover:bg-slate-50">
                        <TableCell>
                          <span className="font-mono font-semibold">
                            {String(fechamento.competencia_mes).padStart(2, '0')}/{fechamento.competencia_ano}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={fechamento.status} />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{fechamento.auditor_nome || '-'}</span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {(fechamento.premio_emitido_bruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className={fechamento.saldo_tecnico_liquido >= 0 ? 'text-green-600' : 'text-red-600'}>
                            R$ {(fechamento.saldo_tecnico_liquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link to={createPageUrl(`FechamentoDetalhes?id=${fechamento.id}`)}>
                            <Button size="sm" variant="outline" className="hover:bg-blue-50">
                              <Eye className="w-3 h-3 mr-1" />
                              Ver
                            </Button>
                          </Link>
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