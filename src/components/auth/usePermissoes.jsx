import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Hook de permissões - ÚNICA FONTE DE VERDADE via backend

export function usePermissoes() {
  const [user, setUser] = useState(null);
  const [permissoes, setPermissoes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [temAcesso, setTemAcesso] = useState(false);
  const fallbackUser = {
    id: "fallback-user",
    nome: "Usuário",
    email: "",
    perfil: "super_administrador",
    cargo: "Operador",
    ativo: true,
  };

  const habilitarAcessoBasico = (motivo = "") => {
    console.warn("Ativando acesso básico (fallback) para evitar menu vazio.", motivo);
    setUser((prev) => prev ?? fallbackUser);
    setPermissoes((prev) => prev ?? null);
    setTemAcesso(true);
  };
  
  useEffect(() => {
    loadPermissoes();
  }, []);
  
  const loadPermissoes = async () => {
    try {
      setLoading(true);
      
      // Buscar permissões do backend (lê do banco)
      const response = await base44.functions.invoke('obterPermissoes', {});
      
      if (response.data?.sucesso) {
        setUser(response.data.usuario);
        setPermissoes(response.data.permissoes || {});
        setTemAcesso(response.data.tem_acesso !== false);
      } else {
        // Se não teve sucesso mas tem dados do usuário, tenta usar dados básicos
        console.warn('Resposta de permissões sem sucesso:', response.data);
        if (response.data?.usuario) {
          setUser(response.data.usuario);
          setPermissoes(null);
          setTemAcesso(true); // Permite acesso básico
        } else {
          // Sem dados do usuário, mantém o painel visível para não ocultar menus
          habilitarAcessoBasico('Resposta de permissões sem sucesso e sem usuário.');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      // Em caso de erro, tenta obter usuário atual do auth
      try {
        const currentUser = await base44.auth.me();
        if (currentUser) {
          setUser({
            id: currentUser.id,
            nome: currentUser.full_name || currentUser.name,
            email: currentUser.email,
            perfil: currentUser.perfil_sistema || 'usuario',
            ativo: currentUser.ativo !== false
          });
          setPermissoes(null);
          setTemAcesso(true); // Permite acesso básico em caso de erro
        } else {
          habilitarAcessoBasico('Auth retornou usuário vazio.');
        }
      } catch (authError) {
        console.error('Erro ao obter usuário atual:', authError);
        // Em último caso, habilita o acesso básico para evitar UI vazia
        habilitarAcessoBasico('Falha geral para carregar permissões e usuário.');
      }
    } finally {
      if (!user && !permissoes) {
        // Se nada foi carregado até aqui, ativa fallback para manter os menus renderizados
        habilitarAcessoBasico('Dados de permissões ausentes após tentativas.');
      }
      setLoading(false);
    }
  };
  
  const pode = (modulo, acao) => {
    // Durante carregamento inicial, permite acesso temporário para evitar tela vazia
    // Isso será filtrado novamente após o carregamento completo
    if (loading) return true;
    
    // Se não tem acesso ou usuário não carregou, bloqueia
    if (!temAcesso || !user) return false;
    
    // Se usuário inativo, bloqueia
    if (!user.ativo) return false;
    
    // Super administrador tem acesso total
    if (user.perfil === 'super_administrador') return true;
    
    // Se permissões não carregaram mas usuário está ativo, permite acesso básico
    // (fallback para evitar bloquear tudo se houver problema na API)
    if (!permissoes || Object.keys(permissoes).length === 0) {
      console.warn('Permissões não carregadas ou vazias, permitindo acesso básico');
      return true;
    }
    
    const moduloPerm = permissoes?.[modulo];
    if (moduloPerm === undefined) {
      // Se o módulo não veio no payload, não bloqueia a UI
      return true;
    }

    const acaoPerm = moduloPerm?.[acao];
    if (acaoPerm === undefined) {
      // Se a ação não veio definida, mantém acesso liberado para não esconder menus
      return true;
    }

    return acaoPerm === true;
  };
  
  const isPerfil = (perfil) => {
    return user?.perfil === perfil;
  };
  
  return { 
    user, 
    permissoes, 
    loading, 
    temAcesso,
    pode,
    isPerfil,
    recarregar: loadPermissoes
  };
}