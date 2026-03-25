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

    // Definir URL do webhook baseado no fluxo
    let webhookUrl: string;
    
    if (body.fluxo === "protocolo") {
      // Webhook específico para autopreenchimento de protocolo
      webhookUrl =
        "https://webhook.conversix.com.br/webhook/api/n8n/protocolos/autopreenchimento";
    } else if (body.fluxo === "status-protocolo") {
      // Webhook específico para notificação de mudança de status
      webhookUrl = "https://webhook.conversix.com.br/webhook/api/n8n/protocolos/status";
    } else {
      // Webhook padrão para outros fluxos
      webhookUrl = "https://webhook.cartorio.app.br/webhook/72c1eaa5-27a0-441e-8786-69f7c4937d63";
    }

    console.log("📤 Chamando webhook:", {
      fluxo: body.fluxo,
      url: webhookUrl,
      payload: {
        ...body,
        // Evita vazar credenciais sensíveis nos logs
        api_token_zdg: body.api_token_zdg ? "***" : null,
        credenciais_levontech: body.credenciais_levontech ? "***" : undefined,
      },
    });

    // Verificar se a URL está bem formada
    try {
      new URL(webhookUrl);
    } catch (urlError) {
      console.error("❌ URL do webhook inválida:", webhookUrl);
      return NextResponse.json(
        { error: `URL do webhook inválida: ${webhookUrl}` },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      // Para GET, passar os parâmetros na URL como query string
      if (body.fluxo === "protocolo") {
        // Webhook de autopreenchimento usa GET com query parameters
        const params = new URLSearchParams();
        
        // Adicionar parâmetros básicos
        if (body.numero_protocolo) params.append("numero_protocolo", body.numero_protocolo);
        if (body.demanda) params.append("demanda", body.demanda);
        if (body.cartorio_id) params.append("cartorio_id", body.cartorio_id);
        params.append("fluxo", body.fluxo || "protocolo");
        
        // Adicionar credenciais Levontech
        if (body.credenciais_levontech) {
          if (body.credenciais_levontech.url) params.append("levontech_url", body.credenciais_levontech.url);
          if (body.credenciais_levontech.username) params.append("levontech_username", body.credenciais_levontech.username);
          if (body.credenciais_levontech.password) params.append("levontech_password", body.credenciais_levontech.password);
        }
        
        const urlWithParams = `${webhookUrl}?${params.toString()}`;
        const logUrl = urlWithParams.replace(/levontech_password=[^&]+/, "levontech_password=***");
        console.log("📤 URL com parâmetros (GET):", logUrl);
        
        response = await fetch(urlWithParams, {
          method: "GET",
          signal: controller.signal,
        });
      } else {
        // Outros fluxos continuam usando POST
        response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error("❌ Erro ao fazer fetch para webhook:", fetchError);
      
      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          { error: "Timeout ao chamar webhook. Tente novamente." },
          { status: 408 }
        );
      }
      
      return NextResponse.json(
        { error: `Erro de conexão: ${fetchError.message || "Não foi possível conectar ao webhook"}` },
        { status: 500 }
      );
    }

    clearTimeout(timeoutId);

    console.log("📥 Resposta do webhook:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
    });

    if (!response.ok) {
      let errorText: string;
      try {
        errorText = await response.text();
      } catch {
        errorText = "Erro desconhecido";
      }
      
      console.error("❌ Erro na resposta do webhook:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url: webhookUrl,
      });
      
      return NextResponse.json(
        { 
          error: `Erro no webhook: ${response.status} ${response.statusText}`, 
          details: errorText,
          url: webhookUrl,
        },
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

