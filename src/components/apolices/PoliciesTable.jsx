import React from 'react';
import { maskPII, formatCPFCNPJ } from "../../utils/maskPII";
import { usePermissoes } from "../auth/usePermissoes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Users, Edit, XCircle, Eye, RefreshCw, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PRODUTOS_LABELS = {
  FR: "Furto e Roubo",
  COL_PARCIAL: "Colisão Parcial",
  COL_TOTAL: "Colisão Total",
  INCENDIO: "Incêndio e Fenômenos",
  RCFV: "RCF-V"
};

const PRODUTOS_COLORS = {
  FR: "bg-red-100 text-red-700 border-red-200",
  COL_PARCIAL: "bg-blue-100 text-blue-700 border-blue-200",
  COL_TOTAL: "bg-purple-100 text-purple-700 border-purple-200",
  INCENDIO: "bg-orange-100 text-orange-700 border-orange-200",
  RCFV: "bg-green-100 text-green-700 border-green-200"
};

const getMovimentacaoBadge = (apolice) => {
  // CANCELADA: tem prioridade
  if (apolice.cancelada_para_revisao || apolice.status === 'cancelada') {
    return <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">Cancelada</Badge>;
  }
  
  // RENOVADA: apólice original foi renovada
  if (apolice.renovada === true) {
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Renovada</Badge>;
  }
  
  // EMITIDA: padrão
  return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Emitida</Badge>;
};

const isActivePolicy = (apolice) => {
  const now = new Date();
  const endDate = new Date(apolice.data_fim_apolice);
  return !apolice.cancelada_para_revisao && apolice.status !== 'cancelada' && endDate >= now && !apolice.renovada;
};

const isElegivelRenovacao = (apolice) => {
  const now = new Date();
  const endDate = new Date(apolice.data_fim_apolice);
  const diasParaVencer = differenceInDays(endDate, now);
  
  // Elegível se: vencida ou vence em até 30 dias, não cancelada, não renovada
  return (
    diasParaVencer <= 30 &&
    !apolice.cancelada_para_revisao &&
    apolice.status !== 'cancelada' &&
    !apolice.renovada
  );
};

export default function PoliciesTable({ apolices, isLoading, onRefresh }) {
  const { user } = usePermissoes();
  const isSuperAdmin = user?.perfil === 'super_administrador';
  const exibirCPFCNPJ = (valor) => isSuperAdmin ? formatCPFCNPJ(valor) : maskPII(valor);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (apolices.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600 mb-2">
          Nenhuma apólice encontrada
        </h3>
        <p className="text-slate-500">
          Tente ajustar os filtros ou cadastre uma nova apólice.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="bg-slate-100/70 border-b border-slate-200">
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-48">
              Número da Apólice
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-28">
              Filial
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-32">
              CPF do Segurado
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-28">
              Placa
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-28">
              Início de Vigência
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-28">
              Fim de Vigência
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-48">
              Coberturas
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 text-right w-24">
              Prêmio Bruto
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 text-right w-20">
              IOF
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-32">
              Movimentação
            </TableHead>
            <TableHead className="text-[11px] font-semibold tracking-[0.08em] uppercase text-slate-600 w-48">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apolices.map((apolice) => {
            const isCancelada = apolice.status === 'cancelada';
            return (
            <TableRow key={apolice.id} className={`hover:bg-slate-50/80 transition-colors border-b border-slate-200/70 h-16 ${isCancelada ? 'opacity-50' : ''}`}>
              <TableCell className="py-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm font-semibold tracking-tight ${isCancelada ? 'text-gray-400 line-through' : 'text-slate-900'}`}>{apolice.numero_apolice}</span>
                    {isCancelada && (
                      <span
                        title={apolice.motivo_status || 'Cancelada'}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 cursor-help"
                      >
                        CANCELADA
                      </span>
                    )}
                  </div>
                  {apolice.numero_renovacao > 0 && (
                    <span className="text-xs text-blue-600 font-medium">Renovação #{apolice.numero_renovacao}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-3">
                {apolice.filial_nome ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    apolice.filial_codigo === '10' || apolice.filial_nome?.toLowerCase().includes('new')
                      ? 'border border-blue-200 bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>{apolice.filial_nome}</span>
                ) : <span className="text-gray-300">—</span>}
              </TableCell>
              <TableCell className="py-3">
                <div className="flex items-center gap-2">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 truncate">{exibirCPFCNPJ(apolice.id_segurado)}</span>
                </div>
              </TableCell>
              <TableCell className="py-3">
                <span className="text-sm font-mono font-semibold text-slate-700 truncate">{maskPII(apolice.id_objeto)}</span>
              </TableCell>
              <TableCell className="py-3">
                <span className="text-sm text-slate-600">
                  {apolice.data_inicio_apolice ? format(new Date(apolice.data_inicio_apolice + 'T00:00:00'), "dd/MM/yy", { locale: ptBR }) : "—"}
                </span>
              </TableCell>
              <TableCell className="py-3">
                <span className="text-sm text-slate-600">
                  {apolice.data_fim_apolice ? format(new Date(apolice.data_fim_apolice + 'T00:00:00'), "dd/MM/yy", { locale: ptBR }) : "—"}
                </span>
              </TableCell>
              <TableCell className="py-3">
                <div className="flex gap-1 flex-wrap max-w-48">
                  {(apolice.produtos || []).slice(0, 3).map(produto => (
                    <Badge 
                      key={produto}
                      variant="secondary"
                      className={`text-[11px] px-2 py-0.5 border ${PRODUTOS_COLORS[produto]} whitespace-nowrap rounded-full`}
                    >
                      {produto === "FR" ? "F&R" : 
                       produto === "COL_PARCIAL" ? "Col.P" :
                       produto === "COL_TOTAL" ? "Col.T" :
                       produto === "INCENDIO" ? "Inc." :
                       produto === "RCFV" ? "RCF-V" : produto}
                    </Badge>
                  ))}
                  {(apolice.produtos || []).length > 3 && (
                  <Badge variant="secondary" className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border-slate-200">
                      +{(apolice.produtos || []).length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-slate-900 py-3">
                <div className="text-sm">
                  R$ {(apolice.premio_bruto_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold text-orange-600 py-3">
                <div className="text-sm">
                  R$ {(apolice.iof || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="flex flex-col gap-1">
                  {getMovimentacaoBadge(apolice)}
                  {apolice.renovada && apolice.id_apolice_renovacao && (
                    <Link to={createPageUrl(`ApoliceDetalhes?id=${apolice.id_apolice_renovacao}`)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      Ver nova <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-3">
                <div className="flex gap-1 flex-wrap">
                  {/* Botão Ver Certificado - sempre visível */}
                  <Link to={createPageUrl(`ApoliceDetalhes?id=${apolice.id}`)}>
                    <Button size="sm" variant="outline" className="hover:bg-blue-50 border-slate-200 text-slate-700 px-2 py-1 text-xs">
                      <Eye className="w-3 h-3 mr-1" />
                      Ver
                    </Button>
                  </Link>
                  
                  {/* Botões Revisar e Cancelar - apenas para apólices ativas */}
                  {isActivePolicy(apolice) && (
                    <>
                      <Link to={createPageUrl(`RevisarApolice?id=${apolice.id}`)}>
                        <Button size="sm" variant="outline" className="hover:bg-blue-50 border-blue-200 text-blue-700 px-2 py-1 text-xs">
                          <Edit className="w-3 h-3 mr-1" />
                          Revisar
                        </Button>
                      </Link>
                      <Link to={createPageUrl(`CancelarApolice?id=${apolice.id}`)}>
                        <Button size="sm" variant="outline" className="hover:bg-red-50 border-red-200 text-red-700 px-2 py-1 text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Cancelar
                        </Button>
                      </Link>
                    </>
                  )}

                  {/* Botão Renovar - para apólices elegíveis */}
                  {isElegivelRenovacao(apolice) && (
                    <Link to={createPageUrl(`RenovarApolice?id=${apolice.id}`)}>
                      <Button size="sm" variant="outline" className="hover:bg-green-50 border-green-200 text-green-700 px-2 py-1 text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Renovar
                      </Button>
                    </Link>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );})}
        </TableBody>
      </Table>
    </div>
  );
}