import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Shield, FileText, PlusCircle, BarChart3, Users, DollarSign, TrendingUp, AlertCircle, History, FileSpreadsheet } from "lucide-react";
import { usePermissoes } from "@/components/auth/usePermissoes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const mainNavigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: BarChart3,
    permissao: { modulo: 'dashboard', acao: 'visualizar' }
  },
  {
    title: "Apólices",
    url: createPageUrl("Apolices"),
    icon: FileText,
    permissao: { modulo: 'apolices', acao: 'visualizar' }
  },
  {
    title: "Nova Apólice",
    url: createPageUrl("NovaApolice"),
    icon: PlusCircle,
    permissao: { modulo: 'apolices', acao: 'criar' }
  },
  /* TEMPORARIAMENTE INATIVO - Sistema focado em Sinistros
  {
    title: "Renovações",
    url: createPageUrl("RenovacoesApolices"),
    icon: Shield,
    permissao: { modulo: 'apolices', acao: 'renovar' }
  },
  */
  {
    title: "Sinistros",
    url: createPageUrl("Sinistros"),
    icon: Shield,
    permissao: { modulo: 'sinistros', acao: 'visualizar' }
  },
  {
    title: "Novo Sinistro",
    url: createPageUrl("NovoSinistro"),
    icon: PlusCircle,
    permissao: { modulo: 'sinistros', acao: 'criar' }
  },
];

const financeiroItems = [
  {
    title: "Fechamentos Mensais",
    url: createPageUrl("Fechamentos"),
    icon: DollarSign,
    permissao: { modulo: 'fechamentos', acao: 'visualizar' }
  },
  {
    title: "Conciliação Financeira",
    url: createPageUrl("ConciliacaoFinanceira"),
    icon: FileSpreadsheet,
    permissao: { modulo: 'conciliacao', acao: 'visualizar' }
  },
  {
    title: "Histórico Conciliações",
    url: createPageUrl("HistoricoConciliacoes"),
    icon: History,
    permissao: { modulo: 'conciliacao', acao: 'visualizar_historico' }
  },
  {
    title: "Gestão Inadimplentes",
    url: createPageUrl("GestaoInadimplentes"),
    icon: AlertCircle,
    permissao: { modulo: 'inadimplentes', acao: 'visualizar' }
  },
  {
    title: "Análise PDD",
    url: createPageUrl("VisualizarPDD"),
    icon: TrendingUp,
    permissao: { modulo: 'pdd', acao: 'visualizar' }
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { user: currentUser, pode, loading: isLoadingUser } = usePermissoes();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50">
        <Sidebar className="border-r border-blue-100 bg-white/80 backdrop-blur-sm">
          <SidebarHeader className="border-b border-blue-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">OON Seguros</h2>
                <p className="text-xs text-blue-600 font-medium">Apólices Auto</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                Menu Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {mainNavigationItems.map((item) => {
                    if (!pode(item.permissao.modulo, item.permissao.acao)) {
                      return null;
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl p-3 ${
                            location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-600' : 'text-slate-600'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* TEMPORARIAMENTE INATIVO - Sistema focado em Sinistros
            Financeiro Section
            {!isLoadingUser && financeiroItems.some(item => pode(item.permissao.modulo, item.permissao.acao)) && (
              <SidebarGroup className="mt-6">
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  🔥 Financeiro
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {financeiroItems.map((item) => {
                      if (!pode(item.permissao.modulo, item.permissao.acao)) {
                        return null;
                      }

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            className={`hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 rounded-xl p-3 ${
                              location.pathname === item.url ? 'bg-orange-50 text-orange-700 font-semibold border-l-4 border-orange-600' : 'text-slate-600'
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3">
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
            */}

            {/* Admin Section */}
            {!isLoadingUser && pode('usuarios', 'visualizar') && (
              <SidebarGroup className="mt-6">
                <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-3">
                  Administração
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-purple-50 hover:text-purple-700 transition-all duration-200 rounded-xl p-3 ${
                          location.pathname === createPageUrl("GestaoUsuarios") ? 'bg-purple-50 text-purple-700 font-semibold border-l-4 border-purple-600' : 'text-slate-600'
                        }`}
                      >
                        <Link to={createPageUrl("GestaoUsuarios")} className="flex items-center gap-3">
                          <Users className="w-5 h-5" />
                          <span className="font-medium">Gestão de Usuários</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b border-blue-100 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-blue-50 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-slate-900">OON Seguros</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}