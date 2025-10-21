import { NextRequest, NextResponse } from "next/server";

// Adicionar suporte para GET para teste
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Proxy API funcionando! Use POST para enviar dados.",
    timestamp: new Date().toISOString(),
    methods: ["GET", "POST", "OPTIONS"],
  });
}

export async function POST(request: NextRequest) {
  console.log("🚀 Proxy API: Rota POST chamada com sucesso!");
  console.log(
    "🔍 Proxy API: Headers recebidos:",
    Object.fromEntries(request.headers.entries())
  );

  try {
    // Verificar se o request tem body
    if (!request.body) {
      console.error("❌ Proxy API: Request sem body");
      return NextResponse.json({ error: "Request sem body" }, { status: 400 });
    }

    const body = await request.json();
    console.log("📦 Proxy API: Body recebido:", body);
    console.log("📦 Proxy API: Tipo do body:", typeof body);
    console.log("📦 Proxy API: Keys do body:", Object.keys(body));

    const { webhookUrl, payload } = body;

    if (!webhookUrl) {
      console.error("❌ Proxy API: webhookUrl não fornecido");
      return NextResponse.json(
        { error: "webhookUrl é obrigatório" },
        { status: 400 }
      );
    }

    if (!payload) {
      console.error("❌ Proxy API: payload não fornecido");
      return NextResponse.json(
        { error: "payload é obrigatório" },
        { status: 400 }
      );
    }

    console.log("🌐 Proxy API: Enviando para webhook:", webhookUrl);
    console.log("📋 Proxy API: Payload:", payload);

    // Fazer a requisição para o webhook N8N
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "GestaoCartorio/1.0",
      },
      body: JSON.stringify(payload),
    });

    console.log("📊 Proxy API: Status da resposta:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Proxy API: Erro na resposta:", errorText);
      return NextResponse.json(
        {
          error: "Erro no webhook N8N",
          status: response.status,
          details: errorText,
        },
        { status: response.status }
      );
    }

    const responseData = await response.text();
    console.log("✅ Proxy API: Resposta do webhook:", responseData);

    return NextResponse.json({
      success: true,
      message: "Webhook chamado com sucesso",
      response: responseData,
    });
  } catch (error) {
    console.error("💥 Proxy API: Erro interno:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
