
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Calendar, DollarSign } from "lucide-react";

const PRODUTOS_LABELS = {
  FR: "Furto e Roubo",
  COL_PARCIAL: "Colisão Parcial",
  COL_TOTAL: "Colisão Total",
  INCENDIO: "Incêndio e Fenômenos",
  RCFV: "RCF-V"
};

const PRODUTOS_COLORS = {
  FR: "bg-red-100 text-red-800",
  COL_PARCIAL: "bg-blue-100 text-blue-800", 
  COL_TOTAL: "bg-purple-100 text-purple-800",
  INCENDIO: "bg-orange-100 text-orange-800",
  RCFV: "bg-green-100 text-green-800"
};

export default function RecentPolicies({ apolices, isLoading }) {
  const recentPolicies = apolices.slice(0, 8);

  return (
    <Card className="shadow-sm border border-slate-200">
      <CardHeader className="border-b border-slate-100 px-6 py-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FileText className="w-5 h-5 text-blue-600" />
          Apólices Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="bg-slate-100/70 border-b border-slate-200">
                <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600">Número</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600">Segurado</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600">Data</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600">Produtos</TableHead>
                <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 text-right">Prêmio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : recentPolicies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhuma apólice cadastrada ainda
                  </TableCell>
                </TableRow>
              ) : (
                recentPolicies.map((apolice) => (
                  <TableRow key={apolice.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200/70">
                    <TableCell className="py-3 font-medium text-slate-900 text-sm">
                      {apolice.numero_apolice}
                    </TableCell>
                    <TableCell className="py-3 text-slate-600 text-sm">
                      {apolice.id_segurado}
                    </TableCell>
                    <TableCell className="py-3 text-slate-600 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(apolice.data_inicio_apolice), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(apolice.produtos || []).map(produto => (
                          <Badge 
                            key={produto}
                            variant="secondary"
                            className={`text-[11px] px-2 py-0.5 border ${PRODUTOS_COLORS[produto]} rounded-full`}
                          >
                            {PRODUTOS_LABELS[produto]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-right font-semibold text-slate-900 text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="w-3 h-3" />
                        R$ {(apolice.premio_bruto_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
