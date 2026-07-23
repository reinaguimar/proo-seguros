// Funções de permissão para o módulo de Fechamento Mensal

export const podeEditarFechamento = (user, fechamento) => {
  if (!user || !fechamento) return false;
  if (user.role === 'admin') return true;
  if (fechamento.status !== 'rascunho') return false;
  if (user.perfil_fechamento === 'auditor' && fechamento.auditor_id === user.id) {
    return true;
  }
  return false;
};

export const podeAuditar = (user, fechamento) => {
  if (!user || !fechamento) return false;
  if (user.role === 'admin') return true;
  if (fechamento.status !== 'rascunho') return false;
  return user.perfil_fechamento === 'auditor';
};

export const podeAprovarMGA = (user, fechamento) => {
  if (!user || !fechamento) return false;
  if (fechamento.status !== 'auditado') return false;
  return user.perfil_fechamento === 'responsavel_mga' || user.role === 'admin';
};

export const podeAprovarSeguradora = (user, fechamento) => {
  if (!user || !fechamento) return false;
  if (fechamento.status !== 'aprovado_mga') return false;
  return user.perfil_fechamento === 'responsavel_seguradora' || user.role === 'admin';
};

export const podeReabrir = (user, fechamento) => {
  if (!user || !fechamento) return false;
  return user.role === 'admin' && 
         (fechamento.status === 'fechado' || fechamento.status === 'aprovado_seguradora');
};

export const podeVisualizar = (user) => {
  if (!user) return false;
  return true;
};

export const podeCriarFechamento = (user) => {
  if (!user) return false;
  return user.role === 'admin' || user.perfil_fechamento === 'auditor';
};

export const getProximaAcao = (fechamento) => {
  if (!fechamento) return null;
  
  const acoes = {
    rascunho: 'Auditar e enviar para aprovação MGA',
    auditado: 'Aguardando aprovação do Responsável MGA',
    aprovado_mga: 'Aguardando aprovação do Responsável Seguradora',
    aprovado_seguradora: 'Fechamento concluído',
    fechado: 'Fechamento finalizado e imutável'
  };
  
  return acoes[fechamento.status] || '';
};