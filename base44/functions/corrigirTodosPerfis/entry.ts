import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// FUNCAO DESATIVADA POR SEGURANCA (P0).
// Era uma rotina de uso unico SEM autenticacao que reescrevia perfis/roles/ativo de TODOS
// os usuarios (incluindo conceder super admin). Mantida como stub que recusa toda chamada.
Deno.serve(async (_req) => {
  return Response.json(
    { sucesso: false, erro: 'Funcao desativada por seguranca.' },
    { status: 403 }
  );
});
