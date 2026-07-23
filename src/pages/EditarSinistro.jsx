import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  Shield,
  DollarSign,
  Calendar,
  Loader2,
  Save
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRODUTOS_INFO = {
  FR: { nome: "Furto e Roubo" },
  COL_PARCIAL: { nome: "Colisão Parcial" },
  COL_TOTAL: { nome: "Colisão Total" },
  INCENDIO: { nome: "Incêndio e Fenômenos" },
  RCFV: { nome: "RCF-V" }
};

const STATUS_OPTIONS = [
  { value: "aberto", label: "Aberto" },
  { value: "em_analise", label: "Em Análise" },
  { value: "aprovado", label: "Aprovado" },
  { value: "em_reparo", label: "Em Reparo" },
  { value: "concluido", label: "Concluído" },
  { value: "negado", label: "Negado" }
];

export default function EditarSinistro() {
  const navigate = useNavigate();
  const [sinistro, setSinistro] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [formData, setFormData] = useState({
    data_sinistro: "",
    data_abertura: "",
    valor_inicial: "",
    franquia: "",
    status: "",
    descricao: "",
    observacoes: ""
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

      setFormData({
        data_sinistro: sinistroData.data_sinistro || "",
        data_abertura: sinistroData.data_abertura || "",
        valor_inicial: formatCurrency(String((sinistroData.valor_inicial || 0) * 100)),
        franquia: formatCurrency(String((sinistroData.franquia || 0) * 100)),
        status: sinistroData.status || "aberto",
        descricao: sinistroData.descricao || "",
        observacoes: sinistroData.observacoes || ""
      });
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

  const handleSalvar = async () => {
    setError(null);

    if (!formData.data_sinistro) {
      setError("Por favor, informe a data do sinistro.");
      return;
    }

    if (!formData.data_abertura) {
      setError("Por favor, informe a data de abertura.");
      return;
    }

    if (!formData.valor_inicial) {
      setError("Por favor, informe o valor inicial.");
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        data_sinistro: formData.data_sinistro,
        data_abertura: formData.data_abertura,
        valor_inicial: parseCurrency(formData.valor_inicial),
        franquia: parseCurrency(formData.franquia),
        status: formData.status,
        descricao: formData.descricao,
        observacoes: formData.observacoes
      };

      await base44.entities.Sinistro.update(sinistro.id, updateData);
      
      setSuccessMessage("Sinistro atualizado com sucesso!");
      setTimeout(() => {
        navigate(createPageUrl(`SinistroDetalhes?id=${sinistro.id}`));
      }, 1500);
    } catch (err) {
      setError("Erro ao atualizar sinistro. Tente novamente.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
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
            <Button onClick={() => navigate(createPageUrl("Sinistros"))}>
              Voltar aos Sinistros
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Sinistros"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Editar Sinistro</h1>
            <p className="text-slate-600">Sinistro: {sinistro.numero_sinistro} | Apólice: {sinistro.numero_apolice}</p>
          </div>
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

        {/* Informações Fixas */}
        <Card className="shadow-lg border-blue-100 bg-blue-50">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-slate-500">CPF/CNPJ Segurado</Label>
                <p className="font-mono font-semibold text-slate-900">{sinistro.cpf_segurado}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Produto</Label>
                <p className="font-semibold text-slate-900">{PRODUTOS_INFO[sinistro.produto_sinistrado]?.nome}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">ID Apólice</Label>
                <p className="font-mono font-semibold text-slate-900">{sinistro.id_apolice}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Edição */}
        <Card className="shadow-lg border-orange-100">
          <CardHeader className="border-b border-orange-100">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Dados do Sinistro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="data_sinistro" className="font-medium text-slate-700">
                  Data do Sinistro (Ocorrência) *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="data_sinistro"
                    type="date"
                    value={formData.data_sinistro}
                    onChange={(e) => setFormData({...formData, data_sinistro: e.target.value})}
                    className="pl-10 border-slate-200 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_abertura" className="font-medium text-slate-700">
                  Data de Abertura (Aviso) *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="data_abertura"
                    type="date"
                    value={formData.data_abertura}
                    onChange={(e) => setFormData({...formData, data_abertura: e.target.value})}
                    className="pl-10 border-slate-200 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="valor_inicial" className="font-medium text-slate-700">
                  Valor Inicial Estimado *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <span className="absolute left-9 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
                  <Input
                    id="valor_inicial"
                    value={formData.valor_inicial}
                    onChange={(e) => setFormData({...formData, valor_inicial: formatCurrency(e.target.value)})}
                    placeholder="0,00"
                    className="pl-16 border-slate-200 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="franquia" className="font-medium text-slate-700">
                  Franquia
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <span className="absolute left-9 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
                  <Input
                    id="franquia"
                    value={formData.franquia}
                    onChange={(e) => setFormData({...formData, franquia: formatCurrency(e.target.value)})}
                    placeholder="0,00"
                    className="pl-16 border-slate-200 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="font-medium text-slate-700">
                Status *
              </Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao" className="font-medium text-slate-700">
                Descrição do Sinistro
              </Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                placeholder="Descreva o que aconteceu..."
                className="border-slate-200 focus:border-orange-500 min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes" className="font-medium text-slate-700">
                Observações
              </Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                placeholder="Observações gerais..."
                className="border-slate-200 focus:border-orange-500 min-h-[100px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("Sinistros"))}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={isSaving}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}