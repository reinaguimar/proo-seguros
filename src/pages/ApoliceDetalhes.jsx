import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePermissoes } from "@/components/auth/usePermissoes";
import { createPageUrl } from "@/utils";
import { Trash2 } from "lucide-react";

const provionLogoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c087e90719d9e5c2743b14/fc218ece-f9ab-47cd-91ea-6a553d638544.png";

const PageCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --primary: #1E40AF;
  --primary-light: #3B82F6;
  --secondary: #059669;
  --text: #1F2937;
  --text-light: #6B7280;
  --text-muted: #9CA3AF;
  --border: #E5E7EB;
  --surface: #FFFFFF;
  --surface-light: #F9FAFB;
  --accent: #F59E0B;
  --success: #10B981;
  --radius: 12px;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

body {
  font: 15px/1.6 'Inter', system-ui, -apple-system, sans-serif;
  color: var(--text);
  background: var(--surface-light);
  -webkit-font-smoothing: antialiased;
}

.print-button-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  gap: 12px;
}

.print-button {
  background: var(--primary);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.print-button:hover {
  background: var(--primary-light);
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.print-button svg {
  width: 20px;
  height: 20px;
}

.certificate-container {
  max-width: 900px;
  margin: 0 auto;
  background: var(--surface);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border-radius: var(--radius);
  overflow: hidden;
}

.header {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  color: white;
  padding: 32px 40px;
  position: relative;
  overflow: hidden;
}

.header::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 300px;
  height: 300px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  transform: translate(100px, -100px);
}

.header-content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}

.logo-section img {
  height: 50px;
  filter: brightness(0) invert(1);
}

.certificate-badge {
  background: var(--surface);
  color: var(--primary);
  padding: 12px 24px;
  border-radius: 50px;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.title-section {
  text-align: center;
  padding: 40px 40px 20px;
}

.title-section h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  color: var(--primary);
}

.title-section .subtitle {
  font-size: 18px;
  color: var(--text-light);
  margin: 0;
}

.policy-summary {
  background: linear-gradient(45deg, var(--secondary), #059669);
  color: white;
  margin: 0 40px;
  padding: 24px;
  border-radius: var(--radius);
  text-align: center;
}

.policy-summary h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
}

.policy-number {
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 20px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 6px;
  display: inline-block;
}

.section {
  margin: 40px 40px 0;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--primary);
  border-bottom: 2px solid var(--primary);
  padding-bottom: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.info-card {
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
}

.info-card .label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 0;
}

.info-card .value {
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
  margin: 0;
}

.info-card.highlight {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  border-color: var(--accent);
}

.info-card.highlight .value {
  color: var(--accent);
  font-weight: 600;
}

.coverage-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  background: var(--surface);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.coverage-table thead th {
  background: var(--primary);
  color: white;
  text-align: left;
  font-weight: 600;
  padding: 16px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.coverage-table tbody td {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.coverage-table tbody tr:last-child td {
  border-bottom: none;
}

.coverage-table tbody tr:hover {
  background: var(--surface-light);
}

.coverage-name {
  font-weight: 600;
  color: var(--text);
}

.coverage-description {
  font-size: 13px;
  color: var(--text-light);
  margin: 4px 0 0 0;
}

.amount {
  font-weight: 600;
  color: var(--secondary);
}

.premium {
  font-weight: 600;
  color: var(--primary);
}

.contact-section {
  background: var(--surface-light);
  margin: 40px 40px 0;
  padding: 32px;
  border-radius: var(--radius);
  border: 2px solid var(--border);
}

.contact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 32px;
}

.contact-card h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
}

.contact-card p {
  margin: 8px 0;
  color: var(--text-light);
}

.legal-section {
  background: var(--text);
  color: var(--surface-light);
  padding: 40px;
  margin-top: 40px;
  line-height: 1.7;
}

.legal-section h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.legal-section p {
  margin: 16px 0;
  font-size: 14px;
  opacity: 0.9;
}

.highlight-box {
  background: #EFF6FF;
  border-left: 4px solid var(--primary);
  padding: 20px;
  border-radius: 0 var(--radius) var(--radius) 0;
  margin: 24px 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active {
  background: #D1FAE5;
  color: #065F46;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.product-card {
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
  position: relative;
}

.product-card.included {
  border-color: var(--secondary);
  background: #ECFDF5;
}

.product-card.included::before {
  content: '✓';
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--secondary);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
}

.product-name {
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}

.product-lmi {
  font-size: 13px;
  color: var(--text-light);
  margin: 0;
}

.print-only {
  display: none;
}

/* ========== ESTILOS OTIMIZADOS PARA IMPRESSÃO ========== */
@media print {
  @page {
    size: A4;
    margin: 1.5cm 1cm;
    @bottom-right {
      content: "Página " counter(page) " de " counter(pages);
      font-size: 9pt;
      color: #6B7280;
    }
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  body {
    background: white;
    font-size: 10pt;
    line-height: 1.4;
    margin: 0;
    padding: 0;
  }

  .print-button-container {
    display: none !important;
  }

  .certificate-container {
    max-width: 100%;
    box-shadow: none;
    border-radius: 0;
    margin: 0;
    background: white;
  }

  /* Header otimizado */
  .header {
    padding: 20px 30px;
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  .header::before {
    display: none;
  }

  .logo-section img {
    height: 35px;
  }

  .certificate-badge {
    font-size: 12pt;
    padding: 8px 16px;
  }

  /* Title otimizado */
  .title-section {
    padding: 20px 30px 10px;
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  .title-section h1 {
    font-size: 20pt;
    margin-bottom: 4px;
  }

  .title-section .subtitle {
    font-size: 12pt;
  }

  /* Policy summary otimizado */
  .policy-summary {
    margin: 10px 30px;
    padding: 15px;
    page-break-inside: avoid;
    page-break-after: avoid;
  }

  .policy-summary h2 {
    font-size: 16pt;
    margin-bottom: 10px;
  }

  .policy-number {
    font-size: 14pt;
    padding: 6px 12px;
  }

  /* Sections otimizadas */
  .section {
    margin: 20px 30px 0;
    page-break-inside: avoid;
  }

  .section-title {
    font-size: 14pt;
    margin-bottom: 12px;
    padding-bottom: 4px;
  }

  /* Info grid otimizado */
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 15px;
    page-break-inside: avoid;
  }

  .info-card {
    padding: 12px;
    page-break-inside: avoid;
  }

  .info-card .label {
    font-size: 9pt;
    margin-bottom: 4px;
  }

  .info-card .value {
    font-size: 11pt;
  }

  /* Highlight box otimizado */
  .highlight-box {
    padding: 12px;
    margin: 15px 0;
    page-break-inside: avoid;
  }

  /* Status badge */
  .status-badge {
    font-size: 10pt;
    padding: 4px 10px;
  }

  /* Products grid otimizado */
  .products-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 15px 0;
    page-break-inside: avoid;
  }

  .product-card {
    padding: 10px;
  }

  .product-name {
    font-size: 10pt;
    margin-bottom: 4px;
  }

  .product-lmi {
    font-size: 9pt;
  }

  /* Coverage table otimizada */
  .coverage-table {
    margin: 15px 0;
    page-break-inside: auto;
  }

  .coverage-table thead th {
    padding: 10px;
    font-size: 10pt;
  }

  .coverage-table tbody td {
    padding: 10px;
    font-size: 9pt;
  }

  .coverage-table tbody tr {
    page-break-inside: avoid;
  }

  .coverage-name {
    font-size: 10pt;
  }

  .coverage-description {
    font-size: 8pt;
  }

  /* Contact section otimizada */
  .contact-section {
    margin: 20px 30px 0;
    padding: 20px;
    page-break-inside: avoid;
  }

  .contact-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .contact-card h3 {
    font-size: 12pt;
    margin-bottom: 8px;
  }

  .contact-card p {
    font-size: 9pt;
    margin: 4px 0;
  }

  /* Legal section otimizada */
  .legal-section {
    padding: 20px 30px;
    margin-top: 20px;
    page-break-before: auto;
    page-break-inside: auto;
  }

  .legal-section h3 {
    font-size: 12pt;
    margin-bottom: 12px;
  }

  .legal-section p {
    font-size: 9pt;
    margin: 10px 0;
    line-height: 1.5;
  }

  /* Evitar quebras ruins */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
  }

  p, li {
    page-break-inside: avoid;
  }

  /* Mostrar apenas na impressão */
  .print-only {
    display: block;
  }

  /* Ocultar elementos desnecessários na impressão */
  .no-print {
    display: none !important;
  }
}
`;

const PRODUTOS_INFO = {
  FR: { 
    nome: "Furto e Roubo", 
    descricao: "Proteção contra furto e roubo total do veículo, incluindo tentativa",
    coberturas: ["Furto simples", "Roubo", "Tentativa de furto/roubo"]
  },
  COL_PARCIAL: { 
    nome: "Colisão Parcial", 
    descricao: "Cobertura para danos parciais causados por colisão",
    coberturas: ["Danos por colisão", "Capotamento", "Abalroamento"]
  },
  COL_TOTAL: { 
    nome: "Colisão Total", 
    descricao: "Cobertura para perda total do veículo por colisão",
    coberturas: ["Perda total por colisão", "Perda total por capotamento"]
  },
  INCENDIO: { 
    nome: "Incêndio e Fenômenos da Natureza", 
    descricao: "Proteção contra danos por incêndio e eventos climáticos",
    coberturas: ["Incêndio", "Raio", "Explosão", "Fenômenos da natureza"]
  },
  RCFV: { 
    nome: "Responsabilidade Civil Facultativa Veicular", 
    descricao: "Cobertura para danos materiais e corporais causados a terceiros",
    coberturas: ["Danos materiais a terceiros", "Danos corporais a terceiros"]
  }
};

const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
};

const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

export default function ApoliceDetalhes() {
    const navigate = useNavigate();
    const { isPerfil } = usePermissoes();
    const [apolice, setApolice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const loadApolice = async () => {
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');

            if (!id) {
                setLoading(false);
                return;
            }

            try {
                const data = await base44.entities.Apolice.get(id);
                setApolice(data);
            } catch (err) {
                console.error("Erro ao buscar apólice:", err);
                
                // Se erro de autenticação, redireciona para login UMA VEZ
                if (err.response?.status === 401 || err.response?.status === 403) {
                    const currentUrl = window.location.href;
                    // Verifica se já não está em loop de login
                    if (!currentUrl.includes('/login?from_url=')) {
                        window.location.href = `/login?from_url=${encodeURIComponent(currentUrl)}`;
                    } else {
                        // Se já está em loop, mostra erro
                        setApolice(null);
                    }
                } else {
                    setApolice(null);
                }
            } finally {
                setLoading(false);
            }
        };

        loadApolice();
    }, []);

    const handlePrint = () => {
      window.print();
    };

    const handleDeletePermanente = async () => {
      if (!window.confirm('⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\nTem certeza que deseja deletar permanentemente a apólice ' + apolice.numero_apolice + ' do banco de dados?')) {
        return;
      }

      try {
        setDeleting(true);
        const response = await base44.functions.invoke('deletarApolice', {
          id_apolice: apolice.id
        });

        if (response.data?.sucesso) {
          alert('✅ ' + response.data.mensagem);
          navigate(createPageUrl('Apolices'));
        } else {
          alert('❌ Erro: ' + (response.data?.erro || 'Falha ao deletar'));
        }
      } catch (error) {
        console.error('Erro ao deletar apólice:', error);
        alert('❌ Erro ao deletar apólice: ' + error.message);
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
                    <p className="text-red-700 mb-4">
                        Você não tem permissão para visualizar esta apólice ou ela não foi encontrada.
                    </p>
                    <button 
                        onClick={() => navigate(createPageUrl('Apolices'))}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Voltar para Apólices
                    </button>
                </div>
            </div>
        );
    }

    const premioComercialTotal = apolice.premio_bruto_total - apolice.iof;
    const isActive = new Date(apolice.data_fim_apolice) >= new Date() && !apolice.cancelada_para_revisao && apolice.status !== 'cancelada';
    
    return (
        <>
            <style>{PageCSS}</style>
            
            {/* Botão de impressão e deletar */}
            <div className="print-button-container no-print">
                {isPerfil('super_administrador') && (
                    <button 
                        onClick={handleDeletePermanente} 
                        className="print-button"
                        disabled={deleting}
                        style={{
                            background: '#DC2626',
                            opacity: deleting ? 0.6 : 1,
                            cursor: deleting ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Trash2 style={{ width: '20px', height: '20px' }} />
                        {deleting ? 'Deletando...' : 'Deletar Permanentemente'}
                    </button>
                )}
                <button onClick={handlePrint} className="print-button">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir Certificado
                </button>
            </div>

            <div className="certificate-container">
                {/* Header */}
                <div className="header">
                    <div className="header-content">
                        <div className="logo-section">
                            <img src={provionLogoUrl} alt="Provion Club" />
                        </div>
                        <div className="certificate-badge">
                            Certificado Digital
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="title-section">
                    <h1>Certificado de Seguro Automotivo</h1>
                    <p className="subtitle">Documento válido para comprovação de cobertura</p>
                </div>

                {/* Policy Summary */}
                <div className="policy-summary">
                    <h2>Apólice Nº</h2>
                    <div className="policy-number">{apolice.numero_apolice}</div>
                </div>

                {/* Policy Status */}
                <div className="section">
                    <div className="highlight-box">
                        <strong>Status da Apólice:</strong> 
                        <span className={`status-badge ${isActive ? 'status-active' : ''}`} style={{marginLeft: '12px'}}>
                            {isActive ? '✓ ATIVA' : '⚠ INATIVA'}
                        </span>
                        {isActive && (
                            <p style={{margin: '12px 0 0 0', color: 'var(--text-light)'}}>
                                Sua apólice está ativa e suas coberturas estão em vigor.
                            </p>
                        )}
                    </div>
                </div>

                {/* Policy Details */}
                <div className="section">
                    <h2 className="section-title">Dados da Apólice</h2>
                    <div className="info-grid">
                        <div className="info-card">
                            <p className="label">Número da Apólice</p>
                            <p className="value" style={{fontFamily: 'Monaco, Consolas, monospace'}}>{apolice.numero_apolice}</p>
                        </div>
                        <div className="info-card">
                            <p className="label">Data de Emissão</p>
                            <p className="value">{formatDateTime(apolice.created_date)}</p>
                        </div>
                        <div className="info-card">
                            <p className="label">Início da Vigência</p>
                            <p className="value">{formatDate(apolice.data_inicio_apolice)}</p>
                        </div>
                        <div className="info-card">
                            <p className="label">Fim da Vigência</p>
                            <p className="value">{formatDate(apolice.data_fim_apolice)}</p>
                        </div>
                        <div className="info-card highlight">
                            <p className="label">Prêmio Total</p>
                            <p className="value">{formatCurrency(apolice.premio_bruto_total)}</p>
                        </div>
                        <div className="info-card">
                            <p className="label">IOF</p>
                            <p className="value">{formatCurrency(apolice.iof)}</p>
                        </div>
                    </div>
                </div>

                {/* Insured Details */}
                <div className="section">
                    <h2 className="section-title">Dados do Segurado</h2>
                    <div className="info-grid">
                        <div className="info-card">
                            <p className="label">CPF/CNPJ</p>
                            <p className="value" style={{fontFamily: 'Monaco, Consolas, monospace'}}>{apolice.id_segurado}</p>
                        </div>
                        <div className="info-card">
                            <p className="label">Beneficiário</p>
                            <p className="value" style={{fontFamily: 'Monaco, Consolas, monospace'}}>{apolice.id_beneficiario}</p>
                        </div>
                        <div className="info-card">
                            <p className="label">Veículo (Placa/Chassi)</p>
                            <p className="value" style={{fontFamily: 'Monaco, Consolas, monospace', fontWeight: '600'}}>{apolice.id_objeto}</p>
                        </div>
                    </div>
                </div>

                {/* Products Overview */}
                <div className="section">
                    <h2 className="section-title">Produtos Contratados</h2>
                    <div className="products-grid">
                        {Object.keys(PRODUTOS_INFO).map(produto => {
                            const isIncluded = (apolice.produtos || []).includes(produto);
                            const info = PRODUTOS_INFO[produto];
                            
                            return (
                                <div key={produto} className={`product-card ${isIncluded ? 'included' : ''}`}>
                                    <h3 className="product-name">{info.nome}</h3>
                                    <p className="product-lmi">
                                        {isIncluded ? (produto === 'RCFV' ? 'LMI: R$ 100.000,00' : `LMI: ${formatCurrency(apolice.lmi_geral)}`) : 'Não contratado'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Coverage Details */}
                <div className="section">
                    <h2 className="section-title">Detalhamento das Coberturas</h2>
                    <table className="coverage-table">
                        <thead>
                            <tr>
                                <th>Cobertura</th>
                                <th>Limite de Indenização</th>
                                <th>Prêmio Líquido</th>
                                <th>O que está coberto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(apolice.produtos || []).map(produto => {
                                const info = PRODUTOS_INFO[produto];
                                const lmi = produto === 'RCFV' ? 100000 : apolice.lmi_geral;
                                
                                // Buscar prêmio específico da cobertura
                                let premioLiquido = 0;
                                for (let i = 1; i <= 6; i++) {
                                    const prefixCobertura = `cobertura_${i}_`;
                                    const idCobertura = apolice[prefixCobertura + 'id_cobertura'];
                                    
                                    if ((produto === 'FR' && ['001', '002'].includes(idCobertura)) ||
                                        (produto === 'RCFV' && idCobertura === '006') ||
                                        (produto === 'COL_PARCIAL' && idCobertura === '008') ||
                                        (produto === 'COL_TOTAL' && idCobertura === '009') ||
                                        (produto === 'INCENDIO' && idCobertura === '010')) {
                                        premioLiquido += apolice[prefixCobertura + 'premio_comercial'] || 0;
                                    }
                                }
                                
                                return (
                                    <tr key={produto}>
                                        <td>
                                            <div className="coverage-name">{info.nome}</div>
                                            <div className="coverage-description">{info.descricao}</div>
                                        </td>
                                        <td className="amount">{formatCurrency(lmi)}</td>
                                        <td className="premium">{formatCurrency(premioLiquido)}</td>
                                        <td>
                                            <ul style={{margin: 0, paddingLeft: '16px', fontSize: '13px', color: 'var(--text-light)'}}>
                                                {info.coberturas.map(item => (
                                                    <li key={item}>{item}</li>
                                                ))}
                                            </ul>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Contact Section */}
                <div className="contact-section">
                    <h2 className="section-title" style={{margin: '0 0 24px 0'}}>Atendimento e Suporte</h2>
                    <div className="contact-grid">
                        <div className="contact-card">
                            <h3>Central de Atendimento</h3>
                            <p><strong>Telefone:</strong> 0800 123 4567</p>
                            <p><strong>WhatsApp:</strong> (11) 99999-9999</p>
                            <p><strong>E-mail:</strong> atendimento@provionclub.com.br</p>
                            <p><strong>Horário:</strong> Segunda a sexta, 8h às 18h</p>
                        </div>
                        <div className="contact-card">
                            <h3>Sinistros</h3>
                            <p><strong>Telefone:</strong> 0800 765 4321</p>
                            <p><strong>WhatsApp:</strong> (11) 88888-8888</p>
                            <p><strong>E-mail:</strong> sinistros@provionclub.com.br</p>
                            <p><strong>Horário:</strong> 24 horas por dia, 7 dias por semana</p>
                        </div>
                    </div>
                </div>

                {/* Legal Section */}
                <div className="legal-section">
                    <h3>Informações Regulamentares e Legais</h3>
                    
                    <p><strong>Seguradora:</strong> OON Seguradora S.A. - CNPJ: 43.249.519/0001-10 - Código Susep 110627</p>
                    
                    <p><strong>Representante:</strong> PROVION CLUB REPRESENTANTE DE SEGUROS LTDA. - CNPJ: 59.578.761/0001-78</p>
                    
                    <p><strong>Sandbox Regulatório SUSEP:</strong> Este produto é oferecido no âmbito do Sandbox Regulatório da SUSEP, processo nº 15414.627418/2021-15, que permite o desenvolvimento e oferta de soluções inovadoras de seguros com determinadas flexibilizações regulamentares, sempre garantindo conformidade, proteção ao consumidor e estabilidade do setor.</p>
                    
                    <p><strong>Prazo de Vigência:</strong> Este seguro tem prazo de vigência de 30 dias, podendo ser renovado mediante nova contratação.</p>
                    
                    <p><strong>Franquia:</strong> As coberturas contratadas não possuem franquia, salvo disposição em contrário especificada nas condições gerais.</p>
                    
                    <p><strong>Importante:</strong> Este certificado comprova a contratação do seguro e deve ser mantido em local seguro. Em caso de sinistro, entre em contato imediatamente com nossa central de atendimento. Para dúvidas sobre coberturas, exclusões e condições gerais, consulte a apólice completa disponível em nosso site ou entre em contato conosco.</p>
                    
                    <p><strong>Ouvidoria:</strong> Caso não fique satisfeito com o atendimento, entre em contato com nossa ouvidoria através do telefone 0800 000 0000 ou e-mail ouvidoria@provionclub.com.br</p>
                    
                    <p style={{fontSize: '12px', opacity: '0.8', marginTop: '24px'}}>
                        Este documento foi gerado eletronicamente em {formatDateTime(new Date())} e possui validade legal. Para verificar a autenticidade deste certificado, acesse nosso portal com o número da apólice.
                    </p>
                </div>
            </div>
        </>
    );
}