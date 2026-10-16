import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// FUNCAO DESATIVADA POR SEGURANCA (P0).
// Permitia a qualquer usuario autenticado renumerar apolices arbitrarias (sem checagem de perfil).
// Mantida como stub que recusa toda chamada. Reative sob demanda apenas com checagem de
// super_administrador e trilha de auditoria.
Deno.serve(async (_req) => {
  return Response.json(
    { sucesso: false, erro: 'Funcao desativada por seguranca.' },
    { status: 403 }
  );
});
