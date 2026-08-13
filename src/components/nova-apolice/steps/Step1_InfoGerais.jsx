import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import CpfCnpjInput, { cpfCnpjValidity } from '../CpfCnpjInput';
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Building2 } from "lucide-react";

export default function Step1InfoGerais({ formData, onInputChange, onValidityChange }) {
  const [filiais, setFiliais] = useState([]);

  // Notifica o pai sempre que a validade dos CPF/CNPJ mudar
  useEffect(() => {
    if (!onValidityChange) return;
    const seguradoOk = cpfCnpjValidity(formData.id_segurado) === true;
    const beneficiarioOk = cpfCnpjValidity(formData.id_beneficiario) === true;
    onValidityChange(seguradoOk && beneficiarioOk);
  }, [formData.id_segurado, formData.id_beneficiario]);

  useEffect(() => {
    base44.entities.Filial.filter({ ativo: true }).then(setFiliais);
  }, []);

  return (
    <div className="space-y-6">
      {/* Seleção de filial */}
      <div className="space-y-2">
        <Label className="font-medium text-slate-700 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-blue-500" />
          Filial Emissora *
        </Label>
        {filiais.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Nenhuma filial ativa cadastrada. Acesse <strong>Administração → Gestão de Filiais</strong> para cadastrar.
          </p>
        ) : (
          <select
            value={formData.filial_id || ""}
            onChange={e => {
              const filial = filiais.find(f => f.id === e.target.value);
              onInputChange('filial_id', e.target.value);
              onInputChange('filial_codigo_susep', filial?.codigo_susep || "");
              onInputChange('filial_nome', filial?.nome || "");
            }}
            className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Selecione a filial...</option>
            {filiais.map(f => (
              <option key={f.id} value={f.id}>
                {f.nome} — {f.codigo_susep}{f.cidade ? ` (${f.cidade}/${f.estado})` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

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