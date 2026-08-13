import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Mapeamento manual de correções fixas: id → cpf/cnpj correto
const CORRECOES_MANUAIS = {
  "69dd51f3de966d90cbffcd21": "11026449000145",
  "69d7bce4f2c0b74f30953cc3": "12548585638",
  "69d56a1bd4f13a67f73f1970": "26624317000192",
  "69dd46654c96002eed9b7479": "04069267603",
  "69d7bd2c2b9f92bab53559a3": "26492753000155",
  "69d7bcfdadcd80bdc9090cce": "26492753000155",
  "69d7bc5ca0a54802cd201cbb": "00061482633",
  "69d56a1c7347f838aa74d779": "00076312607",
  "69dd51f1d0a633a836e473a2": "00395899605",
  "69dd51e49b2392ea5da65502": "00514468637",
  "69dd46c664a1d968f269b3e9": "00971277877",
  "69dd4689f6aa257f3edbad59": "00971277877",
  "69dd45e287a88e3f997806cf": "00548000646",
  "69dd45d74b7f017a7df4cf4d": "00647273608",
  "69d92f867974c60a868cf4f1": "00711549575",
  "69d92f383cb3831dd2fc01c0": "00117334626",
  "69d7bcb85c79379389be5e7a": "00809057654",
  "69d7bca63162b826ebfef608": "00637764641",
  "69d7bc861c327c7e425c7d9c": "00546102654",
  "69d7bc733463154243f97d89": "00315217626",
  "69d7bc6d206ac7b69b40dc59": "00315170646",
  "69d56a74940db4e1df3399da": "00363104682",
  "69d56a4656b5d2549bfd9a24": "00741456656",
};

// Normaliza um CPF/CNPJ numérico: pad com zeros à esquerda
function normalizarDoc(value) {
  if (!value) return value;
  const digits = String(value).replace(/[^\d]/g, '');
  if (!digits) return value;
  const len = digits.length;
  if (len <= 11) return digits.padStart(11, '0');
  return digits.padStart(14, '0');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    if (!['admin', 'super_administrador'].includes(user.role) && !['admin', 'super_administrador'].includes(user.perfil_sistema)) {
      return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const relatorio = {
      etapa1_manuais: { total: 0, atualizados: 0, erros: [] },
      etapa2_pad_cpf: { total: 0, atualizados: 0, erros: [] },
      etapa2_pad_cnpj: { total: 0, atualizados: 0, erros: [] },
    };

    // ── Etapa 1: Correções manuais ────────────────────────────────────────────
    console.log('[normalizarCPFCNPJ] Etapa 1 — Correções manuais...');
    for (const [id, cpfCnpjCorreto] of Object.entries(CORRECOES_MANUAIS)) {
      relatorio.etapa1_manuais.total++;
      try {
        await base44.asServiceRole.entities.Apolice.update(id, { id_segurado: cpfCnpjCorreto });
        relatorio.etapa1_manuais.atualizados++;
        console.log(`[Etapa1] OK: ${id} → ${cpfCnpjCorreto}`);
      } catch (e) {
        const msg = `ID ${id}: ${e.message}`;
        relatorio.etapa1_manuais.erros.push(msg);
        console.error(`[Etapa1] ERRO: ${msg}`);
      }
    }

    // ── Etapa 2: Pad automático para CPF (10 dígitos) e CNPJ (13 dígitos) ────
    console.log('[normalizarCPFCNPJ] Etapa 2 — Buscando todas as apólices...');
    const todasApolices = [];
    let skip = 0;
    const limit = 200;
    while (true) {
      const lote = await base44.asServiceRole.entities.Apolice.list(null, limit, skip);
      if (!lote || lote.length === 0) break;
      todasApolices.push(...lote);
      if (lote.length < limit) break;
      skip += limit;
    }
    console.log(`[normalizarCPFCNPJ] Total de apólices: ${todasApolices.length}`);

    // IDs já corrigidos manualmente — pular na etapa 2
    const idsManual = new Set(Object.keys(CORRECOES_MANUAIS));

    for (const apolice of todasApolices) {
      if (idsManual.has(apolice.id)) continue;
      const raw = apolice.id_segurado;
      if (!raw) continue;

      const digits = String(raw).replace(/[^\d]/g, '');
      if (!digits || digits.length === raw.length) {
        // Só processa se o valor for puramente numérico (sem máscaras) e com tamanho incorreto
        if (digits.length !== raw.length) continue;
      }

      // Apenas corrige valores que sejam puramente numéricos com tamanho errado
      if (!/^\d+$/.test(String(raw))) continue;

      const len = digits.length;

      if (len === 10) {
        // CPF com zero faltando
        relatorio.etapa2_pad_cpf.total++;
        const corrigido = digits.padStart(11, '0');
        try {
          await base44.asServiceRole.entities.Apolice.update(apolice.id, { id_segurado: corrigido });
          relatorio.etapa2_pad_cpf.atualizados++;
          console.log(`[Etapa2-CPF] ${apolice.numero_apolice}: "${raw}" → "${corrigido}"`);
        } catch (e) {
          relatorio.etapa2_pad_cpf.erros.push(`${apolice.id}: ${e.message}`);
        }
      } else if (len === 13) {
        // CNPJ com zero faltando
        relatorio.etapa2_pad_cnpj.total++;
        const corrigido = digits.padStart(14, '0');
        try {
          await base44.asServiceRole.entities.Apolice.update(apolice.id, { id_segurado: corrigido });
          relatorio.etapa2_pad_cnpj.atualizados++;
          console.log(`[Etapa2-CNPJ] ${apolice.numero_apolice}: "${raw}" → "${corrigido}"`);
        } catch (e) {
          relatorio.etapa2_pad_cnpj.erros.push(`${apolice.id}: ${e.message}`);
        }
      }
    }

    console.log('[normalizarCPFCNPJ] Concluído.', JSON.stringify(relatorio));
    return Response.json({ sucesso: true, relatorio });

  } catch (error) {
    console.error('[normalizarCPFCNPJ] Erro fatal:', error);
    return Response.json({ sucesso: false, error: error.message }, { status: 500 });
  }
});