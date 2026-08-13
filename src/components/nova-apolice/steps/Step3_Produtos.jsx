import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
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
  { lmi: 30000, label: "R$ 30.000,00", premio: 35.90 },
  { lmi: 50000, label: "R$ 50.000,00", premio: 35.90 },
  { lmi: 100000, label: "R$ 100.000,00", premio: 35.90 },
];

export default function Step3Produtos({ formData, onInputChange, COBERTURAS_FIXAS }) {
  const [produtosPermitidos, setProdutosPermitidos] = useState(null);
  const [rcfvLmisPermitidos, setRcfvLmisPermitidos] = useState(null);

  useEffect(() => {
    const carregarFilial = async () => {
      if (!formData.filial_id) {
        setProdutosPermitidos(null);
        setRcfvLmisPermitidos(null);
        return;
      }
      try {
        const filiais = await base44.entities.Filial.filter({ id: formData.filial_id });
        const filial = filiais[0];
        setProdutosPermitidos(filial?.produtos_permitidos || null);
        setRcfvLmisPermitidos(filial?.rcfv_lmis_permitidos || null);
      } catch {
        setProdutosPermitidos(null);
        setRcfvLmisPermitidos(null);
      }
    };
    carregarFilial();
  }, [formData.filial_id]);

  // Se produtosPermitidos estiver vazio ou ausente, permite todos (compatibilidade)
  const produtosBloqueados = (produtosPermitidos && produtosPermitidos.length > 0)
    ? PRODUTOS.filter(p => !produtosPermitidos.includes(p.value)).map(p => p.value)
    : [];

  // Remove produtos bloqueados da seleção atual
  const bloqueadosKey = produtosBloqueados.join(',');
  useEffect(() => {
    if (bloqueadosKey && formData.produtos && formData.produtos.length > 0) {
      const limpos = formData.produtos.filter(p => !produtosBloqueados.includes(p));
      if (limpos.length !== formData.produtos.length) {
        onInputChange('produtos', limpos);
      }
    }
  }, [bloqueadosKey]);

  // Limites de RCF-V habilitados para a filial (compatibilidade: vazio = todos)
  const lmisHabilitados = (rcfvLmisPermitidos && rcfvLmisPermitidos.length > 0)
    ? RCFV_OPCOES.filter(o => rcfvLmisPermitidos.includes(o.lmi))
    : RCFV_OPCOES;

  const rcfvSelecionado = (formData.produtos || []).includes("RCFV");
  const rcfvLmi = formData.rcfv_lmi || (lmisHabilitados[0]?.lmi ?? 100000);

  // Se o rcfv_lmi atual não estiver entre os habilitados, ajustar para o primeiro
  useEffect(() => {
    if (rcfvSelecionado && lmisHabilitados.length > 0 && !lmisHabilitados.some(o => o.lmi === rcfvLmi)) {
      onInputChange('rcfv_lmi', lmisHabilitados[0].lmi);
    }
  }, [rcfvLmisPermitidos]);

  const handleProdutoToggle = (produto, checked) => {
    const newProdutos = checked
      ? [...(formData.produtos || []), produto]
      : (formData.produtos || []).filter(p => p !== produto);
    onInputChange('produtos', newProdutos);
    if (produto === "RCFV" && checked) {
      onInputChange('rcfv_lmi', lmisHabilitados[0]?.lmi ?? 100000);
    }
  };

  return (
    <div className="space-y-4">
      {PRODUTOS.map(produto => {
        const isBloqueado = produtosBloqueados.includes(produto.value);
        return (
        <div key={produto.value}>
          <div className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
            (formData.produtos || []).includes(produto.value)
              ? 'bg-blue-50 border-blue-300'
              : 'border-slate-200 hover:bg-slate-50'
          } ${produto.isBasic ? 'opacity-70' : ''} ${isBloqueado ? 'opacity-40' : ''}`}>
            <Checkbox
              id={produto.value}
              checked={(formData.produtos || []).includes(produto.value)}
              onCheckedChange={(checked) => handleProdutoToggle(produto.value, checked)}
              disabled={produto.isBasic || isBloqueado}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <Label htmlFor={produto.value} className={`text-base font-medium text-slate-900 ${!produto.isBasic && !isBloqueado && "cursor-pointer"}`}>
                  {produto.label}
                  {isBloqueado && <span className="ml-2 text-xs text-red-500 font-normal">Não disponível para esta filial</span>}
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
                {lmisHabilitados.map(opcao => (
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
              <p className="text-xs text-slate-500 mt-2">LMI selecionado: <strong>{lmisHabilitados.find(o => o.lmi === rcfvLmi)?.label || '—'}</strong></p>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}