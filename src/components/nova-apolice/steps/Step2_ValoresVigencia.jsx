import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Switch não é mais necessário
// import { Switch } from "@/components/ui/switch";

export default function Step2ValoresVigencia({ formData, onInputChange }) {
    
  const formatCurrency = (value) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    const floatValue = parseFloat(numericValue) / 100;
    return floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="data_inicio" className="font-medium text-slate-700">
            Data de início da apólice *
          </Label>
          <Input
            id="data_inicio"
            type="date"
            value={formData.data_inicio || ''}
            onChange={(e) => onInputChange('data_inicio', e.target.value)}
            className="border-slate-200 focus:border-blue-500"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data_movimento" className="font-medium text-slate-700">
            Data do movimento
          </Label>
          <Input
            id="data_movimento"
            type="date"
            value={formData.data_movimento || ''}
            onChange={(e) => onInputChange('data_movimento', e.target.value)}
            className="border-slate-200 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="lmi_geral" className="font-medium text-slate-700">
            Valor do LMI (Limite Máximo de Indenização) *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
            <Input
              id="lmi_geral"
              value={formData.lmi_geral || ''}
              onChange={(e) => onInputChange('lmi_geral', formatCurrency(e.target.value))}
              placeholder="0,00"
              className="pl-10 border-slate-200 focus:border-blue-500"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="premio_bruto" className="font-medium text-slate-700">
            Prêmio bruto (total) *
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">R$</span>
            <Input
              id="premio_bruto"
              value={formData.premio_bruto || ''}
              onChange={(e) => onInputChange('premio_bruto', formatCurrency(e.target.value))}
              placeholder="0,00"
              className="pl-10 border-slate-200 focus:border-blue-500"
              required
            />
          </div>
        </div>
      </div>
      {/* O campo de seguro intermitente foi removido daqui */}
    </div>
  );
}