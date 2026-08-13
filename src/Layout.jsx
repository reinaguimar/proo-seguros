import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  Shield, 
  FileText, 
  PlusCircle, 
  BarChart3, 
  Users, 
  DollarSign, 
  Bell, 
  Search,
  CreditCard,
  History,
  AlertTriangle,
  FileSearch,
  Building2,
  Layers,
  Heart,
  BookOpen,
} from "lucide-react";
import { usePermissoes } from "@/components/auth/usePermissoes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
  SidebarFooter,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "VISÃO GERAL",
    items: [
      { title: "Dashboard", url: createPageUrl("Dashboard"), icon: BarChart3 },
    ],
  },
  {
    label: "OPERACIONAL",
    items: [
      { title: "Apólices", url: createPageUrl("Apolices"), icon: FileText },
      { title: "Nova Apólice", url: createPageUrl("NovaApolice"), icon: PlusCircle },
      { title: "Emissão em Lote", url: createPageUrl("EmissaoLote"), icon: Layers },
      { title: "Renovações", url: createPageUrl("RenovacoesApolices"), icon: Shield },
      { title: "Sinistros", url: createPageUrl("Sinistros"), icon: Shield },
      { title: "Novo Sinistro", url: createPageUrl("NovoSinistro"), icon: PlusCircle },
    ],
  },
  {
    label: "FINANCEIRO",
    items: [
      { title: "Fechamentos", url: createPageUrl("Fechamentos"), icon: DollarSign },
      { title: "Borderô Contábil", url: "/bordero-contabil", icon: BookOpen },
    ],
  },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { user: currentUser, pode, loading: isLoadingUser } = usePermissoes();
  const userNome = currentUser?.nome || currentUser?.name || "Usuário";
  const userCargo = currentUser?.cargo || "Designer";
  const [matriz, setMatriz] = useState(null);

  useEffect(() => {
    const carregarMatriz = async () => {
      try {
        const matrizes = await base44.entities.Filial.filter({ tipo: "matriz" });
        setMatriz(matrizes[0] || null);
      } catch {
        setMatriz(null);
      }
    };
    carregarMatriz();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <Sidebar className="border-r border-sidebar-border/70 bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
          <SidebarHeader className="border-b border-sidebar-border/70 px-6 py-6">
            <div className="flex items-center gap-3">
              {matriz?.logo_url ? (
                <img
                  src={matriz.logo_url}
                  alt={matriz.nome}
                  className="w-11 h-11 rounded-xl object-contain p-1"
                  style={{ backgroundColor: matriz.cor_primaria || "transparent" }}
                />
              ) : matriz?.cor_primaria ? (
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: matriz.cor_primaria }}
                >
                  <Shield className="w-6 h-6 text-white" />
                </div>
              ) : (
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="leading-tight">
                <h2 className="font-semibold text-base" style={{ color: matriz?.cor_texto_cabecalho || "#ffffff" }}>
                  {matriz?.nome || "Painel"}
                </h2>
                <p className="text-xs font-medium" style={{ color: matriz?.cor_texto_cabecalho || "#bfdbfe" }}>
                  Painel seguro
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="px-4 py-6 space-y-6">
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] px-3 py-2">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`group relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                                : 'text-slate-200 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3">
                              <span className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 ${
                                isActive ? 'border-white/20 bg-white/10 text-white' : ''
                              }`}>
                                <item.icon className="w-5 h-5" />
                              </span>
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                          {isActive && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-blue-400" />}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}

            {!isLoadingUser && pode('usuarios', 'visualizar') && (
              <SidebarGroup className="pt-2 border-t border-sidebar-border/50">
                <SidebarGroupLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.12em] px-3 py-2">
                  Administração
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {[
                      { title: "Gestão de Usuários", url: createPageUrl("GestaoUsuarios"), Icon: Users },
                      { title: "Gestão de Filiais", url: createPageUrl("GestaoFiliais"), Icon: Building2 },
                      { title: "Configurações", url: createPageUrl("Configuracoes"), Icon: Building2 },
                      { title: "Saúde do Sistema", url: createPageUrl("SaudeSistema"), Icon: Heart },
                    ].map(({ title, url, Icon }) => {
                      const isActive = location.pathname === url;
                      return (
                        <SidebarMenuItem key={title}>
                          <SidebarMenuButton
                            asChild
                            className={`group relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                              isActive
                                ? 'bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                                : 'text-slate-200 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <Link to={url} className="flex items-center gap-3">
                              <span className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 ${isActive ? 'border-white/20 bg-white/10 text-white' : ''}`}>
                                <Icon className="w-5 h-5" />
                              </span>
                              <span className="font-medium">{title}</span>
                            </Link>
                          </SidebarMenuButton>
                          {isActive && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-blue-400" />}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="px-4 pb-6">
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-white/20">
                <AvatarImage src={currentUser?.avatar} alt={userNome} />
                <AvatarFallback className="bg-blue-500/30 text-white">
                  {userNome.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-white">{userNome}</p>
                <p className="text-xs text-slate-300">{userCargo}</p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-sm">
            <div className="flex items-center justify-between px-5 lg:px-8 py-4 gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="md:hidden text-slate-500 hover:text-[hsl(var(--foreground))] h-10 w-10 rounded-full border border-slate-200" />
                <div className="hidden md:block">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Buscar no painel"
                      className="w-80 bg-slate-50 border-slate-200 pl-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="h-10 w-10 rounded-full border border-slate-200 bg-white shadow-sm text-slate-500 hover:text-[hsl(var(--foreground))] hover:border-slate-300 transition-colors">
                  <Bell className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                  <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                    <AvatarImage src={currentUser?.avatar} alt={userNome} />
                    <AvatarFallback>{userNome.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block leading-tight">
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{userNome}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{userCargo}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto px-4 py-6 lg:px-8 bg-[hsl(var(--background))]">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}