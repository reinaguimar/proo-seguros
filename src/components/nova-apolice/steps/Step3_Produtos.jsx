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

const RCFV_OPCOES = [
  { lmi: 15000, label: "R$ 15.000,00", premio: 35.90 },
  { lmi: 30000, label: "R$ 30.000,00", premio: 35.90 },
  { lmi: 50000, label: "R$ 50.000,00", premio: 35.90 },
  { lmi: 100000, label: "R$ 100.000,00", premio: 35.90 },
];

export default function Step3Produtos({ formData, onInputChange }) {
  const rcfvSelecionado = (formData.produtos || []).includes("RCFV");
  const rcfvLmi = formData.rcfv_lmi || 100000;

  const handleProdutoToggle = (produto, checked) => {
    const newProdutos = checked
      ? [...(formData.produtos || []), produto]
      : (formData.produtos || []).filter(p => p !== produto);
    onInputChange('produtos', newProdutos);
    if (produto === "RCFV" && checked && !formData.rcfv_lmi) {
      onInputChange('rcfv_lmi', 100000);
    }
  };

  return (
    <div className="space-y-4">
      {PRODUTOS.map(produto => (
        <div key={produto.value}>
          <div className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
            (formData.produtos || []).includes(produto.value)
              ? 'bg-blue-50 border-blue-300'
              : 'border-slate-200 hover:bg-slate-50'
          } ${produto.isBasic ? 'opacity-70' : ''}`}>
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
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1">{produto.description}</p>
            </div>
          </div>

          {/* Sub-opções de LMI para RCFV */}
          {produto.value === 'RCFV' && rcfvSelecionado && (
            <div className="ml-7 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Selecione o Limite Máximo de Indenização:</p>
              <div className="flex flex-wrap gap-2">
                {RCFV_OPCOES.map(opcao => (
                  <button
                    key={opcao.lmi}
                    type="button"
                    onClick={() => onInputChange('rcfv_lmi', opcao.lmi)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      rcfvLmi === opcao.lmi
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">LMI selecionado: <strong>{RCFV_OPCOES.find(o => o.lmi === rcfvLmi)?.label}</strong></p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}