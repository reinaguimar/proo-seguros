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

        // APENAS o usuário autorizado pode deletar apólices permanentemente
        const EMAIL_AUTORIZADO = 'reinaldo.aguimar@oonseguradora.com';
        if (user.email !== EMAIL_AUTORIZADO) {
            return Response.json({ 
                sucesso: false, 
                erro: 'Acesso negado. Apenas o usuário autorizado pode deletar apólices.' 
            }, { status: 403 });
        }

        const { id_apolice, motivo } = await req.json();

        if (!id_apolice) {
            return Response.json({ sucesso: false, erro: 'ID da apólice é obrigatório' }, { status: 400 });
        }

        if (!motivo || !motivo.trim()) {
            return Response.json({ sucesso: false, erro: 'Motivo da exclusão é obrigatório' }, { status: 400 });
        }

        // Buscar a apólice para validação
        const apolice = await base44.asServiceRole.entities.Apolice.filter({ id: id_apolice });
        
        if (!apolice || apolice.length === 0) {
            return Response.json({ sucesso: false, erro: 'Apólice não encontrada' }, { status: 404 });
        }

        // Backup dos dados para trilha de auditoria
        const backup = JSON.parse(JSON.stringify(apolice[0]));

        // Deletar permanentemente do banco de dados
        await base44.asServiceRole.entities.Apolice.delete(id_apolice);

        // Decrementar contador da filial
        if (apolice[0].filial_id) {
            const filiais = await base44.asServiceRole.entities.Filial.filter({ id: apolice[0].filial_id });
            if (filiais.length > 0 && (filiais[0].total_apolices || 0) > 0) {
                await base44.asServiceRole.entities.Filial.update(apolice[0].filial_id, { total_apolices: filiais[0].total_apolices - 1 });
            }
        }

        // Registrar trilha de auditoria
        await base44.asServiceRole.entities.LogDelecao.create({
            tipo_entidade: 'Apolice',
            id_registro: id_apolice,
            id_registro_alternativo: apolice[0].numero_apolice || null,
            usuario_id: user.id,
            usuario_email: user.email,
            usuario_nome: user.full_name || user.email,
            motivo_delecao: motivo.trim(),
            data_delecao: new Date().toISOString(),
            dados_backup: backup
        });

        console.log(`✅ Apólice ${apolice[0].numero_apolice} deletada permanentemente por ${user.email}. Motivo: ${motivo}`);

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