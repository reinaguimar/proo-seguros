import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado. Apenas admins.' }, { status: 403 });
    }

    const PROFORTE_ID = "69cbd5ac361ac3831f2a88e1";

    await base44.asServiceRole.entities.Filial.update(PROFORTE_ID, {
      logo_url: "https://play-lh.googleusercontent.com/umoSI3WbApprITfcm0OeU0fMtzsC3fhdEPETbne0bqV3NF_RYM7e3AVDVREP1ZowNIx0E_2JIRkl_nTu33L62Q=w480-h960-rw",
      site: "http://proforte.org.br/",
      telefone_sac: "0800 943 1930",
      email_sac: "sac@gestaonew.com.br",
      telefone_ouvidoria: "1194332-2972",
      email_ouvidoria: "ouvidoria@gestaonew.com.br",
      cor_primaria: "#C41E3A",
      cor_texto_cabecalho: "#FFFFFF"
    });

    return Response.json({ sucesso: true, mensagem: "Filial PROFORTE atualizada com sucesso!" });
  } catch (error) {
    return Response.json({ sucesso: false, error: error.message }, { status: 500 });
  }
});