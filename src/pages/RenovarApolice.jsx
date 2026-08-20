import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertCircle, Loader2, CheckCircle, FileText, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";

import Stepper from "../components/nova-apolice/Stepper";
import Step2ValoresVigencia from "../components/nova-apolice/steps/Step2_ValoresVigencia";
import Step3Produtos from "../components/nova-apolice/steps/Step3_Produtos";
import PolicySummary from "../components/nova-apolice/PolicySummary";

const STEPS = ["Valores e Vigência", "Produtos e Coberturas"];

const CONFIG = {
  aliquota_iof: 0.0738,
  percentual_corretagem: 0.001,
  prazo_em_dias: 30,
};

const COBERTURAS_FIXAS = [
  { id_cobertura: "001", ramo: 31, nome: "Furto", percentual: 0.20, produto: "FR" },
  { id_cobertura: "002", ramo: 31, nome: "Roubo", percentual: 0.20, produto: "FR" },
  { id_cobertura: "006", ramo: 42, nome: "RCF-V", percentual: 0.11, produto: "RCFV" },
  { id_cobertura: "008", ramo: 31, nome: "Colisão Parcial", percentual: 0.18, produto: "COL_PARCIAL" },
  { id_cobertura: "009", ramo: 31, nome: "Colisão Total", percentual: 0.22, produto: "COL_TOTAL" },
  { id_cobertura: "010", ramo: 31, nome: "Incendio e Fenomenos da Natureza", percentual: 0.09, produto: "INCENDIO" }
];

export default function RenovarApolice() {
  const navigate = useNavigate();
  const [apoliceOriginal, setApoliceOriginal] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [calculatedData, setCalculatedData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [createdApolice, setCreatedApolice] = useState(null);
  const [loadAttempts, setLoadAttempts] = useState(0);

  useEffect(() => {
    if (loadAttempts >= 3) return;
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (id) {
      base44.entities.Apolice.get(id)
        .then(data => {
          setApoliceOriginal(data);
          
          // Calcular novas datas (início = fim anterior + 1 dia)
          const dataFimAnterior = new Date(data.data_fim_apolice);
          const novaDataInicio = addDays(dataFimAnterior, 1);
          const novaDataFim = addDays(novaDataInicio, CONFIG.prazo_em_dias);
          
          // Pré-preencher formulário com dados da apólice anterior
          setFormData({
            data_inicio: format(novaDataInicio, 'yyyy-MM-dd'),
            id_segurado: data.id_segurado,
            id_beneficiario: data.id_beneficiario,
            lmi_geral: data.lmi_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            produtos: data.produtos || [],
            premio_bruto: data.premio_bruto_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            id_objeto: data.id_objeto,
            data_movimento: format(new Date(), 'yyyy-MM-dd'),
            rcfv_lmi: data.rcfv_lmi || 100000
          });
        })
        .catch(err => {
          setError("Erro ao carregar apólice.");
          console.error(err);
          setLoadAttempts(prev => prev + 1);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setError("ID da apólice não encontrado.");
      setIsLoading(false);
    }
  }, [loadAttempts]);

  const generatePolicyNumber = async (id_objeto, filial_id, filial_codigo_susep) => {
    if (!id_objeto) throw new Error("ID do objeto é obrigatório para gerar o número da apólice.");
    if (!filial_id || !filial_codigo_susep) throw new Error("Filial da apólice original não encontrada.");

    // Buscar filial para pegar o contador sequencial
    const filiais = await base44.entities.Filial.filter({ id: filial_id });
    if (filiais.length === 0) throw new Error("Filial não encontrada.");
    const filial = filiais[0];

    const novoSequencial = (filial.ultimo_numero_sequencial || 0) + 1;
    const nnnnnn = novoSequencial.toString().padStart(6, '0');

    // ZZZ: número de recorrências do veículo nesta filial
    const apolicesToObject = await base44.entities.Apolice.filter({ id_objeto, filial_id });
    const zzz = (apolicesToObject.length + 1).toString().padStart(3, '0');

    const year = new Date().getFullYear();
    const codigoFilial = (filial.codigo_filial || '10').toUpperCase();
    const numeroGerado = `${filial_codigo_susep}.${year}.${codigoFilial}.031.${nnnnnn}.${zzz}`;

    // Verificar unicidade do número
    const duplicata = await base44.entities.Apolice.filter({ numero_apolice: numeroGerado });
    if (duplicata.length > 0) throw new Error(`Número de apólice ${numeroGerado} já existe.`);

    return { numeroGerado, novoSequencial, filialId: filial.id, filialCodigo: filial.codigo_filial || '10' };
  };

  const calculateDerivatives = async (data) => {
    const startDate = new Date(data.data_inicio);
    const endDate = addDays(startDate, CONFIG.prazo_em_dias);
    
    const { numeroGerado: numero_apolice, novoSequencial, filialId, filialCodigo } = await generatePolicyNumber(
      data.id_objeto,
      apoliceOriginal.filial_id,
      apoliceOriginal.filial_codigo_susep
    );
    const valor_corretagem_total = Math.round(data.premio_bruto * CONFIG.percentual_corretagem * 100) / 100;

    // RCF-V é produto de PREÇO FIXO: cobra o valor configurado no cadastro da filial (por LMI).
    const filiaisRcfv = await base44.entities.Filial.filter({ id: apoliceOriginal.filial_id });
    const filRcfv = filiaisRcfv[0] || {};
    const precoRcfv = (lmi) => {
      const v = filRcfv["rcfv_preco_" + lmi];
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
      const premio_retido = premio_comercial - corretagem;
      
      return {
        idx: index + 1,
        id_cobertura: cobertura.id_cobertura,
        ramo: cobertura.ramo,
        valor_maximo: valor_maximo,
        id_objeto: "007",
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

  const parseCurrency = (formattedValue) => {
    if (typeof formattedValue === 'number') return formattedValue;
    if (!formattedValue) return 0;
    const numericValue = formattedValue.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numericValue) || 0;
  };

  const validateStep = (step) => {
    const errors = [];
    switch (step) {
      case 1:
        if (!formData.data_inicio) errors.push("Data de início é obrigatória");
        if (!formData.lmi_geral || parseCurrency(formData.lmi_geral) <= 0) errors.push("Informe o LMI");
        if (!formData.premio_bruto || parseCurrency(formData.premio_bruto) <= 0) errors.push("Informe o prêmio bruto");
        break;
      case 2:
        if (!formData.produtos || formData.produtos.length === 0) errors.push("Selecione ao menos um produto");
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
    if (!validateStep(2)) return;

    setIsProcessing(true);
    const processedData = {
        ...formData,
        lmi_geral: parseCurrency(formData.lmi_geral),
        premio_bruto: parseCurrency(formData.premio_bruto)
    };
    
    try {
      // B) Validação de data: início da renovação não pode ser anterior ao fim da original
      if (formData.data_inicio && apoliceOriginal.data_fim_apolice) {
        const dataInicioNova = new Date(formData.data_inicio + 'T00:00:00');
        const dataFimOriginal = new Date(apoliceOriginal.data_fim_apolice + 'T00:00:00');
        if (dataInicioNova < dataFimOriginal) {
          const fmtDt = (d) => format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy');
          setError(
            `A data de início da renovação (${fmtDt(formData.data_inicio)}) é anterior ao fim da apólice original ` +
            `(${fmtDt(apoliceOriginal.data_fim_apolice)}). Por favor, defina uma data de início igual ou posterior a ${fmtDt(apoliceOriginal.data_fim_apolice)}.`
          );
          setIsProcessing(false);
          return;
        }
      }

      // C) Verificar se já existe renovação ativa para esta apólice
      const renovacoesExistentes = await base44.entities.Apolice.filter({ renovacao_de: apoliceOriginal.id });
      const renovacaoAtiva = renovacoesExistentes.find(a =>
        a.natureza_movimento !== 'Cancelamento' && a.natureza_movimento !== '03 - Cancelamento'
      );
      if (renovacaoAtiva) {
        const confirmar = window.confirm(
          `Atenção: já existe uma renovação ativa (nº ${renovacaoAtiva.numero_apolice}) para esta apólice. Deseja criar mesmo assim?`
        );
        if (!confirmar) {
          setIsProcessing(false);
          return;
        }
      }

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

  const handleSaveRenovacao = async () => {
    setIsProcessing(true);
    try {
      const cleanCpfCnpj = (value) => {
        const digits = String(value || '').replace(/[^\d]/g, '');
        if (!digits) return digits;
        if (digits.length <= 11) return digits.padStart(11, '0');
        return digits.padStart(14, '0');
      };
      
      // Criar nova apólice (renovação)
      const novaApoliceData = {
        numero_apolice: calculatedData.numero_apolice,
        natureza_movimento: "01",
        tipo_movimento: "01",
        valor_corretagem: calculatedData.valor_corretagem_total,
        iof: calculatedData.iof_total,
        data_inicio_apolice: formData.data_inicio,
        data_fim_apolice: calculatedData.data_fim.toISOString().split('T')[0],
        data_inicio_cobertura: formData.data_inicio,
        data_fim_cobertura: calculatedData.data_fim.toISOString().split('T')[0],
        id_segurado: cleanCpfCnpj(formData.id_segurado),
        id_beneficiario: cleanCpfCnpj(formData.id_beneficiario),
        seguro_intermitente: true,
        data_movimento: formData.data_inicio,
        lmi_geral: parseCurrency(formData.lmi_geral),
        premio_bruto_total: parseCurrency(formData.premio_bruto),
        produtos: formData.produtos,
        id_objeto: formData.id_objeto,
        filial_id: apoliceOriginal.filial_id,
        filial_codigo_susep: apoliceOriginal.filial_codigo_susep,
        filial_nome: apoliceOriginal.filial_nome,
        filial_codigo: calculatedData.filialCodigo,
        // Campos de renovação
        renovacao_de: apoliceOriginal.id,
        numero_renovacao: (apoliceOriginal.numero_renovacao || 0) + 1,
        renovada: false,
        id_apolice_renovacao: null,
        data_renovacao: null
      };
      
      // Adicionar coberturas
      calculatedData.coberturas_calculadas.forEach((cobertura, index) => {
        const prefix = `cobertura_${index + 1}_`;
        novaApoliceData[prefix + 'id_cobertura'] = cobertura.id_cobertura;
        novaApoliceData[prefix + 'ramo'] = cobertura.ramo;
        novaApoliceData[prefix + 'valor_maximo'] = cobertura.valor_maximo;
        novaApoliceData[prefix + 'id_objeto'] = cobertura.id_objeto;
        novaApoliceData[prefix + 'premio_bruto'] = cobertura.premio_bruto;
        novaApoliceData[prefix + 'premio_comercial'] = cobertura.premio_comercial;
        novaApoliceData[prefix + 'premio_retido'] = cobertura.premio_retido;
      });

      const novaApolice = await base44.entities.Apolice.create(novaApoliceData);

      // Atualizar contador sequencial e total da filial
      const filialAtual = await base44.entities.Filial.filter({ id: calculatedData.filialId });
      if (filialAtual.length > 0) {
        await base44.entities.Filial.update(calculatedData.filialId, {
          ultimo_numero_sequencial: calculatedData.novoSequencial,
          total_apolices: (filialAtual[0].total_apolices || 0) + 1
        });
      }

      // Atualizar apólice original
      await base44.entities.Apolice.update(apoliceOriginal.id, {
        renovada: true,
        id_apolice_renovacao: novaApolice.id,
        data_renovacao: new Date().toISOString().split('T')[0]
      });

      setCreatedApolice(novaApolice);
      setShowSummary(false);

    } catch (error) {
      setError("Erro ao renovar apólice. Tente novamente.");
      console.error("Erro ao salvar:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step2ValoresVigencia formData={formData} onInputChange={handleInputChange} />;
      case 2:
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
                    <CardTitle className="text-2xl font-bold text-slate-800 mt-4">Apólice Renovada com Sucesso!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-slate-600">
                        Nova apólice <strong className="font-mono">{createdApolice.numero_apolice}</strong> foi criada e está ativa.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-slate-600">
                        <strong>Renovação #{createdApolice.numero_renovacao}</strong>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Vigência: {format(new Date(createdApolice.data_inicio_apolice), "dd/MM/yyyy")} até {format(new Date(createdApolice.data_fim_apolice), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button onClick={() => navigate(createPageUrl(`ApoliceDetalhes?id=${createdApolice.id}`))} className="bg-blue-600 hover:bg-blue-700">
                            <FileText className="w-4 h-4 mr-2" />
                            Ver Certificado
                        </Button>
                        <Button variant="outline" onClick={() => navigate(createPageUrl("Apolices"))}>
                            Ver Todas as Apólices
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
                    onSave={handleSaveRenovacao}
                    onEdit={() => setShowSummary(false)}
                    isProcessing={isProcessing}
                />
            </div>
        </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!apoliceOriginal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-6">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">Apólice não encontrada</h3>
            <Button onClick={() => navigate(createPageUrl("Apolices"))}>
              Voltar às Apólices
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Apolices"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-7 h-7 text-green-600" />
              Renovar Apólice
            </h1>
            <p className="text-slate-600">Renovação da apólice: {apoliceOriginal.numero_apolice}</p>
          </div>
        </div>

        {/* Informação da Apólice Original */}
        <Card className="shadow-lg border-blue-100 bg-blue-50">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-600 font-medium">Apólice Original:</span>
                <p className="font-mono font-semibold text-slate-900">{apoliceOriginal.numero_apolice}</p>
              </div>
              <div>
                <span className="text-slate-600 font-medium">Vigência Anterior:</span>
                <p className="font-semibold text-slate-900">
                  {format(new Date(apoliceOriginal.data_inicio_apolice), "dd/MM/yyyy")} - {format(new Date(apoliceOriginal.data_fim_apolice), "dd/MM/yyyy")}
                </p>
              </div>
              <div>
                <span className="text-slate-600 font-medium">Nova Vigência:</span>
                <p className="font-semibold text-green-700">
                  {formData.data_inicio && format(new Date(formData.data_inicio), "dd/MM/yyyy")} - {formData.data_inicio && format(addDays(new Date(formData.data_inicio), CONFIG.prazo_em_dias), "dd/MM/yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
            <Button onClick={handleCalculateAndReview} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Calcular e Revisar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}