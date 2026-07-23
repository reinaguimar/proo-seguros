import React from "react";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock, CheckCheck, Lock } from "lucide-react";

const STATUS_INFO = {
  rascunho: { 
    nome: "Rascunho", 
    icon: FileText, 
    color: "bg-gray-100 text-gray-800 border-gray-200" 
  },
  auditado: { 
    nome: "Auditado", 
    icon: CheckCircle, 
    color: "bg-blue-100 text-blue-800 border-blue-200" 
  },
  aprovado_mga: { 
    nome: "Aprovado MGA", 
    icon: Clock, 
    color: "bg-yellow-100 text-yellow-800 border-yellow-200" 
  },
  aprovado_seguradora: { 
    nome: "Aprovado Seguradora", 
    icon: CheckCheck, 
    color: "bg-green-100 text-green-800 border-green-200" 
  },
  fechado: { 
    nome: "Fechado", 
    icon: Lock, 
    color: "bg-slate-100 text-slate-800 border-slate-300" 
  }
};

export default function StatusBadge({ status }) {
  const info = STATUS_INFO[status] || STATUS_INFO.rascunho;
  const Icon = info.icon;
  
  return (
    <Badge variant="secondary" className={`${info.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {info.nome}
    </Badge>
  );
}