import { useAuth } from "@/contexts/auth-context";
import { 
  TipoUsuario, 
  PermissoesUsuario, 
  podeAcessarRota,
  isAdmin as checkIsAdmin,
  isAtendente as checkIsAtendente,
  isFinanceiro as checkIsFinanceiro,
  getPermissoes 
} from "@/types";

/**
 * Hook personalizado para verificação de permissões do usuário
 * 
 * @returns Objeto com funções e propriedades para verificar permissões
 * 
 * @example
 * ```tsx
 * const { isAdmin, canAccess } = usePermissions();
 * 
 * if (isAdmin) {
 *   // Renderizar opções de admin
 * }
 * 
 * if (canAccess('/usuarios')) {
 *   // Exibir link para página de usuários
 * }
 * ```
 */
export function usePermissions() {
  const { userType, userRoles, permissions } = useAuth();

  /**
   * Verifica se o usuário pode acessar uma rota específica (considera todas as permissões)
   * @param rota - Caminho da rota a ser verificada
   * @returns true se pode acessar, false caso contrário
   */
  const canAccess = (rota: string): boolean => {
    return podeAcessarRota(userRoles?.length ? userRoles : userType, rota);
  };

  /**
   * Verifica se o usuário tem o role administrador (em qualquer uma das permissões)
   */
  const isAdmin = userRoles?.includes("admin") ?? checkIsAdmin(userType);

  /**
   * Verifica se o usuário tem o role atendente
   */
  const isAtendente = userRoles?.includes("atendente") ?? checkIsAtendente(userType);

  /**
   * Verifica se o usuário tem o role financeiro
   */
  const isFinanceiro = userRoles?.includes("financeiro") ?? checkIsFinanceiro(userType);

  /**
   * Verifica se o usuário tem uma permissão específica
   * @param permissao - Nome da permissão a ser verificada
   * @returns true se tem a permissão, false caso contrário
   */
  const hasPermission = (permissao: keyof PermissoesUsuario): boolean => {
    if (!permissions) return false;
    const value = permissions[permissao];
    // Se for booleano, retornar o valor
    if (typeof value === "boolean") return value;
    // Se for array, retornar true se não estiver vazio
    if (Array.isArray(value)) return value.length > 0;
    return false;
  };

  return {
    /** Tipo principal do usuário (para exibição) */
    userType,
    /** Lista de permissões/roles do usuário */
    userRoles: userRoles ?? [],
    /** Objeto completo de permissões (união de todos os roles) */
    permissions,
    /** Verifica se pode acessar uma rota */
    canAccess,
    /** Verifica se é administrador */
    isAdmin,
    /** Verifica se é atendente */
    isAtendente,
    /** Verifica se é financeiro */
    isFinanceiro,
    /** Verifica se tem uma permissão específica */
    hasPermission,
  };
}
