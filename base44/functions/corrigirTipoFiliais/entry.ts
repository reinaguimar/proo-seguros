import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// FUNCAO DESATIVADA POR SEGURANCA (P0).
// Rotina de correcao de uso unico SEM autenticacao que alterava registros de Filial.
// Mantida como stub que recusa toda chamada. Gestao de filiais deve ser feita pela tela
// 'Gestao de Filiais' (com perfil adequado).
Deno.serve(async (_req) => {
  return Response.json(
    { sucesso: false, erro: 'Funcao desativada por seguranca.' },
    { status: 403 }
  );
});
