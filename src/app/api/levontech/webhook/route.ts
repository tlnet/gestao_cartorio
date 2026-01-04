import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar payload baseado no fluxo
    if (!body.fluxo) {
      return NextResponse.json(
        { error: "Payload inválido. Campo obrigatório: fluxo" },
        { status: 400 }
      );
    }

    // Validação específica por fluxo
    if (body.fluxo === "protocolo") {
      if (!body.numero_protocolo || !body.cartorio_id) {
        return NextResponse.json(
          { error: "Payload inválido para fluxo 'protocolo'. Campos obrigatórios: numero_protocolo, cartorio_id" },
          { status: 400 }
        );
      }
    } else if (body.fluxo === "status-protocolo") {
      if (!body.status_novo || !body.cartorio_id || !body.protocolo_id) {
        return NextResponse.json(
          { error: "Payload inválido para fluxo 'status-protocolo'. Campos obrigatórios: status_novo, cartorio_id, protocolo_id" },
          { status: 400 }
        );
      }
    }

    // Fazer requisição para o webhook do servidor (sem CORS)
    const webhookUrl = "https://webhook.cartorio.app.br/webhook/72c1eaa5-27a0-441e-8786-69f7c4937d63";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Erro desconhecido");
      return NextResponse.json(
        { error: `Erro no webhook: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    // Tentar parsear como JSON
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // Se não for JSON, retornar como texto
      const textData = await response.text();
      return NextResponse.json({ data: textData, isText: true });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Erro ao chamar webhook Levontech:", error);

    if (error.name === "AbortError") {
      return NextResponse.json(
        { error: "Timeout ao chamar webhook. Tente novamente." },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Erro ao chamar webhook Levontech" },
      { status: 500 }
    );
  }
}

