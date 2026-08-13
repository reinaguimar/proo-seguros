import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

export default function ConciliacaoFinanceira() {
  const [competencia, setCompetencia] = useState("");
  const [arquivoAtivos, setArquivoAtivos] = useState(null);
  const [arquivoInadimplentes, setArquivoInadimplentes] = useState(null);
  const [arquivoCancelados, setArquivoCancelados] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [loteAtual, setLoteAtual] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");

  // Detectar coluna CPF/CNPJ
  const detectarColunaCpfCnpj = (headers) => {
    return headers.find(h => 
      h && /CPF|CNPJ/i.test(String(h))
    );
  };

  // Detectar coluna Placa
  const detectarColunaPlaca = (headers) => {
    return headers.find(h => 
      h && /PLACA/i.test(String(h))
    );
  };

  // Função para encontrar linha do cabeçalho
  const encontrarLinhaHeader = (sheet) => {
    const range = XLSX.utils.decode_range(sheet['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; R++) {
      const row = [];
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellAddress];
        row.push(cell ? String(cell.v) : '');
      }
      
      const textoCompleto = row.join(' ').toUpperCase();
      const temCpfCnpj = /CPF|CNPJ/.test(textoCompleto);
      const temPlaca = /PLACA/.test(textoCompleto);
      
      if (temCpfCnpj && temPlaca) {
        return { linhaHeader: R, headers: row };
      }
    }
    
    return null;
  };

  // Parsear Excel com detecção de cabeçalho
  const parseExcel = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Encontrar linha do cabeçalho
    const headerInfo = encontrarLinhaHeader(worksheet);
    
    if (!headerInfo) {
      throw new Error(`Não foi possível encontrar o cabeçalho (CPF/CNPJ e Placa) no arquivo ${file.name}`);
    }
    
    const { linhaHeader, headers } = headerInfo;
    
    // Detectar colunas
    const colunaCpf = detectarColunaCpfCnpj(headers);
    const colunaPlaca = detectarColunaPlaca(headers);
    
    if (!colunaCpf && !colunaPlaca) {
      throw new Error(`Não foi possível detectar as colunas CPF/CNPJ ou Placa no arquivo ${file.name}`);
    }
    
    // Ler dados a partir da linha após o cabeçalho
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const dados = [];
    
    for (let R = linhaHeader + 1; R <= range.e.r; R++) {
      const row = {};
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const headerCell = XLSX.utils.encode_cell({ r: linhaHeader, c: C });
        const cell = worksheet[cellAddress];
        const headerName = worksheet[headerCell] ? String(worksheet[headerCell].v) : '';
        
        if (headerName && cell) {
          row[headerName] = cell.v;
        }
      }
      
      // Extrair CPF e Placa
      const cpfCnpj = colunaCpf ? row[colunaCpf] : null;
      const placa = colunaPlaca ? row[colunaPlaca] : null;
      
      dados.push({
        cpf_cnpj: cpfCnpj,
        placa: placa
      });
    }
    
    console.log(`Arquivo ${file.name}: ${dados.length} linhas lidas após cabeçalho`);
    
    return dados;
  };

  const handleProcessar = async () => {
    try {
      setProcessando(true);
      setResultado(null);
      
      // Validar competência
      if (!competencia || !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia)) {
        alert('Competência inválida. Use formato YYYY-MM (ex: 2025-12)');
        setProcessando(false);
        return;
      }
      
      // Parsear arquivos
      const planilhas = {
        ativos: arquivoAtivos ? await parseExcel(arquivoAtivos) : [],
        inadimplentes: arquivoInadimplentes ? await parseExcel(arquivoInadimplentes) : [],
        cancelados: arquivoCancelados ? await parseExcel(arquivoCancelados) : []
      };
      
      console.log('Planilhas parseadas:', {
        ativos: planilhas.ativos.length,
        inadimplentes: planilhas.inadimplentes.length,
        cancelados: planilhas.cancelados.length
      });
      
      // Enviar para backend
      const response = await base44.functions.invoke('iniciarConciliacao', {
        competencia,
        planilhas
      });
      
      if (response.data.sucesso) {
        setResultado(response.data);
        await carregarResultados(response.data.lote_id);
      } else {
        alert('Erro: ' + response.data.erro);
      }
      
    } catch (error) {
      console.error('Erro ao processar:', error);
      
      if (error.response?.status === 404) {
        alert('❌ ERRO 404: A função backend não está deployada.\n\n' +
              '📋 SOLUÇÃO:\n' +
              '1. Abra uma nova aba do navegador\n' +
              '2. Vá para: Dashboard → Code → Functions\n' +
              '3. Encontre "iniciarConciliacao"\n' +
              '4. Clique no botão "Deploy" ou "Redeploy"\n' +
              '5. Aguarde até aparecer "Successfully deployed"\n' +
              '6. Volte aqui e tente novamente\n\n' +
              'Se a função não aparecer na lista, me avise!');
      } else {
        alert('Erro ao processar: ' + error.message);
      }
    } finally {
      setProcessando(false);
    }
  };

  const carregarResultados = async (loteId) => {
    try {
      const [lote, dados] = await Promise.all([
        base44.entities.LoteConciliacao.filter({ id: loteId }),
        base44.entities.ConciliacaoResultado.filter({ lote_id: loteId }, '-created_date', 1000)
      ]);
      
      setLoteAtual(lote[0]);
      setResultados(dados);
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
    }
  };

  const resultadosFiltrados = resultados.filter(r => {
    const matchStatus = filtroStatus === 'todos' || r.status_financeiro === filtroStatus;
    const matchBusca = !busca || 
      r.numero_apolice?.toLowerCase().includes(busca.toLowerCase()) ||
      r.cpf_cnpj_normalizado?.includes(busca) ||
      r.placa_normalizada?.toLowerCase().includes(busca.toLowerCase());
    
    return matchStatus && matchBusca;
  });

  const getBadgeColor = (status) => {
    const colors = {
      ativo: 'bg-green-100 text-green-800',
      inadimplente: 'bg-yellow-100 text-yellow-800',
      cancelado: 'bg-red-100 text-red-800',
      pago: 'bg-blue-100 text-blue-800',
      nao_classificado: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || '';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Conciliação Financeira</h1>
      </div>

      {/* Formulário de Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Importar Planilhas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Competência (formato: YYYY-MM)
            </label>
            <Input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              placeholder="2025-12"
              required
            />
            {competencia && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Será enviado: {competencia}
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                <FileSpreadsheet className="inline w-4 h-4 mr-1" />
                Planilha Ativos
              </label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setArquivoAtivos(e.target.files[0])}
              />
              {arquivoAtivos && (
                <p className="text-xs text-green-600 mt-1">✓ {arquivoAtivos.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <FileSpreadsheet className="inline w-4 h-4 mr-1" />
                Planilha Inadimplentes
              </label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setArquivoInadimplentes(e.target.files[0])}
              />
              {arquivoInadimplentes && (
                <p className="text-xs text-green-600 mt-1">✓ {arquivoInadimplentes.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <FileSpreadsheet className="inline w-4 h-4 mr-1" />
                Planilha Cancelados
              </label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setArquivoCancelados(e.target.files[0])}
              />
              {arquivoCancelados && (
                <p className="text-xs text-green-600 mt-1">✓ {arquivoCancelados.name}</p>
              )}
            </div>
          </div>

          <Button 
            onClick={handleProcessar} 
            disabled={processando || !competencia}
            className="w-full"
          >
            {processando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Conciliar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && loteAtual && (
        <>
          {/* Totalizadores */}
          <div className="grid md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{loteAtual.total_ativo}</p>
                  <p className="text-sm text-gray-600">Ativo</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{loteAtual.total_inadimplente}</p>
                  <p className="text-sm text-gray-600">Inadimplente</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{loteAtual.total_cancelado}</p>
                  <p className="text-sm text-gray-600">Cancelado</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{loteAtual.total_pago}</p>
                  <p className="text-sm text-gray-600">Pago</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-600">{loteAtual.total_nao_classificado}</p>
                  <p className="text-sm text-gray-600">Não Classificado</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {loteAtual.alertas && loteAtual.alertas.length > 0 && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                {loteAtual.alertas.map((alerta, i) => (
                  <div key={i}>{alerta}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inadimplente">Inadimplente</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="nao_classificado">Não Classificado</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Buscar por apólice, CPF ou placa"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número Apólice</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Sequência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultadosFiltrados.slice(0, 100).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.numero_apolice}</TableCell>
                        <TableCell className="font-mono text-sm">{r.cpf_cnpj_normalizado}</TableCell>
                        <TableCell className="font-mono text-sm">{r.placa_normalizada}</TableCell>
                        <TableCell>
                          <Badge className={getBadgeColor(r.status_financeiro)}>
                            {r.status_financeiro}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.fonte_status}</TableCell>
                        <TableCell className="text-sm">
                          {r.sequencia_no_grupo}/{r.total_apolices_no_grupo}
                          {r.eh_mais_recente_do_grupo && (
                            <CheckCircle2 className="inline w-4 h-4 ml-1 text-green-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {resultadosFiltrados.length > 100 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Mostrando 100 de {resultadosFiltrados.length} registros
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}