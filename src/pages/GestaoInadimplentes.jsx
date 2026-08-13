import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Phone, Mail, MessageCircle, Save, TrendingUp, Calculator, Lock } from "lucide-react";

export default function GestaoInadimplentes() {
  const [gestoes, setGestoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAging, setFiltroAging] = useState("todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [pddInfo, setPddInfo] = useState(null);

  useEffect(() => {
    const init = async () => {
      await aplicarAging();
      await carregarGestoes();
      await carregarPDD();
    };
    init();
  }, []);

  const aplicarAging = async () => {
    try {
      await base44.functions.invoke('aplicarAgingOnDemand', {});
    } catch (error) {
      console.error('Erro ao aplicar aging:', error);
    }
  };

  const carregarGestoes = async () => {
    try {
      setLoading(true);
      const dados = await base44.entities.InadimplenciaGestao.list('-created_date', 1000);
      setGestoes(dados);
    } catch (error) {
      console.error('Erro ao carregar gestões:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarPDD = async () => {
    try {
      const dados = await base44.entities.PDDCompetencia.list('-created_date', 1);
      if (dados.length > 0) {
        setPddInfo(dados[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar PDD:', error);
    }
  };

  const handleSalvar = async () => {
    try {
      setSalvando(true);
      
      const response = await base44.functions.invoke('atualizarInadimplencia', {
        gestao_id: editando.id,
        dados: {
          status_atual: editando.status_atual,
          responsavel: editando.responsavel,
          canal: editando.canal,
          observacoes: editando.observacoes,
          proxima_acao_em: editando.proxima_acao_em,
          valor_em_aberto: editando.valor_em_aberto ? parseFloat(editando.valor_em_aberto) : null,
          valor_acordo: editando.valor_acordo ? parseFloat(editando.valor_acordo) : null,
          data_pagamento: editando.data_pagamento
        }
      });
      
      if (response.data.sucesso) {
        await carregarGestoes();
        setEditando(null);
        if (response.data.bloqueado) {
          alert('✅ Gestão marcada como PAGA e BLOQUEADA!\n🔒 Não será alterada em futuras conciliações.');
        } else {
          alert('✅ Inadimplência atualizada com sucesso!');
        }
      } else {
        alert('Erro: ' + response.data.erro);
      }
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const handleRecalcularAging = async () => {
    try {
      setRecalculando(true);
      const response = await base44.functions.invoke('aplicarAgingOnDemand', {});
      alert(`✅ Aging recalculado!\n\nProcessadas: ${response.data.total_processadas}\nCanceladas por aging: ${response.data.total_canceladas_aging}`);
      await carregarGestoes();
    } catch (error) {
      alert('Erro ao recalcular aging: ' + error.message);
    } finally {
      setRecalculando(false);
    }
  };

  const gestoesFiltr = gestoes.filter(g => {
    const matchStatus = filtroStatus === 'todos' || g.status_atual === filtroStatus;
    
    let matchAging = true;
    if (filtroAging !== 'todos') {
      const dias = g.dias_inadimplencia || 0;
      if (filtroAging === '0-30') matchAging = dias <= 30;
      else if (filtroAging === '31-60') matchAging = dias > 30 && dias <= 60;
      else if (filtroAging === '61-90') matchAging = dias > 60 && dias <= 90;
      else if (filtroAging === '90+') matchAging = dias > 90;
    }
    
    const matchBusca = !busca || 
      g.numero_apolice?.toLowerCase().includes(busca.toLowerCase()) ||
      g.cpf_cnpj?.includes(busca) ||
      g.placa?.toLowerCase().includes(busca.toLowerCase());
    
    return matchStatus && matchAging && matchBusca;
  });

  const getCorDias = (dias) => {
    if (!dias) return 'text-gray-500';
    if (dias <= 15) return 'text-green-600';
    if (dias <= 30) return 'text-yellow-600';
    return 'text-red-600 font-bold';
  };

  const getBadgeColor = (status) => {
    const colors = {
      em_aberto: 'bg-red-100 text-red-800',
      em_contato: 'bg-yellow-100 text-yellow-800',
      negociacao: 'bg-blue-100 text-blue-800',
      acordo_fechado: 'bg-purple-100 text-purple-800',
      pago_confirmado: 'bg-green-100 text-green-800',
      encerrado: 'bg-green-100 text-green-800',
      cancelado_por_inadimplencia: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || '';
  };

  const getStatusLabel = (status) => {
    const labels = {
      em_aberto: 'Em Aberto',
      em_contato: 'Em Contato',
      negociacao: 'Negociação',
      acordo_fechado: 'Acordo Fechado',
      pago_confirmado: 'Pago Confirmado',
      encerrado: 'Encerrado',
      cancelado_por_inadimplencia: 'Cancelado (Aging)'
    };
    return labels[status] || status;
  };

  const getCanalIcon = (canal) => {
    const icons = {
      whatsapp: MessageCircle,
      telefone: Phone,
      email: Mail,
      outros: AlertCircle
    };
    const Icon = icons[canal] || AlertCircle;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Gestão de Inadimplentes</h1>
      </div>

      {/* PDD Info */}
      {pddInfo && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">PDD Estimado ({pddInfo.competencia})</p>
                <p className="text-2xl font-bold text-purple-900">
                  R$ {pddInfo.pdd_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500">{pddInfo.total_inadimplentes} inadimplentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="em_aberto">Em Aberto</SelectItem>
                <SelectItem value="em_contato">Em Contato</SelectItem>
                <SelectItem value="negociacao">Negociação</SelectItem>
                <SelectItem value="acordo_fechado">Acordo Fechado</SelectItem>
                <SelectItem value="pago_confirmado">Pago Confirmado</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
                <SelectItem value="cancelado_por_inadimplencia">Cancelado por Inadimplência</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroAging} onValueChange={setFiltroAging}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Faixa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Faixas</SelectItem>
                <SelectItem value="0-30">0-30 dias</SelectItem>
                <SelectItem value="31-60">31-60 dias</SelectItem>
                <SelectItem value="61-90">61-90 dias</SelectItem>
                <SelectItem value="90+">90+ dias</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Buscar por apólice, CPF ou placa"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1"
            />

            <Button 
              onClick={handleRecalcularAging}
              disabled={recalculando}
              variant="outline"
            >
              {recalculando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recalculando...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Recalcular Aging
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apólice</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Último Contato</TableHead>
                  <TableHead>Próxima Ação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gestoesFiltr.slice(0, 100).map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-sm">{g.numero_apolice}</TableCell>
                    <TableCell className="font-mono text-sm">{g.cpf_cnpj}</TableCell>
                    <TableCell className="font-mono text-sm">{g.placa}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={getBadgeColor(g.status_atual)}>
                          {getStatusLabel(g.status_atual)}
                        </Badge>
                        {g.bloqueado_recalculo && (
                          <Badge className="bg-gray-100 text-gray-800">
                            <Lock className="w-3 h-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={getCorDias(g.dias_inadimplencia)}>
                      {g.dias_inadimplencia || 0} dias
                    </TableCell>
                    <TableCell className="text-sm">{g.responsavel || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getCanalIcon(g.canal)}
                        <span className="text-xs">{g.canal}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{g.data_ultimo_contato || '-'}</TableCell>
                    <TableCell className="text-sm">{g.proxima_acao_em || '-'}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setEditando({...g})}>
                            Editar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Editar Inadimplência - {g.numero_apolice}</DialogTitle>
                          </DialogHeader>
                          
                          {editando && editando.id === g.id && (
                            <div className="space-y-4">
                              <div>
                                <Label>Status</Label>
                                <Select 
                                  value={editando.status_atual} 
                                  onValueChange={(v) => setEditando({...editando, status_atual: v})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="em_aberto">Em Aberto</SelectItem>
                                    <SelectItem value="em_contato">Em Contato</SelectItem>
                                    <SelectItem value="negociacao">Negociação</SelectItem>
                                    <SelectItem value="acordo_fechado">Acordo Fechado</SelectItem>
                                    <SelectItem value="pago_confirmado">Pago Confirmado</SelectItem>
                                    <SelectItem value="encerrado">Encerrado</SelectItem>
                                    <SelectItem value="cancelado_por_inadimplencia">Cancelado por Inadimplência</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Responsável</Label>
                                <Input
                                  value={editando.responsavel || ''}
                                  onChange={(e) => setEditando({...editando, responsavel: e.target.value})}
                                />
                              </div>

                              <div>
                                <Label>Canal</Label>
                                <Select 
                                  value={editando.canal} 
                                  onValueChange={(v) => setEditando({...editando, canal: v})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                    <SelectItem value="telefone">Telefone</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="outros">Outros</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Próxima Ação Em</Label>
                                <Input
                                  type="date"
                                  value={editando.proxima_acao_em || ''}
                                  onChange={(e) => setEditando({...editando, proxima_acao_em: e.target.value})}
                                />
                              </div>

                              <div>
                                <Label>Valor em Aberto</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editando.valor_em_aberto || ''}
                                  onChange={(e) => setEditando({...editando, valor_em_aberto: e.target.value})}
                                />
                              </div>

                              <div>
                                <Label>Valor do Acordo</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editando.valor_acordo || ''}
                                  onChange={(e) => setEditando({...editando, valor_acordo: e.target.value})}
                                />
                              </div>

                              <div>
                                <Label>Data de Pagamento</Label>
                                <Input
                                  type="date"
                                  value={editando.data_pagamento || ''}
                                  onChange={(e) => setEditando({...editando, data_pagamento: e.target.value})}
                                />
                              </div>

                              <div>
                                <Label>Observações</Label>
                                <Textarea
                                  rows={4}
                                  value={editando.observacoes || ''}
                                  onChange={(e) => setEditando({...editando, observacoes: e.target.value})}
                                  placeholder="Observações sobre o contato..."
                                />
                              </div>

                              <Button 
                                onClick={handleSalvar} 
                                disabled={salvando}
                                className="w-full"
                              >
                                {salvando ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {gestoesFiltr.length > 100 && (
              <p className="text-sm text-gray-500 mt-4 text-center">
                Mostrando 100 de {gestoesFiltr.length} registros
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}