import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Hook de permissões - ÚNICA FONTE DE VERDADE via backend

export function usePermissoes() {
  const [user, setUser] = useState(null);
  const [permissoes, setPermissoes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [temAcesso, setTemAcesso] = useState(false);
  
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
        setPermissoes(response.data.permissoes);
        setTemAcesso(response.data.tem_acesso);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setTemAcesso(false);
    } finally {
      setLoading(false);
    }
  };
  
  const pode = (modulo, acao) => {
    // Bloqueia durante carregamento
    if (loading) return false;
    if (!temAcesso || !user) return false;
    if (!user.ativo) return false;
    if (user.perfil === 'super_administrador') return true;
    
    // Bloqueia se permissões não carregaram
    if (!permissoes) return false;
    
    return permissoes?.[modulo]?.[acao] === true;
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