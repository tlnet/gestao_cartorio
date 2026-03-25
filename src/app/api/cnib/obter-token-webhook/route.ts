import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildCnibTokenWebhookRequestBody } from "@/lib/cnib-webhook-token-body";

/**
 * Proxy server-side para o webhook N8N do token CNIB.
 * O browser não chama o webhook direto (CORS); apenas esta rota, mesma origem.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cookies = request.headers.get("cookie");

  let user: { id: string } | null = null;

  try {
    if (authHeader?.startsWith("Bearer ")) {
      const accessToken = authHeader.replace("Bearer ", "");
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser(accessToken);

      if (!authError && authUser) {
        user = authUser;
      }
    }

    if (!user && cookies) {
      const cookieMap = new Map<string, string>();
      cookies.split(";").forEach((cookie: string) => {
        const [name, value] = cookie.trim().split("=");
        if (name && value) {
          cookieMap.set(name, decodeURIComponent(value));
        }
      });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const urlPrefix = supabaseUrl.replace(/https?:\/\//, "").split(".")[0] || "";

      const accessToken =
        cookieMap.get("sb-access-token") ||
        cookieMap.get("supabase-auth-token") ||
        cookieMap.get(`sb-${urlPrefix}-auth-token`);

      if (accessToken) {
        const {
          data: { user: sessionUser },
          error: sessionError,
        } = await supabase.auth.getUser(accessToken);

        if (!sessionError && sessionUser) {
          user = sessionUser;
        }
      }
    }
  } catch (e) {
    console.error("❌ Erro na autenticação (obter-token-webhook):", e);
  }

  if (!user) {
    return NextResponse.json(
      { error: "Não autorizado. Autenticação necessária." },
      { status: 401 }
    );
  }

  let cartorioIdFromUser: string | null = null;
  try {
    const { data: userData, error: userDataError } = await supabase
      .from("users")
      .select("cartorio_id")
      .eq("id", user.id)
      .single();

    if (!userDataError && userData?.cartorio_id) {
      cartorioIdFromUser = String(userData.cartorio_id);
    }
  } catch (e) {
    console.warn("⚠️ obter-token-webhook: cartorio_id:", e);
  }

  const cnibWebhookUrl =
    process.env.CNIB_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_CNIB_WEBHOOK_URL ||
    "https://webhook.conversix.com.br/webhook/56a42f09-36f7-4912-b9cb-c4363d5ca7ad";

  const webhookBody = buildCnibTokenWebhookRequestBody(
    cartorioIdFromUser,
    user.id
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const tokenResponse = await fetch(cnibWebhookUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await tokenResponse.text();
    let tokenData: Record<string, unknown>;
    try {
      tokenData = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        {
          error: "Resposta do webhook não é JSON válido",
          status: tokenResponse.status,
        },
        { status: 502 }
      );
    }

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          error: `Webhook retornou ${tokenResponse.status}`,
          details: tokenData,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(tokenData);
  } catch (error) {
    console.error("❌ Erro ao chamar webhook CNIB (obter-token-webhook):", error);
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Timeout ao contatar webhook CNIB"
        : error instanceof Error
          ? error.message
          : "Falha ao obter token CNIB";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
