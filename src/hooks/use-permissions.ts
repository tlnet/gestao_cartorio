import { useAuth } from "@/contexts/auth-context";
import { 
  TipoUsuario, 
  PermissoesUsuario, 
  podeAcessarRota,
  isAdmin as checkIsAdmin,
  isAtendente as checkIsAtendente,
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
  const { userType, permissions } = useAuth();

  /**
   * Verifica se o usuário pode acessar uma rota específica
   * @param rota - Caminho da rota a ser verificada
   * @returns true se pode acessar, false caso contrário
   */
  const canAccess = (rota: string): boolean => {
    const result = podeAcessarRota(userType, rota);
    console.log(`🔍 canAccess("${rota}"): ${result} (userType: ${userType})`);
    return result;
  };

  /**
   * Verifica se o usuário é administrador
   */
  const isAdmin = checkIsAdmin(userType);

  /**
   * Verifica se o usuário é atendente
   */
  const isAtendente = checkIsAtendente(userType);

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
    /** Tipo do usuário atual */
    userType,
    /** Objeto completo de permissões */
    permissions,
    /** Verifica se pode acessar uma rota */
    canAccess,
    /** Verifica se é administrador */
    isAdmin,
    /** Verifica se é atendente */
    isAtendente,
    /** Verifica se tem uma permissão específica */
    hasPermission,
  };
}
