import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // New Soluções = Matriz (Representante)
    await base44.asServiceRole.entities.Filial.update('69a88b96aca1474b40187291', {
      tipo: 'matriz'
    });

    // PROFORTE = Sub-Representante
    await base44.asServiceRole.entities.Filial.update('69cbd5ac361ac3831f2a88e1', {
      tipo: 'sub_representante'
    });

    return Response.json({
      sucesso: true,
      new_solucoes: 'tipo = matriz',
      proforte: 'tipo = sub_representante'
    });
  } catch (err) {
    return Response.json({ sucesso: false, erro: String(err) }, { status: 500 });
  }
});