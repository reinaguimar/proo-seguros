import React, { useState } from "react";
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
  Search, 
  CheckCircle, 
  FileText,
  Calendar,
  Users,
  Shield,
  DollarSign,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

import CpfCnpjInput from "../components/nova-apolice/CpfCnpjInput";

const validateCPF = (cpf) => {
  if (typeof cpf !== 'string') return false;
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
  cpf = cpf.split('').map(el => +el);
  const rest = (count) => (cpf.slice(0, count-12).reduce((soma, el, index) => soma + el * (count-index), 0) * 10) % 11 % 10;
  return rest(10) === cpf[9] && rest(11) === cpf[10];
};

const validateCNPJ = (cnpj) => {
  if (typeof cnpj !== 'string') return false;
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14 || !!cnpj.match(/(\d)\1{13}/)) return false;
  
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado != digitos.charAt(0)) return false;
  
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
  if (resultado != digitos.charAt(1)) return false;
  
  return true;
};

const validateCpfCnpj = (value) => {
  if (!value) return false;
  const cleanedValue = value.replace(/[^\d]/g, '');
  if (cleanedValue.length === 11) {
    return validateCPF(cleanedValue);
  }
  if (cleanedValue.length === 14) {
    return validateCNPJ(cleanedValue);
  }
  return false;
};

const cleanCpfCnpj = (value) => value.replace(/[^\d]/g, '');

const PRODUTOS_INFO = {
  FR: { nome: "Furto e Roubo", icon: "🚗", color: "bg-red-100 text-red-800 border-red-300" },
  COL_PARCIAL: { nome: "Colisão Parcial", icon: "🔧", color: "bg-blue-100 text-blue-800 border-blue-300" },
  COL_TOTAL: { nome: "Colisão Total", icon: "💥", color: "bg-purple-100 text-purple-800 border-purple-300" },
  INCENDIO: { nome: "Incêndio e Fenômenos", icon: "🔥", color: "bg-orange-100 text-orange-800 border-orange-300" },
  RCFV: { nome: "RCF-V", icon: "⚖️", color: "bg-green-100 text-green-800 border-green-300" }
};

export default function NovoSinistro() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dataSinistro, setDataSinistro] = useState("");
  const [cpfSegurado, setCpfSegurado] = useState("");
  const [apolicesEncontradas, setApolicesEncontradas] = useState([]);
  const [apoliceSeleccionada, setApoliceSeleccionada] = useState(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [dataAbertura, setDataAbertura] = useState(new Date().toISOString().split('T')[0]);
  const [valorInicial, setValorInicial] = useState("");
  const [valorFranquia, setValorFranquia] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleBuscarApolices = async () => {
    setError(null);

    if (!dataSinistro) {
      setError("Por favor, informe a data do sinistro.");
      return;
    }

    if (!cpfSegurado) {
      setError("Por favor, informe o CPF/CNPJ do segurado.");
      return;
    }

    if (!validateCpfCnpj(cpfSegurado)) {
      setError("CPF/CNPJ inválido. Por favor, verifique o número digitado.");
      return;
    }

    setIsSearching(true);

    try {
      const cpfLimpo = cleanCpfCnpj(cpfSegurado);
      const dataSinistroObj = new Date(dataSinistro);
      const todasApolices = await base44.entities.Apolice.list();

      const apolicesVigentes = todasApolices.filter(apolice => {
        const cpfApolice = cleanCpfCnpj(apolice.id_segurado);
        const dataInicio = new Date(apolice.data_inicio_apolice);
        const dataFim = new Date(apolice.data_fim_apolice);
        const estaCancelada = apolice.cancelada_para_revisao || apolice.status === 'cancelada';

        return (
          cpfApolice === cpfLimpo &&
          dataSinistroObj >= dataInicio &&
          dataSinistroObj <= dataFim &&
          !estaCancelada
        );
      });

      if (apolicesVigentes.length === 0) {
        setError("Nenhuma apólice ativa encontrada para este CPF/CNPJ na data informada.");
        setApolicesEncontradas([]);
      } else {
        setApolicesEncontradas(apolicesVigentes);
        setStep(2);
      }
    } catch (err) {
      setError("Erro ao buscar apólices. Por favor, tente novamente.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelecionarApolice = (apolice) => {
    setApoliceSeleccionada(apolice);
  };

  const handleContinuarParaProduto = () => {
    if (!apoliceSeleccionada) {
      setError("Por favor, selecione uma apólice para continuar.");
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleContinuarParaDados = () => {
    if (!produtoSelecionado) {
      setError("Por favor, selecione o produto/motivo do sinistro.");
      return;
    }
    setError(null);
    setStep(4);
  };

  const gerarNumeroSinistro = () => {
    const ano = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `SIN-${ano}-${timestamp}`;
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

  const handleCriarSinistro = async () => {
    if (!dataAbertura) {
      setError("Por favor, informe a data de abertura.");
      return;
    }

    if (!valorInicial) {
      setError("Por favor, informe o valor inicial.");
      return;
    }

    setIsSaving(true);
    try {
      const numeroSinistro = gerarNumeroSinistro();
      
      const sinistroData = {
        numero_sinistro: numeroSinistro,
        data_sinistro: dataSinistro,
        data_abertura: dataAbertura,
        cpf_segurado: cleanCpfCnpj(cpfSegurado),
        id_apolice: apoliceSeleccionada.id,
        numero_apolice: apoliceSeleccionada.numero_apolice,
        produto_sinistrado: produtoSelecionado,
        valor_inicial: parseCurrency(valorInicial),
        franquia: valorFranquia || 0,
        status: "aberto",
        descricao: descricao
      };

      const novoSinistro = await base44.entities.Sinistro.create(sinistroData);
      
      // Redirecionar para a página de detalhes do sinistro
      navigate(createPageUrl(`SinistroDetalhes?id=${novoSinistro.id}`));
    } catch (err) {
      setError("Erro ao criar sinistro. Tente novamente.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoltar = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    } else {
      navigate(createPageUrl("Dashboard"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={handleVoltar}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Registrar Sinistro</h1>
            <p className="text-slate-600">
              {step === 1 && "Informe os dados iniciais do sinistro"}
              {step === 2 && "Selecione a apólice correspondente"}
              {step === 3 && "Selecione o produto/motivo do sinistro"}
              {step === 4 && "Informe os dados do sinistro"}
            </p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-md overflow-x-auto">
          {[1, 2, 3, 4].map((s, index) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${step >= s ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step >= s ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                }`}>
                  {s}
                </div>
                <span className="font-medium text-sm hidden md:inline">
                  {s === 1 && "Dados"}
                  {s === 2 && "Apólice"}
                  {s === 3 && "Produto"}
                  {s === 4 && "Registro"}
                </span>
              </div>
              {index < 3 && (
                <div className={`h-1 flex-1 mx-2 rounded ${step > s ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Dados Iniciais */}
        {step === 1 && (
          <Card className="shadow-lg border-blue-100">
            <CardHeader className="border-b border-blue-100">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Informações Iniciais
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="data_sinistro" className="font-medium text-slate-700">
                  Data do Sinistro *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="data_sinistro"
                    type="date"
                    value={dataSinistro}
                    onChange={(e) => setDataSinistro(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="pl-10 border-slate-200 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf_segurado" className="font-medium text-slate-700">
                  CPF/CNPJ do Segurado *
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <CpfCnpjInput
                    id="cpf_segurado"
                    value={cpfSegurado}
                    onChange={(value) => setCpfSegurado(value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="pl-10 border-slate-200 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <Button
                onClick={handleBuscarApolices}
                disabled={isSearching}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? "Buscando..." : "Buscar Apólices"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Seleção de Apólice */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="shadow-lg border-green-100">
              <CardHeader className="border-b border-green-100 bg-green-50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <CardTitle className="text-green-900">
                      {apolicesEncontradas.length} Apólice(s) Encontrada(s)
                    </CardTitle>
                    <p className="text-sm text-green-700 mt-1">
                      Selecione a apólice correspondente ao sinistro
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4">
              {apolicesEncontradas.map((apolice) => (
                <Card
                  key={apolice.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    apoliceSeleccionada?.id === apolice.id
                      ? 'border-2 border-blue-500 shadow-lg bg-blue-50'
                      : 'border border-slate-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                  onClick={() => handleSelecionarApolice(apolice)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-slate-500 mb-1">Número da Apólice</p>
                        <p className="text-lg font-bold text-slate-900 font-mono">
                          {apolice.numero_apolice}
                        </p>
                      </div>
                      {apoliceSeleccionada?.id === apolice.id && (
                        <div className="bg-blue-600 text-white p-2 rounded-full">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Vigência</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {format(new Date(apolice.data_inicio_apolice), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(apolice.data_fim_apolice), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Veículo</p>
                        <p className="text-sm font-mono text-slate-700">{apolice.id_objeto}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-2">Produtos Contratados</p>
                      <div className="flex flex-wrap gap-2">
                        {(apolice.produtos || []).map(produto => (
                          <Badge key={produto} variant="secondary" className="text-xs">
                            {PRODUTOS_INFO[produto]?.nome || produto}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              onClick={handleContinuarParaProduto}
              disabled={!apoliceSeleccionada}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Step 3: Seleção de Produto */}
        {step === 3 && apoliceSeleccionada && (
          <div className="space-y-6">
            <Card className="shadow-lg border-blue-100">
              <CardHeader className="border-b border-blue-100">
                <CardTitle>Selecione o Produto/Motivo do Sinistro</CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Escolha qual cobertura será utilizada para este sinistro
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  {(apoliceSeleccionada.produtos || []).map(produto => {
                    const info = PRODUTOS_INFO[produto];
                    return (
                      <Card
                        key={produto}
                        className={`cursor-pointer transition-all duration-200 ${
                          produtoSelecionado === produto
                            ? `border-2 border-blue-500 shadow-lg ${info.color}`
                            : 'border border-slate-200 hover:border-blue-300 hover:shadow-md'
                        }`}
                        onClick={() => setProdutoSelecionado(produto)}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="text-4xl mb-3">{info.icon}</div>
                          <h3 className="font-bold text-lg mb-2">{info.nome}</h3>
                          {produtoSelecionado === produto && (
                            <CheckCircle className="w-6 h-6 mx-auto text-blue-600 mt-2" />
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleContinuarParaDados}
              disabled={!produtoSelecionado}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Step 4: Dados do Sinistro */}
        {step === 4 && (
          <Card className="shadow-lg border-blue-100">
            <CardHeader className="border-b border-blue-100">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Dados do Sinistro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="data_abertura" className="font-medium text-slate-700">
                  Data de Abertura *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="data_abertura"
                    type="date"
                    value={dataAbertura}
                    onChange={(e) => setDataAbertura(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="pl-10 border-slate-200 focus:border-blue-500"
                    required
                  />
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
                      value={valorInicial}
                      onChange={(e) => setValorInicial(formatCurrency(e.target.value))}
                      placeholder="0,00"
                      className="pl-16 border-slate-200 focus:border-blue-500"
                      required
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
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorFranquia}
                      onChange={(e) => setValorFranquia(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="pl-16 border-slate-200 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className="font-medium text-slate-700">
                  Descrição do Sinistro
                </Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o que aconteceu..."
                  className="border-slate-200 focus:border-blue-500 min-h-[120px]"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Resumo do Registro</h4>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Apólice:</strong> {apoliceSeleccionada.numero_apolice}</p>
                  <p><strong>Produto:</strong> {PRODUTOS_INFO[produtoSelecionado]?.nome}</p>
                  <p><strong>Data do Sinistro:</strong> {format(new Date(dataSinistro), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              </div>

              <Button
                onClick={handleCriarSinistro}
                disabled={isSaving}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando Sinistro...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Criar Sinistro
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}