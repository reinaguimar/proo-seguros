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
  DialogDescription,
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
import { Building2, Plus, Pencil, Power, PowerOff, FileText, Hash, Crown, Upload, Image as ImageIcon } from "lucide-react";

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

const PRODUTOS_FILIAL = [
  { value: "FR", label: "Furto e Roubo" },
  { value: "COL_PARCIAL", label: "Colisão Parcial" },
  { value: "COL_TOTAL", label: "Colisão Total" },
  { value: "INCENDIO", label: "Incêndio e Fenômenos da Natureza" },
];

const RCFV_LMIS = [
  { value: 30000, label: "RCF-V — R$ 30.000" },
  { value: 50000, label: "RCF-V — R$ 50.000" },
  { value: 100000, label: "RCF-V — R$ 100.000" },
];

// Preço fixo (prêmio bruto) padrão do RCF-V por LMI. Usado como fallback quando a filial ainda não configurou.
const RCFV_PRECOS_PADRAO = { 30000: 35.90, 50000: 35.90, 100000: 35.90 };

const TODOS_PRODUTOS = ["FR", "RCFV", "COL_PARCIAL", "COL_TOTAL", "INCENDIO"];

const filialVazio = {
  nome: "",
  codigo_susep: "",
  codigo_filial: "",
  cnpj: "",
  cidade: "",
  estado: "SP",
  ativo: true,
  tipo: "sub_representante",
  produtos_permitidos: [...TODOS_PRODUTOS],
  rcfv_lmis_permitidos: [30000, 50000, 100000],
  rcfv_precos: { ...RCFV_PRECOS_PADRAO },
  logo_url: "",
  cor_primaria: "",
  cor_texto_cabecalho: "#ffffff",
};

export default function GestaoFiliais() {
  const [filiais, setFiliais] = useState([]);
  const [contagemApolices, setContagemApolices] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [filialEditando, setFilialEditando] = useState(null);
  const [form, setForm] = useState(filialVazio);
  const [salvando, setSalvando] = useState(false);
  const [uploadLogoLoading, setUploadLogoLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [promoverDialog, setPromoverDialog] = useState({ open: false, filial: null, matrizAtual: null });

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
      tipo: filial.tipo || "sub_representante",
      produtos_permitidos: filial.produtos_permitidos && filial.produtos_permitidos.length > 0
        ? [...filial.produtos_permitidos]
        : [...TODOS_PRODUTOS],
      rcfv_lmis_permitidos: filial.rcfv_lmis_permitidos && filial.rcfv_lmis_permitidos.length > 0
        ? [...filial.rcfv_lmis_permitidos]
        : [30000, 50000, 100000],
      rcfv_precos: { ...RCFV_PRECOS_PADRAO, ...(filial.rcfv_precos || {}) },
      logo_url: filial.logo_url || "",
      cor_primaria: filial.cor_primaria || "",
      cor_texto_cabecalho: filial.cor_texto_cabecalho || "#ffffff",
    });
    setErro("");
    setModalAberto(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLogoLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, logo_url: file_url }));
    } catch (err) {
      setErro("Erro ao enviar logo: " + (err.message || "tente novamente"));
    } finally {
      setUploadLogoLoading(false);
    }
  };

  const toggleAtivo = async (filial) => {
    await base44.entities.Filial.update(filial.id, { ativo: !filial.ativo });
    carregarFiliais();
  };

  const abrirPromoverDialog = (filial) => {
    const matrizAtual = filiais.find(f => f.tipo === "matriz" && f.id !== filial.id);
    setPromoverDialog({ open: true, filial, matrizAtual });
  };

  const confirmarPromocaoMatriz = async () => {
    const { filial, matrizAtual } = promoverDialog;
    if (!filial) return;
    setSalvando(true);
    try {
      if (matrizAtual) {
        await base44.entities.Filial.update(matrizAtual.id, { tipo: "sub_representante" });
      }
      await base44.entities.Filial.update(filial.id, { tipo: "matriz" });
    } catch (e) {
      setErro("Erro ao promover filial: " + e.message);
    } finally {
      setSalvando(false);
      setPromoverDialog({ open: false, filial: null, matrizAtual: null });
      carregarFiliais();
    }
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

    // Sincronizar RCFV em produtos_permitidos com rcfv_lmis_permitidos
    const lmisRcfv = form.rcfv_lmis_permitidos || [];
    const outrosProdutos = (form.produtos_permitidos || []).filter(p => p !== "RCFV");
    const produtosPermitidosFinal = lmisRcfv.length > 0
      ? [...outrosProdutos, "RCFV"]
      : outrosProdutos;

    setSalvando(true);
    const dados = {
      nome: form.nome.trim(),
      codigo_susep: form.codigo_susep.trim(),
      codigo_filial: form.codigo_filial.trim().toUpperCase(),
      cnpj: form.cnpj.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado,
      ativo: form.ativo,
      tipo: form.tipo || "sub_representante",
      produtos_permitidos: produtosPermitidosFinal,
      rcfv_lmis_permitidos: lmisRcfv,
      logo_url: form.logo_url || "",
      cor_primaria: form.cor_primaria || "",
      cor_texto_cabecalho: form.cor_texto_cabecalho || "#ffffff",
    };

    // Regra de matriz única: se salvando como matriz, rebaixar a matriz atual
    if (dados.tipo === "matriz") {
      const matrizAtual = filiais.find(f => f.tipo === "matriz" && f.id !== filialEditando?.id);
      if (matrizAtual) {
        await base44.entities.Filial.update(matrizAtual.id, { tipo: "sub_representante" });
      }
    }

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
                  <TableHead className="text-center">Tipo</TableHead>
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
                      {filial.tipo === "matriz" ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">Matriz</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200">Sub-representante</Badge>
                      )}
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
                        {filial.tipo !== "matriz" && (
                          <Button variant="ghost" size="icon" onClick={() => abrirPromoverDialog(filial)} title="Promover a Matriz">
                            <Crown className="w-4 h-4 text-purple-500" />
                          </Button>
                        )}
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

      {/* Modal Criar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={form.tipo || "sub_representante"}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="sub_representante">Sub-representante</option>
                <option value="matriz">Matriz</option>
              </select>
              {form.tipo === "matriz" && (
                <p className="text-xs text-amber-600">⚠ Ao salvar como matriz, a matriz atual (se houver) será rebaixada a sub-representante.</p>
              )}
            </div>

            {/* Identidade Visual */}
            <div className="space-y-2">
              <Label>Identidade Visual</Label>
              <div className="border rounded-md p-3 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Logo da empresa</Label>
                  <div className="flex items-center gap-3">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="Logo" className="w-16 h-16 object-contain border rounded-md bg-white p-1" />
                    ) : (
                      <div className="w-16 h-16 border rounded-md flex items-center justify-center bg-slate-50">
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-input bg-white hover:bg-slate-50">
                          <Upload className="w-3.5 h-3.5" />
                          {uploadLogoLoading ? "Enviando..." : form.logo_url ? "Trocar logo" : "Enviar logo"}
                        </span>
                        <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} disabled={uploadLogoLoading} />
                      </label>
                      {form.logo_url && (
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, logo_url: "" }))}
                          className="text-xs text-red-500 hover:text-red-700 text-left"
                        >
                          Remover logo
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">PNG, JPG ou SVG.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Cor primária</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.cor_primaria || "#1a3a5c"}
                      onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))}
                      className="w-10 h-9 rounded-md border border-input cursor-pointer bg-transparent"
                    />
                    <Input
                      value={form.cor_primaria || ""}
                      onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))}
                      placeholder="#1a3a5c"
                      className="font-mono text-sm w-32"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Cor do texto do cabeçalho</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, cor_texto_cabecalho: "#ffffff" }))}
                      className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${form.cor_texto_cabecalho === "#ffffff" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      Claro (#ffffff)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, cor_texto_cabecalho: "#1a1a1a" }))}
                      className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${form.cor_texto_cabecalho === "#1a1a1a" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      Escuro (#1a1a1a)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Produtos Comercializáveis</Label>
              <div className="border rounded-md p-3 space-y-2">
                {PRODUTOS_FILIAL.map(produto => (
                  <label key={produto.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form.produtos_permitidos || []).includes(produto.value)}
                      onChange={() => {
                        const atual = form.produtos_permitidos || [];
                        const novo = atual.includes(produto.value)
                          ? atual.filter(v => v !== produto.value)
                          : [...atual, produto.value];
                        setForm(f => ({ ...f, produtos_permitidos: novo }));
                      }}
                    />
                    <span className="text-sm">{produto.label}</span>
                  </label>
                ))}

                {/* Subgrupo RCF-V por LMI */}
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-700 mb-2">RCF-V (Danos a Terceiros)</p>
                  <div className="ml-4 space-y-2">
                    {RCFV_LMIS.map(opcao => (
                      <label key={opcao.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form.rcfv_lmis_permitidos || []).includes(opcao.value)}
                          onChange={() => {
                            const atual = form.rcfv_lmis_permitidos || [];
                            const novo = atual.includes(opcao.value)
                              ? atual.filter(v => v !== opcao.value)
                              : [...atual, opcao.value];
                            setForm(f => ({ ...f, rcfv_lmis_permitidos: novo }));
                          }}
                        />
                        <span className="text-sm">{opcao.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
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

      {/* Dialog Promover a Matriz */}
      <Dialog open={promoverDialog.open} onOpenChange={(open) => !open && setPromoverDialog({ open: false, filial: null, matrizAtual: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-500" />
              Promover a Matriz
            </DialogTitle>
            <DialogDescription>
              Promover <strong>{promoverDialog.filial?.nome}</strong> a matriz?
              {promoverDialog.matrizAtual ? (
                <> A matriz atual (<strong>{promoverDialog.matrizAtual.nome}</strong>) será rebaixada a sub-representante.</>
              ) : (
                <> Não há matriz atual, então esta se tornará a nova matriz.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPromoverDialog({ open: false, filial: null, matrizAtual: null })}>
              Cancelar
            </Button>
            <Button onClick={confirmarPromocaoMatriz} disabled={salvando} className="bg-purple-600 hover:bg-purple-700">
              {salvando ? "Processando..." : "Confirmar Promoção"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}