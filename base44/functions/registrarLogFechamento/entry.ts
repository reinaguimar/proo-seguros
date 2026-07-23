import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    const { fechamento_id, acao, observacao, dados_snapshot } = await req.json();
    
    if (!fechamento_id || !acao) {
      return Response.json({ error: 'Dados obrigatórios' }, { status: 400 });
    }
    
    // Capturar IP (melhor esforço)
    const ip_address = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       'unknown';
    
    const log = await base44.entities.LogFechamento.create({
      fechamento_id,
      acao,
      usuario_id: user.id,
      usuario_nome: user.full_name || user.email,
      usuario_email: user.email,
      observacao: observacao || '',
      ip_address,
      dados_snapshot: dados_snapshot || {}
    });
    
    return Response.json({ sucesso: true, log });
    
  } catch (error) {
    console.error('Erro ao registrar log:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});