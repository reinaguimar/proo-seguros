import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { History, CheckCircle2, Loader2, AlertCircle, Plus } from "lucide-react";
import { format } from "date-fns";

export default function HistoricoConciliacoes() {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(null);

  useEffect(() => {
    carregarLotes();
  }, []);

  const carregarLotes = async () => {
    try {
      setLoading(true);
      const dados = await base44.entities.LoteConciliacao.list('-created_date', 100);
      setLotes(dados);
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarGestao = async (lote) => {
    try {
      setProcessando(lote.id);
      
      // Inicializar parâmetros PDD se necessário
      try {
        await base44.functions.invoke('inicializarParametrosPDD', {});
      } catch (error) {
        console.log('Parâmetros PDD já inicializados ou erro:', error.message);
      }
      
      // Reconciliar gestão (cria ou atualiza)
      const response1 = await base44.functions.invoke('reconciliarGestao', {
        lote_id: lote.id
      });
      
      const data1 = response1?.data || response1;
      if (!data1?.sucesso) {
        alert('Erro ao reconciliar gestão: ' + (data1?.erro || 'Erro desconhecido'));
        return;
      }
      
      // Calcular PDD
      const response2 = await base44.functions.invoke('calcularPDD', {
        competencia: lote.competencia,
        lote_id: lote.id
      });
      
      const data2 = response2?.data || response2;
      if (!data2?.sucesso) {
        alert('Erro ao calcular PDD: ' + (data2?.erro || 'Erro desconhecido'));
        return;
      }
      
      alert(`✅ Gestão criada com sucesso!\n\nCriadas: ${data1.gestoes_criadas || 0}\nAtualizadas: ${data1.gestoes_atualizadas || 0}\nBloqueadas: ${data1.gestoes_bloqueadas || 0}\nRecuperados: ${data1.inadimplentes_recuperados || 0}\n\nTotal Inadimplentes: ${data2.total_inadimplentes || 0}\nPDD estimado: R$ ${(data2.pdd_estimado || 0).toFixed(2)}`);
      
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao criar gestão: ' + (error.response?.data?.erro || error.message));
    } finally {
      setProcessando(null);
    }
  };

  const getBadgeStatus = (status) => {
    const config = {
      concluido: { color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      processando: { color: 'bg-yellow-100 text-yellow-800', icon: Loader2 },
      erro: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };
    
    const { color, icon: Icon } = config[status] || config.erro;
    
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Histórico de Conciliações</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lotes Processados</CardTitle>
        </CardHeader>
        <CardContent>
          {lotes.length === 0 ? (
            <Alert>
              <AlertDescription>
                Nenhuma conciliação processada ainda. Acesse "Conciliação Financeira" para iniciar.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Base</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Inadimplente</TableHead>
                    <TableHead>Cancelado</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Não Class.</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map((lote) => (
                    <TableRow key={lote.id}>
                      <TableCell className="font-semibold">{lote.competencia}</TableCell>
                      <TableCell className="text-sm">
                        {lote.data_processamento 
                          ? format(new Date(lote.data_processamento), 'dd/MM/yyyy HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>{getBadgeStatus(lote.status)}</TableCell>
                      <TableCell>{lote.total_apolices_base || 0}</TableCell>
                      <TableCell>
                        <span className="text-green-600 font-semibold">{lote.total_ativo || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-yellow-600 font-semibold">{lote.total_inadimplente || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600 font-semibold">{lote.total_cancelado || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-blue-600 font-semibold">{lote.total_pago || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600 font-semibold">{lote.total_nao_classificado || 0}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleCriarGestao(lote)}
                          disabled={processando === lote.id || lote.status !== 'concluido'}
                        >
                          {processando === lote.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-1" />
                              Criar Gestão
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}