import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Webhook para receber tokens CNIB do N8N
 * O N8N envia o token a cada 1h via webhook
 * 
 * Payload esperado do N8N:
 * {
 *   "cnib_access_token": "eyJhbGciOiJSUzI1NiIs..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook CNIB Token recebido:", {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
    });

    // Verificar se as variáveis de ambiente estão configuradas
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error("❌ Variáveis de ambiente do Supabase não configuradas");
      return NextResponse.json(
        { error: "Variáveis de ambiente do Supabase não configuradas" },
        { status: 503 }
      );
    }

    // Parsear o body
    const body = await request.json();
    console.log("📦 Dados recebidos do N8N:", {
      hasToken: !!body.cnib_access_token,
      tokenLength: body.cnib_access_token?.length || 0,
    });

    // Validar que o token foi enviado
    if (!body.cnib_access_token) {
      console.error("❌ Token CNIB não encontrado no payload");
      return NextResponse.json(
        { error: "cnib_access_token é obrigatório" },
        { status: 400 }
      );
    }

    // Decodificar o JWT para obter a data de expiração
    // O token JWT tem 3 partes separadas por ponto: header.payload.signature
    let expiresAt: Date;
    try {
      const tokenParts = body.cnib_access_token.split(".");
      if (tokenParts.length !== 3) {
        throw new Error("Token JWT inválido");
      }

      // Decodificar o payload (segunda parte)
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], "base64").toString("utf-8")
      );

      // O campo 'exp' contém o timestamp de expiração em segundos
      if (payload.exp) {
        expiresAt = new Date(payload.exp * 1000);
        console.log("📅 Token expira em:", expiresAt.toISOString());
      } else {
        // Se não tiver exp, assumir que expira em 1 hora (padrão)
        expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        console.log("⚠️ Token sem data de expiração, assumindo 1 hora");
      }
    } catch (error) {
      console.error("❌ Erro ao decodificar token:", error);
      // Se não conseguir decodificar, assumir que expira em 1 hora
      expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      console.log("⚠️ Assumindo expiração em 1 hora devido ao erro");
    }

    // Salvar o token no banco de dados
    const { data, error } = await supabase
      .from("cnib_tokens")
      .insert([
        {
          access_token: body.cnib_access_token,
          expires_at: expiresAt.toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Erro ao salvar token no banco:", error);
      return NextResponse.json(
        {
          error: "Erro ao salvar token no banco de dados",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Token CNIB salvo com sucesso:", {
      id: data.id,
      expiresAt: data.expires_at,
    });

    return NextResponse.json({
      success: true,
      message: "Token CNIB recebido e salvo com sucesso",
      token_id: data.id,
      expires_at: data.expires_at,
    });
  } catch (error) {
    console.error("💥 Erro ao processar webhook CNIB:", error);
    return NextResponse.json(
      {
        error: "Erro ao processar webhook",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// Permitir GET para teste
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook CNIB Token está funcionando",
    endpoint: "/api/cnib/webhook",
    method: "POST",
    expectedPayload: {
      cnib_access_token: "string (JWT token)",
    },
  });
}

