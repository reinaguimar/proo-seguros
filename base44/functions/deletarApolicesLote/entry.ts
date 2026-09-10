import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// EXCLUSÃO DE APÓLICES EM LOTE
// Apenas super_administrador pode executar. Deleta múltiplas apólices,
// decrementa contadores das filiais e registra trilha de auditoria.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({
                sucesso: false,
                erro: 'Usuário não autenticado'
            }, { status: 401 });
        }

        // Buscar perfil do usuário
        const perfis = await base44.asServiceRole.entities.Perfil.filter({ id: user.perfil_id });
        const perfilNome = perfis.length > 0 ? perfis[0].nome : null;

        // APENAS SUPER ADMINISTRADOR pode deletar permanentemente
        if (perfilNome !== 'super_administrador') {
            return Response.json({
                sucesso: false,
                erro: 'Apenas o Super Administrador pode deletar apólices em lote'
            }, { status: 403 });
        }

        const { ids_apolices, motivo } = await req.json();

        if (!Array.isArray(ids_apolices) || ids_apolices.length === 0) {
            return Response.json({ sucesso: false, erro: 'Lista de IDs é obrigatória' }, { status: 400 });
        }

        if (!motivo || !motivo.trim()) {
            return Response.json({ sucesso: false, erro: 'Motivo da exclusão em lote é obrigatório' }, { status: 400 });
        }

        const deletadas = [];
        const falhas = [];
        const filiaisParaDecrementar = {};

        for (const id_apolice of ids_apolices) {
            try {
                const apoliceArr = await base44.asServiceRole.entities.Apolice.filter({ id: id_apolice });
                if (!apoliceArr || apoliceArr.length === 0) {
                    falhas.push({ id: id_apolice, erro: 'Apólice não encontrada' });
                    continue;
                }

                const apolice = apoliceArr[0];
                const backup = JSON.parse(JSON.stringify(apolice));

                await base44.asServiceRole.entities.Apolice.delete(id_apolice);

                // Acumular decremento por filial
                if (apolice.filial_id) {
                    if (!filiaisParaDecrementar[apolice.filial_id]) {
                        filiaisParaDecrementar[apolice.filial_id] = 0;
                    }
                    filiaisParaDecrementar[apolice.filial_id] += 1;
                }

                // Registrar trilha de auditoria
                await base44.asServiceRole.entities.LogDelecao.create({
                    tipo_entidade: 'Apolice',
                    id_registro: id_apolice,
                    id_registro_alternativo: apolice.numero_apolice || null,
                    usuario_id: user.id,
                    usuario_email: user.email,
                    usuario_nome: user.full_name || user.email,
                    motivo_delecao: `Exclusão em lote: ${motivo.trim()}`,
                    data_delecao: new Date().toISOString(),
                    dados_backup: backup
                });

                deletadas.push({
                    id: id_apolice,
                    numero_apolice: apolice.numero_apolice
                });
            } catch (err) {
                falhas.push({ id: id_apolice, erro: err.message });
            }
        }

        // Decrementar contadores das filiais
        for (const [filialId, quantidade] of Object.entries(filiaisParaDecrementar)) {
            try {
                const filiais = await base44.asServiceRole.entities.Filial.filter({ id: filialId });
                if (filiais.length > 0) {
                    const novoTotal = Math.max(0, (filiais[0].total_apolices || 0) - quantidade);
                    await base44.asServiceRole.entities.Filial.update(filialId, { total_apolices: novoTotal });
                }
            } catch (_) {}
        }

        console.log(`✅ Lote de exclusão: ${deletadas.length} apólice(s) deletada(s) por ${user.email}. Motivo: ${motivo}`);

        return Response.json({
            sucesso: true,
            total_solicitadas: ids_apolices.length,
            total_deletadas: deletadas.length,
            total_falhas: falhas.length,
            deletadas,
            falhas
        });

    } catch (error) {
        console.error('Erro ao deletar apólices em lote:', error);
        return Response.json({
            sucesso: false,
            erro: error.message
        }, { status: 500 });
    }
});