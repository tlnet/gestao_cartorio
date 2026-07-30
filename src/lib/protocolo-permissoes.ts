import { isAdmin, type TipoUsuario } from "@/types";

/**
 * Admin / Super Adm podem alterar status de qualquer protocolo.
 * Demais usuários (ex.: atendente) só se forem o responsável pelo serviço.
 */
export function canAlterarStatusProtocolo(params: {
  userId: string | null | undefined;
  userType: TipoUsuario | null | undefined;
  userRoles?: TipoUsuario[] | null;
  responsavelServicoId: string | null | undefined;
}): boolean {
  const { userId, userType, userRoles, responsavelServicoId } = params;

  const roles =
    userRoles && userRoles.length > 0
      ? userRoles
      : userType
        ? [userType]
        : [];

  if (roles.some((r) => isAdmin(r)) || isAdmin(userType)) {
    return true;
  }

  if (!userId || !responsavelServicoId) {
    return false;
  }

  return responsavelServicoId === userId;
}
