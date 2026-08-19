import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePermissoes } from "@/components/auth/usePermissoes";
import { createPageUrl } from "@/utils";
import { Trash2, AlertTriangle, Save, Pencil } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PageCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

body {
  font: 14px/1.5 'Inter', system-ui, -apple-system, sans-serif;
  color: #333;
  background: #f0f0f0;
  -webkit-font-smoothing: antialiased;
}

.action-buttons {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
  display: flex;
  gap: 8px;
}

.action-btn {
  background: #1a3a5c;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: opacity 0.2s;
}
.action-btn:hover { opacity: 0.85; }
.action-btn svg { width: 14px; height: 14px; }

/* DOCUMENTO */
.cert-doc {
  max-width: 840px;
  margin: 24px auto;
  background: white;
  box-shadow: 0 2px 16px rgba(0,0,0,0.12);
}

/* CABECALHO */
.cert-header {
  background: #1a3a5c;
  padding: 16px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cert-header-left { display: flex; flex-direction: column; gap: 1px; }
.cert-h-name { color: white; font-size: 14px; font-weight: 700; }
.cert-h-sub  { color: #90b4d0; font-size: 11px; }
.cert-h-logo { color: #22c55e; font-size: 32px; font-weight: 900; font-style: italic; letter-spacing: -2px; line-height: 1; }
.cert-green-bar { height: 4px; background: #22c55e; }

/* CORPO */
.cert-body { padding: 24px 28px; }

.cert-doc-title {
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: #111;
  text-decoration: underline;
  margin: 0 0 20px 0;
}

/* SECOES */
.cert-section { margin-bottom: 18px; }
.cert-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #1a3a5c;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 4px;
  margin: 0 0 0 0;
}

/* GRID COMPACTO */
.cert-grid {
  display: grid;
  border-left: 1px solid #e5e7eb;
  border-top: 1px solid #e5e7eb;
  margin-top: 0;
}
.cert-grid-3 { grid-template-columns: repeat(3, 1fr); }
.cert-grid-2 { grid-template-columns: repeat(2, 1fr); }

.cert-cell {
  padding: 7px 10px;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}
.cert-cell-label {
  font-size: 10px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 2px;
}
.cert-cell-value {
  font-size: 13px;
  font-weight: 700;
  color: #111;
}

/* TABELA COBERTURAS */
.cert-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  border: 1px solid #e5e7eb;
}
.cert-table thead tr { background: #f3f4f6; }
.cert-table thead th {
  padding: 7px 10px;
  text-align: left;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #374151;
  border-bottom: 1px solid #d1d5db;
}
.cert-table tbody td {
  padding: 7px 10px;
  border-bottom: 1px solid #f3f4f6;
  color: #333;
}
.cert-table tbody tr:nth-child(even) { background: #fafafa; }
.cert-table tbody tr:last-child td { border-bottom: none; }
.td-bold { font-weight: 600; }
.td-accent { color: #15803d; font-weight: 600; }

/* BLOCO REGULAMENTAR */
.cert-legal {
  background: #f8f9fa;
  border-left: 4px solid #1a3a5c;
  padding: 14px 18px;
  margin-top: 20px;
  font-size: 11px;
  line-height: 1.6;
  color: #444;
}
.cert-legal-title { font-size: 12px; font-weight: 700; color: #1a3a5c; margin: 0 0 8px 0; }
.cert-legal-ids { margin: 0 0 8px 0; }
.cert-legal-ids p { margin: 2px 0; font-size: 12px; }
.cert-legal-body { font-size: 11px; color: #555; border-top: 1px solid #dde; padding-top: 8px; margin-top: 4px; }
.cert-legal-body p { margin: 4px 0; }
.cert-authenticity { font-size: 10px; color: #999; font-style: italic; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #ddd; }

/* RODAPE */
.cert-footer {
  border-top: 1px solid #e5e7eb;
  padding: 9px 28px;
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  background: white;
}

/* IMPRESSAO */
@media print {
  @page { size: A4; margin: 1cm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { background: white; }
  .no-print, .action-buttons { display: none !important; }
  .cert-doc { margin: 0; box-shadow: none; }
  .cert-section { page-break-inside: avoid; }
}
`;

const COBERTURAS_MAP = {
  '001': 'Furto',
  '002': 'Roubo',
  '006': 'Responsabilidade Civil Facultativa Veicular (RCF-V)',
  '008': 'Colisao Parcial',
  '009': 'Colisao Total',
  '010': 'Incendio e Fenomenos da Natureza',
};

const formatCurrency = (value) =>
  (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
};

const maskCpfCnpj = (doc) => {
  if (!doc) return '-';
  const d = doc.replace(/\D/g, '');
  if (d.length === 11) return `***.${d.slice(3,6)}.${d.slice(6,9)}-**`;
  if (d.length === 14) return `**.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-**`;
  return doc;
};

const fmtCnpj = (v) => {
  if (!v) return '--';
  const d = v.replace(/\D/g, '');
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`;
  return v;
};

export default function ApoliceDetalhes() {
  const navigate = useNavigate();
  const { isPerfil } = usePermissoes();
  const [apolice, setApolice] = useState(null);
  const [filial, setFilial] = useState(null);
  const [matriz, setMatriz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editandoObjeto, setEditandoObjeto] = useState(false);
  const [novoIdObjeto, setNovoIdObjeto] = useState('');
  const [salvandoObjeto, setSalvandoObjeto] = useState(false);
  const certificateRef = useRef(null);

  useEffect(() => {
    const loadApolice = async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (!id) { setLoading(false); return; }
      try {
        const data = await base44.entities.Apolice.get(id);
        setApolice(data);
        if (data.filial_id) {
          try {
            const f = await base44.entities.Filial.get(data.filial_id);
            setFilial(f);
          } catch (_) {}
        }
        try {
          const matrizes = await base44.entities.Filial.filter({ tipo: "matriz" });
          setMatriz(matrizes[0] || null);
        } catch (_) {}
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          const cur = window.location.href;
          if (!cur.includes('/login?from_url=')) window.location.href = `/login?from_url=${encodeURIComponent(cur)}`;
          else setApolice(null);
        } else {
          setApolice(null);
        }
      } finally {
        setLoading(false);
      }
    };
    loadApolice();
  }, []);

  const handlePrint = () => window.print();

  const handleSalvarObjeto = async () => {
    if (!novoIdObjeto.trim()) return;
    setSalvandoObjeto(true);
    await base44.entities.Apolice.update(apolice.id, { id_objeto: novoIdObjeto.trim().toUpperCase() });
    setApolice(prev => ({ ...prev, id_objeto: novoIdObjeto.trim().toUpperCase() }));
    setEditandoObjeto(false);
    setSalvandoObjeto(false);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    const element = certificateRef.current;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    let position = 0;
    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`certificado-${apolice.numero_apolice}.pdf`);
    setDownloading(false);
  };

  const handleDeletePermanente = async () => {
    if (!window.confirm('ATENCAO: Esta acao e IRREVERSIVEL!\n\nDeseja deletar permanentemente a apolice ' + apolice.numero_apolice + '?')) return;
    try {
      setDeleting(true);
      const response = await base44.functions.invoke('deletarApolice', { id_apolice: apolice.id });
      if (response.data?.sucesso) {
        alert('Apolice deletada com sucesso.');
        navigate(createPageUrl('Apolices'));
      } else {
        alert('Erro: ' + (response.data?.erro || 'Falha ao deletar'));
      }
    } catch (error) {
      alert('Erro ao deletar: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!apolice) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-2">Acesso Negado</h2>
          <p className="text-red-700 mb-4">Voce nao tem permissao para visualizar esta apolice.</p>
          <button onClick={() => navigate(createPageUrl('Apolices'))} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Voltar para Apolices
          </button>
        </div>
      </div>
    );
  }

  // Coberturas ativas
  const coberturas = [];
  for (let i = 1; i <= 6; i++) {
    const id = apolice[`cobertura_${i}_id_cobertura`];
    if (!id) continue;
    coberturas.push({
      nome: COBERTURAS_MAP[id] || `Cobertura ${id}`,
      lmi: apolice[`cobertura_${i}_valor_maximo`] || 0,
      premio: apolice[`cobertura_${i}_premio_comercial`] || 0,
    });
  }

  const isSubRep = filial?.tipo === 'sub_representante';
  const repNome = matriz?.nome || filial?.nome || '—';
  const repCnpj = matriz?.cnpj || filial?.cnpj || '--';
  const repTexto = `${repNome} - CNPJ: ${fmtCnpj(repCnpj)}`;
  const franquiaPerc = (filial?.franquia_percentual != null ? filial.franquia_percentual : 6);
  const corPrimaria = filial?.cor_primaria || '#1a3a5c';
  const corTexto = filial?.cor_texto_cabecalho || '#ffffff';
  // Derive accent color: lighten primary by mixing with white
  const deriveAccent = (hex) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
    if (lum < 0.4) {
      // dark color: return a vibrant green-ish accent
      return '#22c55e';
    }
    // light color: darken slightly
    const dr = Math.round(r*0.7), dg = Math.round(g*0.7), db = Math.round(b*0.7);
    return `#${dr.toString(16).padStart(2,'0')}${dg.toString(16).padStart(2,'0')}${db.toString(16).padStart(2,'0')}`;
  };
  const corAcento = deriveAccent(corPrimaria);
  const now = format(new Date(), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  const semPlaca = !apolice.id_objeto || !apolice.id_objeto.trim() || apolice.id_objeto.toLowerCase().includes('sem placa');

  return (
    <>
      <style>{PageCSS}</style>

      {/* Botoes de acao */}
      <div className="action-buttons no-print">
        {isPerfil('super_administrador') && (
          <button onClick={handleDeletePermanente} className="action-btn" disabled={deleting} style={{ background: '#b91c1c', opacity: deleting ? 0.6 : 1 }}>
            <Trash2 />
            {deleting ? 'Deletando...' : 'Deletar'}
          </button>
        )}
        <button onClick={handlePrint} className="action-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
        <button onClick={handleDownloadPDF} className="action-btn" disabled={downloading} style={{ background: '#15803d', opacity: downloading ? 0.6 : 1 }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? 'Gerando...' : 'Download PDF'}
        </button>
      </div>

      {/* Alerta sem placa */}
      {semPlaca && (
        <div className="no-print" style={{ maxWidth: '840px', margin: '14px auto', background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '6px', padding: '10px 14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#92400e', fontSize: '12px' }}>Veiculo sem placa ou chassi registrado.</p>
            {!editandoObjeto ? (
              <button onClick={() => { setEditandoObjeto(true); setNovoIdObjeto(apolice.id_objeto || ''); }} style={{ marginTop: '4px', fontSize: '11px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                Atualizar placa/chassi
              </button>
            ) : (
              <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" value={novoIdObjeto} onChange={e => setNovoIdObjeto(e.target.value.toUpperCase())} placeholder="Ex: ABC1D23" style={{ border: '1px solid #ccc', borderRadius: '3px', padding: '3px 7px', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', background: 'white' }} />
                <button onClick={handleSalvarObjeto} disabled={salvandoObjeto} style={{ background: '#1a3a5c', color: 'white', border: 'none', borderRadius: '3px', padding: '3px 9px', fontSize: '11px', cursor: 'pointer', opacity: salvandoObjeto ? 0.6 : 1 }}>{salvandoObjeto ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setEditandoObjeto(false)} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '3px', padding: '3px 9px', fontSize: '11px', cursor: 'pointer' }}>Cancelar</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="cert-doc" ref={certificateRef}>

        {/* CABECALHO */}
        <div className="cert-header" style={{ backgroundColor: corPrimaria }}>
          <div className="cert-header-left">
            <span className="cert-h-name" style={{ color: corTexto }}>{filial?.nome || matriz?.nome || apolice.filial_nome || 'OON SEGURADORA SA'}</span>
            {(filial?.cnpj || matriz?.cnpj) && <span className="cert-h-sub" style={{ color: corTexto, opacity: 0.8 }}>CNPJ: {fmtCnpj(filial?.cnpj || matriz?.cnpj)}</span>}
            {(filial?.site || matriz?.site) && <span className="cert-h-sub" style={{ color: corTexto, opacity: 0.8 }}>{filial?.site || matriz?.site}</span>}
          </div>
          {(filial?.logo_url || matriz?.logo_url) ? (
            <img src={filial?.logo_url || matriz?.logo_url} alt="Logo" style={{ maxHeight: '48px', objectFit: 'contain' }} />
          ) : (
            <div className="cert-h-logo" style={{ color: corAcento }}>OON</div>
          )}
        </div>
        <div className="cert-green-bar" style={{ backgroundColor: corAcento }} />

        {/* CORPO */}
        <div className="cert-body">
          <div className="cert-doc-title">Dados da Apolice</div>

          {/* Secao 1 - Dados Gerais */}
          <div className="cert-section">
            <div className="cert-section-title" style={{ color: corPrimaria, borderColor: corPrimaria + '30' }}>Dados Gerais</div>
            <div className="cert-grid cert-grid-3">
              <div className="cert-cell"><div className="cert-cell-label">Seguradora</div><div className="cert-cell-value">OON SEGURADORA SA</div></div>
              <div className="cert-cell"><div className="cert-cell-label">CNPJ</div><div className="cert-cell-value">43.249.519/0001-10</div></div>
              <div className="cert-cell"><div className="cert-cell-label">Apolice n.o</div><div className="cert-cell-value" style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>{apolice.numero_apolice}</div></div>
            </div>
            <div className={`cert-grid ${isSubRep ? 'cert-grid-2' : ''}`} style={{ gridTemplateColumns: isSubRep ? '1fr 1fr' : '1fr' }}>
              <div className="cert-cell"><div className="cert-cell-label">Representante</div><div className="cert-cell-value">{repTexto}</div></div>
              {isSubRep && (
                <div className="cert-cell"><div className="cert-cell-label">Sub-Representante</div><div className="cert-cell-value">{filial?.nome} - CNPJ: {fmtCnpj(filial?.cnpj)}</div></div>
              )}
            </div>
            <div className="cert-grid cert-grid-3">
              <div className="cert-cell"><div className="cert-cell-label">Emissao</div><div className="cert-cell-value">{formatDate(apolice.data_movimento || apolice.data_inicio_apolice)}</div></div>
              <div className="cert-cell"><div className="cert-cell-label">Inicio da Vigencia</div><div className="cert-cell-value">{formatDate(apolice.data_inicio_apolice)}</div></div>
              <div className="cert-cell"><div className="cert-cell-label">Fim da Vigencia</div><div className="cert-cell-value">{formatDate(apolice.data_fim_apolice)}</div></div>
            </div>
            <div className="cert-grid cert-grid-3">
              <div className="cert-cell"><div className="cert-cell-label">Premio Total</div><div className="cert-cell-value" style={{ color: '#1a3a5c' }}>{formatCurrency(apolice.premio_bruto_total)}</div></div>
              <div className="cert-cell"><div className="cert-cell-label">IOF</div><div className="cert-cell-value">{formatCurrency(apolice.iof)}</div></div>
              <div className="cert-cell"><div className="cert-cell-label">Vigencia</div><div className="cert-cell-value">30 dias - Mensal</div></div>
            </div>
          </div>

          {/* Secao 2 - Dados do Segurado */}
          <div className="cert-section">
            <div className="cert-section-title" style={{ color: corPrimaria, borderColor: corPrimaria + '30' }}>Dados do Segurado</div>
            <div className="cert-grid cert-grid-3">
              <div className="cert-cell"><div className="cert-cell-label">Segurado (CPF/CNPJ)</div><div className="cert-cell-value" style={{ fontFamily: 'monospace' }}>{maskCpfCnpj(apolice.id_segurado)}</div></div>
              <div className="cert-cell"><div className="cert-cell-label">CPF/CNPJ</div><div className="cert-cell-value" style={{ fontFamily: 'monospace' }}>{maskCpfCnpj(apolice.id_segurado)}</div></div>
              <div className="cert-cell"><div className="cert-cell-label">Beneficiario</div><div className="cert-cell-value" style={{ fontFamily: 'monospace' }}>{maskCpfCnpj(apolice.id_beneficiario)}</div></div>
            </div>
          </div>

          {/* Secao 3 - Dados do Veiculo */}
          <div className="cert-section">
            <div className="cert-section-title" style={{ color: corPrimaria, borderColor: corPrimaria + '30' }}>Dados do Veiculo</div>
            <div className="cert-grid cert-grid-3">
              <div className="cert-cell"><div className="cert-cell-label">Placa / Chassi</div><div className="cert-cell-value" style={{ fontFamily: 'monospace' }}>{apolice.id_objeto || '-'}</div></div>
              <div className="cert-cell"><div className="cert-cell-label">Marca / Modelo</div><div className="cert-cell-value">-</div></div>
              <div className="cert-cell"><div className="cert-cell-label">Ano</div><div className="cert-cell-value">-</div></div>
            </div>
          </div>

          {/* Secao 4 - Coberturas */}
          <div className="cert-section">
            <div className="cert-section-title" style={{ color: corPrimaria, borderColor: corPrimaria + '30', marginBottom: '8px' }}>Coberturas Contratadas</div>
            <table className="cert-table">
              <thead>
                <tr style={{ backgroundColor: corPrimaria + '15' }}>
                  <th style={{ color: corPrimaria }}>Cobertura</th>
                  <th style={{ color: corPrimaria }}>Valor da Cobertura</th>
                  <th style={{ color: corPrimaria }}>Premio Liquido</th>
                  <th style={{ color: corPrimaria }}>Franquia</th>
                  <th style={{ color: corPrimaria }}>Periodo</th>
                </tr>
              </thead>
              <tbody>
                {coberturas.map((cob, idx) => {
                  const nomeLC = cob.nome.toLowerCase();
                  const semFranquia = nomeLC.includes('furto') || nomeLC.includes('roubo') || nomeLC.includes('rcf') || nomeLC.includes('responsabilidade civil');
                  const franqVal = !semFranquia && franquiaPerc > 0 ? (cob.lmi * franquiaPerc / 100) : null;
                  return (
                    <tr key={idx}>
                      <td className="td-bold">{cob.nome}</td>
                      <td className="td-accent">{formatCurrency(cob.lmi)}</td>
                      <td>{formatCurrency(cob.premio)}</td>
                      <td>{franqVal ? <>{formatCurrency(franqVal)}<br /><span style={{fontSize:'10px',color:'#888'}}>({franquiaPerc}% do LMI)</span></> : 'Sem franquia'}</td>
                      <td>Mensal</td>
                    </tr>
                  );
                })}
                {coberturas.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: '12px' }}>Nenhuma cobertura registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bloco Regulamentar */}
          <div className="cert-legal" style={{ borderLeftColor: corPrimaria }}>
            <p className="cert-legal-title">Informacoes Regulamentares e Legais</p>
            <div className="cert-legal-ids">
              <p><strong>Seguradora:</strong> OON Seguradora S.A. - CNPJ: 43.249.519/0001-10 - Codigo Susep 110627</p>
              <p><strong>Representante:</strong> {repTexto}</p>
              {isSubRep && (
                <p><strong>Sub-Representante:</strong> {apolice.filial_nome || '-'} - CNPJ: {fmtCnpj(filial?.cnpj)}</p>
              )}
            </div>
            <div className="cert-legal-body">
              <p>Este produto e oferecido no ambito do Sandbox Regulatorio da SUSEP, processo no 15414.627418/2021-15, que permite o desenvolvimento e oferta de solucoes inovadoras de seguros com determinadas flexibilizacoes regulamentares, sempre garantindo conformidade, protecao ao consumidor e estabilidade do setor.</p>
              <p><strong>Prazo de Vigencia:</strong> Este seguro tem prazo de vigencia de 30 dias, podendo ser renovado mediante nova contratacao.</p>
              <p><strong>Franquia:</strong> As coberturas contratadas nao possuem franquia, salvo disposicao em contrario especificada nas condicoes gerais.</p>
              <p><strong>Importante:</strong> Este certificado comprova a contratacao do seguro e deve ser mantido em local seguro. Em caso de sinistro, entre em contato imediatamente com nossa central de atendimento. Para duvidas sobre coberturas, exclusoes e condicoes gerais, consulte a apolice completa disponivel em nosso site ou entre em contato conosco.</p>
              {(() => {
                const sacTel = filial?.telefone_sac || matriz?.telefone_sac;
                const sacEmail = filial?.email_sac || matriz?.email_sac;
                if (!sacTel) return null;
                return <p><strong>SAC:</strong> Telefone {sacTel}{sacEmail ? ` | E-mail: ${sacEmail}` : ''}</p>;
              })()}
              {(() => {
                const ouvTel = filial?.telefone_ouvidoria || matriz?.telefone_ouvidoria;
                const ouvEmail = filial?.email_ouvidoria || matriz?.email_ouvidoria;
                if (!ouvTel && !ouvEmail) return null;
                return <p><strong>Ouvidoria:</strong> Caso nao fique satisfeito com o atendimento, entre em contato com nossa ouvidoria{ouvTel ? ` atraves do telefone ${ouvTel}` : ''}{ouvTel && ouvEmail ? ' ou ' : ''}{ouvEmail ? `e-mail ${ouvEmail}` : ''}</p>;
              })()}
              {(() => {
                const siteFinal = filial?.site || matriz?.site;
                if (!siteFinal) return null;
                return <p><strong>Site:</strong> {siteFinal}</p>;
              })()}
            </div>
            <p className="cert-authenticity">Este documento foi gerado eletronicamente em {now} e possui validade legal. Para verificar a autenticidade deste certificado, acesse nosso portal com o numero da apolice.</p>
          </div>
        </div>

        {/* RODAPE */}
        <div className="cert-footer">
          OON SEGURADORA S/A &nbsp;|&nbsp; CNPJ: 43.249.519/0001-10 &nbsp;|&nbsp; Processo SUSEP No: 15414.627418/2021-15
        </div>
      </div>
    </>
  );
}