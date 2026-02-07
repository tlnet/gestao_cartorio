import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { TipoUsuario, isAdmin } from "@/types";

/**
 * Interface para dados do usuário autenticado
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: TipoUsuario;
  profile: any;
}

/**
 * Obtém o usuário autenticado da requisição
 * 
 * @param request - Request do Next.js
 * @returns Dados do usuário autenticado ou null se não autenticado
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    // Obter token do cabeçalho Authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Token não fornecido");
      return null;
    }

    const token = authHeader.replace("Bearer ", "");

    // Verificar token com Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log("❌ Token inválido:", authError?.message);
      return null;
    }

    // Buscar perfil do usuário
    // Tentar buscar com campos opcionais primeiro
    let profile: any = null;
    let profileError: any = null;

    const { data: profileData, error: profileErr } = await supabase
      .from("users")
      .select("id, name, email, telefone, role, cartorio_id, ativo")
      .eq("id", user.id)
      .single();

    profile = profileData;
    profileError = profileErr;

    // Se erro for de coluna não existir, tentar novamente sem campos opcionais
    if (profileError && profileError.code === "42703") {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("users")
        .select("id, name, email, role, ativo")
        .eq("id", user.id)
        .single();

      profile = fallbackData;
      profileError = fallbackError;
    }

    if (profileError || !profile) {
      console.log("❌ Perfil não encontrado:", profileError?.message);
      // Retornar com tipo padrão se perfil não encontrado
      return {
        id: user.id,
        email: user.email || "",
        userType: "atendente", // Fallback seguro
        profile: null,
      };
    }

    // Usar role como tipo de usuário (mapear para TipoUsuario)
    const userRole = profile.role || "atendente";
    const userType: TipoUsuario = userRole === "admin" ? "admin" : "atendente";

    return {
      id: user.id,
      email: user.email || "",
      userType,
      profile,
    };
  } catch (error) {
    console.error("❌ Erro ao autenticar usuário:", error);
    return null;
  }
}

/**
 * Middleware para exigir autenticação de administrador
 * 
 * @param request - Request do Next.js
 * @returns Dados do usuário se for admin, ou resposta de erro se não for
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const authResult = await requireAdmin(request);
 *   if (authResult instanceof NextResponse) {
 *     return authResult; // Retorna erro 403
 *   }
 *   
 *   // authResult contém dados do usuário admin
 *   const { id, email, userType, profile } = authResult;
 *   // ... continuar com lógica da rota
 * }
 * ```
 */
export async function requireAdmin(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    console.log("❌ Acesso negado: Não autenticado");
    return NextResponse.json(
      { error: "Não autenticado", message: "Você precisa estar logado para acessar este recurso." },
      { status: 401 }
    );
  }

  if (!isAdmin(user.userType)) {
    console.log(`❌ Acesso negado: Usuário tipo "${user.userType}" tentou acessar recurso de admin`);
    return NextResponse.json(
      {
        error: "Acesso negado",
        message: "Você não tem permissão para acessar este recurso. Apenas administradores podem realizar esta ação.",
      },
      { status: 403 }
    );
  }

  console.log(`✅ Acesso autorizado: Admin ${user.email}`);
  return user;
}

/**
 * Middleware para exigir autenticação (qualquer tipo de usuário)
 * 
 * @param request - Request do Next.js
 * @returns Dados do usuário ou resposta de erro
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    console.log("❌ Acesso negado: Não autenticado");
    return NextResponse.json(
      { error: "Não autenticado", message: "Você precisa estar logado para acessar este recurso." },
      { status: 401 }
    );
  }

  console.log(`✅ Acesso autorizado: ${user.email} (${user.userType})`);
  return user;
}
