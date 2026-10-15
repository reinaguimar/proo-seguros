import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// FUNCAO DESATIVADA POR SEGURANCA (P0).
// Era uma rotina de bootstrap de uso unico SEM autenticacao que permitia promover
// qualquer e-mail a super_administrador. Mantida apenas como stub que recusa toda chamada,
// para eliminar a superficie de ataque. Gestao de perfis deve usar 'alterarPerfilUsuario'
// (que exige administrador). Reative sob demanda apenas com checagem de super_administrador.
Deno.serve(async (_req) => {
  return Response.json(
    { sucesso: false, erro: 'Funcao desativada por seguranca.' },
    { status: 403 }
  );
});
