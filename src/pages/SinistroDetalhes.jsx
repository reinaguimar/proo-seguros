import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Paperclip,
  X,
  Upload
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false); // New state variable
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const GASTO_INICIAL = {
    tipo_gasto: "oficina",
    nome_fornecedor: "",
    numero_nf: "",
    numero_documento: "",
    numero_termo: "",
    valor_total: "",
    data_nota_fiscal: "",
    forma_pagamento: "a_vista",
    numero_parcelas: 1,
    datas_pagamento: [""],
    valores_parcelas: [""],
    // Campos de Acordo Extrajudicial
    beneficiario_nome: "",
    beneficiario_cpf_cnpj: "",
    banco: "",
    agencia: "",
    conta_corrente: "",
    tipo_conta: "corrente",
    chave_pix: "",
  };

  // Form fields para novo gasto
  const [novoGasto, setNovoGasto] = useState(GASTO_INICIAL);
  const [anexos, setAnexos] = useState([]); // { file: File, uploading: bool, url: string, name: string }
  const [isUploadingAnexo, setIsUploadingAnexo] = useState(false);
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

      const gastosData = await base44.entities.GastoSinistro.filter({ id_sinistro: id });
      setGastos(gastosData);
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

  const handleAlterarStatus = async (novoStatus) => {
    setIsUpdatingStatus(true);
    setError(null);

    const statusAnterior = sinistro.status;

    try {
      await base44.entities.Sinistro.update(sinistro.id, { status: novoStatus });
      setSinistro({ ...sinistro, status: novoStatus });
      setSuccessMessage(`Status alterado para "${STATUS_INFO[novoStatus].nome}" com sucesso!`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Trilha de auditoria (complementar — não bloqueia se falhar)
      try {
        const user = await base44.auth.me();
        await base44.entities.LogSinistro.create({
          sinistro_id: sinistro.id,
          numero_sinistro: sinistro.numero_sinistro,
          acao: "status_alterado",
          campo_alterado: "status",
          valor_anterior: statusAnterior,
          valor_novo: novoStatus,
          usuario_id: user?.id,
          usuario_nome: user?.full_name,
          usuario_email: user?.email,
          data_acao: new Date().toISOString()
        });
      } catch (logErr) {
        console.error("Erro ao registrar log de alteração de status:", logErr);
      }
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

  const handleAnexarArquivo = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploadingAnexo(true);
    for (const file of files) {
      const entrada = { name: file.name, url: null, uploading: true };
      setAnexos(prev => [...prev, entrada]);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setAnexos(prev => prev.map(a => a.name === file.name && a.uploading ? { ...a, url: file_url, uploading: false } : a));
      } catch {
        setAnexos(prev => prev.filter(a => !(a.name === file.name && a.uploading)));
      }
    }
    setIsUploadingAnexo(false);
    e.target.value = "";
  };

  const handleRemoverAnexo = (idx) => {
    setAnexos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAdicionarGasto = async () => {
    setError(null);

    const isAcordo = novoGasto.tipo_gasto === "acordo_extrajudicial";

    if (!novoGasto.valor_total) {
      setError("Informe o valor total.");
      return;
    }
    if (!isAcordo && !novoGasto.data_nota_fiscal) {
      setError("Informe a data da nota fiscal.");
      return;
    }
    if (novoGasto.datas_pagamento.some(d => !d)) {
      setError("Informe todas as datas de pagamento.");
      return;
    }
    if (isAcordo) {
      if (!novoGasto.beneficiario_nome || !novoGasto.beneficiario_cpf_cnpj || !novoGasto.banco || !novoGasto.agencia || !novoGasto.conta_corrente) {
        setError("Preencha todos os dados bancários do beneficiário.");
        return;
      }
      if (novoGasto.tipo_conta === "pix" && !novoGasto.chave_pix) {
        setError("Informe a chave PIX.");
        return;
      }
    }
    const anexosProntos = anexos.filter(a => a.url && !a.uploading);
    if (anexosProntos.length === 0) {
      setError("Anexo obrigatório — adicione ao menos um documento (NF, termo, recibo, etc.)");
      return;
    }

    setIsSavingGasto(true);

    try {
      // Compor descrição estruturada para auditoria
      const partes = [];
      if (novoGasto.numero_nf) partes.push(`NF: ${novoGasto.numero_nf}`);
      if (novoGasto.numero_documento) partes.push(`Doc: ${novoGasto.numero_documento}`);
      if (novoGasto.numero_termo) partes.push(`Termo: ${novoGasto.numero_termo}`);
      if (isAcordo && novoGasto.beneficiario_nome) partes.push(`Benef: ${novoGasto.beneficiario_nome}`);
      if (isAcordo && novoGasto.beneficiario_cpf_cnpj) partes.push(`CPF/CNPJ: ${novoGasto.beneficiario_cpf_cnpj}`);
      if (isAcordo) partes.push(`Banco: ${novoGasto.banco} Ag: ${novoGasto.agencia} Conta: ${novoGasto.conta_corrente} (${novoGasto.tipo_conta}${novoGasto.chave_pix ? ` PIX: ${novoGasto.chave_pix}` : ""})`);

      // Mapeamento correto dos campos para o schema GastoSinistro
      // Campos de data: nunca enviar string vazia (schema format:date rejeita "")
      const dataNF = novoGasto.data_nota_fiscal || novoGasto.datas_pagamento[0] || null;
      const dataPagamento = novoGasto.datas_pagamento[0] || null;

      const gastoData = {
        id_sinistro: sinistro.id,
        numero_sinistro: sinistro.numero_sinistro,
        tipo_gasto: novoGasto.tipo_gasto,
        nome_fornecedor: novoGasto.nome_fornecedor || (isAcordo ? novoGasto.beneficiario_nome || "Acordo Extrajudicial" : ""),
        descricao: partes.join(" | ") || undefined,
        valor_total: parseCurrency(novoGasto.valor_total),
        forma_pagamento: novoGasto.forma_pagamento,
        numero_parcelas: novoGasto.forma_pagamento === "parcelado" ? novoGasto.numero_parcelas : 1,
        datas_pagamento: novoGasto.datas_pagamento.filter(Boolean),
        valores_parcelas: novoGasto.valores_parcelas.map(v => parseFloat(v) || 0),
        status_pagamento: "pendente",
        anexos_urls: anexosProntos.map(a => a.url),
        // Campos de data: apenas incluir se tiver valor
        ...(dataNF && { data_nota_fiscal: dataNF }),
        ...(dataPagamento && { data_pagamento: dataPagamento }),
        // Campos opcionais de texto: apenas incluir se tiver valor
        ...(novoGasto.numero_nf && { numero_nf: novoGasto.numero_nf }),
        ...(novoGasto.numero_documento && { numero_documento: novoGasto.numero_documento }),
        // Campos bancários do acordo extrajudicial
        ...(isAcordo && {
          beneficiario_nome: novoGasto.beneficiario_nome,
          beneficiario_cpf_cnpj: novoGasto.beneficiario_cpf_cnpj,
          banco_nome: novoGasto.banco,
          banco_agencia: novoGasto.agencia,
          banco_conta: novoGasto.conta_corrente,
          // banco_tipo_conta aceita: "corrente", "poupanca", "pagamento" — "pix" usa "pagamento"
          banco_tipo_conta: ["corrente", "poupanca", "pagamento"].includes(novoGasto.tipo_conta)
            ? novoGasto.tipo_conta
            : "pagamento",
          ...(novoGasto.chave_pix && { banco_chave_pix: novoGasto.chave_pix }),
        }),
      };

      await base44.entities.GastoSinistro.create(gastoData);

      setSuccessMessage("Gasto adicionado com sucesso!");
      setShowAddGasto(false);
      setNovoGasto(GASTO_INICIAL);
      setAnexos([]);

      await loadSinistro();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Exibir mensagem de erro real para diagnóstico
      const msg = err?.response?.data?.message || err?.message || String(err);
      setError(`Erro ao adicionar gasto: ${msg}`);
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

        {/* Alterar Status */}
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
                <Label className="text-slate-500 text-sm">Filial</Label>
                <p className="font-semibold">{sinistro.filial_nome || "—"}</p>
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

        {/* Gastos do Sinistro */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Gastos do Sinistro ({gastos.length})
              </CardTitle>
              <Dialog open={showAddGasto} onOpenChange={(open) => { setShowAddGasto(open); if (!open) { setNovoGasto(GASTO_INICIAL); setAnexos([]); setError(null); } }}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Gasto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Adicionar Gasto</DialogTitle>
                  </DialogHeader>

                  {(() => {
                    const isAcordo = novoGasto.tipo_gasto === "acordo_extrajudicial";
                    const anexosProntos = anexos.filter(a => a.url && !a.uploading);
                    return (
                      <div className="space-y-3 py-2">

                        {/* Tipo + Fornecedor */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo *</Label>
                            <Select
                              value={novoGasto.tipo_gasto}
                              onValueChange={(v) => setNovoGasto({ ...GASTO_INICIAL, tipo_gasto: v })}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="oficina"><div className="flex items-center gap-2"><Wrench className="w-3 h-3" />Oficina</div></SelectItem>
                                <SelectItem value="peca"><div className="flex items-center gap-2"><Package className="w-3 h-3" />Peça</div></SelectItem>
                                <SelectItem value="acordo_extrajudicial"><div className="flex items-center gap-2"><FileText className="w-3 h-3" />Acordo Extrajudicial</div></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {!isAcordo && (
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Fornecedor</Label>
                              <Input className="h-8 text-sm" value={novoGasto.nome_fornecedor}
                                onChange={(e) => setNovoGasto({ ...novoGasto, nome_fornecedor: e.target.value })}
                                placeholder="Nome da oficina / fornecedor" />
                            </div>
                          )}
                        </div>

                        {/* Campos de Acordo Extrajudicial */}
                        {isAcordo && (
                          <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50 p-3">
                            <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Dados do Beneficiário</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome Completo *</Label>
                                <Input className="h-8 text-sm" value={novoGasto.beneficiario_nome}
                                  onChange={(e) => setNovoGasto({ ...novoGasto, beneficiario_nome: e.target.value })}
                                  placeholder="Nome do beneficiário" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CPF / CNPJ *</Label>
                                <Input className="h-8 text-sm font-mono" value={novoGasto.beneficiario_cpf_cnpj}
                                  onChange={(e) => setNovoGasto({ ...novoGasto, beneficiario_cpf_cnpj: e.target.value })}
                                  placeholder="000.000.000-00" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Banco *</Label>
                                <Input className="h-8 text-sm" value={novoGasto.banco}
                                  onChange={(e) => setNovoGasto({ ...novoGasto, banco: e.target.value })}
                                  placeholder="Ex: 001 - Banco do Brasil" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Agência *</Label>
                                <Input className="h-8 text-sm font-mono" value={novoGasto.agencia}
                                  onChange={(e) => setNovoGasto({ ...novoGasto, agencia: e.target.value })}
                                  placeholder="0000-0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Conta *</Label>
                                <Input className="h-8 text-sm font-mono" value={novoGasto.conta_corrente}
                                  onChange={(e) => setNovoGasto({ ...novoGasto, conta_corrente: e.target.value })}
                                  placeholder="00000-0" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de Conta *</Label>
                                <Select value={novoGasto.tipo_conta} onValueChange={(v) => setNovoGasto({ ...novoGasto, tipo_conta: v, chave_pix: "" })}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="corrente">Corrente</SelectItem>
                                    <SelectItem value="poupanca">Poupança</SelectItem>
                                    <SelectItem value="pix">PIX</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              {novoGasto.tipo_conta === "pix" && (
                                <div className="space-y-1 col-span-2">
                                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chave PIX *</Label>
                                  <Input className="h-8 text-sm" value={novoGasto.chave_pix}
                                    onChange={(e) => setNovoGasto({ ...novoGasto, chave_pix: e.target.value })}
                                    placeholder="CPF, e-mail, telefone ou chave aleatória" />
                                </div>
                              )}
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nº Termo</Label>
                                <Input className="h-8 text-sm font-mono" value={novoGasto.numero_termo}
                                  onChange={(e) => setNovoGasto({ ...novoGasto, numero_termo: e.target.value })}
                                  placeholder="TERMO-2024-001" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nº NF (opcional)</Label>
                                <Input className="h-8 text-sm font-mono" value={novoGasto.numero_nf}
                                  onChange={(e) => setNovoGasto({ ...novoGasto, numero_nf: e.target.value })}
                                  placeholder="000000" />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Campos NF/Doc para Oficina/Peça */}
                        {!isAcordo && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nº NF</Label>
                              <Input className="h-8 text-sm font-mono" value={novoGasto.numero_nf}
                                onChange={(e) => setNovoGasto({ ...novoGasto, numero_nf: e.target.value })}
                                placeholder="000000" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nº Documento</Label>
                              <Input className="h-8 text-sm font-mono" value={novoGasto.numero_documento}
                                onChange={(e) => setNovoGasto({ ...novoGasto, numero_documento: e.target.value })}
                                placeholder="OS / Pedido" />
                            </div>
                          </div>
                        )}

                        {/* Valor + Data NF */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                              {isAcordo ? "Valor do Acordo *" : "Valor Total *"}
                            </Label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                              <Input className="h-8 text-sm pl-7" value={novoGasto.valor_total}
                                onChange={(e) => setNovoGasto({ ...novoGasto, valor_total: formatCurrency(e.target.value) })}
                                placeholder="0,00" />
                            </div>
                          </div>
                          {!isAcordo && (
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Data da NF *</Label>
                              <Input type="date" className="h-8 text-sm" value={novoGasto.data_nota_fiscal}
                                onChange={(e) => setNovoGasto({ ...novoGasto, data_nota_fiscal: e.target.value })} />
                            </div>
                          )}
                        </div>

                        {/* Forma de pagamento */}
                        <div className="flex gap-3 items-end">
                          <div className="space-y-1 flex-1">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Forma de Pagamento</Label>
                            <Select value={novoGasto.forma_pagamento} onValueChange={handleFormaPagamentoChange}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="a_vista">À Vista</SelectItem>
                                <SelectItem value="parcelado">Parcelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {novoGasto.forma_pagamento === "parcelado" && (
                            <div className="space-y-1 w-28">
                              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Parcelas</Label>
                              <Input type="number" min="2" max="12" className="h-8 text-sm"
                                value={novoGasto.numero_parcelas}
                                onChange={(e) => handleNumeroParcelasChange(e.target.value)} />
                            </div>
                          )}
                        </div>

                        {/* Datas de pagamento */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {novoGasto.forma_pagamento === "a_vista" ? "Data de Pagamento *" : "Datas das Parcelas *"}
                          </Label>
                          <div className="space-y-1.5">
                            {novoGasto.datas_pagamento.map((data, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                {novoGasto.forma_pagamento === "parcelado" && (
                                  <span className="text-xs text-slate-500 w-16 shrink-0">Parc. {index + 1}</span>
                                )}
                                <Input type="date" className="h-8 text-sm flex-1" value={data}
                                  onChange={(e) => {
                                    const nd = [...novoGasto.datas_pagamento];
                                    nd[index] = e.target.value;
                                    setNovoGasto({ ...novoGasto, datas_pagamento: nd });
                                  }} />
                                {novoGasto.forma_pagamento === "parcelado" && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-400">R$</span>
                                    <Input type="number" step="0.01" className="h-8 text-sm w-24"
                                      value={novoGasto.valores_parcelas[index] || ""}
                                      onChange={(e) => {
                                        const nv = [...novoGasto.valores_parcelas];
                                        nv[index] = e.target.value;
                                        setNovoGasto({ ...novoGasto, valores_parcelas: nv });
                                      }} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Área de Anexos — obrigatório */}
                        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> Documentos Anexados *
                            </Label>
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                multiple
                                className="hidden"
                                onChange={handleAnexarArquivo}
                                disabled={isUploadingAnexo}
                              />
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded px-2 py-1 transition-colors">
                                {isUploadingAnexo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                Anexar arquivo
                              </span>
                            </label>
                          </div>
                          <p className="text-xs text-amber-600">PDF, JPG ou PNG. Ao menos um documento obrigatório (NF, termo, recibo, etc.)</p>

                          {anexos.length > 0 && (
                            <div className="space-y-1 mt-1">
                              {anexos.map((a, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white rounded px-2 py-1 border border-amber-200 text-xs">
                                  {a.uploading ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-amber-500 shrink-0" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                                  )}
                                  <span className="flex-1 truncate text-slate-700">{a.name}</span>
                                  {!a.uploading && (
                                    <button onClick={() => handleRemoverAnexo(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Erro inline */}
                        {error && (
                          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                          </div>
                        )}

                        <Button
                          onClick={handleAdicionarGasto}
                          disabled={isSavingGasto || isUploadingAnexo || anexosProntos.length === 0}
                          className="w-full bg-green-600 hover:bg-green-700 h-9 disabled:opacity-60"
                        >
                          {isSavingGasto ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
                          ) : (
                            <><CheckCircle className="w-4 h-4 mr-2" />Salvar Gasto{anexosProntos.length === 0 ? " (anexo obrigatório)" : ""}</>
                          )}
                        </Button>
                      </div>
                    );
                  })()}
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
                      <TableHead>Fornecedor / Beneficiário</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data NF</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Anexos</TableHead>
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
                            ) : gasto.tipo_gasto === "acordo_extrajudicial" ? (
                              <FileText className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Package className="w-4 h-4 text-green-600" />
                            )}
                            <span className="capitalize text-sm">
                              {gasto.tipo_gasto === "acordo_extrajudicial" ? "Acordo Ext." : gasto.tipo_gasto}
                            </span>
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
                            <Badge variant="secondary" className="bg-green-100 text-green-800">À Vista</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">{gasto.numero_parcelas}x</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {gasto.anexos_urls?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {gasto.anexos_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline">
                                  <Paperclip className="w-3 h-3" />{i + 1}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
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
      </div>
    </div>
  );
}