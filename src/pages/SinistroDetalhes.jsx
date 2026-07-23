import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Shield,
  DollarSign,
  Plus,
  Calendar,
  FileText,
  Wrench,
  Package,
  Loader2,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DocumentacaoSinistro from "@/components/sinistros/DocumentacaoSinistro";

const PRODUTOS_INFO = {
  FR: { nome: "Furto e Roubo", icon: "🚗", color: "bg-red-100 text-red-800" },
  COL_PARCIAL: { nome: "Colisão Parcial", icon: "🔧", color: "bg-blue-100 text-blue-800" },
  COL_TOTAL: { nome: "Colisão Total", icon: "💥", color: "bg-purple-100 text-purple-800" },
  INCENDIO: { nome: "Incêndio e Fenômenos", icon: "🔥", color: "bg-orange-100 text-orange-800" },
  RCFV: { nome: "RCF-V", icon: "⚖️", color: "bg-green-100 text-green-800" }
};

const STATUS_INFO = {
  aberto: { nome: "Aberto", color: "bg-yellow-100 text-yellow-800" },
  em_analise: { nome: "Em Análise", color: "bg-blue-100 text-blue-800" },
  aprovado: { nome: "Aprovado", color: "bg-green-100 text-green-800" },
  em_reparo: { nome: "Em Reparo", color: "bg-purple-100 text-purple-800" },
  concluido: { nome: "Concluído", color: "bg-slate-100 text-slate-800" },
  negado: { nome: "Negado", color: "bg-red-100 text-red-800" }
};

export default function SinistroDetalhes() {
  const navigate = useNavigate();
  const [sinistro, setSinistro] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [isSavingGasto, setIsSavingGasto] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [relatoEvento, setRelatoEvento] = useState("");
  const [documentos, setDocumentos] = useState([]);

  // Form fields para novo gasto
  const [novoGasto, setNovoGasto] = useState({
    tipo_gasto: "oficina",
    nome_fornecedor: "",
    descricao: "",
    valor_total: "",
    data_nota_fiscal: "",
    forma_pagamento: "a_vista",
    numero_parcelas: 1,
    datas_pagamento: [""],
    valores_parcelas: [""]
  });
  const [loadAttempts, setLoadAttempts] = useState(0);

  useEffect(() => {
    if (loadAttempts < 3) {
      loadSinistro();
    }
  }, [loadAttempts]);

  const loadSinistro = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');

      if (!id) {
        setError("ID do sinistro não encontrado.");
        return;
      }

      const sinistroData = await base44.entities.Sinistro.get(id);
      setSinistro(sinistroData);
      setRelatoEvento(sinistroData.relato_evento || "");

      const gastosData = await base44.entities.GastoSinistro.filter({ id_sinistro: id });
      setGastos(gastosData);

      const docsData = await base44.entities.DocumentoSinistro.filter({ id_sinistro: id });
      setDocumentos(docsData);
    } catch (err) {
      setError("Erro ao carregar sinistro.");
      console.error(err);
      setLoadAttempts(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const parseCurrency = (formattedValue) => {
    if (!formattedValue) return 0;
    const numericValue = formattedValue.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numericValue) || 0;
  };

  const handleSalvarRelato = async () => {
    try {
      await base44.entities.Sinistro.update(sinistro.id, { 
        relato_evento: relatoEvento 
      });
      setSinistro({ ...sinistro, relato_evento: relatoEvento });
      setSuccessMessage("Relato salvo com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Erro ao salvar relato.");
      console.error(err);
    }
  };

  const handleAvancarParaAnalise = async () => {
    setError(null);

    // Verificar documentação
    const obrigatorios = ['cnh_condutor', 'documento_veiculo', 'boletim_ocorrencia', 'carta_descricao', 'foto_colisao'];
    const todosEnviados = obrigatorios.every(tipo => 
      documentos.some(d => d.tipo_documento === tipo)
    );

    if (!todosEnviados) {
      setError("Envie todos os documentos obrigatórios antes de prosseguir.");
      return;
    }

    if (!relatoEvento || relatoEvento.trim().length < 50) {
      setError("O relato do evento deve ter pelo menos 50 caracteres.");
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await base44.entities.Sinistro.update(sinistro.id, { 
        status: 'em_analise',
        documentacao_completa: true,
        data_documentacao_completa: new Date().toISOString()
      });
      setSinistro({ 
        ...sinistro, 
        status: 'em_analise',
        documentacao_completa: true 
      });
      setSuccessMessage("Sinistro enviado para análise com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Erro ao avançar para análise.");
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAlterarStatus = async (novoStatus) => {
    setIsUpdatingStatus(true);
    setError(null);

    try {
      await base44.entities.Sinistro.update(sinistro.id, { status: novoStatus });
      setSinistro({ ...sinistro, status: novoStatus });
      setSuccessMessage(`Status alterado para "${STATUS_INFO[novoStatus].nome}" com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Erro ao atualizar status do sinistro.");
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFormaPagamentoChange = (forma) => {
    if (forma === "a_vista") {
      setNovoGasto({
        ...novoGasto,
        forma_pagamento: forma,
        numero_parcelas: 1,
        datas_pagamento: [""],
        valores_parcelas: [novoGasto.valor_total]
      });
    } else {
      setNovoGasto({
        ...novoGasto,
        forma_pagamento: forma,
        numero_parcelas: 2,
        datas_pagamento: ["", ""],
        valores_parcelas: ["", ""]
      });
    }
  };

  const handleNumeroParcelasChange = (num) => {
    const numParcelas = parseInt(num);
    const valorTotal = parseCurrency(novoGasto.valor_total);
    const valorParcela = valorTotal / numParcelas;

    setNovoGasto({
      ...novoGasto,
      numero_parcelas: numParcelas,
      datas_pagamento: Array(numParcelas).fill(""),
      valores_parcelas: Array(numParcelas).fill(valorParcela.toFixed(2))
    });
  };

  const handleAdicionarGasto = async () => {
    setError(null);

    // Validações
    if (!novoGasto.nome_fornecedor) {
      setError("Informe o nome do fornecedor.");
      return;
    }

    if (!novoGasto.valor_total) {
      setError("Informe o valor total.");
      return;
    }

    if (!novoGasto.data_nota_fiscal) {
      setError("Informe a data da nota fiscal.");
      return;
    }

    if (novoGasto.datas_pagamento.some(d => !d)) {
      setError("Informe todas as datas de pagamento.");
      return;
    }

    setIsSavingGasto(true);

    try {
      const gastoData = {
        id_sinistro: sinistro.id,
        numero_sinistro: sinistro.numero_sinistro,
        tipo_gasto: novoGasto.tipo_gasto,
        nome_fornecedor: novoGasto.nome_fornecedor,
        descricao: novoGasto.descricao,
        valor_total: parseCurrency(novoGasto.valor_total),
        data_nota_fiscal: novoGasto.data_nota_fiscal,
        forma_pagamento: novoGasto.forma_pagamento,
        numero_parcelas: novoGasto.forma_pagamento === "parcelado" ? novoGasto.numero_parcelas : 1,
        datas_pagamento: novoGasto.datas_pagamento,
        valores_parcelas: novoGasto.valores_parcelas.map(v => parseFloat(v)),
        status_pagamento: "pendente"
      };

      await base44.entities.GastoSinistro.create(gastoData);

      setSuccessMessage("Gasto adicionado com sucesso!");
      setShowAddGasto(false);
      setNovoGasto({
        tipo_gasto: "oficina",
        nome_fornecedor: "",
        descricao: "",
        valor_total: "",
        data_nota_fiscal: "",
        forma_pagamento: "a_vista",
        numero_parcelas: 1,
        datas_pagamento: [""],
        valores_parcelas: [""]
      });

      await loadSinistro();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Erro ao adicionar gasto.");
      console.error(err);
    } finally {
      setIsSavingGasto(false);
    }
  };

  const calcularTotalGastos = () => {
    return gastos.reduce((total, gasto) => total + (gasto.valor_total || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4 md:p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!sinistro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Sinistro não encontrado</h3>
            <Button onClick={() => navigate(createPageUrl("Dashboard"))}>
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const produtoInfo = PRODUTOS_INFO[sinistro.produto_sinistrado];
  const statusInfo = STATUS_INFO[sinistro.status];
  const totalGastos = calcularTotalGastos();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Sinistros"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Sinistro: {sinistro.numero_sinistro}
            </h1>
            <p className="text-slate-600">Apólice: {sinistro.numero_apolice}</p>
          </div>
          <Badge className={statusInfo.color}>
            {statusInfo.nome}
          </Badge>
        </div>

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

        {/* Cards de Resumo */}
        <div className="grid md:grid-cols-5 gap-4">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Produto</p>
                  <p className="text-lg font-bold text-slate-900">{produtoInfo.icon} {produtoInfo.nome}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Valor Inicial</p>
                  <p className="text-lg font-bold text-blue-600">
                    R$ {(sinistro.valor_inicial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Franquia</p>
                  <p className="text-lg font-bold text-purple-600">
                    R$ {(sinistro.franquia || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-purple-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Gastos</p>
                  <p className="text-lg font-bold text-orange-600">
                    R$ {totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-orange-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Data do Sinistro</p>
                  <p className="text-lg font-bold text-slate-900">
                    {format(new Date(sinistro.data_sinistro), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documentação do Sinistro - Apenas se status = aberto */}
        {sinistro.status === 'aberto' && (
          <>
            <DocumentacaoSinistro 
              sinistro={sinistro}
              onDocumentacaoCompleta={() => loadSinistro()}
            />

            {/* Relato do Evento */}
            <Card className="shadow-lg">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Relato do Evento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label>Descreva como o sinistro ocorreu *</Label>
                  <Textarea
                    value={relatoEvento}
                    onChange={(e) => setRelatoEvento(e.target.value)}
                    placeholder="Descreva detalhadamente as circunstâncias do sinistro: data, hora, local, como ocorreu, etc."
                    className="min-h-[150px] mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Mínimo de 50 caracteres. Atual: {relatoEvento.length}
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSalvarRelato}
                    variant="outline"
                    disabled={!relatoEvento || relatoEvento.length < 50}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Salvar Relato
                  </Button>

                  <Button
                    onClick={handleAvancarParaAnalise}
                    disabled={
                      isUpdatingStatus ||
                      !relatoEvento ||
                      relatoEvento.length < 50 ||
                      documentos.filter(d => ['cnh_condutor', 'documento_veiculo', 'boletim_ocorrencia', 'carta_descricao', 'foto_colisao'].includes(d.tipo_documento)).length < 5
                    }
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUpdatingStatus ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Enviar para Análise
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Alterar Status - Apenas para status != aberto */}
        {sinistro.status !== 'aberto' && (
          <Card className="shadow-lg border-blue-100">
            <CardHeader className="border-b border-blue-100">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Alterar Status do Sinistro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                {Object.keys(STATUS_INFO).map((status) => (
                  <Button
                    key={status}
                    variant={sinistro.status === status ? "default" : "outline"}
                    onClick={() => handleAlterarStatus(status)}
                    disabled={isUpdatingStatus || sinistro.status === status}
                    className={sinistro.status === status ? `${STATUS_INFO[status].color} hover:${STATUS_INFO[status].color}` : ""}
                  >
                    {isUpdatingStatus && sinistro.status !== status ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {STATUS_INFO[status].nome}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Informações do Sinistro */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Informações do Sinistro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-slate-500 text-sm">CPF do Segurado</Label>
                <p className="font-mono font-semibold">{sinistro.cpf_segurado}</p>
              </div>
              <div>
                <Label className="text-slate-500 text-sm">Data de Abertura</Label>
                <p className="font-semibold">
                  {format(new Date(sinistro.data_abertura), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              {sinistro.descricao && (
                <div className="md:col-span-2">
                  <Label className="text-slate-500 text-sm">Descrição</Label>
                  <p className="text-slate-700 mt-1">{sinistro.descricao}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gastos do Sinistro - Apenas para status aprovado ou posterior */}
        {['aprovado', 'em_reparo', 'concluido'].includes(sinistro.status) && (
          <Card className="shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Gastos do Sinistro ({gastos.length})
                </CardTitle>
                <Dialog open={showAddGasto} onOpenChange={setShowAddGasto}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Gasto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Adicionar Novo Gasto</DialogTitle>
                    <DialogDescription>
                      Registre um gasto relacionado a este sinistro
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Gasto *</Label>
                        <Select
                          value={novoGasto.tipo_gasto}
                          onValueChange={(value) => setNovoGasto({...novoGasto, tipo_gasto: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oficina">
                              <div className="flex items-center gap-2">
                                <Wrench className="w-4 h-4" />
                                Oficina
                              </div>
                            </SelectItem>
                            <SelectItem value="peca">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Peça
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome do Fornecedor *</Label>
                        <Input
                          value={novoGasto.nome_fornecedor}
                          onChange={(e) => setNovoGasto({...novoGasto, nome_fornecedor: e.target.value})}
                          placeholder="Ex: Oficina Silva"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={novoGasto.descricao}
                        onChange={(e) => setNovoGasto({...novoGasto, descricao: e.target.value})}
                        placeholder="Descreva o serviço ou peça..."
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor Total *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
                          <Input
                            value={novoGasto.valor_total}
                            onChange={(e) => setNovoGasto({...novoGasto, valor_total: formatCurrency(e.target.value)})}
                            placeholder="0,00"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Data da Nota Fiscal *</Label>
                        <Input
                          type="date"
                          value={novoGasto.data_nota_fiscal}
                          onChange={(e) => setNovoGasto({...novoGasto, data_nota_fiscal: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Forma de Pagamento *</Label>
                      <Select
                        value={novoGasto.forma_pagamento}
                        onValueChange={handleFormaPagamentoChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a_vista">À Vista</SelectItem>
                          <SelectItem value="parcelado">Parcelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {novoGasto.forma_pagamento === "parcelado" && (
                      <div className="space-y-2">
                        <Label>Número de Parcelas</Label>
                        <Input
                          type="number"
                          min="2"
                          max="12"
                          value={novoGasto.numero_parcelas}
                          onChange={(e) => handleNumeroParcelasChange(e.target.value)}
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label>Datas de Pagamento *</Label>
                      {novoGasto.datas_pagamento.map((data, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <span className="text-sm text-slate-600 w-24">
                            {novoGasto.forma_pagamento === "a_vista" ? "Pagamento:" : `Parcela ${index + 1}:`}
                          </span>
                          <Input
                            type="date"
                            value={data}
                            onChange={(e) => {
                              const newDatas = [...novoGasto.datas_pagamento];
                              newDatas[index] = e.target.value;
                              setNovoGasto({...novoGasto, datas_pagamento: newDatas});
                            }}
                          />
                          {novoGasto.forma_pagamento === "parcelado" && (
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-slate-600">R$</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={novoGasto.valores_parcelas[index] || ""}
                                onChange={(e) => {
                                  const newValores = [...novoGasto.valores_parcelas];
                                  newValores[index] = e.target.value;
                                  setNovoGasto({...novoGasto, valores_parcelas: newValores});
                                }}
                                className="w-32"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleAdicionarGasto}
                      disabled={isSavingGasto}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isSavingGasto ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Salvar Gasto
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {gastos.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>Nenhum gasto registrado ainda.</p>
                <p className="text-sm mt-2">Clique em "Adicionar Gasto" para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data NF</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gastos.map((gasto) => (
                      <TableRow key={gasto.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {gasto.tipo_gasto === "oficina" ? (
                              <Wrench className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Package className="w-4 h-4 text-green-600" />
                            )}
                            <span className="capitalize">{gasto.tipo_gasto}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{gasto.nome_fornecedor}</TableCell>
                        <TableCell className="max-w-xs truncate">{gasto.descricao || "-"}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          R$ {(gasto.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(gasto.data_nota_fiscal), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {gasto.forma_pagamento === "a_vista" ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              À Vista
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {gasto.numero_parcelas}x
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={
                            gasto.status_pagamento === "pago" ? "bg-green-100 text-green-800" :
                            gasto.status_pagamento === "parcialmente_pago" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }>
                            {gasto.status_pagamento === "pago" ? "Pago" :
                             gasto.status_pagamento === "parcialmente_pago" ? "Parcial" :
                             "Pendente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}