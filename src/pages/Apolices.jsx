import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Search, PlusCircle, Download } from "lucide-react";
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
  const [apolices, setApolices] = useState([]);
  const [filteredApolices, setFilteredApolices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtro, setFiltro] = useState({ tipo: "rapido", valor: "todo_periodo" });
  const [filtroMovimentacao, setFiltroMovimentacao] = useState("todas");

  useEffect(() => {
    loadApolices();
  }, []);

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

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(apolice => 
        apolice.numero_apolice?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apolice.id_segurado?.includes(searchTerm) ||
        apolice.id_beneficiario?.includes(searchTerm)
      );
    }

    // Filtro de período - por data_inicio_apolice (vigência)
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

    setFilteredApolices(filtered);
  }, [apolices, searchTerm, filtro, filtroMovimentacao]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]); // Now depends on the memoized applyFilters

  const loadApolices = async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Carregando apólices...");
      const data = await base44.entities.Apolice.list();
      console.log("✅ Apólices carregadas:", data.length);
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

    // Preparar dados para Excel
    const dadosExcel = filteredApolices.map(apolice => {
      // Converter datas para objetos Date válidos
      const dataInicio = apolice.data_inicio_apolice ? new Date(apolice.data_inicio_apolice) : null;
      const dataFim = apolice.data_fim_apolice ? new Date(apolice.data_fim_apolice) : null;
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
        "Movimentação": getMovimentacao(apolice),
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

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por número da apólice, CPF/CNPJ..."
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