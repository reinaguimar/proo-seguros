import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle, CheckCircle, Calculator, Save, Loader2, DollarSign } from "lucide-react";
import StatusBadge from "../components/fechamento/StatusBadge";

const MESES = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function EditarFechamento() {
  const navigate = useNavigate();
  const [fechamento, setFechamento] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isBuscandoDados, setIsBuscandoDados] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Valores editáveis
  const [premioEmitidoBruto, setPremioEmitidoBruto] = useState("");
  const [inadimplencia, setInadimplencia] = useState("");
  const [sinistrosPagos, setSinistrosPagos] = useState("");

  useEffect(() => {
    loadFechamento();
  }, []);

  const loadFechamento = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');

      if (!id) {
        setError("ID do fechamento não encontrado.");
        return;
      }

      const fechamentoData = await base44.entities.FechamentoMensal.get(id);
      setFechamento(fechamentoData);
      
      // Preencher campos
      setPremioEmitidoBruto(fechamentoData.premio_emitido_bruto?.toString() || "");
      setInadimplencia(fechamentoData.inadimplencia?.toString() || "");
      setSinistrosPagos(fechamentoData.sinistros_pagos?.toString() || "");
    } catch (err) {
      setError("Erro ao carregar fechamento: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuscarDados = async () => {
    setError(null);
    setIsBuscandoDados(true);

    try {
      const response = await base44.functions.invoke('buscarDadosFechamento', {
        competencia_mes: fechamento.competencia_mes,
        competencia_ano: fechamento.competencia_ano
      });

      if (response.data?.sucesso) {
        const dados = response.data.dados;
        setPremioEmitidoBruto(dados.premio_emitido_bruto.toString());
        setInadimplencia(dados.inadimplencia.toString());
        setSinistrosPagos(dados.sinistros_pagos.toString());
        
        setSuccessMessage(
          `Dados carregados: ${dados.estatisticas.total_apolices} apólices, ` +
          `${dados.estatisticas.total_sinistros} sinistros, ` +
          `${dados.estatisticas.total_gastos} gastos pagos`
        );
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(response.data?.error || "Erro ao buscar dados");
      }
    } catch (err) {
      setError("Erro ao buscar dados: " + err.message);
    } finally {
      setIsBuscandoDados(false);
    }
  };

  const handleCalcular = async () => {
    setError(null);
    setIsCalculating(true);

    try {
      const response = await base44.functions.invoke('calcularFechamento', {
        fechamento_id: fechamento.id,
        premio_emitido_bruto: parseFloat(premioEmitidoBruto) || 0,
        inadimplencia: parseFloat(inadimplencia) || 0,
        sinistros_pagos: parseFloat(sinistrosPagos) || 0
      });

      if (response.data?.sucesso) {
        setSuccessMessage("Fechamento calculado com sucesso!");
        await loadFechamento();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.data?.error || "Erro ao calcular fechamento");
      }
    } catch (err) {
      setError("Erro ao calcular: " + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSalvar = async () => {
    setError(null);
    setIsSaving(true);

    try {
      await base44.entities.FechamentoMensal.update(fechamento.id, {
        premio_emitido_bruto: parseFloat(premioEmitidoBruto) || 0,
        inadimplencia: parseFloat(inadimplencia) || 0,
        sinistros_pagos: parseFloat(sinistrosPagos) || 0
      });

      setSuccessMessage("Valores salvos com sucesso!");
      await loadFechamento();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError("Erro ao salvar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!fechamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Fechamento não encontrado</h3>
            <Button onClick={() => navigate(createPageUrl("Fechamentos"))}>
              Voltar aos Fechamentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Fechamentos"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Fechamento - {MESES[fechamento.competencia_mes]}/{fechamento.competencia_ano}
            </h1>
            <p className="text-slate-600">Edite os valores e calcule o fechamento</p>
          </div>
          <StatusBadge status={fechamento.status} />
        </div>

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

        {/* Valores de Entrada */}
        <Card className="shadow-lg border-blue-100">
          <CardHeader className="border-b border-blue-100 bg-blue-50">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Valores de Entrada
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="premio_emitido">Prêmio Emitido Bruto</Label>
                <Input
                  id="premio_emitido"
                  type="number"
                  step="0.01"
                  value={premioEmitidoBruto}
                  onChange={(e) => setPremioEmitidoBruto(e.target.value)}
                  disabled={fechamento.status !== 'rascunho'}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inadimplencia">Inadimplência (&gt;60 dias)</Label>
                <Input
                  id="inadimplencia"
                  type="number"
                  step="0.01"
                  value={inadimplencia}
                  onChange={(e) => setInadimplencia(e.target.value)}
                  disabled={fechamento.status !== 'rascunho'}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sinistros_pagos">Sinistros Pagos</Label>
                <Input
                  id="sinistros_pagos"
                  type="number"
                  step="0.01"
                  value={sinistrosPagos}
                  onChange={(e) => setSinistrosPagos(e.target.value)}
                  disabled={fechamento.status !== 'rascunho'}
                  placeholder="0.00"
                />
              </div>
            </div>

            {fechamento.status === 'rascunho' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={handleBuscarDados} 
                  disabled={isBuscandoDados} 
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                >
                  {isBuscandoDados ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  Buscar Dados Automáticos
                </Button>
                <Button onClick={handleSalvar} disabled={isSaving} variant="outline">
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar Valores
                </Button>
                <Button onClick={handleCalcular} disabled={isCalculating} className="bg-blue-600 hover:bg-blue-700">
                  {isCalculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                  Calcular Fechamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Valores Calculados */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg">Remuneração Seguradora</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Mínima:</span>
                <span className="font-semibold">R$ {(fechamento.remuneracao_minima_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Sinistralidade:</span>
                <span className="font-semibold">R$ {(fechamento.remuneracao_sinistralidade_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-slate-900 font-semibold">Aplicada:</span>
                <span className="font-bold text-blue-600">R$ {(fechamento.remuneracao_aplicada_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-lg">Remuneração MGA</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Comissão Fixa:</span>
                <span className="font-semibold">R$ {(fechamento.comissao_fixa_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Bônus Variável:</span>
                <span className="font-semibold">R$ {(fechamento.bonus_variavel_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-slate-900 font-semibold">Total:</span>
                <span className="font-bold text-green-600">R$ {(fechamento.remuneracao_total_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultado Final */}
        <Card className="shadow-lg border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
            <CardTitle className="text-lg">Resultado Final</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Saldo Técnico Líquido</p>
                <p className="text-2xl font-bold text-slate-900">
                  R$ {(fechamento.saldo_tecnico_liquido || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Repasse Seguradora</p>
                <p className="text-2xl font-bold text-blue-900">
                  R$ {(fechamento.repasse_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-1">Retenção MGA</p>
                <p className="text-2xl font-bold text-green-900">
                  R$ {(fechamento.retencao_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}