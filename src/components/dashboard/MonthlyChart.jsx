import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

export default function MonthlyChart({ apolices, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-sm border border-blue-100">
        <CardHeader>
          <CardTitle>Carteira Vigente por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getLastSixMonths = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = startOfMonth(subMonths(new Date(), i));
      months.push(date);
    }
    return months;
  };

  const months = getLastSixMonths();
  
  const chartData = months.map(month => {
    const inicioMes = new Date(month);
    const fimMes = new Date(month);
    fimMes.setMonth(fimMes.getMonth() + 1);
    fimMes.setDate(0); // último dia do mês
    
    inicioMes.setHours(0, 0, 0, 0);
    fimMes.setHours(23, 59, 59, 999);
    
    // Contar apólices vigentes naquele mês
    const count = apolices.filter(apolice => {
      const inicioApolice = new Date(apolice.data_inicio_apolice);
      const fimApolice = new Date(apolice.data_fim_apolice);
      inicioApolice.setHours(0, 0, 0, 0);
      fimApolice.setHours(23, 59, 59, 999);
      
      // Apólice estava vigente se: início <= fim do mês E fim >= início do mês
      return inicioApolice <= fimMes && fimApolice >= inicioMes;
    }).length;

    return {
      month: format(month, "MMM", { locale: ptBR }),
      count
    };
  });

  return (
    <Card className="shadow-sm border border-blue-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Carteira Vigente por Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar 
              dataKey="count" 
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}