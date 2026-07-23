import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  FileText, 
  PlusCircle, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Shield,
  RefreshCw,
  Percent,
  AlertCircle,
  XCircle
} from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";

import StatsCard from "../components/dashboard/StatsCard";
import RecentPolicies from "../components/dashboard/RecentPolicies";
import MonthlyChart from "../components/dashboard/MonthlyChart";
import PeriodFilter from "../components/dashboard/PeriodFilter";

export default function Dashboard() {
  const [apolices, setApolices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtro, setFiltro] = useState({ tipo: "rapido", valor: "mes_atual" });
  const [stats, setStats] = useState({
    segurosNovos: 0,
    renovacoes: 0,
    carteiraVigente: 0,
    premioTotal: 0,
    premioMedio: 0,
    inadimplencia: 0,
    canceladas: 0
  });

  useEffect(() => {
    loadData();
  }, [filtro]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      console.log("Carregando apólices do Dashboard...");
      console.log("Base44 client:", base44);
      
      const allData = await base44.entities.Apolice.list();
      console.log("Apólices carregadas com sucesso:", allData.length);
      
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
      
      // Filtrar apólices que INICIARAM vigência no período
      const data = allData.filter(a => {
        if (!a.data_inicio_apolice) return false;
        const dataInicioApolice = new Date(a.data_inicio_apolice);
        return dataInicioApolice >= dataInicio && dataInicioApolice <= dataFim;
      });
      
      setApolices(data);

      // Seguros Novos (excluindo canceladas)
      const segurosNovosApolices = data.filter(a => 
        (a.numero_renovacao === 0 || !a.renovacao_de) && !a.cancelada_para_revisao
      );
      const segurosNovos = segurosNovosApolices.length;

      // Renovações (excluindo canceladas)
      const renovacoesApolices = data.filter(a => 
        a.numero_renovacao > 0 && a.renovacao_de && !a.cancelada_para_revisao
      );
      const renovacoes = renovacoesApolices.length;

      // Carteira Vigente Total = Seguros Novos + Renovações
      const carteiraVigenteApolices = [...segurosNovosApolices, ...renovacoesApolices];
      const carteiraVigente = carteiraVigenteApolices.length;

      // Prêmio Total de TODAS as apólices do período (incluindo canceladas)
      const premioTotal = data.reduce((sum, a) => 
        sum + (a.premio_bruto_total || 0), 0
      );

      // Prêmio Médio de todas as apólices do período
      const premioMedio = data.length > 0 
        ? premioTotal / data.length 
        : 0;

      // Inadimplência da Carteira Vigente (vencidas não renovadas)
      const inadimplencia = carteiraVigenteApolices.filter(a => {
        const fim = new Date(a.data_fim_apolice);
        fim.setHours(0, 0, 0, 0);
        return fim < hoje && !a.renovada;
      }).length;

      // Apólices Canceladas (do período filtrado)
      const canceladas = data.filter(a => a.cancelada_para_revisao === true).length;

      setStats({
        segurosNovos,
        renovacoes,
        carteiraVigente,
        premioTotal,
        premioMedio,
        inadimplencia,
        canceladas
      });
    } catch (error) {
      console.error("❌ Erro ao carregar dados do Dashboard");
      console.error("Tipo do erro:", error.constructor.name);
      console.error("Mensagem:", error.message);
      console.error("Stack:", error.stack);
      console.error("Erro completo:", error);
      
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      
      if (error.name === 'Base44Error') {
        console.error("É um Base44Error - possível problema de autenticação ou CORS");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2">
              Dashboard
            </h1>
            <p className="text-slate-600 text-lg">
              Visão geral das apólices e sinistros
            </p>
          </div>
          <div className="flex gap-3 items-center flex-wrap">
            <PeriodFilter onFilterChange={setFiltro} />
            <Link to={createPageUrl("NovaApolice")}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3">
                <PlusCircle className="w-5 h-5 mr-2" />
                Nova Apólice
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <StatsCard
            title="Seguros Novos"
            value={stats.segurosNovos}
            icon={FileText}
            bgColor="bg-blue-500"
            isLoading={isLoading}
          />
          <StatsCard
            title="Renovações"
            value={stats.renovacoes}
            icon={RefreshCw}
            bgColor="bg-green-500"
            isLoading={isLoading}
          />
          <StatsCard
            title="Carteira Vigente Total"
            value={stats.carteiraVigente}
            icon={Shield}
            bgColor="bg-purple-500"
            isLoading={isLoading}
          />
          <StatsCard
            title="Apólices Canceladas"
            value={stats.canceladas}
            icon={XCircle}
            bgColor="bg-gray-500"
            isLoading={isLoading}
          />
          <StatsCard
            title="Prêmio Total"
            value={`R$ ${stats.premioTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            bgColor="bg-yellow-500"
            isLoading={isLoading}
          />
          <StatsCard
            title="Prêmio Médio"
            value={`R$ ${stats.premioMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={Percent}
            bgColor="bg-orange-500"
            isLoading={isLoading}
          />
          <StatsCard
            title="Inadimplência"
            value={stats.inadimplencia}
            icon={AlertCircle}
            bgColor="bg-red-500"
            isLoading={isLoading}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <RecentPolicies 
              apolices={apolices}
              isLoading={isLoading}
              onRefresh={loadData}
            />
          </div>
          
          <div className="space-y-6">
            <MonthlyChart apolices={apolices} isLoading={isLoading} />
            
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Ações Rápidas
              </h3>
              <div className="space-y-3">
                <Link to={createPageUrl("NovaApolice")}>
                  <Button variant="outline" className="w-full justify-start hover:bg-blue-50 hover:border-blue-200">
                    <PlusCircle className="w-4 h-4 mr-3" />
                    Criar nova apólice
                  </Button>
                </Link>
                <Link to={createPageUrl("Apolices")}>
                  <Button variant="outline" className="w-full justify-start hover:bg-green-50 hover:border-green-200">
                    <FileText className="w-4 h-4 mr-3" />
                    Ver todas as apólices
                  </Button>
                </Link>
                <Link to={createPageUrl("NovoSinistro")}>
                  <Button variant="outline" className="w-full justify-start hover:bg-orange-50 hover:border-orange-200">
                    <Shield className="w-4 h-4 mr-3" />
                    Registrar sinistro
                  </Button>
                </Link>
                <Link to={createPageUrl("Sinistros")}>
                  <Button variant="outline" className="w-full justify-start hover:bg-red-50 hover:border-red-200">
                    <Shield className="w-4 h-4 mr-3" />
                    Ver todos os sinistros
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}