/**
 * gerarNumeroApolice — SINGLE SOURCE OF TRUTH para geração de números de apólice.
 *
 * Esta é a ÚNICA função autorizada a gerar números de apólice no sistema.
 * Nenhum código de frontend ou outra server function deve calcular numero_apolice diretamente.
 *
 * Garante unicidade usando:
 *   1. Entidade SequencialApolice como contador por filial/ano (atualizada atomicamente aqui).
 *   2. Verificação de duplicata na entidade Apolice antes de retornar.
 *   3. Retry com até MAX_TENTATIVAS incrementos em caso de colisão (race condition).
 *
 * Formato: SUSEP.AAAA.CC.031.NNNNNN.VVV
 *   SUSEP   = código SUSEP da filial (ex: 110627)
 *   AAAA    = ano atual (ex: 2026)
 *   CC      = código da filial (ex: 10)
 *   031     = fixo (código de ramo)
 *   NNNNNN  = sequencial zero-padded 6 dígitos (ex: 000523)
 *   VVV     = versão/endosso zero-padded 3 dígitos (ex: 001)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAX_TENTATIVAS = 10;

async function registrarErro(base44, funcao, error, user, req) {
  try {
    await base44.asServiceRole.entities.LogErro.create({
      funcao,
      mensagem: error.message || String(error),
      stack: error.stack || '',
      usuario_id: user?.id || 'desconhecido',
      usuario_email: user?.email || '',
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
      contexto: JSON.stringify({ timestamp: new Date().toISOString() }),
      resolvido: false
    });
  } catch (e) {
    console.error('[registrarErro] Falha ao salvar LogErro:', e);
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { filial_id, id_objeto, filial_codigo_susep, versao } = await req.json();

    if (!filial_id) {
      return Response.json({ error: 'filial_id é obrigatório' }, { status: 400 });
    }

    // Buscar dados da filial
    const filial = await base44.asServiceRole.entities.Filial.get(filial_id);
    if (!filial) {
      return Response.json({ error: 'Filial não encontrada' }, { status: 404 });
    }

    const codigoSusep = filial_codigo_susep || filial.codigo_susep;
    const codigoFilial = (filial.codigo_filial || '10').toUpperCase();
    const ano = new Date().getFullYear();

    // Buscar ou criar registro SequencialApolice para filial+ano
    let registros = await base44.asServiceRole.entities.SequencialApolice.filter({ filial_id, ano });
    let registro;
    if (!registros || registros.length === 0) {
      registro = await base44.asServiceRole.entities.SequencialApolice.create({
        filial_id,
        ano,
        ultimo_sequencial: 0
      });
    } else {
      registro = registros[0];
    }

    // Calcular VVV (versão) — baseado em apólices existentes para o mesmo id_objeto + filial
    let vvv = versao || '001';
    if (id_objeto && !versao) {
      const apolicesDoObjeto = await base44.asServiceRole.entities.Apolice.filter({ id_objeto, filial_id });
      vvv = ((apolicesDoObjeto.length || 0) + 1).toString().padStart(3, '0');
    }

    // Buscar sequencial mais atualizado a cada tentativa (evita conflito sob carga)
    let numeroGerado = null;
    let candidato = 0;

    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
      if (tentativa > 0) await sleep(50);

      // Reler registro atual para pegar o valor mais recente
      const regs = await base44.asServiceRole.entities.SequencialApolice.filter({ filial_id, ano });
      registro = regs?.[0] || registro;

      candidato = (registro.ultimo_sequencial || 0) + 1;
      const nnnnnn = candidato.toString().padStart(6, '0');
      const numero = `${codigoSusep}.${ano}.${codigoFilial}.031.${nnnnnn}.${vvv}`;

      // Verificar duplicata na entidade Apolice
      const existentes = await base44.asServiceRole.entities.Apolice.filter({ numero_apolice: numero });
      if (!existentes || existentes.length === 0) {
        await base44.asServiceRole.entities.SequencialApolice.update(registro.id, {
          ultimo_sequencial: candidato
        });
        numeroGerado = numero;
        break;
      }
      console.warn(`[gerarNumeroApolice] Colisão no sequencial ${candidato} (${numero}). Tentativa ${tentativa + 1}/${MAX_TENTATIVAS}`);
      await base44.asServiceRole.entities.SequencialApolice.update(registro.id, {
        ultimo_sequencial: candidato
      });
    }

    if (!numeroGerado) {
      return Response.json({
        sucesso: false,
        error: `Falha ao gerar número sequencial após ${MAX_TENTATIVAS} tentativas — tente novamente`
      }, { status: 500 });
    }

    await base44.asServiceRole.entities.Filial.update(filial_id, {
      ultimo_numero_sequencial: candidato
    });

    return Response.json({
      sucesso: true,
      numero_apolice: numeroGerado,
      sequencial_usado: candidato,
      filial_id,
      filial_codigo: codigoFilial,
      filial_codigo_susep: codigoSusep
    });

  } catch (error) {
    console.error('[gerarNumeroApolice] Erro:', error);
    try {
      const b = createClientFromRequest(req);
      const u = await b.auth.me().catch(() => null);
      await registrarErro(b, 'gerarNumeroApolice', error, u, req);
    } catch (_) {}
    return Response.json({ sucesso: false, error: error.message }, { status: 500 });
  }
});