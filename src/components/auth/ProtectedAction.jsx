import React from "react";
import { usePermissoes } from "./usePermissoes";

// Componente para proteger ações por permissão

export default function ProtectedAction({ 
  modulo, 
  acao, 
  children, 
  fallback = null,
  showLoading = false
}) {
  const { pode, loading } = usePermissoes();
  
  if (loading && showLoading) {
    return <div className="animate-pulse bg-gray-200 rounded h-8 w-24"></div>;
  }
  
  if (loading) return null;
  
  if (!pode(modulo, acao)) {
    return fallback;
  }
  
  return <>{children}</>;
}