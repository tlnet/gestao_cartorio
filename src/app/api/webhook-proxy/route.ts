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

    const contentType = request.headers.get("content-type") || "";
    let response: Response;
    let webhookUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const webhookUrlRaw = formData.get("webhookUrl");
      const payloadRaw = formData.get("payload");
      const file = formData.get("file");

      if (!webhookUrlRaw || typeof webhookUrlRaw !== "string") {
        return NextResponse.json(
          { error: "webhookUrl é obrigatório no multipart" },
          { status: 400 }
        );
      }
      if (!payloadRaw || typeof payloadRaw !== "string") {
        return NextResponse.json(
          { error: "payload é obrigatório no multipart (JSON string)" },
          { status: 400 }
        );
      }

      webhookUrl = webhookUrlRaw;
      const forwardFormData = new FormData();
      forwardFormData.append("payload", payloadRaw);
      if (file instanceof File && file.size > 0) {
        forwardFormData.append("file", file, file.name || "documento.pdf");
      }

      console.log("🌐 Proxy API (multipart): Enviando para webhook:", webhookUrl);
      const multipartAbort = new AbortController();
      const multipartTimer = setTimeout(() => multipartAbort.abort(), 55_000);
      try {
        response = await fetch(webhookUrl, {
          method: "POST",
          body: forwardFormData,
          signal: multipartAbort.signal,
        });
      } finally {
        clearTimeout(multipartTimer);
      }
    } else {
      const body = await request.json();
      console.log("📦 Proxy API: Body recebido:", body);
      console.log("📦 Proxy API: Tipo do body:", typeof body);
      console.log("📦 Proxy API: Keys do body:", Object.keys(body));

      const { webhookUrl: jsonWebhookUrl, payload } = body;

      if (!jsonWebhookUrl) {
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

      webhookUrl = jsonWebhookUrl;
      console.log("🌐 Proxy API: Enviando para webhook:", webhookUrl);
      console.log("📋 Proxy API: Payload:", payload);

      const jsonAbort = new AbortController();
      const jsonTimer = setTimeout(() => jsonAbort.abort(), 55_000);
      try {
        response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: jsonAbort.signal,
        });
      } finally {
        clearTimeout(jsonTimer);
      }
    }

    console.log("📊 Proxy API: Status da resposta:", response.status);

    if (!response.ok) {
      let errorText = "";
      let errorData: any = null;
      
      try {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } else {
          errorText = await response.text();
        }
      } catch (parseError) {
        errorText = `Erro ao ler resposta: ${response.status} ${response.statusText}`;
      }

      console.error("❌ Proxy API: Erro na resposta do webhook:", {
        status: response.status,
        statusText: response.statusText,
        url: webhookUrl,
        errorText,
        errorData,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Mensagem mais específica para 404
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "Webhook não encontrado (404)",
            status: response.status,
            details: `A URL "${webhookUrl}" não está disponível. Verifique se o webhook está configurado corretamente no N8N e se está ativo.`,
            webhookUrl: webhookUrl,
          },
          { status: response.status }
        );
      }

      return NextResponse.json(
        {
          error: "Erro no webhook N8N",
          status: response.status,
          statusText: response.statusText,
          details: errorText || errorData || "Erro desconhecido",
          webhookUrl: webhookUrl,
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
    if ((error as any)?.name === "AbortError") {
      console.error("⏱️ Proxy API: Timeout ao chamar webhook (55s)");
      return NextResponse.json(
        {
          error: "Tempo limite excedido",
          details:
            "O webhook não respondeu dentro de 55 segundos. Verifique se o N8N está acessível e o workflow está ativo.",
        },
        { status: 504 }
      );
    }
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
