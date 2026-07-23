import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertCircle, CheckCircle, Calendar as CalendarIcon, Loader2 } from "lucide-react";

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" }
];

export default function NovoFechamento() {
  const navigate = useNavigate();
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleCriar = async () => {
    setError(null);

    if (!mes || !ano) {
      setError("Por favor, selecione o mês e o ano.");
      return;
    }

    setIsCreating(true);

    try {
      // Verificar se já existe fechamento para essa competência
      const fechamentosExistentes = await base44.entities.FechamentoMensal.filter({
        competencia_mes: parseInt(mes),
        competencia_ano: parseInt(ano)
      });

      if (fechamentosExistentes.length > 0) {
        setError("Já existe um fechamento para esta competência.");
        setIsCreating(false);
        return;
      }

      // Criar novo fechamento em rascunho
      const novoFechamento = await base44.entities.FechamentoMensal.create({
        competencia_mes: parseInt(mes),
        competencia_ano: parseInt(ano),
        status: "rascunho",
        premio_emitido_bruto: 0,
        inadimplencia: 0,
        premio_arrecadado_liquido: 0,
        sinistros_avisados: 0,
        sinistros_pagos: 0,
        remuneracao_minima_seguradora: 0,
        remuneracao_sinistralidade_seguradora: 0,
        remuneracao_aplicada_seguradora: 0,
        comissao_fixa_mga: 0,
        lucro_operacional: 0,
        bonus_variavel_mga: 0,
        remuneracao_total_mga: 0,
        saldo_tecnico_liquido: 0,
        repasse_seguradora: 0,
        retencao_mga: 0,
        percentual_comissao_mga: 10,
        percentual_bonus_mga: 3.8
      });

      // Registrar log
      const user = await base44.auth.me();
      await base44.entities.LogFechamento.create({
        fechamento_id: novoFechamento.id,
        acao: "criado",
        usuario_id: user.id,
        usuario_nome: user.full_name,
        usuario_email: user.email,
        observacao: "Fechamento criado em rascunho"
      });

      // Redirecionar para edição
      navigate(createPageUrl(`EditarFechamento?id=${novoFechamento.id}`));
    } catch (err) {
      setError("Erro ao criar fechamento: " + err.message);
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Fechamentos"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Novo Fechamento Mensal</h1>
            <p className="text-slate-600">Selecione a competência do fechamento</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg border-blue-100">
          <CardHeader className="border-b border-blue-100">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Competência
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="mes" className="font-medium text-slate-700">
                  Mês *
                </Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger id="mes">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ano" className="font-medium text-slate-700">
                  Ano *
                </Label>
                <Input
                  id="ano"
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                  min="2020"
                  max="2100"
                  placeholder="2025"
                  className="border-slate-200 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> O fechamento será criado em status "Rascunho". Você poderá inserir os valores e calcular antes de enviar para auditoria.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => navigate(createPageUrl("Fechamentos"))}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCriar}
                disabled={isCreating || !mes || !ano}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Criar Fechamento
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