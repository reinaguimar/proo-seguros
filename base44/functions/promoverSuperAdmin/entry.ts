import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// FUNCAO DESATIVADA POR SEGURANCA (P0).
// Rotina de bootstrap do primeiro super admin, ja cumprida. Mantida como stub que recusa
// toda chamada. Gestao de perfis deve usar 'alterarPerfilUsuario' (exige administrador).
Deno.serve(async (_req) => {
  return Response.json(
    { sucesso: false, erro: 'Funcao desativada por seguranca.' },
    { status: 403 }
  );
});
