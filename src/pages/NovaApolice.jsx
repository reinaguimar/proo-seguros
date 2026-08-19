import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertCircle, Loader2, CheckCircle, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import Stepper from "../components/nova-apolice/Stepper";
import Step1InfoGerais from "../components/nova-apolice/steps/Step1_InfoGerais";
import Step2ValoresVigencia from "../components/nova-apolice/steps/Step2_ValoresVigencia";
import Step3Produtos from "../components/nova-apolice/steps/Step3_Produtos";
import PolicySummary from "../components/nova-apolice/PolicySummary";

// Funções de validação de CPF/CNPJ
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

const STEPS = ["Informações Gerais", "Valores e Vigência", "Produtos e Coberturas"];

export default function NovaApolice() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    data_inicio: '',
    id_segurado: '',
    id_beneficiario: '',
    lmi_geral: '',
    produtos: ["FR"], // "Furto e Roubo" é básico
    premio_bruto: '',
    id_objeto: '',
    data_movimento: new Date().toISOString().split('T')[0],
    filial_id: '',
    filial_codigo_susep: '',
    filial_nome: '',
    rcfv_lmi: 100000,
  });
  const [calculatedData, setCalculatedData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [createdApolice, setCreatedApolice] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateApolice, setDuplicateApolice] = useState(null);
  const [cpfCnpjValidos, setCpfCnpjValidos] = useState(false);

  const CONFIG = {
    aliquota_iof: 0.0738,
    percentual_corretagem: 0.001, // Alterado para 0,10%
    prazo_em_dias: 30, // Mudança: agora são 30 dias
  };

  const COBERTURAS_FIXAS = [
    { id_cobertura: "001", ramo: 31, nome: "Furto", percentual: 0.20, produto: "FR" },
    { id_cobertura: "002", ramo: 31, nome: "Roubo", percentual: 0.20, produto: "FR" },
    { id_cobertura: "006", ramo: 42, nome: "RCF-V", percentual: 0.11, produto: "RCFV" },
    { id_cobertura: "008", ramo: 31, nome: "Colisão Parcial", percentual: 0.18, produto: "COL_PARCIAL" },
    { id_cobertura: "009", ramo: 31, nome: "Colisão Total", percentual: 0.22, produto: "COL_TOTAL" },
    { id_cobertura: "010", ramo: 31, nome: "Incendio e Fenomenos da Natureza", percentual: 0.09, produto: "INCENDIO" }
  ];

  const cleanCpfCnpj = (value) => {
    const digits = String(value || '').replace(/[^\d]/g, '');
    if (!digits) return digits;
    // Normaliza: CPF = 11 dígitos, CNPJ = 14 dígitos
    if (digits.length <= 11) return digits.padStart(11, '0');
    return digits.padStart(14, '0');
  };

  // NOTA: geração de número de apólice foi movida para a server function `gerarNumeroApolice`.
  // Esta função é apenas um wrapper para manter compatibilidade com calculateDerivatives.
  const generatePolicyNumber = async (id_objeto, filial_id, filial_codigo_susep) => {
    const response = await base44.functions.invoke('gerarNumeroApolice', {
      filial_id,
      id_objeto,
      filial_codigo_susep
    });
    if (!response.data?.sucesso) {
      throw new Error(response.data?.error || 'Erro ao gerar número da apólice.');
    }
    const { numero_apolice: numeroGerado, sequencial_usado: novoSequencial, filial_id: filialId, filial_codigo: filialCodigo } = response.data;
    return { numeroGerado, novoSequencial, filialId, filialCodigo };
  };

  const calculateDerivatives = async (data) => {
    const startDate = new Date(data.data_inicio);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + CONFIG.prazo_em_dias); 
    
    const { numeroGerado: numero_apolice, novoSequencial, filialId, filialCodigo } = await generatePolicyNumber(data.id_objeto, data.filial_id, data.filial_codigo_susep);
    const valor_corretagem_total = Math.round(data.premio_bruto * CONFIG.percentual_corretagem * 100) / 100;

    // RCF-V é produto de PREÇO FIXO: cobra o valor configurado no cadastro da filial (por LMI).
    const filiaisRcfv = await base44.entities.Filial.filter({ id: data.filial_id });
    const rcfvPrecos = filiaisRcfv[0]?.rcfv_precos || {};
    const precoRcfv = (lmi) => {
      const v = rcfvPrecos[lmi] ?? rcfvPrecos[String(lmi)];
      return (v === undefined || v === null || v === "") ? 35.90 : Number(v);
    };
    const temRCFV = data.produtos.includes("RCFV");
    const valorFixoRcfv = temRCFV ? precoRcfv(data.rcfv_lmi || 100000) : 0;
    const premio_distribuivel = Math.round((data.premio_bruto - valorFixoRcfv) * 100) / 100;

    // Percentual apenas dos produtos NÃO-RCFV selecionados (RCFV sai do rateio)
    const percentual_total_selecionado = COBERTURAS_FIXAS
      .filter(c => c.produto !== "RCFV" && data.produtos.includes(c.produto))
      .reduce((sum, c) => sum + c.percentual, 0);

    const coberturas_calculadas = COBERTURAS_FIXAS.map((cobertura, index) => {
      let premio_bruto = 0;
      let valor_maximo = 0;
      
      const isSelected = data.produtos.includes(cobertura.produto);

      if (isSelected) {
        if (cobertura.produto === "RCFV") {
          valor_maximo = data.rcfv_lmi || 100000;
          premio_bruto = valorFixoRcfv;
        } else {
          valor_maximo = data.lmi_geral;
          if (percentual_total_selecionado > 0) {
            const percentual_relativo = cobertura.percentual / percentual_total_selecionado;
            premio_bruto = Math.round(premio_distribuivel * percentual_relativo * 100) / 100;
          }
        }
      }
      
      const premio_comercial = Math.round((premio_bruto - (premio_bruto * CONFIG.aliquota_iof)) * 100) / 100;
      const corretagem = Math.round(premio_bruto * CONFIG.percentual_corretagem * 100) / 100;
      const premio_retido = Math.round((premio_comercial - corretagem) * 100) / 100;
      
      return {
        idx: index + 1,
        id_cobertura: cobertura.id_cobertura,
        ramo: cobertura.ramo,
        valor_maximo: valor_maximo,
        id_objeto: "007", // Fixo conforme especificação
        premio_bruto: premio_bruto,
        premio_comercial: premio_comercial,
        premio_retido: premio_retido,
        nome: cobertura.nome
      };
    });

    const iof_total = Math.round(data.premio_bruto * CONFIG.aliquota_iof * 100) / 100;
    const premio_comercial_total = Math.round((data.premio_bruto - iof_total) * 100) / 100;

    return { 
      numero_apolice, 
      data_fim: endDate, 
      iof_total, 
      premio_comercial_total,
      valor_corretagem_total,
      coberturas_calculadas,
      novoSequencial,
      filialId,
      filialCodigo
    };
  };

  const handleSavePolicy = async (force = false) => {
    setIsProcessing(true);
    try {
      // Verificar apólice duplicada (CPF + Placa + vigência ativa) se não forçado
      if (!force) {
        const cpfCheck = cleanCpfCnpj(formData.id_segurado);
        const existentes = await base44.entities.Apolice.filter({ id_segurado: cpfCheck, id_objeto: formData.id_objeto?.toUpperCase() });
        const ativaConflitante = existentes.find(a =>
          !a.cancelada_para_revisao && a.status !== 'cancelada' && a.data_fim_apolice >= formData.data_inicio
        );
        if (ativaConflitante) {
          setDuplicateApolice(ativaConflitante);
          setShowDuplicateModal(true);
          setIsProcessing(false);
          return;
        }
      }
      const apoliceData = {
        numero_apolice: calculatedData.numero_apolice,
        natureza_movimento: "01", // Mudança: agora é "01"
        tipo_movimento: "01", // Mudança: agora é "01"
        valor_corretagem: calculatedData.valor_corretagem_total,
        iof: calculatedData.iof_total,
        data_inicio_apolice: formData.data_inicio,
        data_fim_apolice: calculatedData.data_fim.toISOString().split('T')[0],
        data_inicio_cobertura: formData.data_inicio,
        data_fim_cobertura: calculatedData.data_fim.toISOString().split('T')[0],
        id_segurado: cleanCpfCnpj(formData.id_segurado),
        id_beneficiario: cleanCpfCnpj(formData.id_beneficiario),
        seguro_intermitente: true, // Correção: "01" para true
        data_movimento: formData.data_inicio, // Mudança: usar data de emissão
        lmi_geral: parseCurrency(formData.lmi_geral),
        premio_bruto_total: parseCurrency(formData.premio_bruto),
        produtos: formData.produtos,
        rcfv_lmi: formData.produtos.includes('RCFV') ? (formData.rcfv_lmi || 100000) : undefined,
        id_objeto: formData.id_objeto,
        filial_id: formData.filial_id,
        filial_codigo_susep: formData.filial_codigo_susep,
        filial_nome: formData.filial_nome,
        filial_codigo: calculatedData.filialCodigo,
      };
      
      // Limpa propriedades nulas ou indefinidas antes de enviar
      Object.keys(apoliceData).forEach(key => {
        if (apoliceData[key] === undefined || apoliceData[key] === null) {
          delete apoliceData[key];
        }
      });

      // Adicionar todas as 6 coberturas fixas (com seus valores calculados, que podem ser 0 se não selecionadas)
      calculatedData.coberturas_calculadas.forEach((cobertura, index) => {
        const prefix = `cobertura_${index + 1}_`;
        apoliceData[prefix + 'id_cobertura'] = cobertura.id_cobertura;
        apoliceData[prefix + 'ramo'] = cobertura.ramo;
        apoliceData[prefix + 'valor_maximo'] = cobertura.valor_maximo;
        apoliceData[prefix + 'id_objeto'] = cobertura.id_objeto;
        apoliceData[prefix + 'premio_bruto'] = cobertura.premio_bruto;
        apoliceData[prefix + 'premio_comercial'] = cobertura.premio_comercial;
        apoliceData[prefix + 'premio_retido'] = cobertura.premio_retido;
      });
      
      const newApolice = await base44.entities.Apolice.create(apoliceData);

      // Atualizar total de apólices da filial
      // (ultimo_numero_sequencial já atualizado pela server function gerarNumeroApolice)
      const filialAtual = await base44.entities.Filial.filter({ id: calculatedData.filialId });
      if (filialAtual.length > 0) {
        await base44.entities.Filial.update(calculatedData.filialId, {
          total_apolices: (filialAtual[0].total_apolices || 0) + 1
        });
      }

      setCreatedApolice(newApolice);
      setShowSummary(false);

    } catch (error) {
      setError("Erro ao salvar apólice. Tente novamente.");
      console.error("Erro ao salvar:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const validateStep = (step) => {
    const errors = [];
    switch (step) {
      case 1:
        if (!formData.filial_id) errors.push("Selecione a filial emissora");
        if (!validateCpfCnpj(formData.id_segurado)) errors.push("CPF/CNPJ do segurado inválido");
        if (!validateCpfCnpj(formData.id_beneficiario)) errors.push("CPF/CNPJ do beneficiário inválido");
        if (!formData.id_objeto) errors.push("O ID do objeto (placa/chassi) é obrigatório");
        break;
      case 2:
        if (!formData.data_inicio) errors.push("Data de início é obrigatória");
        if (!formData.lmi_geral || parseCurrency(formData.lmi_geral) <= 0) errors.push("Informe o LMI");
        if (!formData.premio_bruto || parseCurrency(formData.premio_bruto) <= 0) errors.push("Informe o prêmio bruto");
        break;
      case 3:
        if (!formData.produtos || formData.produtos.length === 0) errors.push("Selecione ao menos um produto");
        // Check if "FR" (Furto e Roubo) is always selected as it's the base.
        if (!formData.produtos.includes("FR")) errors.push("O produto 'Furto e Roubo' é obrigatório.");
        break;
      default:
        break;
    }
    if (errors.length > 0) {
      setError(errors.join(". "));
      return false;
    }
    setError(null);
    return true;
  };
  
  const parseCurrency = (formattedValue) => {
    if (!formattedValue) return 0;
    const numericValue = formattedValue.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numericValue) || 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculateAndReview = async () => {
    if (!validateStep(3)) return;

    setIsProcessing(true);
    const processedData = {
        ...formData,
        lmi_geral: parseCurrency(formData.lmi_geral),
        premio_bruto: parseCurrency(formData.premio_bruto)
    };
    
    try {
      const calculated = await calculateDerivatives(processedData);
      setCalculatedData(calculated);
      setShowSummary(true);
    } catch (e) {
      setError("Erro ao gerar número da apólice. Verifique os dados e tente novamente.");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1InfoGerais formData={formData} onInputChange={handleInputChange} onValidityChange={setCpfCnpjValidos} />;
      case 2:
        return <Step2ValoresVigencia formData={formData} onInputChange={handleInputChange} />;
      case 3:
        return <Step3Produtos formData={formData} onInputChange={handleInputChange} COBERTURAS_FIXAS={COBERTURAS_FIXAS}/>;
      default:
        return null;
    }
  };

  if (createdApolice) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4 md:p-6 flex items-center justify-center">
            <Card className="w-full max-w-lg text-center shadow-2xl border-green-200">
                <CardHeader>
                    <div className="mx-auto bg-green-100 p-4 rounded-full w-fit">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800 mt-4">Apólice Emitida com Sucesso!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-slate-600">
                        A apólice <strong className="font-mono">{createdApolice.numero_apolice}</strong> foi criada e está ativa.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to={createPageUrl(`CertificadoApolice?id=${createdApolice.id}`)} target="_blank">
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                                <FileText className="w-4 h-4 mr-2" />
                                Ver Certificado
                            </Button>
                        </Link>
                        <Link to={createPageUrl(`ApoliceDetalhes?id=${createdApolice.id}`)} target="_blank">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                <FileText className="w-4 h-4 mr-2" />
                                Ver Apólice Detalhada
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={() => navigate(0)}>
                            Emitir Nova Apólice
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (showSummary) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
            {showDuplicateModal && duplicateApolice && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                  <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Apólice Duplicada Detectada
                  </h3>
                  <p className="text-sm text-slate-600">Já existe uma apólice ativa com o mesmo CPF/CNPJ e veículo:</p>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                    <p className="font-mono font-bold">{duplicateApolice.numero_apolice}</p>
                    <p className="text-slate-500 text-xs mt-1">Vigência: {duplicateApolice.data_inicio_apolice} até {duplicateApolice.data_fim_apolice}</p>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button className="px-4 py-2 border rounded-lg text-sm" onClick={() => { setShowDuplicateModal(false); setDuplicateApolice(null); }}>Cancelar</button>
                    <button className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm" onClick={() => { setShowDuplicateModal(false); handleSavePolicy(true); }}>Emitir Mesmo Assim</button>
                  </div>
                </div>
              </div>
            )}
            <div className="max-w-4xl mx-auto">
                <PolicySummary
                    formData={formData}
                    calculatedData={calculatedData}
                    onSave={() => handleSavePolicy(false)}
                    onEdit={() => setShowSummary(false)}
                    isProcessing={isProcessing}
                />
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Dashboard"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Nova Apólice</h1>
            <p className="text-slate-600">Siga os 3 passos para cadastrar</p>
          </div>
        </div>

        <Stepper steps={STEPS} currentStep={currentStep} />

        {error && (
          <Alert variant="destructive" className="my-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg border-blue-100">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800">
              Passo {currentStep}: {STEPS[currentStep - 1]}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mt-6">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            Anterior
          </Button>
          {currentStep < STEPS.length ? (
            <Button onClick={nextStep} disabled={currentStep === 1 && !cpfCnpjValidos}>Próximo</Button>
          ) : (
            <Button onClick={handleCalculateAndReview} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Calcular e Revisar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}