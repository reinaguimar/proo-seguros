import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// CORREÇÃO DEFINITIVA DE TODOS OS PERFIS
// Garante que reinaldo.aguimar@oonseguradora.com seja super_administrador
// E corrige todos os outros usuários

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todos os usuários
    const usuarios = await base44.asServiceRole.entities.User.list();
    
    const atualizacoes = [];
    
    for (const usuario of usuarios) {
      let updates = {};
      let precisaAtualizar = false;
      
      // REGRA 1: Reinaldo SEMPRE super_administrador
      if (usuario.email === 'reinaldo.aguimar@oonseguradora.com') {
        if (usuario.perfil_sistema !== 'super_administrador') {
          updates.perfil_sistema = 'super_administrador';
          precisaAtualizar = true;
        }
        if (usuario.perfil_fechamento !== 'admin_sistema') {
          updates.perfil_fechamento = 'admin_sistema';
          precisaAtualizar = true;
        }
      }
      
      // REGRA 2: Se perfil_sistema está indefinido, define como usuario
      if (!usuario.perfil_sistema) {
        updates.perfil_sistema = 'usuario';
        precisaAtualizar = true;
      }
      
      // REGRA 3: Sincronizar perfil_fechamento com perfil_sistema
      if (usuario.perfil_sistema === 'super_administrador' && usuario.perfil_fechamento !== 'admin_sistema') {
        updates.perfil_fechamento = 'admin_sistema';
        precisaAtualizar = true;
      } else if (usuario.perfil_sistema === 'administrador' && usuario.perfil_fechamento !== 'admin_sistema') {
        updates.perfil_fechamento = 'admin_sistema';
        precisaAtualizar = true;
      } else if (usuario.perfil_sistema === 'auditor' && usuario.perfil_fechamento !== 'auditor') {
        updates.perfil_fechamento = 'auditor';
        precisaAtualizar = true;
      } else if (usuario.perfil_sistema === 'gerente' && usuario.perfil_fechamento === 'visualizador') {
        updates.perfil_fechamento = 'responsavel_mga';
        precisaAtualizar = true;
      }
      
      // REGRA 4: Todos devem estar ativos
      if (usuario.ativo !== true) {
        updates.ativo = true;
        precisaAtualizar = true;
      }
      
      // Atualizar se necessário
      if (precisaAtualizar) {
        await base44.asServiceRole.entities.User.update(usuario.id, updates);
        
        atualizacoes.push({
          nome: usuario.full_name,
          email: usuario.email,
          perfil_sistema_anterior: usuario.perfil_sistema || 'indefinido',
          perfil_sistema_novo: updates.perfil_sistema || usuario.perfil_sistema,
          perfil_fechamento_anterior: usuario.perfil_fechamento,
          perfil_fechamento_novo: updates.perfil_fechamento || usuario.perfil_fechamento
        });
      }
    }
    
    return Response.json({ 
      sucesso: true, 
      mensagem: `${atualizacoes.length} usuário(s) corrigido(s)`,
      detalhes: atualizacoes
    });
    
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});