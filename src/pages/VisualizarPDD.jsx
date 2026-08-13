import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, DollarSign, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function VisualizarPDD() {
  const [competencias, setCompetencias] = useState([]);
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState('');
  const [pddData, setPddData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCompetencias();
  }, []);

  useEffect(() => {
    if (competenciaSelecionada) {
      carregarPDD();
    }
  }, [competenciaSelecionada]);

  const carregarCompetencias = async () => {
    try {
      setLoading(true);
      const dados = await base44.entities.PDDCompetencia.list('-created_date', 50);
      
      // Extrair competências únicas
      const comps = [...new Set(dados.map(d => d.competencia))];
      setCompetencias(comps);
      
      if (comps.length > 0) {
        setCompetenciaSelecionada(comps[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar competências:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarPDD = async () => {
    try {
      setLoading(true);
      const dados = await base44.entities.PDDCompetencia.filter({
        competencia: competenciaSelecionada
      }, '-created_date', 1);
      
      if (dados.length > 0) {
        setPddData(dados[0]);
      } else {
        setPddData(null);
      }
    } catch (error) {
      console.error('Erro ao carregar PDD:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepararDadosGrafico = () => {
    if (!pddData || !pddData.breakdown_por_faixa) return [];
    
    const breakdown = pddData.breakdown_por_faixa;
    
    return [
      {
        faixa: '0-30 dias',
        quantidade: breakdown.faixa_0_30?.qtd || 0,
        pdd: breakdown.faixa_0_30?.pdd_parcial || 0,
        percentual: breakdown.faixa_0_30?.percentual_usado || 0
      },
      {
        faixa: '31-60 dias',
        quantidade: breakdown.faixa_31_60?.qtd || 0,
        pdd: breakdown.faixa_31_60?.pdd_parcial || 0,
        percentual: breakdown.faixa_31_60?.percentual_usado || 0
      },
      {
        faixa: '61-90 dias',
        quantidade: breakdown.faixa_61_90?.qtd || 0,
        pdd: breakdown.faixa_61_90?.pdd_parcial || 0,
        percentual: breakdown.faixa_61_90?.percentual_usado || 0
      },
      {
        faixa: '90+ dias',
        quantidade: breakdown.faixa_90_mais?.qtd || 0,
        pdd: breakdown.faixa_90_mais?.pdd_parcial || 0,
        percentual: breakdown.faixa_90_mais?.percentual_usado || 0
      }
    ];
  };

  if (loading && competencias.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const dadosGrafico = prepararDadosGrafico();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Visualização PDD</h1>
        <Select value={competenciaSelecionada} onValueChange={setCompetenciaSelecionada}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Selecione competência" />
          </SelectTrigger>
          <SelectContent>
            {competencias.map(comp => (
              <SelectItem key={comp} value={comp}>{comp}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!pddData ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            Nenhum PDD calculado para esta competência
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Users className="w-10 h-10 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Inadimplentes</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {pddData.total_inadimplentes}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <DollarSign className="w-10 h-10 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">PDD Estimado</p>
                    <p className="text-3xl font-bold text-purple-900">
                      R$ {pddData.pdd_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <TrendingUp className="w-10 h-10 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Ticket Médio</p>
                    <p className="text-3xl font-bold text-green-900">
                      R$ {(pddData.ticket_medio_usado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Breakdown por Faixa de Aging</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faixa</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">% PDD</TableHead>
                    <TableHead className="text-right">Valor Base Total</TableHead>
                    <TableHead className="text-right">PDD Parcial</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosGrafico.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-semibold">{item.faixa}</TableCell>
                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{item.percentual}%</TableCell>
                      <TableCell className="text-right">
                        R$ {(pddData.breakdown_por_faixa[`faixa_${item.faixa.replace(/[^0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`]?.valor_base_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        R$ {item.pdd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{pddData.total_inadimplentes}</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right">
                      R$ {pddData.pdd_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Gráfico */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Inadimplentes por Faixa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="faixa" />
                  <YAxis />
                  <Tooltip formatter={(value) => value.toLocaleString('pt-BR')} />
                  <Legend />
                  <Bar dataKey="quantidade" fill="#3b82f6" name="Quantidade" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Critério */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">Critério:</span> {pddData.criterio}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Calculado em: {new Date(pddData.data_calculo).toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}