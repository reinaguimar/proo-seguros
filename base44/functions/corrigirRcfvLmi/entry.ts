import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const toFix = [];
    const fixed = [];
    const semDados = [];

    // Paginar para buscar todos os registros
    let skip = 0;
    const limit = 100;
    let totalBuscados = 0;

    while (true) {
        const lote = await base44.asServiceRole.entities.Apolice.list(null, limit, skip);
        if (!lote || lote.length === 0) break;
        totalBuscados += lote.length;

        for (const apolice of lote) {
            const hasRcfv = (apolice.produtos || []).includes('RCFV');
            if (!hasRcfv) continue;
            if (apolice.rcfv_lmi) continue; // já preenchido, pular

            toFix.push(apolice.numero_apolice);

            // Busca o LMI pela cobertura com id_cobertura === '006' em qualquer posição
            let rcfvLmi = null;
            for (let i = 1; i <= 6; i++) {
                if (apolice[`cobertura_${i}_id_cobertura`] === '006') {
                    const val = apolice[`cobertura_${i}_valor_maximo`];
                    if (val) {
                        rcfvLmi = val;
                        break;
                    }
                }
            }

            if (rcfvLmi) {
                await base44.asServiceRole.entities.Apolice.update(apolice.id, { rcfv_lmi: rcfvLmi });
                fixed.push({ numero: apolice.numero_apolice, rcfv_lmi: rcfvLmi });
            } else {
                semDados.push({ numero: apolice.numero_apolice, motivo: 'Cobertura 006 não encontrada nos campos de cobertura' });
            }
        }

        if (lote.length < limit) break;
        skip += limit;
    }

    return Response.json({
        total_verificadas: totalBuscados,
        total_com_rcfv_sem_lmi: toFix.length,
        total_corrigidas: fixed.length,
        corrigidas: fixed,
        sem_dados_para_correcao: semDados
    });
});