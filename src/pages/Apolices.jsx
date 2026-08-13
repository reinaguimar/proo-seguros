import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { usePermissoes } from "../components/auth/usePermissoes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, PlusCircle, Download, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import PoliciesTable from "../components/apolices/PoliciesTable";
import PeriodFilter from "../components/dashboard/PeriodFilter";

export default function Apolices() {
  const { pode, user: currentUser, loading: loadingPermissions } = usePermissoes();
  const [apolices, setApolices] = useState([]);
  const [filiaisDisponiveis, setFiliaisDisponiveis] = useState([]);
  const [filialCtx, setFilialCtx] = useState("todas");
  const [filteredApolices, setFilteredApolices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState({ tipo: "rapido", valor: "todo_periodo" });
  const [filtroMovimentacao, setFiltroMovimentacao] = useState("todas");
  const [quickFilter, setQuickFilter] = useState("todas");
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);

  const filiaisPermitidas = currentUser?.filiais_permitidas || [];
  const isGlobal = filiaisPermitidas.length === 0;
  const isUmaFilial = filiaisPermitidas.length === 1;
  const showSeletor = isGlobal || filiaisPermitidas.length >= 2;

  useEffect(() => {
    if (!loadingPermissions) {
      loadApolices();
      base44.entities.Filial.filter({ ativo: true }).then(all => {
        const vis = isGlobal ? all : all.filter(f => filiaisPermitidas.includes(f.id));
        setFiliaisDisponiveis(vis);
        if (isUmaFilial && filiaisPermitidas.length === 1) setFilialCtx(filiaisPermitidas[0]);
      }).catch(() => {});
    }
  }, [loadingPermissions, currentUser?.id]);

  const getMovimentacao = (apolice) => {
    if (apolice.cancelada_para_revisao || apolice.status === 'cancelada') {
      return 'Cancelada';
    }
    if (apolice.renovada === true) {
      return 'Renovada';
    }
    return 'Emitida';
  };

  const applyFilters = useCallback(() => {
    let filtered = [...apolices];
    const hasSearch = searchTerm.trim().length > 0;

    // Quando há busca ativa, ignora filtros de canceladas/vigência/período/movimentação
    // para que o usuário sempre encontre a apólice pesquisada
    if (!hasSearch) {
      // Ocultar canceladas por padrão
      if (!mostrarCanceladas) {
        filtered = filtered.filter(a => a.status !== 'cancelada');
      }

      // Quick filter de vigência
      if (quickFilter !== 'todas') {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const em30 = new Date(now); em30.setDate(em30.getDate() + 30);
        filtered = filtered.filter(a => {
          if (!a.data_fim_apolice) return false;
          const d = new Date(a.data_fim_apolice);
          if (quickFilter === 'ativas') return d >= now && !a.cancelada_para_revisao;
          if (quickFilter === 'vencendo30') return d >= now && d <= em30;
          if (quickFilter === 'vencidas') return d < now;
          return true;
        });
      }
    }

    // Filtro automático por filiais permitidas
    if (!isGlobal) {
      filtered = filtered.filter(a => filiaisPermitidas.includes(a.filial_id));
    }
    // Filtro pela pill selecionada
    if (filialCtx !== "todas") {
      filtered = filtered.filter(a => a.filial_id === filialCtx);
    }

    // Filtro de busca — normaliza CPF/CNPJ e número de apólice (remove pontuação)
    if (hasSearch) {
      const term = searchTerm.toLowerCase().trim();
      const termDigits = searchTerm.replace(/\D/g, '');
      filtered = filtered.filter(apolice => {
        const num = (apolice.numero_apolice || '').toLowerCase();
        const numDigits = (apolice.numero_apolice || '').replace(/\D/g, '');
        const segurado = (apolice.id_segurado || '').toLowerCase();
        const seguradoDigits = (apolice.id_segurado || '').replace(/\D/g, '');
        const beneficiario = (apolice.id_beneficiario || '').toLowerCase();
        const beneficiarioDigits = (apolice.id_beneficiario || '').replace(/\D/g, '');
        const placa = (apolice.id_objeto || '').toLowerCase();
        return num.includes(term) ||
               (termDigits && numDigits.includes(termDigits)) ||
               segurado.includes(term) ||
               (termDigits && seguradoDigits.includes(termDigits)) ||
               beneficiario.includes(term) ||
               (termDigits && beneficiarioDigits.includes(termDigits)) ||
               placa.includes(term);
      });
    }

    // Filtro de período - por data_inicio_apolice (vigência)
    if (!hasSearch) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      let dataInicio, dataFim;

      if (filtro.tipo === "rapido") {
        dataInicio = new Date();
        dataInicio.setHours(0, 0, 0, 0);
        dataFim = new Date(hoje);

        switch(filtro.valor) {
          case "mes_atual":
            dataInicio = startOfMonth(hoje);
            break;
          case "ultimos_3_meses":
            dataInicio.setMonth(hoje.getMonth() - 3);
            break;
          case "ultimos_6_meses":
            dataInicio.setMonth(hoje.getMonth() - 6);
            break;
          case "ano_atual":
            dataInicio = new Date(hoje.getFullYear(), 0, 1);
            break;
          case "todo_periodo":
            dataInicio = new Date(0);
            break;
          default:
            dataInicio = startOfMonth(hoje);
        }
      } else if (filtro.tipo === "intervalo") {
        dataInicio = filtro.dataInicio;
        dataFim = filtro.dataFim;
      }

      if (filtro.valor !== "todo_periodo") {
        filtered = filtered.filter(a => {
          if (!a.data_inicio_apolice) return false;
          const dataInicioApolice = new Date(a.data_inicio_apolice);
          return dataInicioApolice >= dataInicio && dataInicioApolice <= dataFim;
        });
      }

      // Filtro de movimentação
      if (filtroMovimentacao !== "todas") {
        filtered = filtered.filter(a => getMovimentacao(a) === filtroMovimentacao);
      }
    }

    setFilteredApolices(filtered);
  }, [apolices, searchTerm, filtro, filtroMovimentacao, filialCtx, isGlobal, filiaisPermitidas.join(','), quickFilter, mostrarCanceladas]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]); // Now depends on the memoized applyFilters

  const loadApolices = async () => {
    if (!pode('apolices', 'visualizar')) {
      console.log("Usuário sem permissão para visualizar apólices");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("🔄 Carregando apólices...");
      const data = await base44.entities.Apolice.filter({ natureza_movimento: { $ne: "Cancelamento" } });
      console.log("✅ Apólices carregadas:", data.length);
      // Separar canceladas — exibidas apenas se toggle ativo
      setApolices(data);
    } catch (error) {
      console.error("❌ Erro ao carregar apólices");
      console.error("Tipo:", error.constructor.name);
      console.error("Mensagem:", error.message);
      console.error("Erro completo:", error);
      
      if (error.response) {
        console.error("Response:", error.response);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    // Gerar nome do arquivo com período
    let nomeArquivo = 'apolices';
    if (filtro.tipo === "intervalo") {
      const dataIni = format(filtro.dataInicio, "yyyy-MM-dd");
      const dataFim = format(filtro.dataFim, "yyyy-MM-dd");
      nomeArquivo = `apolices_${dataIni}_a_${dataFim}`;
    } else if (filtro.valor !== "todo_periodo") {
      nomeArquivo = `apolices_${filtro.valor}_${new Date().toISOString().split('T')[0]}`;
    } else {
      nomeArquivo = `apolices_${new Date().toISOString().split('T')[0]}`;
    }

    // Preparar dados para Excel — respeitar toggle de canceladas
    const apolicesParaExportar = filteredApolices.filter(a =>
      a.natureza_movimento !== "Cancelamento" && (mostrarCanceladas || a.status !== 'cancelada')
    );

    const mapMovimentacao = (natureza) => {
      if (!natureza || natureza === "01") return "Original";
      return natureza; // "Renovação", "Emissão", etc. — exibe o valor real
    };

    const dadosExcel = apolicesParaExportar.map(apolice => {
      // Usar T00:00:00 para evitar offset UTC nas datas de vigência
      const dataInicio = apolice.data_inicio_apolice ? new Date(apolice.data_inicio_apolice + 'T00:00:00') : null;
      const dataFim = apolice.data_fim_apolice ? new Date(apolice.data_fim_apolice + 'T00:00:00') : null;
      const dataCriacao = apolice.created_date ? new Date(apolice.created_date) : null;
      
      return {
        "Número": apolice.numero_apolice || "",
        "CPF do Segurado": apolice.id_segurado || "",
        "Placa": apolice.id_objeto || "",
        "Início de Vigência": dataInicio && !isNaN(dataInicio.getTime()) ? dataInicio : "",
        "Fim de Vigência": dataFim && !isNaN(dataFim.getTime()) ? dataFim : "",
        "Prêmio Bruto": apolice.premio_bruto_total || 0,
        "IOF": apolice.iof || 0,
        "Coberturas": (apolice.produtos || []).join(", "),
        "Movimentação": mapMovimentacao(apolice.natureza_movimento),
        "Data Criação": dataCriacao && !isNaN(dataCriacao.getTime()) ? dataCriacao : ""
      };
    });

    // Criar planilha
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 25 }, // Número
      { wch: 18 }, // CPF do Segurado
      { wch: 12 }, // Placa
      { wch: 16 }, // Início de Vigência
      { wch: 16 }, // Fim de Vigência
      { wch: 15 }, // Prêmio Bruto
      { wch: 10 }, // IOF
      { wch: 30 }, // Coberturas
      { wch: 15 }, // Movimentação
      { wch: 15 }  // Data Criação
    ];

    // Aplicar formato de data nas colunas D, E, J (Início Vigência, Fim Vigência, Data Criação)
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      // Coluna D (índice 3): Início de Vigência
      const cellD = ws[XLSX.utils.encode_cell({ r: row, c: 3 })];
      if (cellD && cellD.v && cellD.v instanceof Date && !isNaN(cellD.v.getTime())) {
        cellD.z = 'dd/mm/yyyy';
        cellD.t = 'd';
      }
      
      // Coluna E (índice 4): Fim de Vigência
      const cellE = ws[XLSX.utils.encode_cell({ r: row, c: 4 })];
      if (cellE && cellE.v && cellE.v instanceof Date && !isNaN(cellE.v.getTime())) {
        cellE.z = 'dd/mm/yyyy';
        cellE.t = 'd';
      }
      
      // Coluna J (índice 9): Data Criação
      const cellJ = ws[XLSX.utils.encode_cell({ r: row, c: 9 })];
      if (cellJ && cellJ.v && cellJ.v instanceof Date && !isNaN(cellJ.v.getTime())) {
        cellJ.z = 'dd/mm/yyyy';
        cellJ.t = 'd';
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Apólices");

    // Download
    XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Apólices</h1>
            <p className="text-slate-600">
              {filteredApolices.length} de {apolices.length} apólices
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={filteredApolices.length === 0}
              className="hover:bg-green-50 border-green-200 text-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Link to={createPageUrl("NovaApolice")}>
              <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg">
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Apólice
              </Button>
            </Link>
          </div>
        </div>

        {/* Seletor de Filial (pills) */}
        {showSeletor && filiaisDisponiveis.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilialCtx("todas")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filialCtx === "todas" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >Todas</button>
            {filiaisDisponiveis.map(f => (
              <button key={f.id} onClick={() => setFilialCtx(f.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filialCtx === f.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >{f.nome}</button>
            ))}
          </div>
        )}
        {isUmaFilial && filiaisDisponiveis.length === 1 && (
          <div><span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">Filial: {filiaisDisponiveis[0]?.nome}</span></div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por número da apólice, CPF/CNPJ, placa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200 focus:border-blue-500"
                />
              </div>
            </div>
            <PeriodFilter onFilterChange={setFiltro} />
            <Select value={filtroMovimentacao} onValueChange={setFiltroMovimentacao}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Movimentação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="Emitida">Emitida</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
                <SelectItem value="Renovada">Renovada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick filter pills + toggle canceladas */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[{v:'todas',l:'Todas'},{v:'ativas',l:'Ativas'},{v:'vencendo30',l:'Vencendo em 30 dias'},{v:'vencidas',l:'Vencidas'}].map(({v,l}) => (
              <button key={v} onClick={() => setQuickFilter(v)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${quickFilter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="toggle-canceladas"
              checked={mostrarCanceladas}
              onCheckedChange={setMostrarCanceladas}
            />
            <Label htmlFor="toggle-canceladas" className="text-xs text-slate-500 cursor-pointer select-none flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> Mostrar canceladas
            </Label>
          </div>
        </div>

        <p className="text-xs text-slate-500">Exibindo {filteredApolices.length} apólices</p>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
          <PoliciesTable 
            apolices={filteredApolices}
            isLoading={isLoading}
            onRefresh={loadApolices}
          />
        </div>
      </div>
    </div>
  );
}