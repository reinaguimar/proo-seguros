import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const MODULOS = {
  dashboard: {
    nome: "Dashboard",
    acoes: [
      { id: "visualizar", nome: "Visualizar Dashboard" }
    ]
  },
  apolices: {
    nome: "Apólices",
    acoes: [
      { id: "visualizar", nome: "Visualizar Apólices" },
      { id: "criar", nome: "Criar Apólice" },
      { id: "editar", nome: "Editar Apólice" },
      { id: "deletar", nome: "Deletar Apólice" },
      { id: "renovar", nome: "Renovar Apólice" },
      { id: "cancelar", nome: "Cancelar Apólice" },
      { id: "exportar", nome: "Exportar Apólices" }
    ]
  },
  sinistros: {
    nome: "Sinistros",
    acoes: [
      { id: "visualizar", nome: "Visualizar Sinistros" },
      { id: "criar", nome: "Criar Sinistro" },
      { id: "editar", nome: "Editar Sinistro" },
      { id: "deletar", nome: "Deletar Sinistro" },
      { id: "adicionar_gastos", nome: "Adicionar Gastos" }
    ]
  },
  fechamentos: {
    nome: "Fechamentos Mensais",
    acoes: [
      { id: "visualizar", nome: "Visualizar Fechamentos" },
      { id: "criar", nome: "Criar Fechamento" },
      { id: "auditar", nome: "Auditar Fechamento" },
      { id: "aprovar_mga", nome: "Aprovar MGA" },
      { id: "aprovar_seguradora", nome: "Aprovar Seguradora" },
      { id: "reabrir", nome: "Reabrir Fechamento" },
      { id: "deletar", nome: "Deletar Fechamento" }
    ]
  },
  usuarios: {
    nome: "Usuários",
    acoes: [
      { id: "visualizar", nome: "Visualizar Usuários" },
      { id: "criar", nome: "Criar Usuário" },
      { id: "editar", nome: "Editar Usuário" },
      { id: "inativar", nome: "Inativar Usuário" },
      { id: "gerenciar_perfis", nome: "Gerenciar Perfis" },
      { id: "ver_inativos", nome: "Ver Inativos" }
    ]
  },
  sistema: {
    nome: "Sistema",
    acoes: [
      { id: "acessar_logs", nome: "Acessar Logs" },
      { id: "configuracoes", nome: "Configurações" }
    ]
  }
};

export default function EditarPerfilModal({ perfil, isOpen, onClose, onSave }) {
  const [permissoes, setPermissoes] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (perfil) {
      setPermissoes(perfil.permissoes || {});
    }
  }, [perfil]);

  const handleTogglePermissao = (modulo, acao) => {
    setPermissoes(prev => ({
      ...prev,
      [modulo]: {
        ...(prev[modulo] || {}),
        [acao]: !prev[modulo]?.[acao]
      }
    }));
  };

  const handleSalvar = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await base44.entities.Perfil.update(perfil.id, {
        permissoes: permissoes
      });

      setSuccess("Permissões atualizadas com sucesso!");
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } catch (err) {
      setError("Erro ao salvar permissões: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!perfil) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Permissões: {perfil.nome}</DialogTitle>
          <DialogDescription>
            {perfil.descricao}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {Object.entries(MODULOS).map(([moduloKey, moduloInfo]) => (
            <div key={moduloKey} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3 text-slate-900">
                {moduloInfo.nome}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {moduloInfo.acoes.map(acao => (
                  <div key={acao.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${moduloKey}-${acao.id}`}
                      checked={!!permissoes[moduloKey]?.[acao.id]}
                      onCheckedChange={() => handleTogglePermissao(moduloKey, acao.id)}
                      disabled={perfil.nome === 'Super Administrador'}
                    />
                    <Label
                      htmlFor={`${moduloKey}-${acao.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {acao.nome}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {perfil.nome === 'Super Administrador' && (
          <Alert className="bg-purple-50 border-purple-200">
            <AlertDescription className="text-purple-800">
              Super Administrador tem acesso total ao sistema. Não é possível editar suas permissões.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvar} 
            disabled={isSaving || perfil.nome === 'Super Administrador'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? "Salvando..." : "Salvar Permissões"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}