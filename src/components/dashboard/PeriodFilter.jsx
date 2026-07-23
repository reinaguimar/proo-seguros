import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MESES = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" }
];

const ANOS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

const OPCOES_RAPIDAS = [
  { value: "mes_atual", label: "Este Mês" },
  { value: "ultimos_3_meses", label: "Últimos 3 Meses" },
  { value: "ultimos_6_meses", label: "Últimos 6 Meses" },
  { value: "ano_atual", label: "Este Ano" },
  { value: "todo_periodo", label: "Todo o Período" }
];

export default function PeriodFilter({ onFilterChange }) {
  const [open, setOpen] = useState(false);
  const [tipoFiltro, setTipoFiltro] = useState("rapido"); // rapido, mes, intervalo
  const [opcaoRapida, setOpcaoRapida] = useState("mes_atual");
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined
  });

  const getDisplayText = () => {
    if (tipoFiltro === "rapido") {
      const opcao = OPCOES_RAPIDAS.find(o => o.value === opcaoRapida);
      return opcao?.label || "Este Mês";
    }
    
    if (tipoFiltro === "mes") {
      const mes = MESES.find(m => m.value === mesSelecionado);
      return `${mes.label} ${anoSelecionado}`;
    }
    
    if (tipoFiltro === "intervalo" && dateRange.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
      }
      return format(dateRange.from, "dd/MM/yyyy");
    }
    
    return "Selecione o período";
  };

  const aplicarFiltro = () => {
    let filtro = {};
    
    if (tipoFiltro === "rapido") {
      filtro = { tipo: "rapido", valor: opcaoRapida };
    } else if (tipoFiltro === "mes") {
      const dataInicio = new Date(anoSelecionado, mesSelecionado, 1);
      const dataFim = new Date(anoSelecionado, mesSelecionado + 1, 0);
      dataFim.setHours(23, 59, 59, 999);
      filtro = { tipo: "intervalo", dataInicio, dataFim };
    } else if (tipoFiltro === "intervalo" && dateRange.from && dateRange.to) {
      const dataInicio = new Date(dateRange.from);
      const dataFim = new Date(dateRange.to);
      dataInicio.setHours(0, 0, 0, 0);
      dataFim.setHours(23, 59, 59, 999);
      filtro = { tipo: "intervalo", dataInicio, dataFim };
    }
    
    onFilterChange(filtro);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-white rounded-lg shadow-sm border border-blue-100 px-4 py-2 hover:bg-blue-50"
        >
          <CalendarIcon className="w-4 h-4 mr-2 text-slate-500" />
          <span className="font-medium">{getDisplayText()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Menu lateral */}
          <div className="border-r border-slate-200 p-2 space-y-1 min-w-[140px]">
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start ${tipoFiltro === "rapido" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => setTipoFiltro("rapido")}
            >
              Opções Rápidas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start ${tipoFiltro === "mes" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => setTipoFiltro("mes")}
            >
              Por Mês
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`w-full justify-start ${tipoFiltro === "intervalo" ? "bg-blue-50 text-blue-700" : ""}`}
              onClick={() => setTipoFiltro("intervalo")}
            >
              Intervalo
            </Button>
          </div>

          {/* Conteúdo */}
          <div className="p-4 min-w-[280px]">
            {tipoFiltro === "rapido" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 mb-3">Selecione o período</p>
                {OPCOES_RAPIDAS.map(opcao => (
                  <button
                    key={opcao.value}
                    onClick={() => setOpcaoRapida(opcao.value)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-slate-100 flex items-center justify-between ${
                      opcaoRapida === opcao.value ? "bg-blue-50 text-blue-700 font-medium" : ""
                    }`}
                  >
                    {opcao.label}
                    {opcaoRapida === opcao.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}

            {tipoFiltro === "mes" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Mês</label>
                  <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map(mes => (
                        <SelectItem key={mes.value} value={String(mes.value)}>
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Ano</label>
                  <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANOS.map(ano => (
                        <SelectItem key={ano} value={String(ano)}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {tipoFiltro === "intervalo" && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700">Selecione o intervalo</p>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  locale={ptBR}
                  numberOfMonths={1}
                  className="rounded-md"
                />
                {dateRange.from && dateRange.to && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                    <strong>Período:</strong> {format(dateRange.from, "dd/MM/yyyy")} até {format(dateRange.to, "dd/MM/yyyy")}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={aplicarFiltro}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={tipoFiltro === "intervalo" && (!dateRange.from || !dateRange.to)}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}