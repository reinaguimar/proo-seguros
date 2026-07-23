import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função para criar os 5 perfis padrão do sistema
// EXECUTE UMA VEZ via dashboard -> código -> functions -> inicializarPerfis

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Apenas admins podem inicializar perfis' }, { status: 403 });
    }
    
    const perfis = [
      {
        nome: "usuario",
        descricao: "Usuário básico - apenas visualização",
        ordem: 1,
        sistema: true,
        permissoes: {
          dashboard: { visualizar: true },
          apolices: { visualizar: true, criar: false, editar: false, deletar: false, renovar: false, cancelar: false, exportar: false },
          sinistros: { visualizar: true, criar: false, editar: false, deletar: false, adicionar_gastos: false },
          fechamentos: { visualizar: false, criar: false, auditar: false, aprovar_mga: false, aprovar_seguradora: false, reabrir: false, deletar: false },
          usuarios: { visualizar: false, criar: false, editar: false, inativar: false, gerenciar_perfis: false, ver_inativos: false },
          sistema: { acessar_logs: false, configuracoes: false }
        }
      },
      {
        nome: "gerente",
        descricao: "Gerente - cria e edita apólices e sinistros",
        ordem: 2,
        sistema: true,
        permissoes: {
          dashboard: { visualizar: true },
          apolices: { visualizar: true, criar: true, editar: true, deletar: false, renovar: true, cancelar: false, exportar: true },
          sinistros: { visualizar: true, criar: true, editar: true, deletar: false, adicionar_gastos: true },
          fechamentos: { visualizar: true, criar: false, auditar: false, aprovar_mga: false, aprovar_seguradora: false, reabrir: false, deletar: false },
          usuarios: { visualizar: true, criar: false, editar: false, inativar: false, gerenciar_perfis: false, ver_inativos: false },
          sistema: { acessar_logs: false, configuracoes: false }
        }
      },
      {
        nome: "administrador",
        descricao: "Administrador - gestão completa exceto perfis",
        ordem: 3,
        sistema: true,
        permissoes: {
          dashboard: { visualizar: true },
          apolices: { visualizar: true, criar: true, editar: true, deletar: true, renovar: true, cancelar: true, exportar: true },
          sinistros: { visualizar: true, criar: true, editar: true, deletar: true, adicionar_gastos: true },
          fechamentos: { visualizar: true, criar: false, auditar: false, aprovar_mga: true, aprovar_seguradora: true, reabrir: true, deletar: false },
          usuarios: { visualizar: true, criar: true, editar: true, inativar: false, gerenciar_perfis: false, ver_inativos: false },
          sistema: { acessar_logs: false, configuracoes: false }
        }
      },
      {
        nome: "auditor",
        descricao: "Auditor - foco em fechamentos e auditoria",
        ordem: 4,
        sistema: true,
        permissoes: {
          dashboard: { visualizar: true },
          apolices: { visualizar: true, criar: false, editar: false, deletar: false, renovar: false, cancelar: false, exportar: true },
          sinistros: { visualizar: true, criar: false, editar: false, deletar: false, adicionar_gastos: false },
          fechamentos: { visualizar: true, criar: true, auditar: true, aprovar_mga: false, aprovar_seguradora: false, reabrir: false, deletar: false },
          usuarios: { visualizar: true, criar: false, editar: false, inativar: false, gerenciar_perfis: false, ver_inativos: false },
          sistema: { acessar_logs: false, configuracoes: false }
        }
      },
      {
        nome: "super_administrador",
        descricao: "Super Administrador - controle total do sistema",
        ordem: 5,
        sistema: true,
        permissoes: {
          dashboard: { visualizar: true },
          apolices: { visualizar: true, criar: true, editar: true, deletar: true, renovar: true, cancelar: true, exportar: true },
          sinistros: { visualizar: true, criar: true, editar: true, deletar: true, adicionar_gastos: true },
          fechamentos: { visualizar: true, criar: true, auditar: true, aprovar_mga: true, aprovar_seguradora: true, reabrir: true, deletar: true },
          usuarios: { visualizar: true, criar: true, editar: true, inativar: true, gerenciar_perfis: true, ver_inativos: true },
          sistema: { acessar_logs: true, configuracoes: true }
        }
      }
    ];
    
    const perfisExistentes = await base44.asServiceRole.entities.Perfil.list();
    const criados = [];
    
    for (const perfil of perfis) {
      const existe = perfisExistentes.find(p => p.nome === perfil.nome);
      
      if (!existe) {
        const novo = await base44.asServiceRole.entities.Perfil.create(perfil);
        criados.push(novo.nome);
      }
    }
    
    return Response.json({ 
      sucesso: true, 
      mensagem: `Inicialização concluída. ${criados.length} perfis criados.`,
      perfis_criados: criados,
      total_perfis: perfisExistentes.length + criados.length
    });
    
  } catch (error) {
    console.error('Erro ao inicializar perfis:', error);
    return Response.json({ 
      sucesso: false,
      error: error.message 
    }, { status: 500 });
  }
});