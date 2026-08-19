import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Play, CheckCircle, XCircle, Loader2, AlertCircle,
  FileText, BarChart3, RefreshCw, Info, Download
} from "lucide-react";

// ─── Exemplo de CSV para download ─────────────────────────────────────────────
const baixarExemploCSV = () => {
  const cabecalho = "filial;cpf_segurado;cpf_beneficiario;placa;data_inicio_apolice;data_movimento;valor_lmi;premio_bruto";
  const linhasExemplo = [
    "Proo Matriz;11122233344;11122233344;ABC1D23;01/09/2026;01/09/2026;30000,00;150,00",
    "Proo Matriz;22233344455;22233344455;DEF4G56;01/09/2026;01/09/2026;50000,00;200,00",
    "Proo Filial SP;33344455566;33344455566;GHI7H89;01/09/2026;01/09/2026;30000,00;150,00",
  ];
  const conteudo = [cabecalho, ...linhasExemplo].join("\n");
  const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "modelo_emissao_lote.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── Configurações fixas ────────────────────────────────────────────────────
const CONFIG = {
  aliquota_iof: 0.0738,
  percentual_corretagem: 0.001,
  prazo_em_dias: 30,
};

const PRODUTOS_PADRAO = ["FR", "COL_PARCIAL", "COL_TOTAL", "INCENDIO", "RCFV"];
const RCFV_LMI_PADRAO = 30000;

const COBERTURAS_FIXAS = [
  { id_cobertura: "001", ramo: 31, nome: "Furto",                            percentual: 0.20, produto: "FR" },
  { id_cobertura: "002", ramo: 31, nome: "Roubo",                            percentual: 0.20, produto: "FR" },
  { id_cobertura: "006", ramo: 42, nome: "RCF-V",                            percentual: 0.11, produto: "RCFV" },
  { id_cobertura: "008", ramo: 31, nome: "Colisão Parcial",                  percentual: 0.18, produto: "COL_PARCIAL" },
  { id_cobertura: "009", ramo: 31, nome: "Colisão Total",                    percentual: 0.22, produto: "COL_TOTAL" },
  { id_cobertura: "010", ramo: 31, nome: "Incendio e Fenomenos da Natureza", percentual: 0.09, produto: "INCENDIO" },
];

// ─── Helpers básicos ─────────────────────────────────────────────────────────
const parseBRL = (str) => {
  if (!str) return 0;
  return parseFloat(str.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
};

const parseDate = (str) => {
  if (!str) return "";
  const parts = String(str).trim().split("/");
  if (parts.length !== 3) return "";
  const day = parts[0].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  let year = parts[2];
  if (year.length === 2) year = "20" + year;
  return `${year}-${month}-${day}`;
};

const cleanDoc = (str) => {
  if (!str) return "";
  const digits = str.replace(/[^\d]/g, "");
  // Se tem até 11 dígitos, assume CPF e completa com zeros à esquerda até 11
  // Se tem entre 12 e 14 dígitos, assume CNPJ e completa até 14
  if (digits.length <= 11) return digits.padStart(11, "0");
  return digits.padStart(14, "0");
};

// ─── Normalização de placa ────────────────────────────────────────────────────
const normalizarPlaca = (placa) => {
  if (!placa) return "SEMPLACA";
  const p = String(placa).replace(/[\s\-\.]/g, "").toUpperCase();
  if (!p || p === "SEMPLACAS" || p === "SEM_PLACA" || p === "SEM PLACA") return "SEMPLACA";
  return p;
};

// ─── Identificação de tipo por linha ─────────────────────────────────────────
// ─── Chave de busca: CPF normalizado + Placa normalizada (AND estrito) ────────
const chaveApolice = (cpf, placa) => `${cleanDoc(String(cpf || ""))}|${normalizarPlaca(placa)}`;

const identificarTipoApolice = (linha, mapaApolicesPorChave) => {
  const placa = normalizarPlaca(linha.placa);
  const cpf = cleanDoc(String(linha.cpf_segurado || ""));
  const chave = `${cpf}|${placa}`;
  const alertas = [];
  let tipo = "nova";
  let apoliceOriginal = null;

  const apolicesChave = mapaApolicesPorChave[chave] || [];

  if (apolicesChave.length > 0) {
    // DUPLICATA: mesmo CPF + mesma placa + mesma data de início
    const duplicata = apolicesChave.find(a => a.data_inicio_apolice === linha.data_inicio);

    if (duplicata) {
      return { tipo: "duplicata", apoliceOriginal: duplicata, alertas: [`Duplicata detectada — apólice ${duplicata.numero_apolice} já existe com os mesmos dados`] };
    }

    // VIGÊNCIA SOBREPOSTA: nova emissão inicia antes do término da apólice ativa anterior
    const ativasParaCheck = apolicesChave.filter(a =>
      !a.cancelada_para_revisao && a.status !== "cancelada"
    );

    if (ativasParaCheck.length > 0) {
      const maisRecente = ativasParaCheck.sort((a, b) =>
        new Date(b.data_inicio_apolice) - new Date(a.data_inicio_apolice)
      )[0];

      if (maisRecente && maisRecente.data_fim_apolice && new Date(linha.data_inicio) < new Date(maisRecente.data_fim_apolice)) {
        return {
          tipo: "duplicata",
          apoliceOriginal: maisRecente,
          alertas: [`Vigência sobreposta — a apólice ${maisRecente.numero_apolice} está vigente até ${maisRecente.data_fim_apolice}. A nova emissão inicia em ${linha.data_inicio}, antes do término da anterior. Bloqueada para evitar cobrança em duplicidade na mesma competência.`]
        };
      }
    }

    // RENOVAÇÃO: mesmo CPF + mesma placa, data de início diferente
    const ativas = apolicesChave.filter(a =>
      !a.renovada && !a.cancelada_para_revisao && a.status !== "cancelada"
    );

    if (ativas.length > 0) {
      tipo = "renovacao";
      apoliceOriginal = ativas.sort((a, b) =>
        new Date(b.data_inicio_apolice) - new Date(a.data_inicio_apolice)
      )[0];
    } else {
      tipo = "nova";
      alertas.push("Apólice anterior já renovada/cancelada — será emitida como nova");
    }
  }

  return { tipo, apoliceOriginal, alertas };
};

// ─── Enriquecimento de todas as linhas ───────────────────────────────────────
const enriquecerLinhas = (linhasCSV, todasApolices) => {
  // Monta mapa (cpf|placa) → [apólices] — chave AND estrito: nunca só placa
  const mapa = {};
  for (const a of todasApolices) {
    const chave = chaveApolice(a.id_segurado, a.id_objeto);
    if (!mapa[chave]) mapa[chave] = [];
    mapa[chave].push(a);
  }

  // Detectar entradas duplicadas dentro do próprio CSV (mesma chave cpf+placa)
  const contagemChaves = {};
  for (const l of linhasCSV) {
    const c = chaveApolice(l.cpf_segurado, l.placa);
    contagemChaves[c] = (contagemChaves[c] || 0) + 1;
  }

  return linhasCSV.map(linha => {
    const placaNorm = normalizarPlaca(linha.placa);
    const { tipo, apoliceOriginal, alertas } = identificarTipoApolice(linha, mapa);

    const alertasFinal = [...alertas];
    const chave = chaveApolice(linha.cpf_segurado, linha.placa);
    if (contagemChaves[chave] > 1) {
      alertasFinal.push("Entrada duplicada no CSV (mesmo CPF + placa)");
    }

    return {
      ...linha,
      _placa_norm: placaNorm,
      _tipo: tipo,
      _apoliceOriginal: apoliceOriginal,
      _alertas: alertasFinal,
    };
  });
};

// ─── Parse CSV ────────────────────────────────────────────────────────────────
const parseCSV = (text) => {
  const lines = text.replace(/^\uFEFF/, "").split("\n").filter(l => l.trim());
  return lines.slice(1).map((line, idx) => {
    const cols = line.split(";");
    // CPF/CNPJ: forçar para string e normalizar (cleanDoc lida com notação científica)
    const cpfSeg = cleanDoc(String(cols[1] || "").trim());
    const cpfBen = cleanDoc(String(cols[2] || "").trim());
    return {
      _row: idx + 2,
      filial_nome: (cols[0] || "").trim(),
      cpf_segurado: cpfSeg,
      cpf_beneficiario: cpfBen,
      placa: (cols[3] || "").trim(),
      data_inicio: parseDate((cols[4] || "").trim()),
      data_movimento: parseDate((cols[5] || "").trim()),
      lmi_geral: parseBRL((cols[6] || "").trim()),
      premio_bruto: parseBRL((cols[7] || "").trim()),
    };
  }).filter(r => r.cpf_segurado);
};

// ─── Cálculo de coberturas ────────────────────────────────────────────────────
const calcularCoberturas = (premioBruto, lmiGeral, rcfvLmi, rcfvPreco = 35.90) => {
  // RCF-V é produto de PREÇO FIXO: sai do rateio e cobra o valor configurado na filial.
  const temRCFV = PRODUTOS_PADRAO.includes("RCFV");
  const valorFixoRcfv = temRCFV ? rcfvPreco : 0;
  const distribuivel = Math.round((premioBruto - valorFixoRcfv) * 100) / 100;
  const percentualTotal = COBERTURAS_FIXAS
    .filter(c => c.produto !== "RCFV" && PRODUTOS_PADRAO.includes(c.produto))
    .reduce((s, c) => s + c.percentual, 0);

  return COBERTURAS_FIXAS.map(cobertura => {
    const isSelected = PRODUTOS_PADRAO.includes(cobertura.produto);
    let premio_bruto = 0;
    let valor_maximo = 0;

    if (isSelected) {
      if (cobertura.produto === "RCFV") {
        valor_maximo = rcfvLmi;
        premio_bruto = valorFixoRcfv;
      } else {
        valor_maximo = lmiGeral;
        if (percentualTotal > 0) {
          const rel = cobertura.percentual / percentualTotal;
          premio_bruto = Math.round(distribuivel * rel * 100) / 100;
        }
      }
    }

    const premio_comercial = Math.round((premio_bruto - premio_bruto * CONFIG.aliquota_iof) * 100) / 100;
    const corretagem = Math.round(premio_bruto * CONFIG.percentual_corretagem * 100) / 100;
    const premio_retido = Math.round((premio_comercial - corretagem) * 100) / 100;

    return { id_cobertura: cobertura.id_cobertura, ramo: cobertura.ramo, valor_maximo, id_objeto: "007", premio_bruto, premio_comercial, premio_retido };
  });
};

// NOTA: gerarNumeroApolice foi migrado para server function (evita race condition).
// Mantido como stub apenas para evitar erros de referência — NÃO USAR diretamente.
const gerarNumeroApolice = null; // substituído por base44.functions.invoke('gerarNumeroApolice', ...)

// ─── Gerador de número — renovação ───────────────────────────────────────────
// SEMPLACA: nunca incrementa endorsement (pool compartilhado) — usa novo sequencial da filial
// Placa real: incrementa o endorsement da apólice pai normalmente
const gerarNumeroRenovacao = async (apoliceOriginal, numeroPreCalculado) => {
  if (apoliceOriginal.id_objeto === "SEMPLACA") {
    // Usa o número pré-calculado pelo mesmo mecanismo de novas emissões
    if (!numeroPreCalculado) throw new Error(`Número sequencial não fornecido para renovação SEMPLACA de ${apoliceOriginal.numero_apolice}`);
    return { numero: numeroPreCalculado };
  }

  // Placa real: incrementar endorsement até achar número livre
  const partes = apoliceOriginal.numero_apolice.split(".");
  let ultimoBloco = parseInt(partes[partes.length - 1], 10);
  let numero;
  for (let tentativas = 0; tentativas < 10; tentativas++) {
    ultimoBloco++;
    const novasPartes = [...partes];
    novasPartes[novasPartes.length - 1] = ultimoBloco.toString().padStart(3, "0");
    numero = novasPartes.join(".");
    const existente = await base44.entities.Apolice.filter({ numero_apolice: numero });
    if (!existente.length) break;
    if (tentativas === 9) throw new Error(`Não foi possível gerar número para renovação de ${apoliceOriginal.numero_apolice}`);
  }
  return { numero };
};

// ─── Componente ───────────────────────────────────────────────────────────────
export default function EmissaoLote() {
  const [linhas, setLinhas] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [filialSelecionada, setFilialSelecionada] = useState(null);
  const [status, setStatus] = useState({});
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [carregandoApolices, setCarregandoApolices] = useState(false);
  const fileRef = useRef();
  const pauseRef = useRef(false);

  useEffect(() => {
    base44.entities.Filial.filter({ ativo: true }).then(fs => {
      setFiliais(fs);
      // Pré-selecionar filial padrão do usuário, se existir
      base44.auth.me().then(u => {
        if (u?.filial_id_padrao) {
          const padrao = fs.find(f => f.id === u.filial_id_padrao);
          if (padrao) setFilialSelecionada(padrao);
        }
      }).catch(() => {});
    });
  }, []);

  // Busca TODAS as apólices do banco em uma única chamada (paginada)
  const buscarTodasApolices = async () => {
    const todas = [];
    let skip = 0;
    const limit = 100;
    while (true) {
      const lote = await base44.entities.Apolice.list(null, limit, skip);
      if (!lote || lote.length === 0) break;
      todas.push(...lote);
      if (lote.length < limit) break;
      skip += limit;
    }
    return todas;
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawLinhas = parseCSV(ev.target.result);
      
      // Busca todas as apólices UMA VEZ e enriquece as linhas em memória
      setCarregandoApolices(true);
      const todasApolices = await buscarTodasApolices();
      const linhasEnriquecidas = enriquecerLinhas(rawLinhas, todasApolices);
      setCarregandoApolices(false);

      setLinhas(linhasEnriquecidas);
      const s = {};
      linhasEnriquecidas.forEach((r, i) => { s[i] = { state: "pending" }; });
      setStatus(s);
      setProgresso(0);
    };
    reader.readAsText(file, "UTF-8");
  };

  const encontrarFilial = (nomeFilial) => {
    return filiais.find(f =>
      f.nome.toLowerCase().trim() === nomeFilial.toLowerCase().trim() ||
      f.nome.toLowerCase().includes(nomeFilial.toLowerCase()) ||
      nomeFilial.toLowerCase().includes(f.nome.toLowerCase())
    );
  };

  const emitirApolice = async (row, idx, filialOverride, numeroPreCalculado) => {
    setStatus(prev => ({ ...prev, [idx]: { state: "processing" } }));

    // Duplicatas: ignorar silenciosamente (não é erro, não gera apólice)
    if (row._tipo === "duplicata") {
      setStatus(prev => ({ ...prev, [idx]: { state: "skipped", msg: row._alertas?.[0] || "Apólice já existe com esta data — ignorada" } }));
      return;
    }

    if (!row.placa) {
      setStatus(prev => ({ ...prev, [idx]: { state: "error", msg: "Placa ausente" } }));
      return;
    }
    if (row.premio_bruto <= 0) {
      setStatus(prev => ({ ...prev, [idx]: { state: "error", msg: "Prêmio bruto inválido (R$ 0,00)" } }));
      return;
    }
    if (!row.data_inicio) {
      setStatus(prev => ({ ...prev, [idx]: { state: "error", msg: "Data de início inválida" } }));
      return;
    }

    const filial = filialOverride || encontrarFilial(row.filial_nome);
    if (!filial) {
      setStatus(prev => ({ ...prev, [idx]: { state: "error", msg: `Filial "${row.filial_nome}" não encontrada` } }));
      return;
    }

    const startDate = new Date(row.data_inicio + "T12:00:00");
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + CONFIG.prazo_em_dias);
    const dataFim = endDate.toISOString().split("T")[0];

    // Verificar dupla renovação antes de gerar número
    if (row._tipo === "renovacao" && row._apoliceOriginal) {
      const renovacoesExistentes = await base44.entities.Apolice.filter({ renovacao_de: row._apoliceOriginal.id });
      const renovacaoAtiva = renovacoesExistentes.find(a =>
        a.natureza_movimento !== 'Cancelamento' && a.natureza_movimento !== '03 - Cancelamento'
      );
      if (renovacaoAtiva) {
        setStatus(prev => ({ ...prev, [idx]: { state: "error", msg: `Já renovada: ${renovacaoAtiva.numero_apolice}` } }));
        return;
      }
    }

    let numero, filialId;
    if (row._tipo === "renovacao" && row._apoliceOriginal) {
      // Passa numeroPreCalculado para renovações SEMPLACA; ignorado para placas reais
      const result = await gerarNumeroRenovacao(row._apoliceOriginal, numeroPreCalculado);
      numero = result.numero;
      filialId = filial.id;
    } else {
      // Usa número pré-calculado em lote (sem chamada à server function)
      if (!numeroPreCalculado) throw new Error('Número de apólice não fornecido para emissão em lote');
      numero = numeroPreCalculado;
      filialId = filial.id;
    }

    const rcfvPrecoLote = (() => {
      const m = filial?.rcfv_precos || {};
      const v = m[RCFV_LMI_PADRAO] ?? m[String(RCFV_LMI_PADRAO)];
      return (v === undefined || v === null || v === "") ? 35.90 : Number(v);
    })();
    const coberturas = calcularCoberturas(row.premio_bruto, row.lmi_geral, RCFV_LMI_PADRAO, rcfvPrecoLote);
    const iof_total = Math.round(row.premio_bruto * CONFIG.aliquota_iof * 100) / 100;
    const corretagem = Math.round(row.premio_bruto * CONFIG.percentual_corretagem * 100) / 100;

    const apoliceData = {
      numero_apolice: numero,
      natureza_movimento: "01",
      tipo_movimento: "01",
      valor_corretagem: corretagem,
      iof: iof_total,
      data_inicio_apolice: row.data_inicio,
      data_fim_apolice: dataFim,
      data_inicio_cobertura: row.data_inicio,
      data_fim_cobertura: dataFim,
      id_segurado: cleanDoc(row.cpf_segurado),
      id_beneficiario: cleanDoc(row.cpf_beneficiario),
      seguro_intermitente: true,
      data_movimento: row.data_movimento || row.data_inicio,
      lmi_geral: row.lmi_geral,
      premio_bruto_total: row.premio_bruto,
      produtos: PRODUTOS_PADRAO,
      rcfv_lmi: RCFV_LMI_PADRAO,
      id_objeto: row._placa_norm || row.placa,
      filial_id: filial.id,
      filial_codigo_susep: filial.codigo_susep,
      filial_nome: filial.nome,
      filial_codigo: filial.codigo_filial || '10',
    };

    // ── Dados de renovação (se aplicável) ──────────────────────────────────
    if (row._tipo === "renovacao" && row._apoliceOriginal) {
      const orig = row._apoliceOriginal;
      apoliceData.renovacao_de = orig.id;
      apoliceData.numero_renovacao = (orig.numero_renovacao || 0) + 1;
    }

    coberturas.forEach((c, i) => {
      const p = `cobertura_${i + 1}_`;
      apoliceData[p + "id_cobertura"] = c.id_cobertura;
      apoliceData[p + "ramo"] = c.ramo;
      apoliceData[p + "valor_maximo"] = c.valor_maximo;
      apoliceData[p + "id_objeto"] = c.id_objeto;
      apoliceData[p + "premio_bruto"] = c.premio_bruto;
      apoliceData[p + "premio_comercial"] = c.premio_comercial;
      apoliceData[p + "premio_retido"] = c.premio_retido;
    });

    const novaApolice = await base44.entities.Apolice.create(apoliceData);

    // ── Marcar apólice original como renovada ──────────────────────────────
    if (row._tipo === "renovacao" && row._apoliceOriginal) {
      await base44.entities.Apolice.update(row._apoliceOriginal.id, {
        renovada: true,
        id_apolice_renovacao: novaApolice.id,
        data_renovacao: new Date().toISOString().split("T")[0],
      });
    }

    setStatus(prev => ({ ...prev, [idx]: { state: "ok", numero, tipo: row._tipo } }));
  };

  const iniciarEmissao = async () => {
    setRodando(true);
    pauseRef.current = false;
    let done = 0;

    // ── Pré-calcular todos os números sequenciais em memória (1 leitura) ──────
    const filial = filialSelecionada;
    const ano = new Date().getFullYear();
    const codigoSusep = filial.codigo_susep;
    const codigoFilial = (filial.codigo_filial || '10').toUpperCase();

    // Buscar sequencial atual da entidade SequencialApolice (1 chamada)
    let sequencialBase = 0;
    let seqRegistroId = null;
    try {
      const regs = await base44.entities.SequencialApolice.filter({ filial_id: filial.id, ano });
      if (regs && regs.length > 0) {
        sequencialBase = regs[0].ultimo_sequencial || 0;
        seqRegistroId = regs[0].id;
      } else {
        // Criar registro se não existir
        const novo = await base44.entities.SequencialApolice.create({ filial_id: filial.id, ano, ultimo_sequencial: 0 });
        seqRegistroId = novo.id;
      }
    } catch (e) {
      console.warn('Erro ao buscar SequencialApolice, usando filial.ultimo_numero_sequencial:', e);
      sequencialBase = filial.ultimo_numero_sequencial || 0;
    }

    // Gerar mapa de índice → numero_apolice para:
    //   - linhas NOVAS (sempre)
    //   - renovações SEMPLACA (nunca incrementam endorsement do pai)
    const numerosPreCalculados = {};
    let seq = sequencialBase;
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      if (linha._tipo === 'duplicata') continue;
      const ehNova = linha._tipo === 'nova';
      const ehRenovacaoSemplaca = linha._tipo === 'renovacao' && linha._apoliceOriginal?.id_objeto === 'SEMPLACA';
      if (ehNova || ehRenovacaoSemplaca) {
        seq++;
        // Renovação SEMPLACA: endorsement sempre .001 (novo número limpo)
        // Nova emissão: endorsement baseado no histórico do objeto na filial
        let vvv = '001';
        if (ehNova) {
          const apolicesDoObjeto = await base44.entities.Apolice.filter({ id_objeto: linha._placa_norm || linha.placa, filial_id: filial.id }).catch(() => []);
          vvv = ((apolicesDoObjeto.length || 0) + 1).toString().padStart(3, '0');
        }
        const nnnnnn = seq.toString().padStart(6, '0');
        numerosPreCalculados[i] = `${codigoSusep}.${ano}.${codigoFilial}.031.${nnnnnn}.${vvv}`;
      }
    }
    const ultimoSeqUsado = seq;
    // ────────────────────────────────────────────────────────────────────────

    for (let i = 0; i < linhas.length; i++) {
      if (pauseRef.current) break;
      if (status[i]?.state === "ok") { done++; continue; }
      try {
        await emitirApolice(linhas[i], i, filial, numerosPreCalculados[i]);
      } catch (e) {
        setStatus(prev => ({ ...prev, [i]: { state: "error", msg: e.message || "Erro desconhecido" } }));
      }
      done++;
      setProgresso(Math.round((done / linhas.length) * 100));
      await new Promise(r => setTimeout(r, 150));
    }

    // ── Atualizar SequencialApolice e Filial com o último seq usado (1 escrita) ─
    if (ultimoSeqUsado > sequencialBase) {
      if (seqRegistroId) {
        await base44.entities.SequencialApolice.update(seqRegistroId, { ultimo_sequencial: ultimoSeqUsado }).catch(() => {});
      }
      await base44.entities.Filial.update(filial.id, { ultimo_numero_sequencial: ultimoSeqUsado }).catch(() => {});
    }

    setRodando(false);
  };

  const pararEmissao = () => { pauseRef.current = true; };

  const reprocessarErros = () => {
    setStatus(prev => {
      const novo = { ...prev };
      Object.keys(novo).forEach(k => {
        if (novo[k].state === "error") novo[k] = { state: "pending" };
      });
      return novo;
    });
  };

  const total = linhas.length;
  const emitidas = Object.values(status).filter(s => s.state === "ok").length;
  const erros = Object.values(status).filter(s => s.state === "error").length;
  const skipped = Object.values(status).filter(s => s.state === "skipped").length;
  // Pendentes: apenas linhas não-duplicatas que ainda não foram processadas
  const pendentes = linhas.filter((l, i) => l._tipo !== "duplicata" && (!status[i] || status[i].state === "pending")).length;
  const totalRenovacoes = linhas.filter(l => l._tipo === "renovacao").length;
  const totalNovas = linhas.filter(l => l._tipo === "nova").length;
  const totalDuplicatas = linhas.filter(l => l._tipo === "duplicata").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Emissão em Lote</h1>
          <p className="text-sm text-slate-500">Importe um CSV — novas emissões e renovações identificadas automaticamente</p>
        </div>
      </div>

      {/* Produtos fixos */}
      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">Produtos que serão contratados em todas as apólices:</p>
          <div className="flex flex-wrap gap-2">
            {["Furto e Roubo", "Colisão Parcial", "Colisão Total", "Incêndio e Fenômenos da Natureza", "RCF-V — LMI R$ 30.000,00"].map(p => (
              <Badge key={p} className="bg-blue-600 text-white text-xs">{p}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Selecione o arquivo CSV</CardTitle></CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">Clique para selecionar o CSV</p>
            <p className="text-xs text-slate-400 mt-1">Formato: filial;CPF segurado;CPF beneficiario;Placa;data inicio apolice;data do movimento;valor lmi;premio bruto</p>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </div>

          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={baixarExemploCSV} className="gap-2">
              <Download className="w-4 h-4" /> Baixar exemplo de CSV
            </Button>
          </div>

          {carregandoApolices && (
            <div className="flex items-center gap-2 mt-3 text-sm text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              Identificando novas emissões e renovações...
            </div>
          )}

          {total > 0 && !carregandoApolices && (
            <div className="flex flex-wrap gap-3 mt-3 items-center">
              <p className="text-sm text-green-700 font-medium">✓ {total} linhas carregadas</p>
              <Badge className="bg-green-100 text-green-700">{totalNovas} Nova{totalNovas !== 1 ? "s" : ""}</Badge>
              <Badge className="bg-purple-100 text-purple-700">{totalRenovacoes} Renovaç{totalRenovacoes !== 1 ? "ões" : "ão"}</Badge>
              {totalDuplicatas > 0 && <Badge className="bg-red-100 text-red-700">{totalDuplicatas} Duplicata{totalDuplicatas !== 1 ? "s" : ""} — bloqueada{totalDuplicatas !== 1 ? "s" : ""}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo + Ações */}
      {total > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-500" />
                <div><p className="text-xl font-bold text-slate-800">{total}</p><p className="text-xs text-slate-500">Total</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <div><p className="text-xl font-bold text-green-700">{emitidas}</p><p className="text-xs text-slate-500">Emitidas</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-400" />
                <div><p className="text-xl font-bold text-red-600">{erros}</p><p className="text-xs text-slate-500">Com Erro</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-slate-400" />
                <div><p className="text-xl font-bold text-slate-600">{pendentes}</p><p className="text-xs text-slate-500">Pendentes</p></div>
              </CardContent>
            </Card>
            <Card className={totalDuplicatas > 0 ? "border-orange-200 bg-orange-50" : ""}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <AlertCircle className={`w-6 h-6 ${totalDuplicatas > 0 ? "text-orange-500" : "text-slate-300"}`} />
                <div><p className={`text-xl font-bold ${totalDuplicatas > 0 ? "text-orange-600" : "text-slate-400"}`}>{totalDuplicatas}</p><p className="text-xs text-slate-500">Duplicatas</p></div>
              </CardContent>
            </Card>
          </div>

          {/* Bloco de confirmação de filial */}
          <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 mb-3">Confirme a Filial Emissora</p>
                <div className="flex flex-wrap gap-3 mb-3">
                  {filiais.map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFilialSelecionada(f)}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        filialSelecionada?.id === f.id
                          ? "border-blue-600 bg-blue-600 text-white shadow-md"
                          : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"
                      }`}
                    >
                      {f.nome} — Código {f.codigo_filial || "—"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-amber-700">
                  Todas as {total} apólices desta emissão serão registradas sob a filial selecionada. Esta ação não pode ser desfeita após a emissão.
                </p>
              </div>
            </div>
          </div>

          {rodando && (
            <div className="w-full bg-slate-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progresso}%` }} />
            </div>
          )}

          <div className="flex gap-3">
            {!rodando ? (
              <Button
                onClick={iniciarEmissao}
                disabled={pendentes === 0 || !filialSelecionada}
                className={`gap-2 ${filialSelecionada ? "bg-green-600 hover:bg-green-700" : "bg-slate-300 cursor-not-allowed"}`}
              >
                <Play className="w-4 h-4" />
                {emitidas === 0 ? "Iniciar Emissão" : "Continuar Emissão"}{filialSelecionada ? ` — ${filialSelecionada.nome}` : ""}
              </Button>
            ) : (
              <Button onClick={pararEmissao} variant="outline" className="gap-2">
                <AlertCircle className="w-4 h-4" />
                Pausar
              </Button>
            )}
            {erros > 0 && !rodando && (
              <Button variant="outline" onClick={reprocessarErros} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Tentar reprocessar erros ({erros})
              </Button>
            )}
          </div>

          {/* Tabela de preview/resultado */}
          <Card>
            <CardHeader><CardTitle className="text-base">Detalhamento por linha</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b text-left">
                    <th className="px-3 py-2 font-semibold text-slate-600 w-8">#</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Tipo</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">CPF Segurado</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Placa</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">LMI</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Prêmio Bruto</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Status</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Alertas / Nº Apólice</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((row, i) => {
                    const s = status[i] || { state: "pending" };
                    const temAlerta = row._alertas?.length > 0;
                    return (
                      <tr key={i} className={`border-b hover:bg-slate-50/50 ${s.state === "error" ? "bg-red-50" : s.state === "ok" ? "bg-green-50/40" : ""}`}>
                        <td className="px-3 py-2 text-slate-400">{row._row}</td>
                        <td className="px-3 py-2">
                          {row._tipo === "duplicata"
                            ? <Badge title="Apólice já existente ou com vigência sobreposta à parcela anterior — bloqueada para evitar cobrança em duplicidade" className="bg-orange-100 text-orange-700 text-xs border border-orange-300 cursor-help">⚠ Duplicata</Badge>
                            : row._tipo === "renovacao"
                            ? <Badge className="bg-purple-100 text-purple-700 text-xs">Renovação</Badge>
                            : <Badge className="bg-green-100 text-green-700 text-xs">Nova</Badge>
                          }
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{row.cpf_segurado}</td>
                        <td className="px-3 py-2 font-mono font-semibold">{row._placa_norm || row.placa || <span className="text-red-400 italic">ausente</span>}</td>
                        <td className="px-3 py-2">{row.lmi_geral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        <td className="px-3 py-2">{row.premio_bruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        <td className="px-3 py-2">
                          {s.state === "pending" && <Badge variant="outline" className="text-slate-500">Pendente</Badge>}
                          {s.state === "processing" && <Badge className="bg-blue-100 text-blue-700 gap-1"><Loader2 className="w-3 h-3 animate-spin" />Emitindo...</Badge>}
                          {s.state === "ok" && <Badge className="bg-green-100 text-green-700">✓ Emitida</Badge>}
                          {s.state === "error" && <Badge className="bg-red-100 text-red-700">✗ Erro</Badge>}
                          {s.state === "skipped" && <Badge className="bg-orange-100 text-orange-700">⊘ Ignorada</Badge>}
                        </td>
                        <td className="px-3 py-2 text-xs max-w-xs">
                          {s.state === "ok" && <span className="text-green-700 font-mono">{s.numero}</span>}
                          {s.state === "error" && <span className="text-red-600">{s.msg}</span>}
                          {s.state !== "ok" && s.state !== "error" && temAlerta && (
                            <div className="flex flex-col gap-1">
                              {row._alertas.map((a, ai) => (
                                <span key={ai} className="flex items-center gap-1 text-amber-600">
                                  <Info className="w-3 h-3 flex-shrink-0" />{a}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}