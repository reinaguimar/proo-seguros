import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Pencil, Power, PowerOff, FileText, Hash } from "lucide-react";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const filialVazio = {
  nome: "",
  codigo_susep: "",
  codigo_filial: "",
  cnpj: "",
  cidade: "",
  estado: "SP",
  ativo: true,
};

export default function GestaoFiliais() {
  const [filiais, setFiliais] = useState([]);
  const [contagemApolices, setContagemApolices] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [filialEditando, setFilialEditando] = useState(null);
  const [form, setForm] = useState(filialVazio);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const carregarFiliais = async () => {
    setLoading(true);
    const dados = await base44.entities.Filial.list("-created_date");
    setFiliais(dados);

    // Contar apólices reais por filial
    const todasApolices = await base44.entities.Apolice.list("-created_date", 5000);
    const contagem = {};
    for (const a of todasApolices) {
      if (a.filial_id) {
        contagem[a.filial_id] = (contagem[a.filial_id] || 0) + 1;
      }
    }
    setContagemApolices(contagem);

    setLoading(false);
  };

  useEffect(() => {
    carregarFiliais();
  }, []);

  const abrirCriar = () => {
    setFilialEditando(null);
    setForm(filialVazio);
    setErro("");
    setModalAberto(true);
  };

  const abrirEditar = (filial) => {
    setFilialEditando(filial);
    setForm({
      nome: filial.nome,
      codigo_susep: filial.codigo_susep,
      codigo_filial: filial.codigo_filial || "",
      cnpj: filial.cnpj || "",
      cidade: filial.cidade || "",
      estado: filial.estado || "SP",
      ativo: filial.ativo,
    });
    setErro("");
    setModalAberto(true);
  };

  const toggleAtivo = async (filial) => {
    await base44.entities.Filial.update(filial.id, { ativo: !filial.ativo });
    carregarFiliais();
  };

  const salvar = async () => {
    setErro("");
    if (!form.nome.trim()) return setErro("Nome é obrigatório.");
    if (!form.codigo_susep.trim()) return setErro("Código SUSEP é obrigatório.");
    if (!/^\d{6}$/.test(form.codigo_susep.trim())) return setErro("Código SUSEP deve ter exatamente 6 dígitos.");
    if (!form.codigo_filial.trim()) return setErro("Código da Filial (XX) é obrigatório.");
    if (form.codigo_filial.trim().length > 2) return setErro("Código da Filial deve ter no máximo 2 caracteres.");

    // Verificar unicidade do código da FILIAL (XX) — não do SUSEP
    const existentes = await base44.entities.Filial.filter({ codigo_filial: form.codigo_filial.trim().toUpperCase() });
    const conflito = existentes.find(f => f.id !== filialEditando?.id);
    if (conflito) return setErro(`Já existe uma filial com o código "${form.codigo_filial.trim().toUpperCase()}". Cada filial deve ter um código único.`);

    setSalvando(true);
    const dados = {
      nome: form.nome.trim(),
      codigo_susep: form.codigo_susep.trim(),
      codigo_filial: form.codigo_filial.trim().toUpperCase(),
      cnpj: form.cnpj.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado,
      ativo: form.ativo,
    };

    if (filialEditando) {
      await base44.entities.Filial.update(filialEditando.id, dados);
    } else {
      await base44.entities.Filial.create({ ...dados, ultimo_numero_sequencial: 0, total_apolices: 0 });
    }

    setSalvando(false);
    setModalAberto(false);
    carregarFiliais();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestão de Filiais</h1>
            <p className="text-sm text-slate-500">Cadastre e gerencie as filiais emissoras de apólices</p>
          </div>
        </div>
        <Button onClick={abrirCriar} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Filial
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{filiais.length}</p>
              <p className="text-xs text-slate-500">Total de filiais</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <Power className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{filiais.filter(f => f.ativo).length}</p>
              <p className="text-xs text-slate-500">Filiais ativas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {Object.values(contagemApolices).reduce((s, v) => s + v, 0)}
              </p>
              <p className="text-xs text-slate-500">Apólices emitidas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-800">Filiais Cadastradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">Carregando...</div>
          ) : filiais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Building2 className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhuma filial cadastrada ainda.</p>
              <Button variant="outline" size="sm" onClick={abrirCriar}>Cadastrar primeira filial</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Cód. SUSEP</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead className="text-center">Apólices</TableHead>
                  <TableHead className="text-center">Último Seq.</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filiais.map((filial) => (
                  <TableRow key={filial.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-800">{filial.nome}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {filial.codigo_susep}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {filial.cidade ? `${filial.cidade} / ${filial.estado}` : filial.estado || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                     <span className="font-semibold text-blue-600">{contagemApolices[filial.id] || 0}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm text-slate-500">
                        {String(filial.ultimo_numero_sequencial || 0).padStart(5, "0")}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={filial.ativo
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"}
                      >
                        {filial.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(filial)} title="Editar">
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleAtivo(filial)}
                          title={filial.ativo ? "Desativar" : "Ativar"}
                        >
                          {filial.ativo
                            ? <PowerOff className="w-4 h-4 text-red-400" />
                            : <Power className="w-4 h-4 text-green-500" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{filialEditando ? "Editar Filial" : "Nova Filial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {erro && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">{erro}</p>}

            <div className="space-y-1.5">
              <Label>Nome da Filial *</Label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Filial São Paulo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Código SUSEP * <span className="text-slate-400 font-normal text-xs">(6 dígitos)</span>
                </Label>
                <Input
                  value={form.codigo_susep}
                  onChange={e => !filialEditando && setForm(f => ({ ...f, codigo_susep: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                  placeholder="110627"
                  maxLength={6}
                  className={`font-mono ${filialEditando ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                  readOnly={!!filialEditando}
                  title={filialEditando ? 'O código SUSEP não pode ser alterado após a criação' : ''}
                />
                {filialEditando && <p className="text-xs text-amber-600">⚠ O código SUSEP não pode ser alterado.</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Código Filial * <span className="text-slate-400 font-normal text-xs">(2 chars — XX)</span>
                </Label>
                <Input
                  value={form.codigo_filial}
                  onChange={e => setForm(f => ({ ...f, codigo_filial: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="10"
                  maxLength={2}
                  className="font-mono"
                />
                <p className="text-xs text-slate-400">Identificador único no número da apólice.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>CNPJ</Label>
              <Input
                value={form.cnpj}
                onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <select
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : filialEditando ? "Salvar Alterações" : "Criar Filial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}