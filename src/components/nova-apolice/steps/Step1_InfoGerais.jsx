import React from 'react';
import { Label } from "@/components/ui/label";
import CpfCnpjInput from '../CpfCnpjInput';
import { Input } from "@/components/ui/input";

export default function Step1InfoGerais({ formData, onInputChange }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="id_segurado" className="font-medium text-slate-700">
            CPF/CNPJ do segurado *
          </Label>
          <CpfCnpjInput
            id="id_segurado"
            value={formData.id_segurado || ''}
            onChange={(value) => onInputChange('id_segurado', value)}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            className="border-slate-200 focus:border-blue-500"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="id_beneficiario" className="font-medium text-slate-700">
            CPF/CNPJ do beneficiário *
          </Label>
          <CpfCnpjInput
            id="id_beneficiario"
            value={formData.id_beneficiario || ''}
            onChange={(value) => onInputChange('id_beneficiario', value)}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            className="border-slate-200 focus:border-blue-500"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="id_objeto" className="font-medium text-slate-700">
          ID do objeto segurado (placa/chassi) *
        </Label>
        <Input
          id="id_objeto"
          value={formData.id_objeto || ''}
          onChange={(e) => onInputChange('id_objeto', e.target.value.toUpperCase())}
          placeholder="ABC1D23"
          className="border-slate-200 focus:border-blue-500"
          required
        />
        <p className="text-xs text-slate-500">Este campo é essencial para gerar o número da apólice.</p>
      </div>
    </div>
  );
}