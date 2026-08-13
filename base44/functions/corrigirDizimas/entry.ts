import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const round2 = (v) => Math.round((v || 0) * 100) / 100;

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
        return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const apolices = await base44.asServiceRole.entities.Apolice.list('-created_date', 5000);

    let corrigidas = 0;
    let sem_correcao = 0;

    for (const apolice of apolices) {
        const updates = {};
        let precisaCorrigir = false;

        for (let i = 1; i <= 6; i++) {
            const key = `cobertura_${i}_premio_retido`;
            const val = apolice[key];
            if (val !== undefined && val !== null) {
                const rounded = round2(val);
                if (rounded !== val) {
                    updates[key] = rounded;
                    precisaCorrigir = true;
                }
            }
        }

        if (precisaCorrigir) {
            await base44.asServiceRole.entities.Apolice.update(apolice.id, updates);
            corrigidas++;
        } else {
            sem_correcao++;
        }
    }

    return Response.json({
        sucesso: true,
        total_verificadas: apolices.length,
        corrigidas,
        sem_correcao
    });
});