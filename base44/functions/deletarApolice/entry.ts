import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Status de FechamentoMensal que caracterizam fechamento JA REALIZADO.
// Apolices de competencias com fechamento nesses status nao podem ser excluidas (nem logicamente).
const STATUS_FECHAMENTO_REALIZADO = ['fechado'];

// Retorna uma mensagem de bloqueio se a competencia da apolice tiver fechamento realizado; senao null.
async function verificarFechamentoRealizado(base44, apolice) {
    const dataRef = apolice?.data_inicio_apolice;
    if (!dataRef || typeof dataRef !== 'string') return null;
    const partes = dataRef.split('-');
    const compAno = parseInt(partes[0], 10);
    const compMes = parseInt(partes[1], 10);
    if (!compAno || !compMes) return null;
    const fechamentos = await base44.asServiceRole.entities.FechamentoMensal.filter({
        competencia_mes: compMes,
        competencia_ano: compAno
    });
    const realizado = (fechamentos || []).find(f => STATUS_FECHAMENTO_REALIZADO.includes(f.status));
    if (realizado) {
        const mm = String(compMes).padStart(2, '0');
        return `A apolice ${apolice.numero_apolice || ''} pertence a competencia ${mm}/${compAno}, cujo fechamento ja foi realizado (status: ${realizado.status}). Apolices de competencias com fechamento realizado nao podem ser excluidas.`;
    }
    return null;
}

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

        // TRAVA REGULATÓRIA: apólice de competência com fechamento já realizado NUNCA pode ser excluída.
        const bloqueioFechamento = await verificarFechamentoRealizado(base44, apolice[0]);
        if (bloqueioFechamento) {
            return Response.json({ sucesso: false, erro: bloqueioFechamento }, { status: 409 });
        }

        // Backup dos dados para trilha de auditoria
        const backup = JSON.parse(JSON.stringify(apolice[0]));

        // SOFT-DELETE: nunca remove fisicamente do banco — marca como excluída (reversível).
        // O registro permanece no banco com excluido_logico=true e é ocultado das listas/relatórios.
        await base44.asServiceRole.entities.Apolice.update(id_apolice, {
            excluido_logico: true,
            excluido_em: new Date().toISOString(),
            excluido_por: user.email,
            excluido_motivo: motivo.trim()
        });

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
            motivo_delecao: `Exclusão lógica (reversível): ${motivo.trim()}`,
            data_delecao: new Date().toISOString(),
            dados_backup: backup
        });

        console.log(`✅ Apólice ${apolice[0].numero_apolice} marcada como excluída (soft-delete) por ${user.email}. Motivo: ${motivo}`);

        return Response.json({ 
            sucesso: true, 
            mensagem: `Apólice ${apolice[0].numero_apolice} excluída (exclusão lógica reversível — registro preservado no banco)` 
        });

    } catch (error) {
        console.error('Erro ao deletar apólice:', error);
        return Response.json({ 
            sucesso: false, 
            erro: error.message 
        }, { status: 500 });
    }
});