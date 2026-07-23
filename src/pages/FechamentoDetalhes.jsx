import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle, Loader2, FileText, DollarSign, Calendar, User, Edit } from "lucide-react";
import StatusBadge from "../components/fechamento/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MESES = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function FechamentoDetalhes() {
  const navigate = useNavigate();
  const [fechamento, setFechamento] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

      // Carregar logs
      const logsData = await base44.entities.LogFechamento.filter({ fechamento_id: id }, "-created_date");
      setLogs(logsData);
    } catch (err) {
      setError("Erro ao carregar fechamento: " + err.message);
    } finally {
      setIsLoading(false);
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Fechamentos"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Fechamento - {MESES[fechamento.competencia_mes]}/{fechamento.competencia_ano}
            </h1>
            <p className="text-slate-600">Detalhes completos do fechamento</p>
          </div>
          <StatusBadge status={fechamento.status} />
          <Button 
            onClick={() => navigate(createPageUrl(`EditarFechamento?id=${fechamento.id}`))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Informações Principais */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Competência
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-blue-600">
                {MESES[fechamento.competencia_mes]}/{fechamento.competencia_ano}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-green-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Prêmio Bruto
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-2xl font-bold text-green-600">
                R$ {(fechamento.premio_emitido_bruto || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-purple-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex items-center justify-center">
              <StatusBadge status={fechamento.status} />
            </CardContent>
          </Card>
        </div>

        {/* Seção 2 - Prêmios */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Seção 2 - Prêmios</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">2.1 - Prêmio Emitido Bruto:</span>
                <span className="font-semibold">R$ {(fechamento.premio_emitido_bruto || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">2.2 - Inadimplência (&gt;60 dias):</span>
                <span className="font-semibold text-red-600">R$ {(fechamento.inadimplencia || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 bg-blue-50 px-3 rounded">
                <span className="font-semibold text-blue-900">2.3 - Prêmio Arrecadado Líquido:</span>
                <span className="font-bold text-blue-600">R$ {(fechamento.premio_arrecadado_liquido || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 3 - Sinistros */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Seção 3 - Sinistros</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">3.1 - Sinistros Avisados (informativo):</span>
                <span className="font-semibold">R$ {(fechamento.sinistros_avisados || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 bg-orange-50 px-3 rounded">
                <span className="font-semibold text-orange-900">3.2 - Sinistros Pagos:</span>
                <span className="font-bold text-orange-600">R$ {(fechamento.sinistros_pagos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 4 - Remuneração Seguradora */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Seção 4 - Remuneração da Seguradora</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">4.1 - Remuneração Mínima (10.38%):</span>
                <span className="font-semibold">R$ {(fechamento.remuneracao_minima_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">4.2 - Remuneração por Sinistralidade (40%):</span>
                <span className="font-semibold">R$ {(fechamento.remuneracao_sinistralidade_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 bg-purple-50 px-3 rounded">
                <span className="font-semibold text-purple-900">4.3 - Remuneração Aplicada (maior):</span>
                <span className="font-bold text-purple-600">R$ {(fechamento.remuneracao_aplicada_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 5 - Remuneração MGA */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Seção 5 - Remuneração da MGA</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">5.1 - Comissão Fixa ({fechamento.percentual_comissao_mga}%):</span>
                <span className="font-semibold">R$ {(fechamento.comissao_fixa_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">5.2 - Lucro Operacional:</span>
                <span className="font-semibold">R$ {(fechamento.lucro_operacional || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">5.3 - Bônus Variável ({fechamento.percentual_bonus_mga}%):</span>
                <span className="font-semibold">R$ {(fechamento.bonus_variavel_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 bg-green-50 px-3 rounded">
                <span className="font-semibold text-green-900">5.4 - Remuneração Total MGA:</span>
                <span className="font-bold text-green-600">R$ {(fechamento.remuneracao_total_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 6 - Resultado Final */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50 border-b">
            <CardTitle className="text-xl">Seção 6 - Resultado Final</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">6.1 - Saldo Técnico Líquido</p>
                <p className="text-2xl font-bold text-slate-900">
                  R$ {(fechamento.saldo_tecnico_liquido || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-2">6.2 - Repasse Seguradora</p>
                <p className="text-2xl font-bold text-blue-900">
                  R$ {(fechamento.repasse_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-2">6.3 - Retenção MGA</p>
                <p className="text-2xl font-bold text-green-900">
                  R$ {(fechamento.retencao_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Ações */}
        {logs.length > 0 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Histórico de Ações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <User className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">{log.acao}</Badge>
                        <span className="text-sm text-slate-600">
                          {format(new Date(log.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{log.usuario_nome}</p>
                      {log.observacao && (
                        <p className="text-sm text-slate-600 mt-1">{log.observacao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}