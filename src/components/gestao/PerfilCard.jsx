import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Shield, Users, Eye, UserCog, Crown } from "lucide-react";

const PERFIL_CONFIG = {
  super_administrador: {
    icon: Crown,
    color: "bg-purple-100 text-purple-800 border-purple-300",
    gradiente: "from-purple-500 to-purple-600"
  },
  administrador: {
    icon: Shield,
    color: "bg-red-100 text-red-800 border-red-300",
    gradiente: "from-red-500 to-red-600"
  },
  gerente: {
    icon: UserCog,
    color: "bg-blue-100 text-blue-800 border-blue-300",
    gradiente: "from-blue-500 to-blue-600"
  },
  auditor: {
    icon: Eye,
    color: "bg-green-100 text-green-800 border-green-300",
    gradiente: "from-green-500 to-green-600"
  },
  usuario: {
    icon: Users,
    color: "bg-slate-100 text-slate-800 border-slate-300",
    gradiente: "from-slate-500 to-slate-600"
  }
};

export default function PerfilCard({ perfil, usuariosCount, onEdit }) {
  const config = PERFIL_CONFIG[perfil.nome.toLowerCase().replace(' ', '_')] || PERFIL_CONFIG.usuario;
  const Icon = config.icon;

  const contarPermissoes = () => {
    if (!perfil.permissoes) return 0;
    let total = 0;
    Object.values(perfil.permissoes).forEach(modulo => {
      if (typeof modulo === 'object') {
        total += Object.values(modulo).filter(v => v === true).length;
      }
    });
    return total;
  };

  const totalPermissoes = contarPermissoes();

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader className={`bg-gradient-to-r ${config.gradiente} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="w-8 h-8" />
            <div>
              <CardTitle className="text-xl">{perfil.nome}</CardTitle>
              <p className="text-sm opacity-90 mt-1">{perfil.descricao}</p>
            </div>
          </div>
          {perfil.sistema && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              Sistema
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-6">
            <div>
              <p className="text-sm text-slate-500">Usuários</p>
              <p className="text-2xl font-bold text-slate-900">{usuariosCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Permissões</p>
              <p className="text-2xl font-bold text-blue-600">{totalPermissoes}</p>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => onEdit(perfil)} 
          className="w-full"
          variant="outline"
          disabled={perfil.nome === 'Super Administrador'}
        >
          <Edit className="w-4 h-4 mr-2" />
          {perfil.nome === 'Super Administrador' ? 'Acesso Total' : 'Editar Permissões'}
        </Button>
      </CardContent>
    </Card>
  );
}