import React from "react";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, UserCheck, Building, Users, UserCog, Crown } from "lucide-react";

const PERFIS_INFO = {
  // Novos perfis de sistema
  usuario: { 
    nome: "Usuário", 
    icon: Users, 
    color: "bg-gray-100 text-gray-800 border-gray-200" 
  },
  gerente: { 
    nome: "Gerente", 
    icon: UserCog, 
    color: "bg-blue-100 text-blue-800 border-blue-200" 
  },
  administrador: { 
    nome: "Administrador", 
    icon: Shield, 
    color: "bg-purple-100 text-purple-800 border-purple-200" 
  },
  auditor: { 
    nome: "Auditor", 
    icon: UserCheck, 
    color: "bg-green-100 text-green-800 border-green-200" 
  },
  super_administrador: { 
    nome: "Super Admin", 
    icon: Crown, 
    color: "bg-red-100 text-red-800 border-red-200" 
  },
  // Perfis de fechamento (manter compatibilidade)
  admin_sistema: { 
    nome: "Admin Sistema", 
    icon: Crown, 
    color: "bg-purple-100 text-purple-800 border-purple-200" 
  },
  responsavel_mga: { 
    nome: "Responsável MGA", 
    icon: Building, 
    color: "bg-blue-100 text-blue-800 border-blue-200" 
  },
  responsavel_seguradora: { 
    nome: "Responsável Seguradora", 
    icon: Building, 
    color: "bg-orange-100 text-orange-800 border-orange-200" 
  },
  visualizador: { 
    nome: "Visualizador", 
    icon: Eye, 
    color: "bg-gray-100 text-gray-800 border-gray-200" 
  }
};

export default function PerfilBadge({ perfil }) {
  const info = PERFIS_INFO[perfil] || PERFIS_INFO.usuario;
  const Icon = info.icon;
  
  return (
    <Badge variant="secondary" className={`${info.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {info.nome}
    </Badge>
  );
}