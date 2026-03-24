import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth-helpers";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const ALLOWED_KEYS = [
  "name",
  "email",
  "telefone",
  "ativo",
  "role",
  "roles",
  "account_status",
  "invite_status",
  "invite_token",
] as const;

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { id, updates } = body as {
      id: string;
      updates: Record<string, unknown>;
    };

    if (!id || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "ID e dados de atualização são obrigatórios." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    const { data: target, error: fetchError } = await admin
      .from("users")
      .select("id, email, cartorio_id, role, roles")
      .eq("id", id)
      .single();

    if (fetchError || !target) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const callerSuper = authResult.userType === "admin_geral";
    const targetRoles: string[] = Array.isArray(target.roles) && target.roles.length > 0
      ? (target.roles as string[])
      : target.role
        ? [String(target.role)]
        : [];

    if (!callerSuper) {
      const callerCartorio = authResult.profile?.cartorio_id;
      if (targetRoles.includes("admin_geral")) {
        return NextResponse.json(
          { error: "Você não pode editar um Super Administrador." },
          { status: 403 }
        );
      }
      if (!callerCartorio || target.cartorio_id !== callerCartorio) {
        return NextResponse.json(
          { error: "Você não tem permissão para editar este usuário." },
          { status: 403 }
        );
      }
    }

    const dbUpdates: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      if (key in updates && updates[key] !== undefined) {
        dbUpdates[key] = updates[key];
      }
    }

    if (Object.keys(dbUpdates).length === 0) {
      return NextResponse.json(
        { error: "Nenhum campo permitido para atualizar." },
        { status: 400 }
      );
    }

    if (!callerSuper && Array.isArray(dbUpdates.roles)) {
      const nextRoles = dbUpdates.roles as string[];
      if (nextRoles.includes("admin_geral")) {
        return NextResponse.json(
          { error: "Não é permitido atribuir perfil de Super Administrador." },
          { status: 403 }
        );
      }
    }

    const oldEmail = String(target.email || "")
      .trim()
      .toLowerCase();

    if (typeof dbUpdates.email === "string") {
      dbUpdates.email = dbUpdates.email.trim().toLowerCase();
    }

    const newEmail =
      typeof dbUpdates.email === "string" ? dbUpdates.email : oldEmail;

    if (newEmail !== oldEmail) {
      const { error: authErr } = await admin.auth.admin.updateUserById(id, {
        email: newEmail,
      });

      if (authErr) {
        const msg =
          authErr.message?.includes("already been registered") ||
          authErr.message?.includes("already registered")
            ? "Este e-mail já está em uso no sistema de autenticação."
            : authErr.message || "Erro ao atualizar e-mail no login.";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    const { data: usuario, error: upErr } = await admin
      .from("users")
      .update(dbUpdates)
      .eq("id", id)
      .select()
      .single();

    if (upErr) {
      console.error("[editar-usuario] Erro ao atualizar public.users:", upErr);
      return NextResponse.json(
        { error: upErr.message || "Erro ao atualizar usuário no banco." },
        { status: 500 }
      );
    }

    return NextResponse.json({ usuario }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    console.error("[editar-usuario]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
