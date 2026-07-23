import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { mapeamentos } = await req.json();

        if (!Array.isArray(mapeamentos) || mapeamentos.length === 0) {
            return Response.json({ 
                error: 'Campo mapeamentos deve ser um array não vazio' 
            }, { status: 400 });
        }

        const relatorio = {
            total: mapeamentos.length,
            atualizados: [],
            ignorados: [],
            erros: []
        };

        // Processar cada mapeamento
        for (const map of mapeamentos) {
            const { id_apolice, numero_apolice_novo } = map;

            if (!id_apolice || !numero_apolice_novo) {
                relatorio.erros.push({
                    id_apolice,
                    numero_apolice_novo,
                    erro: 'Campos id_apolice e numero_apolice_novo são obrigatórios'
                });
                continue;
            }

            try {
                // 1. Validar que a apólice existe
                const apoliceExiste = await base44.asServiceRole.entities.Apolice.get(id_apolice);
                if (!apoliceExiste) {
                    relatorio.erros.push({
                        id_apolice,
                        numero_apolice_novo,
                        erro: 'Apólice não encontrada'
                    });
                    continue;
                }

                // 2. Validar que o novo número ainda NÃO existe
                const duplicata = await base44.asServiceRole.entities.Apolice.filter({ 
                    numero_apolice: numero_apolice_novo 
                });

                if (duplicata.length > 0) {
                    relatorio.ignorados.push({
                        id_apolice,
                        numero_apolice_antigo: apoliceExiste.numero_apolice,
                        numero_apolice_novo,
                        motivo: 'Número de apólice já existe no banco'
                    });
                    continue;
                }

                // 3. Atualizar SOMENTE o campo numero_apolice
                await base44.asServiceRole.entities.Apolice.update(id_apolice, {
                    numero_apolice: numero_apolice_novo
                });

                relatorio.atualizados.push({
                    id_apolice,
                    numero_apolice_antigo: apoliceExiste.numero_apolice,
                    numero_apolice_novo
                });

            } catch (error) {
                relatorio.erros.push({
                    id_apolice,
                    numero_apolice_novo,
                    erro: error.message
                });
            }
        }

        return Response.json({
            sucesso: true,
            relatorio
        });

    } catch (error) {
        return Response.json({ 
            sucesso: false,
            error: error.message 
        }, { status: 500 });
    }
});