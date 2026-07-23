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
    data_movimento: new Date().toISOString().split('T')[0]
  });
  const [calculatedData, setCalculatedData] = useState(null);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [createdApolice, setCreatedApolice] = useState(null); // Novo estado

  const CONFIG = {
    aliquota_iof: 0.0738,
    percentual_corretagem: 0.001, // Alterado para 0,10%
    prazo_em_dias: 30, // Mudança: agora são 30 dias
  };

  const COBERTURAS_FIXAS = [
    { id_cobertura: "001", ramo: 31, nome: "Furto", percentual: 0.195, produto: "FR" },
    { id_cobertura: "002", ramo: 31, nome: "Roubo", percentual: 0.215, produto: "FR" },
    { id_cobertura: "006", ramo: 42, nome: "RCF-V", percentual: 0, valor_fixo: 35.90, lmi_fixo: 100000, produto: "RCFV" },
    { id_cobertura: "008", ramo: 31, nome: "Colisão Parcial", percentual: 0.28, produto: "COL_PARCIAL" },
    { id_cobertura: "009", ramo: 31, nome: "Colisão Total", percentual: 0.22, produto: "COL_TOTAL" },
    { id_cobertura: "010", ramo: 31, nome: "Incendio e Fenomenos da Natureza", percentual: 0.09, produto: "INCENDIO" }
  ];

  const cleanCpfCnpj = (value) => value.replace(/[^\d]/g, '');

  const generatePolicyNumber = async (id_objeto) => {
    if (!id_objeto) throw new Error("ID do objeto é obrigatório para gerar o número da apólice.");
    let yyyyy = '00001', zzz = '001';
    const existingPoliciesForObject = await base44.entities.Apolice.filter({ id_objeto });
    if (existingPoliciesForObject.length > 0) {
      zzz = (existingPoliciesForObject.length + 1).toString().padStart(3, '0');
      const parts = existingPoliciesForObject[0].numero_apolice.split('.');
      if (parts.length === 6) yyyyy = parts[4];
    } else {
      const allPolicies = await base44.entities.Apolice.list();
      if (allPolicies.length > 0) {
        const maxYYYYY = allPolicies.reduce((max, policy) => {
          const parts = policy.numero_apolice.split('.');
          if (parts.length === 6) {
            const currentY = parseInt(parts[4], 10);
            return currentY > max ? currentY : max;
          }
          return max;
        }, 0);
        yyyyy = (maxYYYYY + 1).toString().padStart(5, '0');
      }
    }
    const year = new Date().getFullYear();
    const numeroGerado = `110627.${year}.02.031.${yyyyy}.${zzz}`;
    
    // VALIDAÇÃO: Verificar se número já existe no banco
    const duplicata = await base44.entities.Apolice.filter({ numero_apolice: numeroGerado });
    if (duplicata.length > 0) {
      throw new Error(`Número de apólice ${numeroGerado} já existe. Use Revisar/Editar ao invés de criar nova.`);
    }
    
    return numeroGerado;
  };

  const calculateDerivatives = async (data) => {
    const startDate = new Date(data.data_inicio);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + CONFIG.prazo_em_dias); 
    
    const numero_apolice = await generatePolicyNumber(data.id_objeto);
    const valor_corretagem_total = Math.round(data.premio_bruto * CONFIG.percentual_corretagem * 100) / 100;

    let premio_bruto_distribuivel = data.premio_bruto;
    const temRCFV = data.produtos.includes("RCFV");
    if (temRCFV) {
      const rcfvCoverage = COBERTURAS_FIXAS.find(c => c.produto === "RCFV");
      if (rcfvCoverage) { // Ensure RCFV coverage is found
        premio_bruto_distribuivel -= rcfvCoverage.valor_fixo;
      }
    }

    const produtosSelecionados = COBERTURAS_FIXAS.filter(c => data.produtos.includes(c.produto));
    const percentual_total_selecionado_sem_RCFV = produtosSelecionados
      .filter(c => c.produto !== "RCFV")
      .reduce((sum, c) => sum + c.percentual, 0);

    const coberturas_calculadas = COBERTURAS_FIXAS.map((cobertura, index) => {
      let premio_bruto = 0;
      let valor_maximo = 0;
      
      const isSelected = data.produtos.includes(cobertura.produto);

      if (isSelected) {
        valor_maximo = cobertura.lmi_fixo || data.lmi_geral;
        if (cobertura.produto === "RCFV") {
          premio_bruto = cobertura.valor_fixo;
        } else if (percentual_total_selecionado_sem_RCFV > 0) {
          const percentual_relativo = cobertura.percentual / percentual_total_selecionado_sem_RCFV;
          premio_bruto = Math.round(premio_bruto_distribuivel * percentual_relativo * 100) / 100;
        }
      }
      
      const premio_comercial = Math.round((premio_bruto - (premio_bruto * CONFIG.aliquota_iof)) * 100) / 100;
      const corretagem = Math.round(premio_bruto * CONFIG.percentual_corretagem * 100) / 100;
      const premio_retido = premio_comercial - corretagem;
      
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
      coberturas_calculadas
    };
  };

  const handleSavePolicy = async () => {
    setIsProcessing(true);
    try {
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
        id_objeto: formData.id_objeto
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
      setCreatedApolice(newApolice); // Salva a apólice criada no estado
      setShowSummary(false); // Esconde o resumo

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
        return <Step1InfoGerais formData={formData} onInputChange={handleInputChange} />;
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
            <div className="max-w-4xl mx-auto">
                <PolicySummary
                    formData={formData}
                    calculatedData={calculatedData}
                    onSave={handleSavePolicy}
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
            <Button onClick={nextStep}>Próximo</Button>
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