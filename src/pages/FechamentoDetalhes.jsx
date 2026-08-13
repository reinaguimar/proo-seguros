import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PrintCSS = `
@media print {
  @page {
    size: A4;
    margin: 2cm 1.5cm 2.5cm 1.5cm;
  }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-size: 10pt; }
  .no-print { display: none !important; }
  .page-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    border-top: 1px solid #ccc;
    padding: 6px 24px;
    display: flex;
    justify-content: space-between;
    font-size: 8pt;
    color: #555;
    background: white;
  }
}
@media screen {
  .page-footer { display: none; }
}
`;
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle, Loader2, FileText, DollarSign, Calendar, User, Edit, Printer, Download, CheckCircle, Lock, FileDown } from "lucide-react";
import BorderoImpressao from "../components/fechamento/BorderoImpressao";
import SecaoOperacional from "../components/bordero-contabil/SecaoOperacional";
import SecaoOperacionalBordero from "@/components/bordero-contabil/SecaoOperacionalBordero";
import { generateBorderoPDF } from "@/lib/generateBorderoPDF";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import StatusBadge from "../components/fechamento/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MESES = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function FechamentoDetalhes() {
  const navigate = useNavigate();
  const [fechamento, setFechamento] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isExportingLogs, setIsExportingLogs] = useState(false);
  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [isExportingBordero, setIsExportingBordero] = useState(false);
  const [user, setUser] = useState(null);
  const borderoRef = React.useRef(null);

  const avancarStatus = async (novoStatus, acao, observacao) => {
    setIsApproving(true);
    try {
      await base44.entities.FechamentoMensal.update(fechamento.id, { status: novoStatus });

      const dados_snapshot = {
        premio_emitido_bruto: fechamento.premio_emitido_bruto,
        sinistros_pagos: fechamento.sinistros_pagos,
        remuneracao_total_mga: fechamento.remuneracao_total_mga,
        repasse_seguradora: fechamento.repasse_seguradora,
        status: novoStatus
      };

      await base44.functions.invoke('registrarLogFechamento', {
        fechamento_id: fechamento.id,
        acao,
        observacao,
        dados_snapshot
      });

      // Criar assinatura digital para aprovações
      if (acao === 'aprovado_mga' || acao === 'aprovado_seguradora') {
        await base44.functions.invoke('criarAssinaturaFechamento', {
          fechamento_id: fechamento.id,
          tipo_assinatura: acao === 'aprovado_mga' ? 'mga' : 'seguradora',
          dados_fechamento: dados_snapshot
        });
      }

      await loadFechamento();
    } finally {
      setIsApproving(false);
    }
  };

  const handleExportarParaDrive = async () => {
    setIsExportingDrive(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const response = await base44.functions.invoke('exportarLogsParaDrive', { data: hoje });
      if (response.data?.sucesso) {
        alert(`✅ Logs exportados para o Drive com sucesso!\nArquivo: ${response.data.arquivo}\nRegistros: ${response.data.total_registros}`);
      } else {
        alert(`❌ Erro: ${response.data?.error || 'Falha ao exportar'}`);
      }
    } catch (err) {
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setIsExportingDrive(false);
    }
  };

  const handleExportarLogs = async () => {
    setIsExportingLogs(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const response = await base44.functions.invoke('exportarLogsDiarios', { data: hoje });
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-new-seguros-${hoje}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingLogs(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pageHeightPx = Math.round(794 * 297 / 210);

      const wrapper = borderoRef.current;
      const breakElements = wrapper.querySelectorAll('[data-pdf-break="true"]');

      breakElements.forEach(el => {
        el.style.marginTop = '0px';
        const wrapperRect = wrapper.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const yFromTop = elRect.top - wrapperRect.top;
        const remainder = yFromTop % pageHeightPx;
        if (remainder > 10) {
          el.style.marginTop = (pageHeightPx - remainder) + 'px';
        }
      });

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0
      });

      breakElements.forEach(el => { el.style.marginTop = ''; });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      pdf.save(`bordero_${fechamento.competencia || `${fechamento.competencia_mes}-${fechamento.competencia_ano}`}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBorderoPDF = async () => {
    setIsExportingBordero(true);
    try {
      await generateBorderoPDF(fechamento);
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err.message || 'Falha ao carregar componentes do PDF. Verifique sua conexão.'));
    } finally {
      setIsExportingBordero(false);
    }
  };

  useEffect(() => {
    loadFechamento();
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const loadFechamento = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');

      if (!id) {
        setError("ID do fechamento não encontrado.");
        return;
      }

      const fechamentoData = await base44.entities.FechamentoMensal.get(id);
      setFechamento(fechamentoData);

      // Carregar logs
      const logsData = await base44.entities.LogFechamento.filter({ fechamento_id: id }, "-created_date");
      setLogs(logsData);
    } catch (err) {
      setError("Erro ao carregar fechamento: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!fechamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Fechamento não encontrado</h3>
            <Button onClick={() => navigate(createPageUrl("Fechamentos"))}>
              Voltar aos Fechamentos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 overflow-x-hidden">
      <style>{PrintCSS}</style>

      {/* Rodapé de impressão */}
      <div className="page-footer">
        <span>OON SEGURADORA S/A</span>
        <span>CNPJ: 43.249.519/0001-10</span>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Progress Bar de Status */}
        {(() => {
          const steps = [
            { key: 'rascunho', label: 'Rascunho' },
            { key: 'calculado', label: 'Calculado' },
            { key: 'auditado', label: 'Auditado' },
            { key: 'aprovado_mga', label: 'Aprov. MGA' },
            { key: 'aprovado_seguradora', label: 'Aprov. Seg.' },
            { key: 'fechado', label: 'Fechado' },
          ];
          const order = steps.map(s => s.key);
          const currentIdx = order.indexOf(fechamento.status);
          return (
            <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
              <div className="flex items-center justify-between gap-1">
                {steps.map((step, i) => {
                  const done = i < currentIdx;
                  const active = i === currentIdx;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-1 min-w-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'
                        }`}>{done ? '✓' : i + 1}</div>
                        <span className={`text-[10px] font-medium text-center leading-tight ${
                          active ? 'text-blue-700' : done ? 'text-green-600' : 'text-gray-400'
                        }`}>{step.label}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`flex-1 h-1 rounded-full mb-4 ${
                          i < currentIdx ? 'bg-green-400' : 'bg-gray-200'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Cabeçalho do documento - estilo PDF */}
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-xl font-extrabold tracking-wide">OON SEGURADORA SA</div>
              <div className="text-sm font-medium opacity-90">43.249.519/0001-10</div>
              <div className="text-sm font-medium opacity-90">SUSEP 15414.627418/2021-15</div>
            </div>
            <div className="w-16 h-16 bg-green-400 rounded-full flex items-center justify-center">
              <span className="text-white font-black text-2xl">OON</span>
            </div>
          </div>
          <div className="h-2 bg-green-400" />
          <div className="bg-white px-6 py-3 text-center">
            <div className="text-sm font-semibold text-slate-700">OON SEGURADORA S/A &nbsp;|&nbsp; CNPJ: 43.249.519/0001-10</div>
            <div className="mt-1 text-base font-bold text-slate-900 italic">BORDERÔ MENSAL DE MOVIMENTAÇÃO OPERACIONAL E FINANCEIRA</div>
            <div className="text-sm text-slate-600 italic">DOCUMENTO DE PRESTAÇÃO DE CONTAS: REPRESENTANTE (MGA) → SEGURADORA</div>
          </div>
        </div>

        {/* Header nav */}
        <div className="flex items-center flex-wrap gap-2 no-print">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl("Fechamentos"))}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Fechamento - {MESES[fechamento.competencia_mes]}/{fechamento.competencia_ano}
            </h1>
            <p className="text-slate-600">Detalhes completos do fechamento</p>
          </div>
          <StatusBadge status={fechamento.status} />

          <Button variant="outline" onClick={handleExportBorderoPDF} disabled={isExportingBordero} className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700">
            {isExportingBordero ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
            {isExportingBordero ? 'Gerando...' : 'Exportar Borderô PDF'}
          </Button>
          {(fechamento.status === 'rascunho' || fechamento.status === 'calculado') && (
            <Button onClick={() => avancarStatus('auditado', 'auditado', 'Fechamento auditado')} disabled={isApproving} className="bg-blue-600 hover:bg-blue-700">
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Auditar
            </Button>
          )}
          {fechamento.status === 'auditado' && (
            <Button onClick={() => avancarStatus('aprovado_mga', 'aprovado_mga', 'Aprovado pela MGA')} disabled={isApproving} className="bg-yellow-600 hover:bg-yellow-700">
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Aprovar MGA
            </Button>
          )}
          {fechamento.status === 'aprovado_mga' && (
            <Button onClick={() => avancarStatus('aprovado_seguradora', 'aprovado_seguradora', 'Aprovado pela Seguradora')} disabled={isApproving} className="bg-green-600 hover:bg-green-700">
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Aprovar Seguradora
            </Button>
          )}
          {fechamento.status === 'aprovado_seguradora' && (
            <Button onClick={() => avancarStatus('fechado', 'fechado', 'Fechamento encerrado')} disabled={isApproving} className="bg-slate-700 hover:bg-slate-800">
              {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Fechar
            </Button>
          )}
          <Button 
            onClick={() => navigate(createPageUrl(`EditarFechamento?id=${fechamento.id}`))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Informações Principais */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Competência
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-3xl font-bold text-blue-600">
                {MESES[fechamento.competencia_mes]}/{fechamento.competencia_ano}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-green-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Prêmio Bruto
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-2xl font-bold text-green-600">
                R$ {(fechamento.premio_emitido_bruto || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-purple-50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex items-center justify-center">
              <StatusBadge status={fechamento.status} />
            </CardContent>
          </Card>
        </div>

        {/* Composição por Filial */}
        {(() => {
          const breakdown = fechamento.detalhes_calculo?.breakdown_por_filial;
          const hasData = Array.isArray(breakdown) && breakdown.length > 0;
          const totalQtd = hasData ? breakdown.reduce((s, r) => s + r.qtd_apolices, 0) : 0;
          const totalPremio = hasData ? breakdown.reduce((s, r) => s + r.premio_bruto, 0) : 0;
          const totalIof = hasData ? breakdown.reduce((s, r) => s + r.iof, 0) : 0;
          const fmt = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return (
            <Card>
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle>Composição por Filial</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!hasData ? (
                  <p className="text-slate-500 text-sm p-6">Recalcule o fechamento para ver a composição por filial.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b">
                        <th className="text-left px-4 py-2 font-semibold text-slate-600">Filial</th>
                        <th className="text-right px-4 py-2 font-semibold text-slate-600">Qtd Apólices</th>
                        <th className="text-right px-4 py-2 font-semibold text-slate-600">Prêmio Bruto</th>
                        <th className="text-right px-4 py-2 font-semibold text-slate-600">IOF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.map((row) => (
                        <tr key={row.filial_id} className="border-b hover:bg-slate-50">
                          <td className="px-4 py-2">
                            {row.filial_codigo ? (
                              <a
                                href={`/borderou-filial?filial_codigo=${encodeURIComponent(row.filial_codigo)}&fechamento_id=${fechamento.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-1"
                              >
                                {row.filial_nome || row.filial_id}
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                              </a>
                            ) : (
                              row.filial_nome || row.filial_id
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">{row.qtd_apolices}</td>
                          <td className="px-4 py-2 text-right">R$ {fmt(row.premio_bruto)}</td>
                          <td className="px-4 py-2 text-right">R$ {fmt(row.iof)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                        <td className="px-4 py-2">TOTAL</td>
                        <td className="px-4 py-2 text-right">{totalQtd}</td>
                        <td className="px-4 py-2 text-right">R$ {fmt(totalPremio)}</td>
                        <td className="px-4 py-2 text-right">R$ {fmt(totalIof)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Seção 2 - Prêmios */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Seção 2 - Prêmios</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">2.1 - Prêmio Emitido Bruto:</span>
                <span className="font-semibold">R$ {(fechamento.premio_emitido_bruto || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">2.2 - Inadimplência (&gt;60 dias):</span>
                <span className="font-semibold text-red-600">R$ {(fechamento.inadimplencia || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 bg-blue-50 px-3 rounded">
                <span className="font-semibold text-blue-900">2.3 - Prêmio Arrecadado Líquido:</span>
                <span className="font-bold text-blue-600">R$ {(fechamento.premio_arrecadado_liquido || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 3 - Sinistros */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Seção 3 - Sinistros</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">3.1 - Sinistros Avisados (informativo):</span>
                <span className="font-semibold">R$ {(fechamento.sinistros_avisados || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 bg-orange-50 px-3 rounded">
                <span className="font-semibold text-orange-900">3.2 - Sinistros Pagos:</span>
                <span className="font-bold text-orange-600">R$ {(fechamento.sinistros_pagos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 4 - Remuneração Seguradora */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Seção 4 - IOF e Critérios TPA</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">4.1 - Remuneração Mínima (10.38%):</span>
                <span className="font-semibold">R$ {(fechamento.remuneracao_minima_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">4.2 - IOF do Mês + 20% sobre Sinistros Pagos:</span>
                <span className="font-semibold">R$ {(fechamento.remuneracao_sinistralidade_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 bg-purple-50 px-3 rounded">
                <span className="font-semibold text-purple-900">4.3 - TPA aplicada:</span>
                <span className="font-bold text-purple-600">R$ {(fechamento.remuneracao_aplicada_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">4.4 - Recuperação de Sinistros:</span>
                <span className="font-semibold">R$ {(fechamento.sinistros_pagos || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 bg-purple-50 px-3 rounded">
                <span className="font-semibold text-purple-900">4.5 - Total Repasse OON (4.3 + 4.4):</span>
                <span className="font-bold text-purple-600">R$ {((fechamento.remuneracao_aplicada_seguradora || 0) + (fechamento.sinistros_pagos || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 5 - Remuneração MGA */}
        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>Seção 5 - Remuneração da MGA</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">5.1 - Comissão MGA ({fechamento.percentual_comissao_mga}%):</span>
                <span className="font-semibold">R$ {(fechamento.comissao_fixa_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">5.2 - Profit Sharing:</span>
                <span className="font-semibold">R$ {(fechamento.lucro_operacional || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>

              <div className="flex justify-between py-2 bg-green-50 px-3 rounded">
                <span className="font-semibold text-green-900">5.3 - Remuneração Total MGA (5.1 + 5.2):</span>
                <span className="font-bold text-green-600">R$ {(fechamento.remuneracao_total_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 6 - Capital de Risco */}
        <Card className="border-2 border-amber-200">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 border-b">
            <CardTitle className="text-xl">Seção 6 - Capital de Risco (CR)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">6.1 - Capital Aportado:</span>
                <span className="font-semibold">R$ {(fechamento.cr_capital_aportado || 50000).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">6.2 - Necessidade de CR (1,12 × √[(0,17 × Prêmios)² + (0,44 × Sinistros)²]):</span>
                <span className="font-semibold">R$ {(fechamento.cr_necessidade_capital || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">6.3 - Saldo de CR (positivo):</span>
                <span className={`font-semibold ${fechamento.cr_saldo_positivo > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                  R$ {(fechamento.cr_saldo_positivo || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-slate-700">6.4 - Necessidade de Aporte (negativo):</span>
                <span className={`font-semibold ${fechamento.cr_necessidade_aporte > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  R$ {(fechamento.cr_necessidade_aporte || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
              <div className="flex justify-between py-2 bg-amber-50 px-3 rounded">
                <span className="font-semibold text-amber-900">6.5 - CR Atualizado:</span>
                <span className="font-bold text-amber-700">R$ {(fechamento.cr_atualizado || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 7 - Resultado Final */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50 border-b">
            <CardTitle className="text-xl">Seção 7 - Resultado Final</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-2">7.1 - Saldo Técnico Líquido</p>
                <p className="text-2xl font-bold text-slate-900">
                  R$ {(fechamento.saldo_tecnico_liquido || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-2">7.2 - Repasse Seguradora</p>
                <p className="text-2xl font-bold text-blue-900">
                  R$ {(fechamento.repasse_seguradora || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 mb-2">7.3 - Retenção MGA</p>
                <p className="text-2xl font-bold text-green-900">
                  R$ {(fechamento.retencao_mga || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <SecaoOperacional fechamento={fechamento} />

        {/* Seção 7 - Declaração e Conformidade */}
        <Card className="border-2 border-slate-300">
          <CardHeader className="bg-slate-100 border-b">
            <CardTitle className="text-xl">7. DECLARAÇÃO E CONFORMIDADE</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <p className="text-slate-800 leading-relaxed">
              Declaramos que os valores informados neste borderô refletem, com exatidão, a movimentação de prêmios, sinistros, remunerações e repasses da carteira administrada no período acima indicado, em conformidade com o Contrato de Representação de Seguros (MGA) e com a regulamentação SUSEP aplicável.
            </p>
            <div>
              <p className="font-semibold text-slate-800 mb-6">Assinaturas:</p>
              <div className="grid md:grid-cols-2 gap-12">
                <div className="text-center space-y-2">
                  <div className="border-b-2 border-slate-700 w-4/5 mx-auto mb-1" style={{height: '40px'}} />
                  <p className="font-semibold text-slate-700">Pela REPRESENTANTE (MGA)</p>
                  <p className="text-slate-500 text-sm">Data: ____/____/_____</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="border-b-2 border-slate-700 w-4/5 mx-auto mb-1" style={{height: '40px'}} />
                  <p className="font-semibold text-slate-700">Pela SEGURADORA</p>
                  <p className="text-slate-500 text-sm">Data: ____/____/_____</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Ações */}
        {logs.length > 0 && (
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Histórico de Ações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <User className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">{log.acao}</Badge>
                        <span className="text-sm text-slate-600">
                          {format(new Date(log.created_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{log.usuario_nome}</p>
                      {log.observacao && (
                        <p className="text-sm text-slate-600 mt-1">{log.observacao}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Borderô oculto para exportação PDF */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
        <div ref={borderoRef} style={{ width: '794px', backgroundColor: '#ffffff' }}>
          <BorderoImpressao fechamento={fechamento} />
          <SecaoOperacionalBordero fechamento={fechamento} />
        </div>
      </div>
    </div>
  );
}