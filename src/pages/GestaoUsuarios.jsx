import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Shield, 
  User as UserIcon, 
  Calendar, 
  Mail,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Eye,
  EyeOff,
  Search,
  Play,
  UserX,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PerfilBadge from "../components/fechamento/PerfilBadge";
import { usePermissoes } from "../components/auth/usePermissoes";
import EditarPerfilModal from "../components/gestao/EditarPerfilModal";
import PerfilCard from "../components/gestao/PerfilCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PERFIS_INFO = {
  usuario: { nome: "Usuário", descricao: "Visualização básica", cor: "bg-gray-100 text-gray-800" },
  gerente: { nome: "Gerente", descricao: "Cria e edita", cor: "bg-blue-100 text-blue-800" },
  administrador: { nome: "Administrador", descricao: "Gestão completa", cor: "bg-purple-100 text-purple-800" },
  auditor: { nome: "Auditor", descricao: "Fechamentos", cor: "bg-green-100 text-green-800" },
  super_administrador: { nome: "Super Admin", descricao: "Controle total", cor: "bg-red-100 text-red-800" }
};

export default function GestaoUsuarios() {
  const { user: currentUser, pode, isPerfil, recarregar } = usePermissoes();
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [inativarDialog, setInativarDialog] = useState({ open: false, usuario: null, motivo: "" });
  const [perfisInicializados, setPerfisInicializados] = useState(false);
  const [editarPerfilModal, setEditarPerfilModal] = useState({ open: false, perfil: null });
  const [activeTab, setActiveTab] = useState("usuarios");
  const [filiais, setFiliais] = useState([]);
  const [filialDialog, setFilialDialog] = useState({ open: false, usuario: null, acesso: 'total', selecionadas: [], padrao: '' });
  const [revogarDialog, setRevogarDialog] = useState({ open: false, usuario: null, loading: false });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [usersResponse, allFiliais] = await Promise.all([
        base44.functions.invoke('listarUsuarios', {}),
        base44.entities.Filial.filter({ ativo: true }).catch(() => [])
      ]);
      setUsuarios(usersResponse.data?.usuarios || []);
      setFiliais(allFiliais);

      try {
        const allPerfis = await base44.entities.Perfil.list();
        setPerfis(allPerfis);
        setPerfisInicializados(allPerfis.length === 5);
      } catch {
        setPerfis([]);
        setPerfisInicializados(false);
      }
    } catch (err) {
      setError("Erro ao carregar dados: " + err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInicializarPerfis = async () => {
    try {
      setError(null);
      const response = await base44.functions.invoke('inicializarPerfis', {});
      
      if (response.data?.sucesso) {
        setSuccessMessage(response.data.mensagem);
        await loadData();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(response.data?.error || "Erro ao inicializar perfis");
      }
    } catch (err) {
      setError("Erro ao inicializar perfis: " + err.message);
    }
  };

  const handlePromoverSuperAdmin = async () => {
    try {
      setError(null);
      const response = await base44.functions.invoke('promoverSuperAdmin', {});
      
      if (response.data?.sucesso) {
        setSuccessMessage(response.data.mensagem + " Recarregue a página.");
        await recarregar();
        await loadData();
      } else {
        setError(response.data?.error || "Erro ao promover super admin");
      }
    } catch (err) {
      setError("Erro: " + err.message);
    }
  };

  const handleCorrigirPerfis = async () => {
    try {
      setError(null);
      setSuccessMessage("Corrigindo todos os perfis...");
      
      const response = await base44.functions.invoke('corrigirTodosPerfis', {});
      
      if (response.data?.sucesso) {
        setSuccessMessage(`✅ ${response.data.mensagem} - Recarregando em 2 segundos...`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(response.data?.error || "Erro ao corrigir perfis");
      }
    } catch (err) {
      setError("Erro: " + err.message);
    }
  };

  const handleAbrirFilialDialog = (usuario) => {
    const permitidas = usuario.filiais_permitidas || [];
    setFilialDialog({
      open: true,
      usuario,
      acesso: permitidas.length === 0 ? 'total' : 'especificas',
      selecionadas: permitidas,
      padrao: usuario.filial_id_padrao || ''
    });
  };

  const handleSalvarFiliais = async () => {
    const { usuario, acesso, selecionadas, padrao } = filialDialog;
    const filiais_permitidas = acesso === 'total' ? [] : selecionadas;
    const filial_id_padrao = acesso === 'total' ? '' : padrao;
    await base44.auth.updateMe({ id: usuario.id, filiais_permitidas, filial_id_padrao });
    // Use service role update via update entity
    await base44.entities.User.update(usuario.id, { filiais_permitidas, filial_id_padrao });
    setFilialDialog({ open: false, usuario: null, acesso: 'total', selecionadas: [], padrao: '' });
    setSuccessMessage('Acesso por filial atualizado!');
    await loadData();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const toggleFilialSelecionada = (filialId) => {
    setFilialDialog(prev => {
      const novo = prev.selecionadas.includes(filialId)
        ? prev.selecionadas.filter(id => id !== filialId)
        : [...prev.selecionadas, filialId];
      return { ...prev, selecionadas: novo, padrao: novo.includes(prev.padrao) ? prev.padrao : '' };
    });
  };

  const handleAlterarPerfil = async (usuarioId, novoPerfil) => {
    try {
      setError(null);
      const response = await base44.functions.invoke('alterarPerfilUsuario', {
        usuario_id: usuarioId,
        novo_perfil: novoPerfil
      });
      
      if (response.data?.sucesso) {
        setSuccessMessage(response.data.mensagem);
        await loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data?.error || "Erro ao alterar perfil");
      }
    } catch (err) {
      setError("Erro ao alterar perfil: " + err.message);
    }
  };

  const handleInativarUsuario = async () => {
    try {
      setError(null);
      const response = await base44.functions.invoke('inativarUsuario', {
        usuario_id: inativarDialog.usuario.id,
        motivo: inativarDialog.motivo
      });
      
      if (response.data?.sucesso) {
        setSuccessMessage(response.data.mensagem);
        setInativarDialog({ open: false, usuario: null, motivo: "" });
        await loadData();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data?.error || "Erro ao inativar usuário");
      }
    } catch (err) {
      setError("Erro ao inativar usuário: " + err.message);
    }
  };

  const handleRevogarAcesso = async () => {
    const usuario = revogarDialog.usuario;
    if (!usuario) return;
    setRevogarDialog(prev => ({ ...prev, loading: true }));
    try {
      const response = await base44.functions.invoke('revogarAcesso', { userId: usuario.id });
      if (response.data?.sucesso) {
        setSuccessMessage(`Acesso de ${usuario.full_name} revogado com sucesso.`);
        setRevogarDialog({ open: false, usuario: null, loading: false });
        await loadData();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setError(response.data?.error || 'Erro ao revogar acesso');
        setRevogarDialog(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      setError('Erro ao revogar acesso: ' + err.message);
      setRevogarDialog(prev => ({ ...prev, loading: false }));
    }
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const matchSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchActive = showInactive || u.ativo !== false;
    return matchSearch && matchActive;
  });

  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter(u => u.ativo !== false).length,
    inativos: usuarios.filter(u => u.ativo === false).length,
    super_admins: usuarios.filter(u => u.perfil_sistema === 'super_administrador').length
  };

  const contarUsuariosPorPerfil = (perfilNome) => {
    const key = perfilNome.toLowerCase().replace(' ', '_');
    return usuarios.filter(u => u.perfil_sistema === key && u.ativo !== false).length;
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Gestão de Usuários e Perfis
            </h1>
            <p className="text-slate-600">
              Gerencie permissões e visualize todos os usuários do sistema
            </p>
          </div>
        </div>

        {/* Bootstrap Alert */}
        {!perfisInicializados && isPerfil('super_administrador') && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="flex items-center justify-between">
                <span><strong>Sistema não inicializado.</strong> Execute as funções de bootstrap primeiro.</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleInicializarPerfis} variant="outline">
                    <Play className="w-3 h-3 mr-1" /> 1. Inicializar Perfis
                  </Button>
                  <Button size="sm" onClick={handlePromoverSuperAdmin} variant="outline">
                    <Shield className="w-3 h-3 mr-1" /> 2. Me Promover Super Admin
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Messages */}
        {successMessage && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="usuarios">
              <Users className="w-4 h-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="perfis">
              <Shield className="w-4 h-4 mr-2" />
              Perfis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
                </div>
                <Eye className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Inativos</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inativos}</p>
                </div>
                <EyeOff className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Super Admins</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.super_admins}</p>
                </div>
                <Shield className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showInactive ? "default" : "outline"}
                onClick={() => setShowInactive(!showInactive)}
              >
                {showInactive ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                {showInactive ? "Exibindo Inativos" : "Ocultar Inativos"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários ({usuariosFiltrados.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                       <TableHead>Nome</TableHead>
                       <TableHead>Email</TableHead>
                       <TableHead>Perfil Vinculado</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Filiais</TableHead>
                       <TableHead>Último Acesso</TableHead>
                       <TableHead>Ações</TableHead>
                     </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map((usuario) => {
                    const permitidas = usuario.filiais_permitidas || [];
                    return (
                    <TableRow key={usuario.id} className={usuario.ativo === false ? 'bg-red-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {usuario.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{usuario.full_name}</p>
                            {usuario.id === currentUser?.id && (
                              <Badge variant="secondary" className="text-xs">Você</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{usuario.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {usuario.perfil_sistema ? (
                            <PerfilBadge perfil={usuario.perfil_sistema} />
                          ) : (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Sem perfil</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {usuario.ativo === false ? (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">Inativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Ativo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {permitidas.length === 0 ? (
                          <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Acesso Global</Badge>
                        ) : (
                          <span className="text-sm font-medium text-slate-700">{permitidas.length} filial{permitidas.length !== 1 ? 'is' : ''}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {usuario.last_login ? (
                          <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Clock className="w-3 h-3" />
                            {format(new Date(usuario.last_login), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Nunca acessou</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {usuario.id === currentUser?.id ? (
                          <span className="text-sm text-slate-500">Você mesmo</span>
                        ) : pode('usuarios', 'gerenciar_perfis') && usuario.ativo !== false ? (() => {
                          const isSuperadminAlvo = usuario.perfil_sistema === 'super_administrador';
                          const callerIsSuperadmin = isPerfil('super_administrador');
                          const bloqueado = isSuperadminAlvo && !callerIsSuperadmin;
                          const tooltipMsg = "Superadministradores não podem ser alterados por administradores";
                          return (
                            <div className="flex flex-wrap gap-2">
                              <div title={bloqueado ? tooltipMsg : undefined}>
                                <Select
                                  value={usuario.perfil_sistema || 'usuario'}
                                  onValueChange={(value) => handleAlterarPerfil(usuario.id, value)}
                                  disabled={bloqueado}
                                >
                                  <SelectTrigger className={`w-40 ${bloqueado ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PERFIS_INFO)
                                      .filter(([key]) => key !== 'super_administrador' || callerIsSuperadmin)
                                      .map(([key, info]) => (
                                      <SelectItem key={key} value={key}>
                                        {info.nome}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div title={bloqueado ? tooltipMsg : undefined}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`border-blue-200 text-blue-700 hover:bg-blue-50 ${bloqueado ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  onClick={() => !bloqueado && handleAbrirFilialDialog(usuario)}
                                  disabled={bloqueado}
                                >
                                  <Building2 className="w-3 h-3 mr-1" /> Filiais
                                </Button>
                              </div>
                              {pode('usuarios', 'inativar') && (
                                <div title={bloqueado ? tooltipMsg : undefined}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className={`border-red-200 text-red-700 hover:bg-red-50 ${bloqueado ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    onClick={() => !bloqueado && setRevogarDialog({ open: true, usuario, loading: false })}
                                    disabled={bloqueado}
                                  >
                                    <UserX className="w-3 h-3 mr-1" /> Revogar
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-sm text-slate-500">Sem permissão</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          <TabsContent value="perfis" className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-purple-900 text-lg">Gestão de Perfis e Permissões</h3>
                </div>
                <p className="text-purple-800 text-sm">
                  Configure as permissões de cada perfil do sistema. Super Administrador tem acesso total e não pode ser editado.
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {perfis.map((perfil) => (
                <PerfilCard
                  key={perfil.id}
                  perfil={perfil}
                  usuariosCount={contarUsuariosPorPerfil(perfil.nome)}
                  onEdit={(p) => setEditarPerfilModal({ open: true, perfil: p })}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Dialog Revogar Acesso */}
        <Dialog open={revogarDialog.open} onOpenChange={(open) => setRevogarDialog(prev => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <UserX className="w-5 h-5" /> Revogar Acesso
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja revogar o acesso de <strong>{revogarDialog.usuario?.full_name}</strong>? Esta ação irá desativar a conta.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRevogarDialog({ open: false, usuario: null, loading: false })}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevogarAcesso}
                disabled={revogarDialog.loading}
              >
                {revogarDialog.loading ? 'Revogando...' : 'Confirmar Revogação'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Inativar */}
        <Dialog open={inativarDialog.open} onOpenChange={(open) => setInativarDialog({ ...inativarDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inativar Usuário</DialogTitle>
              <DialogDescription>
                O usuário não poderá mais acessar o sistema, mas todos os dados criados por ele serão mantidos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Usuário</Label>
                <p className="text-sm font-medium">{inativarDialog.usuario?.full_name} ({inativarDialog.usuario?.email})</p>
              </div>
              <div>
                <Label>Motivo da inativação</Label>
                <Textarea
                  value={inativarDialog.motivo}
                  onChange={(e) => setInativarDialog({ ...inativarDialog, motivo: e.target.value })}
                  placeholder="Descreva o motivo..."
                  className="mt-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInativarDialog({ open: false, usuario: null, motivo: "" })}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleInativarUsuario}>
                  Confirmar Inativação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Acesso por Filial */}
        <Dialog open={filialDialog.open} onOpenChange={(open) => setFilialDialog(prev => ({ ...prev, open }))}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Controle de Acesso por Filial</DialogTitle>
              <DialogDescription>{filialDialog.usuario?.full_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tipo de Acesso</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="acesso" value="total" checked={filialDialog.acesso === 'total'} onChange={() => setFilialDialog(prev => ({ ...prev, acesso: 'total', selecionadas: [], padrao: '' }))} />
                    <span className="text-sm font-medium">Acesso Total</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="acesso" value="especificas" checked={filialDialog.acesso === 'especificas'} onChange={() => setFilialDialog(prev => ({ ...prev, acesso: 'especificas' }))} />
                    <span className="text-sm font-medium">Filiais Específicas</span>
                  </label>
                </div>
              </div>

              {filialDialog.acesso === 'especificas' && (
                <>
                  <div className="space-y-2">
                    <Label>Selecionar Filiais</Label>
                    <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                      {filiais.map(f => (
                        <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filialDialog.selecionadas.includes(f.id)}
                            onChange={() => toggleFilialSelecionada(f.id)}
                          />
                          <span className="text-sm">{f.nome}</span>
                          {f.tipo === 'matriz' && <Badge className="text-xs bg-blue-900 text-white">Matriz</Badge>}
                        </label>
                      ))}
                    </div>
                  </div>

                  {filialDialog.selecionadas.length > 0 && (
                    <div className="space-y-2">
                      <Label>Filial Padrão</Label>
                      <Select value={filialDialog.padrao} onValueChange={v => setFilialDialog(prev => ({ ...prev, padrao: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione a filial padrão" /></SelectTrigger>
                        <SelectContent>
                          {filialDialog.selecionadas.map(id => {
                            const f = filiais.find(f => f.id === id);
                            return f ? <SelectItem key={id} value={id}>{f.nome}</SelectItem> : null;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setFilialDialog({ open: false, usuario: null, acesso: 'total', selecionadas: [], padrao: '' })}>Cancelar</Button>
                <Button onClick={handleSalvarFiliais}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Editar Perfil */}
        <EditarPerfilModal
          perfil={editarPerfilModal.perfil}
          isOpen={editarPerfilModal.open}
          onClose={() => setEditarPerfilModal({ open: false, perfil: null })}
          onSave={() => {
            loadData();
            setSuccessMessage("Permissões atualizadas com sucesso!");
            setTimeout(() => setSuccessMessage(null), 3000);
          }}
        />
      </div>
    </div>
  );
}