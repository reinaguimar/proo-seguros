
import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const PRODUTOS = [
  { value: "FR", label: "Furto e Roubo", description: "Proteção contra furto e roubo do veículo. (Cobertura Básica)", isBasic: true },
  { value: "COL_PARCIAL", label: "Colisão Parcial", description: "Cobertura para danos parciais por colisão." },
  { value: "COL_TOTAL", label: "Colisão Total", description: "Cobertura para perda total por colisão." },
  { value: "INCENDIO", label: "Incendio e Fenomenos da Natureza", description: "Proteção contra danos causados por incêndio e fenômenos da natureza." },
  { value: "RCFV", label: "RCF - V (Danos a Terceiros)", description: "Responsabilidade Civil Facultativa Veicular." }
];

export default function Step3Produtos({ formData, onInputChange }) {
  
  const handleProdutoToggle = (produto, checked) => {
    const newProdutos = checked
      ? [...(formData.produtos || []), produto]
      : (formData.produtos || []).filter(p => p !== produto);
    onInputChange('produtos', newProdutos);
  };

  return (
    <div className="space-y-4">
      {PRODUTOS.map(produto => (
        <div key={produto.value} className="flex items-start space-x-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors has-[:checked]:bg-blue-50 has-[:checked]:border-blue-300 has-[:disabled]:bg-slate-50 has-[:disabled]:opacity-70">
          <Checkbox
            id={produto.value}
            checked={(formData.produtos || []).includes(produto.value)}
            onCheckedChange={(checked) => handleProdutoToggle(produto.value, checked)}
            disabled={produto.isBasic}
            className="mt-1"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <Label htmlFor={produto.value} className={`text-base font-medium text-slate-900 ${!produto.isBasic && "cursor-pointer"}`}>
                {produto.label}
              </Label>
              {produto.value === 'RCFV' && (
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">Prêmio Fixo: R$ 35,90</div>
                  <div className="text-xs text-slate-500">LMI Fixo: R$ 100.000,00</div>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1">{produto.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
