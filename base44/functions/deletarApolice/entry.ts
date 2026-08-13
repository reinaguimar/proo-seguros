import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
                erro: 'Apenas o Super Administrador pode deletar apólices permanentemente' 
            }, { status: 403 });
        }

        const { id_apolice } = await req.json();

        if (!id_apolice) {
            return Response.json({ sucesso: false, erro: 'ID da apólice é obrigatório' }, { status: 400 });
        }

        // Buscar a apólice para validação
        const apolice = await base44.asServiceRole.entities.Apolice.filter({ id: id_apolice });
        
        if (!apolice || apolice.length === 0) {
            return Response.json({ sucesso: false, erro: 'Apólice não encontrada' }, { status: 404 });
        }

        // Deletar permanentemente do banco de dados
        await base44.asServiceRole.entities.Apolice.delete(id_apolice);

        // Decrementar contador da filial
        if (apolice[0].filial_id) {
            const filiais = await base44.asServiceRole.entities.Filial.filter({ id: apolice[0].filial_id });
            if (filiais.length > 0 && (filiais[0].total_apolices || 0) > 0) {
                await base44.asServiceRole.entities.Filial.update(apolice[0].filial_id, { total_apolices: filiais[0].total_apolices - 1 });
            }
        }

        console.log(`✅ Apólice ${apolice[0].numero_apolice} deletada permanentemente pelo Super Admin ${user.email}`);

        return Response.json({ 
            sucesso: true, 
            mensagem: `Apólice ${apolice[0].numero_apolice} deletada permanentemente do banco de dados` 
        });

    } catch (error) {
        console.error('Erro ao deletar apólice:', error);
        return Response.json({ 
            sucesso: false, 
            erro: error.message 
        }, { status: 500 });
    }
});