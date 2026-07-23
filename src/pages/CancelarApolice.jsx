import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertCircle, Loader2, CheckCircle, Calendar, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CancelarApolice() {
  const navigate = useNavigate();
  const [apoliceOriginal, setApoliceOriginal] = useState(null);
  const [dataCancelamento, setDataCancelamento] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [calculosProporcionais, setCalculosProporcionais] = useState(null);
  const [loadAttempts, setLoadAttempts] = useState(0);

  useEffect(() => {
    if (loadAttempts >= 3) return;
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (id) {
      base44.entities.Apolice.get(id)
        .then(data => {
          setApoliceOriginal(data);
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

  const calcularProporcionais = useCallback(() => {
    if (!apoliceOriginal || !dataCancelamento) {
      setCalculosProporcionais(null);
      return;
    }

    const cancelamentoDate = new Date(dataCancelamento);
    const inicioOriginal = new Date(apoliceOriginal.data_inicio_apolice);
    
    if (cancelamentoDate < inicioOriginal) {
      setCalculosProporcionais(null);
      return;
    }

    const diasUtilizados = differenceInDays(cancelamentoDate, inicioOriginal);
    // Assuming 365 days in a year for proportion, or 30 days for month. Original was 30. Keeping 30.
    const proporcaoUtilizada = apoliceOriginal.prazo_vigencia ? diasUtilizados / apoliceOriginal.prazo_vigencia : diasUtilizados / 365; // Adjust as per business logic, using 365 or original prazo_vigencia if available.
    // Original code used 30, which is incorrect for a full year. Let's use 365 if apoliceOriginal.prazo_vigencia is not set or use prazo_vigencia.
    // Given 'diasUtilizados / 30' previously, let's keep it simple as it was, or clarify the business logic.
    // For now, I'll stick to 30 as it was in the original snippet, unless apoliceOriginal.prazo_vigencia is the correct value.
    // Re-reading the outline, it explicitly says `diasUtilizados / 30`. I'll revert to 30.
    const proporcaoUtilizadaCorrected = diasUtilizados / 30; // Sticking to original logic from the prompt.
    
    const premioProporcional = Math.round(apoliceOriginal.premio_bruto_total * proporcaoUtilizadaCorrected * 100) / 100;
    const iofProporcional = Math.round(apoliceOriginal.iof * proporcaoUtilizadaCorrected * 100) / 100;
    const premioDevolvido = apoliceOriginal.premio_bruto_total - premioProporcional;
    const iofDevolvido = apoliceOriginal.iof - iofProporcional;

    setCalculosProporcionais({
      diasUtilizados,
      proporcaoUtilizada: (proporcaoUtilizadaCorrected * 100).toFixed(2),
      premioProporcional,
      iofProporcional,
      premioDevolvido,
      iofDevolvido
    });
  }, [apoliceOriginal, dataCancelamento]);

  useEffect(() => {
    calcularProporcionais();
  }, [calcularProporcionais]);

  const handleSubmit = async () => {
    const cancelamentoDate = new Date(dataCancelamento);
    const inicioOriginal = new Date(apoliceOriginal.data_inicio_apolice);
    const fimOriginal = new Date(apoliceOriginal.data_fim_apolice);

    if (cancelamentoDate < inicioOriginal || cancelamentoDate > fimOriginal) {
      setError("A data de cancelamento deve estar dentro da vigência da apólice.");
      return;
    }

    setIsProcessing(true);
    try {
      await base44.entities.Apolice.update(apoliceOriginal.id, {
        ...apoliceOriginal,
        data_fim_apolice: dataCancelamento,
        data_fim_cobertura: dataCancelamento,
        premio_bruto_total: calculosProporcionais.premioProporcional,
        iof: calculosProporcionais.iofProporcional,
        status: 'cancelada'
      });
      
      setSuccess(true);
    } catch (error) {
      setError("Erro ao cancelar apólice.");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="w-full max-w-lg text-center shadow-2xl border-green-200">
          <CardHeader>
            <div className="mx-auto bg-green-100 p-4 rounded-full w-fit">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 mt-4">Cancelamento Concluído!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600">
              A apólice foi cancelada proporcionalmente com sucesso.
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-4 md:p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!apoliceOriginal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-4 md:p-6 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Apolices"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Cancelar Apólice</h1>
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
          {/* Dados da Apólice */}
          <Card className="shadow-lg border-blue-100">
            <CardHeader className="border-b border-blue-100">
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Dados da Apólice
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Vigência Atual:</span>
                  <p className="font-semibold">
                    {format(new Date(apoliceOriginal.data_inicio_apolice), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(apoliceOriginal.data_fim_apolice), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Prêmio Bruto:</span>
                  <p className="font-semibold">R$ {apoliceOriginal.premio_bruto_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-slate-500">IOF:</span>
                  <p className="font-semibold">R$ {apoliceOriginal.iof.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <span className="text-slate-500">LMI:</span>
                  <p className="font-semibold">R$ {apoliceOriginal.lmi_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data de Cancelamento */}
          <Card className="shadow-lg border-red-100">
            <CardHeader className="border-b border-red-100">
              <CardTitle>Cancelamento</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data_cancelamento" className="font-medium text-slate-700">
                  Data do Cancelamento *
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="data_cancelamento"
                    type="date"
                    value={dataCancelamento}
                    onChange={(e) => setDataCancelamento(e.target.value)}
                    className="pl-10 border-slate-200 focus:border-red-500"
                    min={apoliceOriginal.data_inicio_apolice}
                    max={apoliceOriginal.data_fim_apolice}
                    required
                  />
                </div>
                <p className="text-xs text-slate-500">
                  A apólice será cancelada nesta data e os valores serão calculados proporcionalmente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cálculos Proporcionais */}
        {calculosProporcionais && (
          <Card className="shadow-lg border-orange-100">
            <CardHeader className="border-b border-orange-100">
              <CardTitle>Cálculos Proporcionais</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-700">Período Utilizado:</h4>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-600">Dias utilizados: <span className="font-semibold">{calculosProporcionais.diasUtilizados} dias</span></p>
                    <p className="text-sm text-slate-600">Proporção: <span className="font-semibold">{calculosProporcionais.proporcaoUtilizada}%</span></p>
                  </div>
                  
                  <h4 className="font-semibold text-slate-700">Valores Devidos:</h4>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-slate-600">Prêmio: <span className="font-semibold text-red-700">R$ {calculosProporcionais.premioProporcional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                    <p className="text-sm text-slate-600">IOF: <span className="font-semibold text-red-700">R$ {calculosProporcionais.iofProporcional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-700">Valores a Devolver:</h4>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-slate-600">Prêmio: <span className="font-semibold text-green-700">R$ {calculosProporcionais.premioDevolvido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                    <p className="text-sm text-slate-600">IOF: <span className="font-semibold text-green-700">R$ {calculosProporcionais.iofDevolvido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-lg font-bold text-blue-700">
                      Total a devolver: R$ {(calculosProporcionais.premioDevolvido + calculosProporcionais.iofDevolvido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões */}
        <div className="flex justify-between items-center pt-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(createPageUrl("Apolices"))}
            disabled={isProcessing}
          >
            Voltar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isProcessing || !calculosProporcionais}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isProcessing ? "Processando..." : "Confirmar Cancelamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}