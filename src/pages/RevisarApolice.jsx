import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertCircle, Loader2, CheckCircle, Calendar } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import Step3Produtos from "../components/nova-apolice/steps/Step3_Produtos";

const CONFIG = {
  aliquota_iof: 0.0738,
  percentual_corretagem: 0.001,
  prazo_em_dias: 30,
};

const COBERTURAS_FIXAS = [
  { id_cobertura: "001", ramo: 31, nome: "Furto", percentual: 0.195, produto: "FR" },
  { id_cobertura: "002", ramo: 31, nome: "Roubo", percentual: 0.215, produto: "FR" },
  { id_cobertura: "006", ramo: 42, nome: "RCF-V", percentual: 0, valor_fixo: 35.90, lmi_fixo: 100000, produto: "RCFV" },
  { id_cobertura: "008", ramo: 31, nome: "Colisão Parcial", percentual: 0.28, produto: "COL_PARCIAL" },
  { id_cobertura: "009", ramo: 31, nome: "Colisão Total", percentual: 0.22, produto: "COL_TOTAL" },
  { id_cobertura: "010", ramo: 31, nome: "Incendio e Fenomenos da Natureza", percentual: 0.09, produto: "INCENDIO" }
];

export default function RevisarApolice() {
  const navigate = useNavigate();
  const [apoliceOriginal, setApoliceOriginal] = useState(null);
  const [formData, setFormData] = useState({});
  const [dataRevisao, setDataRevisao] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);

  useEffect(() => {
    if (loadAttempts >= 3) return;
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (id) {
      base44.entities.Apolice.get(id)
        .then(data => {
          setApoliceOriginal(data);
          setFormData({
            produtos: data.produtos || [],
            lmi_geral: data.lmi_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).replace('.', ','),
            premio_bruto: data.premio_bruto_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).replace('.', ',')
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

  const parseCurrency = (formattedValue) => {
    if (typeof formattedValue === 'number') return formattedValue;
    if (!formattedValue) return 0;
    const numericValue = formattedValue.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numericValue) || 0;
  };

  const formatCurrency = (value) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const generateNewPolicyNumber = async (id_objeto) => {
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
    return `110627.${year}.02.031.${yyyyy}.${zzz}`;
  };

  const calculateCoberturas = (produtos, lmi_geral, premio_bruto) => {
    let premio_bruto_distribuivel = premio_bruto;
    const temRCFV = produtos.includes("RCFV");
    if (temRCFV) {
      premio_bruto_distribuivel -= COBERTURAS_FIXAS.find(c => c.produto === "RCFV").valor_fixo;
    }

    const produtosSelecionados = COBERTURAS_FIXAS.filter(c => produtos.includes(c.produto));
    const percentual_total_selecionado = produtosSelecionados
      .filter(c => c.produto !== "RCFV")
      .reduce((sum, c) => sum + c.percentual, 0);

    return COBERTURAS_FIXAS.map((cobertura, index) => {
      let premio_bruto = 0, valor_maximo = 0;
      
      const isSelected = produtos.includes(cobertura.produto);
      if (isSelected) {
        valor_maximo = cobertura.lmi_fixo || lmi_geral;
        if (cobertura.produto === "RCFV") {
          premio_bruto = cobertura.valor_fixo;
        } else if (percentual_total_selecionado > 0) {
          const percentual_relativo = cobertura.percentual / percentual_total_selecionado;
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
        id_objeto: "007",
        premio_bruto: premio_bruto,
        premio_comercial: premio_comercial,
        premio_retido: premio_retido,
        nome: cobertura.nome
      };
    });
  };

  const hasChanges = () => {
    const originalProdutos = [...(apoliceOriginal.produtos || [])].sort();
    const newProdutos = [...formData.produtos].sort();
    return JSON.stringify(originalProdutos) !== JSON.stringify(newProdutos) ||
           parseCurrency(formData.lmi_geral) !== apoliceOriginal.lmi_geral ||
           parseCurrency(formData.premio_bruto) !== apoliceOriginal.premio_bruto_total;
  };

  const handleSubmit = async () => {
    if (!hasChanges()) {
      setError("Nenhuma alteração foi detectada. Para revisar uma apólice é necessário fazer alterações.");
      return;
    }

    const revisaoDate = new Date(dataRevisao);
    const inicioOriginal = new Date(apoliceOriginal.data_inicio_apolice);
    const fimOriginal = new Date(apoliceOriginal.data_fim_apolice);

    if (revisaoDate < inicioOriginal || revisaoDate > fimOriginal) {
      setError("A data de revisão deve estar dentro da vigência da apólice original.");
      return;
    }

    setIsProcessing(true);
    try {
      // Calcular valores proporcionais
      const diasUtilizados = differenceInDays(revisaoDate, inicioOriginal);
      const diasRestantes = differenceInDays(fimOriginal, revisaoDate);
      const proporcaoUtilizada = diasUtilizados / 30;
      const proporcaoRestante = diasRestantes / 30;

      // Cancelar apólice original proporcionalmente
      const premioOriginalProporcional = Math.round(apoliceOriginal.premio_bruto_total * proporcaoUtilizada * 100) / 100;
      const iofOriginalProporcional = Math.round(apoliceOriginal.iof * proporcaoUtilizada * 100) / 100;

      await base44.entities.Apolice.update(apoliceOriginal.id, {
        ...apoliceOriginal,
        data_fim_apolice: dataRevisao,
        data_fim_cobertura: dataRevisao,
        premio_bruto_total: premioOriginalProporcional,
        iof: iofOriginalProporcional,
        cancelada_para_revisao: true,
        status: 'cancelada'
      });

      // Criar nova apólice
      const novoNumeroApolice = await generateNewPolicyNumber(apoliceOriginal.id_objeto);
      const novoPremioBruto = parseCurrency(formData.premio_bruto);
      const novoPremioProporcional = Math.round(novoPremioBruto * proporcaoRestante * 100) / 100;
      const novoIOF = Math.round(novoPremioProporcional * CONFIG.aliquota_iof * 100) / 100;
      const novoComercial = Math.round((novoPremioProporcional - novoIOF) * 100) / 100;
      const novaCorretagem = Math.round(novoPremioProporcional * CONFIG.percentual_corretagem * 100) / 100;

      const coberturasCalculadas = calculateCoberturas(
        formData.produtos, 
        parseCurrency(formData.lmi_geral), 
        novoPremioProporcional
      );

      const novaApoliceData = {
        numero_apolice: novoNumeroApolice,
        natureza_movimento: "01",
        tipo_movimento: "01",
        valor_corretagem: novaCorretagem,
        iof: novoIOF,
        data_inicio_apolice: dataRevisao,
        data_fim_apolice: fimOriginal.toISOString().split('T')[0],
        data_inicio_cobertura: dataRevisao,
        data_fim_cobertura: fimOriginal.toISOString().split('T')[0],
        id_segurado: apoliceOriginal.id_segurado,
        id_beneficiario: apoliceOriginal.id_beneficiario,
        seguro_intermitente: true,
        data_movimento: dataRevisao,
        lmi_geral: parseCurrency(formData.lmi_geral),
        premio_bruto_total: novoPremioProporcional,
        produtos: formData.produtos,
        id_objeto: apoliceOriginal.id_objeto,
        apolice_revisada_de: apoliceOriginal.id
      };

      // Adicionar coberturas
      coberturasCalculadas.forEach((cobertura, index) => {
        const prefix = `cobertura_${index + 1}_`;
        novaApoliceData[prefix + 'id_cobertura'] = cobertura.id_cobertura;
        novaApoliceData[prefix + 'ramo'] = cobertura.ramo;
        novaApoliceData[prefix + 'valor_maximo'] = cobertura.valor_maximo;
        novaApoliceData[prefix + 'id_objeto'] = cobertura.id_objeto;
        novaApoliceData[prefix + 'premio_bruto'] = cobertura.premio_bruto;
        novaApoliceData[prefix + 'premio_comercial'] = cobertura.premio_comercial;
        novaApoliceData[prefix + 'premio_retido'] = cobertura.premio_retido;
      });

      await base44.entities.Apolice.create(novaApoliceData);
      setSuccess(true);

    } catch (error) {
      setError("Erro ao processar revisão da apólice.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center shadow-2xl border-green-200">
          <CardHeader>
            <div className="mx-auto bg-green-100 p-4 rounded-full w-fit">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 mt-4">Revisão Concluída!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600">
              A apólice foi revisada com sucesso. A apólice original foi cancelada proporcionalmente e uma nova apólice foi emitida.
            </p>
            <Button 
              onClick={() => navigate(createPageUrl("Apolices"))}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Voltar às Apólices
            </Button>
          </CardContent>
        </Card>
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
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Revisar Apólice</h1>
            <p className="text-slate-600">Apólice: {apoliceOriginal.numero_apolice}</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Dados Originais */}
          <Card className="shadow-lg border-blue-100">
            <CardHeader className="border-b border-blue-100">
              <CardTitle>Dados da Apólice Original</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Vigência:</span>
                  <p className="font-semibold">
                    {format(new Date(apoliceOriginal.data_inicio_apolice), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(apoliceOriginal.data_fim_apolice), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Prêmio Bruto:</span>
                  <p className="font-semibold">R$ {apoliceOriginal.premio_bruto_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-slate-500">LMI:</span>
                  <p className="font-semibold">R$ {apoliceOriginal.lmi_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-slate-500">IOF:</span>
                  <p className="font-semibold">R$ {apoliceOriginal.iof.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              
              <div>
                <span className="text-slate-500">Produtos Atuais:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(apoliceOriginal.produtos || []).map(produto => (
                    <span key={produto} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                      {produto}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Revisão */}
          <Card className="shadow-lg border-orange-100">
            <CardHeader className="border-b border-orange-100">
              <CardTitle>Novos Dados</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data_revisao" className="font-medium text-slate-700">
                  Data da Revisão *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="data_revisao"
                    type="date"
                    value={dataRevisao}
                    onChange={(e) => setDataRevisao(e.target.value)}
                    className="pl-10 border-slate-200 focus:border-blue-500"
                    min={apoliceOriginal.data_inicio_apolice}
                    max={apoliceOriginal.data_fim_apolice}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lmi_geral" className="font-medium text-slate-700">Novo LMI</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
                  <Input
                    id="lmi_geral"
                    value={formData.lmi_geral || ''}
                    onChange={(e) => setFormData({...formData, lmi_geral: formatCurrency(e.target.value)})}
                    placeholder="0,00"
                    className="pl-10 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="premio_bruto" className="font-medium text-slate-700">Novo Prêmio Bruto</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
                  <Input
                    id="premio_bruto"
                    value={formData.premio_bruto || ''}
                    onChange={(e) => setFormData({...formData, premio_bruto: formatCurrency(e.target.value)})}
                    placeholder="0,00"
                    className="pl-10 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Produtos */}
        <Card className="shadow-lg border-purple-100">
          <CardHeader className="border-b border-purple-100">
            <CardTitle>Produtos e Coberturas</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Step3Produtos 
              formData={formData}
              onInputChange={(field, value) => setFormData({...formData, [field]: value})}
              COBERTURAS_FIXAS={COBERTURAS_FIXAS}
            />
          </CardContent>
        </Card>

        {/* Botões */}
        <div className="flex justify-between items-center pt-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(createPageUrl("Apolices"))}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isProcessing}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isProcessing ? "Processando..." : "Confirmar Revisão"}
          </Button>
        </div>
      </div>
    </div>
  );
}