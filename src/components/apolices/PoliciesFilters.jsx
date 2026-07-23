import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function PoliciesFilters({ filters, onFiltersChange }) {
  const handleFilterChange = (key, value) => {
    onFiltersChange(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="flex gap-3 flex-wrap items-center">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        <Select 
          value={filters.dateRange} 
          onValueChange={(value) => handleFilterChange('dateRange', value)}
        >
          <SelectTrigger className="w-40 border-slate-200 focus:border-blue-500">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os períodos</SelectItem>
            <SelectItem value="thisMonth">Este mês</SelectItem>
            <SelectItem value="last3Months">Últimos 3 meses</SelectItem>
            <SelectItem value="thisYear">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Select 
        value={filters.products} 
        onValueChange={(value) => handleFilterChange('products', value)}
      >
        <SelectTrigger className="w-40 border-slate-200 focus:border-blue-500">
          <SelectValue placeholder="Produtos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os produtos</SelectItem>
          <SelectItem value="FR">Furto e Roubo</SelectItem>
          <SelectItem value="COL_PARCIAL">Colisão Parcial</SelectItem>
          <SelectItem value="COL_TOTAL">Colisão Total</SelectItem>
          <SelectItem value="INCENDIO">Incêndio e Fenômenos</SelectItem>
          <SelectItem value="RCFV">RCF-V</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}