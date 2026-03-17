"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { TipoUsuario } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface RequirePermissionProps {
  /** Tipo(s) de usuário necessário(s) para acessar o conteúdo */
  requiredRole?: TipoUsuario | TipoUsuario[];
  /** Nome da página/rota que requer permissão */
  requiredPage?: string;
  /** Componente a exibir se não tiver permissão */
  fallback?: React.ReactNode;
  /** Rota para redirecionar se não tiver permissão (padrão: /acesso-negado) */
  redirectTo?: string;
  /** Conteúdo protegido */
  children: React.ReactNode;
}

/**
 * Componente para proteger rotas e conteúdo baseado em permissões de usuário
 * 
 * @example
 * ```tsx
 * // Proteger página inteira
 * <RequirePermission requiredRole="admin" redirectTo="/acesso-negado">
 *   <ConfiguracoesPage />
 * </RequirePermission>
 * 
 * // Proteger seção específica com fallback
 * <RequirePermission 
 *   requiredRole="admin" 
 *   fallback={<p>Conteúdo restrito</p>}
 * >
 *   <BotaoExcluir />
 * </RequirePermission>
 * ```
 */
export function RequirePermission({
  requiredRole,
  requiredPage,
  fallback,
  redirectTo = "/acesso-negado",
  children,
}: RequirePermissionProps) {
  const { user, loading } = useAuth();
  const { userType, userRoles, canAccess } = usePermissions();
  const router = useRouter();

  // Em reload, a sessão pode existir antes do perfil/permissões estarem disponíveis.
  // Para evitar falso "Acesso negado", aguardamos até termos userType ou userRoles.
  const permissionsResolved = !user || !!userType || (userRoles?.length ?? 0) > 0;

  useEffect(() => {
    // Não fazer nada enquanto autenticação está carregando
    if (loading) return;

    // Se não está autenticado, redirecionar para login
    if (!user) {
      router.push("/login");
      return;
    }

    // Se está autenticado mas as permissões ainda não foram resolvidas, aguardar.
    if (!permissionsResolved) return;

    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const hasRole = (userRoles?.length ? userRoles : (userType ? [userType] : [])).some((r) => roles.includes(r));
      if (!hasRole) {
        if (!fallback) {
          router.push(redirectTo);
        }
        return;
      }
    }

    // Verificar permissão por página
    if (requiredPage) {
      const hasAccess = canAccess(requiredPage);
      
      if (!hasAccess) {
        if (!fallback) {
          router.push(redirectTo);
        }
        return;
      }
    }

  }, [loading, user, userType, userRoles, requiredRole, requiredPage, canAccess, router, redirectTo, fallback]);

  // Exibir loading apenas enquanto autenticação está sendo verificada.
  // O AuthProvider já tem timeout próprio para evitar loading infinito.
  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Se não está autenticado, não renderizar nada (vai redirecionar)
  if (!user) {
    return null;
  }

  // Sessão existe, mas ainda carregando perfil/permissões.
  if (!permissionsResolved) {
    return (
      <div className="flex flex-col space-y-4 p-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = (userRoles?.length ? userRoles : (userType ? [userType] : [])).some((r) => roles.includes(r));
    if (!hasRole) {
      return fallback ? <>{fallback}</> : null;
    }
  }

  // Verificar permissão por página
  if (requiredPage) {
    const hasAccess = canAccess(requiredPage);
    
    if (!hasAccess) {
      return fallback ? <>{fallback}</> : null;
    }
  }

  // Usuário tem permissão, renderizar children
  return <>{children}</>;
}
