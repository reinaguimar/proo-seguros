
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Edit, 
  Save, 
  Calculator, 
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PRODUTOS_LABELS = {
  FR: "Furto e Roubo",
  COL_PARCIAL: "Colisão Parcial",
  COL_TOTAL: "Colisão Total",
  INCENDIO: "Incendio e Fenomenos da Natureza",
  RCFV: "RCF - V"
};

export default function PolicySummary({ formData, calculatedData, onSave, onEdit, isProcessing }) {
  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-800">Apólice Calculada com Sucesso!</h3>
              <p className="text-green-700">
                Número: <span className="font-mono font-semibold">{calculatedData.numero_apolice}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dados da Apólice */}
        <Card className="shadow-lg border-blue-100">
          <CardHeader className="border-b border-blue-100">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Dados da Apólice
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Início:</span>
                <p className="font-semibold">
                  {format(new Date(formData.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Fim:</span>
                <p className="font-semibold">
                  {format(calculatedData.data_fim, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Segurado:</span>
                <p className="font-mono text-sm">{formData.id_segurado}</p>
              </div>
              <div>
                <span className="text-slate-500">Beneficiário:</span>
                <p className="font-mono text-sm">{formData.id_beneficiario}</p>
              </div>
              <div>
                <span className="text-slate-500">LMI Geral:</span>
                <p className="font-semibold text-green-600">
                  R$ {parseCurrency(formData.lmi_geral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Prazo:</span>
                <p className="font-semibold text-blue-600">30 dias</p>
              </div>
            </div>
            
            {formData.id_objeto && (
              <>
                <Separator />
                <div>
                  <span className="text-slate-500">Objeto Segurado:</span>
                  <p className="font-mono font-semibold">{formData.id_objeto}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Valores Calculados */}
        <Card className="shadow-lg border-green-100">
          <CardHeader className="border-b border-green-100">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-600" />
              Valores Calculados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Prêmio Bruto:</span>
                <span className="font-bold text-lg">
                  R$ {parseCurrency(formData.premio_bruto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">IOF (7,38%):</span>
                <span className="font-semibold text-orange-600">
                  R$ {calculatedData.iof_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Prêmio Comercial:</span>
                <span className="font-semibold text-blue-600">
                  R$ {calculatedData.premio_comercial_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Corretagem (0,01%):</span>
                <span className="font-semibold">
                  R$ {calculatedData.valor_corretagem_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Produtos Selecionados */}
      <Card className="shadow-lg border-purple-100">
        <CardHeader className="border-b border-purple-100">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Produtos Selecionados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-3 mb-4">
            {formData.produtos.map(produto => (
              <Badge key={produto} variant="secondary" className="px-3 py-1 text-sm">
                {PRODUTOS_LABELS[produto]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coberturas Calculadas */}
      <Card className="shadow-lg border-indigo-100">
        <CardHeader className="border-b border-indigo-100">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            Distribuição das Coberturas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-semibold text-slate-700">Cobertura</th>
                  <th className="text-right py-2 font-semibold text-slate-700">LMI</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Prêmio Bruto</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Prêmio Comercial</th>
                  <th className="text-right py-2 font-semibold text-slate-700">Prêmio Retido</th>
                </tr>
              </thead>
              <tbody>
                {calculatedData.coberturas_calculadas.map((cobertura, index) => (
                  <tr key={index} className={`border-b last:border-b-0 ${cobertura.premio_bruto === 0 ? 'text-slate-400' : ''}`}>
                    <td className="py-2 font-medium">{cobertura.nome}</td>
                    <td className="text-right py-2">
                      R$ {cobertura.valor_maximo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-2 font-semibold">
                      R$ {cobertura.premio_bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-2 font-semibold text-blue-600">
                      R$ {cobertura.premio_comercial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-2 font-semibold text-purple-600">
                      R$ {cobertura.premio_retido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 pt-6">
        <Button
          variant="outline"
          onClick={onEdit}
          disabled={isProcessing}
          className="flex-1 hover:bg-slate-50 border-slate-300"
        >
          <Edit className="w-4 h-4 mr-2" />
          Editar Dados
        </Button>
        <Button
          onClick={onSave}
          disabled={isProcessing}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg"
        >
          <Save className="w-4 h-4 mr-2" />
          {isProcessing ? "Salvando..." : "Salvar Apólice"}
        </Button>
      </div>
    </div>
  );
}

function parseCurrency(formattedValue) {
    if (typeof formattedValue === 'number') return formattedValue;
    if (!formattedValue) return 0;
    const numericValue = formattedValue.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numericValue) || 0;
}
