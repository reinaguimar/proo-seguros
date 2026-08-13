import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ArrowLeft, Save, Loader2, CheckCircle, Image } from "lucide-react";

export default function Configuracoes() {
  const [filiais, setFiliais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filialSelecionada, setFilialSelecionada] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    loadFiliais();
  }, []);

  const loadFiliais = async () => {
    setLoading(true);
    const data = await base44.entities.Filial.list();
    // Matriz sempre primeiro
    const sorted = [...data].sort((a, b) => {
      if (a.tipo === 'matriz' && b.tipo !== 'matriz') return -1;
      if (b.tipo === 'matriz' && a.tipo !== 'matriz') return 1;
      return 0;
    });
    setFiliais(sorted);
    setLoading(false);
  };

  const handleSelecionar = (filial) => {
    setFilialSelecionada(filial);
    setForm({
      nome: filial.nome || "",
      cnpj: filial.cnpj || "",
      tipo: filial.tipo || "sub_representante",
      logo_url: filial.logo_url || "",
      franquia_percentual: filial.franquia_percentual ?? 6,
      site: filial.site || "",
      telefone_sac: filial.telefone_sac || "",
      email_sac: filial.email_sac || "",
      telefone_ouvidoria: filial.telefone_ouvidoria || "",
      email_ouvidoria: filial.email_ouvidoria || "",
      cor_primaria: filial.cor_primaria || "#1a3a5c",
      cor_texto_cabecalho: filial.cor_texto_cabecalho || "#ffffff",
    });
    setSucesso(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    await base44.entities.Filial.update(filialSelecionada.id, form);
    await loadFiliais();
    setSucesso(true);
    setSalvando(false);
    setTimeout(() => setSucesso(false), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (filialSelecionada) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setFilialSelecionada(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Configurar Filial</h1>
            <p className="text-sm text-muted-foreground">{filialSelecionada.nome}</p>
          </div>
        </div>

        {sucesso && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">Filial atualizada com sucesso!</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Dados da Filial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={e => handleChange("nome", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={e => handleChange("cnpj", e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => handleChange("tipo", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matriz">Matriz (Representante)</SelectItem>
                  <SelectItem value="sub_representante">Sub-Representante</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Logo URL</Label>
              <Input value={form.logo_url} onChange={e => handleChange("logo_url", e.target.value)} placeholder="https://..." />
              {form.logo_url && (
                <div className="mt-2 p-3 border rounded-md bg-slate-50 flex items-center gap-3">
                  <img
                    src={form.logo_url}
                    alt="Preview da logo"
                    className="h-12 w-auto object-contain"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <span className="text-xs text-muted-foreground">Preview da logo</span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Franquia sobre LMI (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.franquia_percentual}
                onChange={e => handleChange("franquia_percentual", parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-1">
              <Label>Site</Label>
              <Input value={form.site} onChange={e => handleChange("site", e.target.value)} placeholder="ex: gestaonew.com.br" />
            </div>

            <div className="space-y-1">
              <Label>Cor Principal (Identidade Visual)</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.cor_primaria || "#1a3a5c"}
                  onChange={e => handleChange("cor_primaria", e.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-input p-1"
                />
                <Input
                  value={form.cor_primaria || ""}
                  onChange={e => handleChange("cor_primaria", e.target.value)}
                  placeholder="#1a3a5c"
                  className="font-mono w-36"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor do Texto no Cabeçalho</Label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cor_texto"
                    value="#ffffff"
                    checked={form.cor_texto_cabecalho === "#ffffff"}
                    onChange={() => handleChange("cor_texto_cabecalho", "#ffffff")}
                  />
                  <span className="text-sm">Branco (#ffffff)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="cor_texto"
                    value="#1a1a1a"
                    checked={form.cor_texto_cabecalho === "#1a1a1a"}
                    onChange={() => handleChange("cor_texto_cabecalho", "#1a1a1a")}
                  />
                  <span className="text-sm">Escuro (#1a1a1a)</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Preview do Cabeçalho</Label>
              <div
                className="rounded-md p-4 flex items-center justify-between"
                style={{ background: form.cor_primaria || "#1a3a5c" }}
              >
                <div>
                  <p className="font-bold text-sm" style={{ color: form.cor_texto_cabecalho || "#ffffff" }}>{form.nome || "Nome da Filial"}</p>
                  {form.cnpj && <p className="text-xs mt-0.5" style={{ color: form.cor_texto_cabecalho || "#ffffff", opacity: 0.8 }}>CNPJ: {form.cnpj}</p>}
                  {form.site && <p className="text-xs" style={{ color: form.cor_texto_cabecalho || "#ffffff", opacity: 0.8 }}>{form.site}</p>}
                </div>
                <span className="text-xs italic" style={{ color: form.cor_texto_cabecalho || "#ffffff", opacity: 0.6 }}>Logo aqui</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">SAC e Ouvidoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Telefone SAC</Label>
                <Input value={form.telefone_sac} onChange={e => handleChange("telefone_sac", e.target.value)} placeholder="0800 000 0000" />
              </div>
              <div className="space-y-1">
                <Label>E-mail SAC</Label>
                <Input type="email" value={form.email_sac} onChange={e => handleChange("email_sac", e.target.value)} placeholder="sac@empresa.com.br" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Telefone Ouvidoria</Label>
                <Input value={form.telefone_ouvidoria} onChange={e => handleChange("telefone_ouvidoria", e.target.value)} placeholder="0800 000 0000" />
              </div>
              <div className="space-y-1">
                <Label>E-mail Ouvidoria</Label>
                <Input type="email" value={form.email_ouvidoria} onChange={e => handleChange("email_ouvidoria", e.target.value)} placeholder="ouvidoria@empresa.com.br" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSalvar} disabled={salvando} className="gap-2">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvando ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">Configure os dados de cada filial do sistema.</p>
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 mt-2 inline-block">ℹ️ A Matriz é o Representante principal. Sub-Representantes são as filiais parceiras.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filiais.map(filial => (
          <Card
            key={filial.id}
            className={`cursor-pointer hover:shadow-md transition-all ${
              filial.tipo === 'matriz'
                ? 'border-t-4 border-t-blue-900 hover:border-primary/40'
                : 'hover:border-primary/40'
            }`}
            onClick={() => handleSelecionar(filial)}
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {filial.logo_url ? (
                    <img src={filial.logo_url} alt="" className="w-8 h-8 object-contain" onError={e => { e.target.style.display='none'; }} />
                  ) : (
                    <Building2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{filial.nome}</p>
                  <p className="text-xs text-muted-foreground font-mono">{filial.cnpj || "CNPJ não cadastrado"}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={filial.ativo ? "default" : "secondary"} className="text-xs">
                      {filial.ativo ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        filial.tipo === 'matriz'
                          ? 'bg-blue-900 text-white border-blue-900'
                          : filial.tipo === 'sub_representante'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                      variant="outline"
                    >
                      {filial.tipo === 'matriz'
                        ? 'Matriz (Representante)'
                        : 'Sub-Representante'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filiais.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma filial cadastrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}