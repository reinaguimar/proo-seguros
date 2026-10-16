import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// FUNCAO DESATIVADA POR SEGURANCA (P0).
// Rotina de correcao de numeracao (uso unico) que, sem checagem de perfil, podia alterar
// numeros de apolices. Mantida como stub que recusa toda chamada. Reative sob demanda
// apenas com checagem de super_administrador.
Deno.serve(async (_req) => {
  return Response.json(
    { sucesso: false, erro: 'Funcao desativada por seguranca.' },
    { status: 403 }
  );
});
