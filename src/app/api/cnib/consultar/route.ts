import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * API Route para consultar CNIB por CPF/CNPJ
 * 
 * Endpoint: POST /api/cnib/consultar
 * 
 * Body:
 * {
 *   "documento": "12345678900" (CPF ou CNPJ sem formatação)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log("🔍 Iniciando consulta CNIB...");
    console.log("📋 Headers recebidos:", {
      authorization: request.headers.get("authorization") ? "Presente" : "Ausente",
      cookie: request.headers.get("cookie") ? "Presente" : "Ausente",
    });

    // Parsear o body PRIMEIRO (antes de qualquer outra operação)
    let body: any;
    try {
      body = await request.json();
      console.log("📦 Body recebido:", { documento: body.documento ? "Presente" : "Ausente" });
    } catch (parseError) {
      console.error("❌ Erro ao parsear body:", parseError);
      return NextResponse.json(
        { error: "Erro ao processar requisição", details: "Body inválido" },
        { status: 400 }
      );
    }

    const { documento } = body;

    if (!documento) {
      return NextResponse.json(
        { error: "Campo 'documento' é obrigatório" },
        { status: 400 }
      );
    }

    // Validar formato do documento (deve ter 11 ou 14 dígitos)
    const documentoLimpo = documento.replace(/\D/g, "");
    if (documentoLimpo.length !== 11 && documentoLimpo.length !== 14) {
      return NextResponse.json(
        { error: "Documento inválido. Deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)" },
        { status: 400 }
      );
    }

    console.log("📋 Documento para consulta:", documentoLimpo.substring(0, 3) + "***");

    // Verificar autenticação via Supabase
    // Prioridade: Header Authorization > Cookies
    const authHeader = request.headers.get("authorization");
    const cookies = request.headers.get("cookie");
    
    let user: any = null;
    
    try {
      // Se tiver token no header Authorization, usar ele (método preferido)
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        console.log("🔑 Token encontrado no header Authorization");
        
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
        
        if (!authError && authUser) {
          user = authUser;
          console.log("✅ Usuário autenticado via header Authorization");
        } else {
          console.log("⚠️ Erro ao autenticar via header:", authError?.message);
        }
      }
      
      // Se não tiver usuário e tiver cookies, tentar via cookies
      if (!user && cookies) {
        try {
          // Tentar extrair o token de acesso diretamente dos cookies
          const cookieString = cookies;
          const cookieMap = new Map<string, string>();
          
          cookieString.split(";").forEach((cookie: string) => {
            const [name, value] = cookie.trim().split("=");
            if (name && value) {
              cookieMap.set(name, decodeURIComponent(value));
            }
          });
          
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
          const urlPrefix = supabaseUrl.replace(/https?:\/\//, "").split(".")[0] || "";
          
          const accessToken = cookieMap.get("sb-access-token") || 
                             cookieMap.get("supabase-auth-token") ||
                             cookieMap.get(`sb-${urlPrefix}-auth-token`);
          
          if (accessToken) {
            // Usar o cliente Supabase padrão para validar o token
            const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser(accessToken);
            
            if (!sessionError && sessionUser) {
              user = sessionUser;
              console.log("✅ Usuário autenticado via cookies");
            } else {
              console.log("⚠️ Erro ao autenticar via cookies:", sessionError?.message);
            }
          }
        } catch (cookieError) {
          console.error("❌ Erro ao processar cookies:", cookieError);
        }
      }
    } catch (authError) {
      console.error("❌ Erro geral na autenticação:", authError);
    }
    
    if (!user) {
      console.error("❌ Usuário não autenticado");
      console.error("📋 Debug:", {
        hasAuthHeader: !!authHeader,
        hasCookies: !!cookies,
        authHeaderStart: authHeader?.substring(0, 20),
      });
      return NextResponse.json(
        { error: "Não autorizado. Autenticação necessária." },
        { status: 401 }
      );
    }

    console.log("👤 Usuário autenticado:", user.id);

    // Obter CPF da SERVENTIA (cartório) para a consulta CNIB
    // IMPORTANTE: Este é o CPF da SERVENTIA cadastrado na CNIB, não do usuário logado
    // Este CPF é o mesmo para todas as consultas e deve estar configurado na variável de ambiente
    // Prioridade: Variável de ambiente CNIB_CPF_USUARIO > Tabela users (se existir)
    let cpfUsuario: string | null = null;
    
    // Primeiro, tentar usar a variável de ambiente (recomendado)
    if (process.env.CNIB_CPF_USUARIO) {
      cpfUsuario = process.env.CNIB_CPF_USUARIO;
      console.log("✅ CPF obtido da variável de ambiente CNIB_CPF_USUARIO");
    } else {
      // Se não tiver na variável de ambiente, tentar buscar da tabela users (opcional)
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("cpf")
          .eq("id", user.id)
          .single();
        
        if (!userError && userData?.cpf) {
          cpfUsuario = userData.cpf;
          console.log("✅ CPF obtido da tabela users");
        } else {
          console.log("⚠️ CPF não encontrado na tabela users, usando apenas variável de ambiente");
        }
      } catch (error) {
        console.log("⚠️ Erro ao buscar CPF da tabela (não crítico):", error);
        // Não é crítico, continuar sem CPF da tabela
      }
    }

    // Buscar token CNIB do webhook N8N
    const cnibWebhookUrl = process.env.CNIB_WEBHOOK_URL || 
      "https://webhook.conversix.com.br/webhook/56a42f09-36f7-4912-b9cb-c4363d5ca7ad";

    console.log("🔍 Buscando token CNIB do webhook N8N:", cnibWebhookUrl);

    let token: string | null = null;

    try {
      console.log("📡 Fazendo requisição GET para webhook...");
      
      // Adicionar timeout para evitar requisições infinitas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
      
      // Fazer requisição ao webhook N8N para obter o token
      const tokenResponse = await fetch(cnibWebhookUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("📊 Resposta do webhook:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        ok: tokenResponse.ok,
        contentType: tokenResponse.headers.get("content-type"),
      });

      if (!tokenResponse.ok) {
        let errorText = "";
        try {
          errorText = await tokenResponse.text();
        } catch (e) {
          errorText = "Não foi possível ler a resposta de erro";
        }
        console.error("❌ Erro na resposta do webhook:", {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorText,
        });
        throw new Error(`Webhook retornou erro ${tokenResponse.status}: ${errorText || tokenResponse.statusText}`);
      }

      let tokenData: any;
      try {
        tokenData = await tokenResponse.json();
      } catch (jsonError) {
        console.error("❌ Erro ao parsear JSON do webhook:", jsonError);
        throw new Error("Resposta do webhook não é um JSON válido");
      }

      console.log("📦 Dados recebidos do webhook:", {
        hasCnibAccessToken: !!tokenData.cnib_access_token,
        hasAccessToken: !!tokenData.access_token,
        hasToken: !!tokenData.token,
        keys: Object.keys(tokenData),
      });
      
      // O webhook retorna o token no formato: { "cnib_access_token": "..." }
      token = tokenData.cnib_access_token || tokenData.access_token || tokenData.token;

      if (!token) {
        console.error("❌ Token não encontrado na resposta:", tokenData);
        throw new Error("Token não encontrado na resposta do webhook. Verifique o formato da resposta. Campos esperados: cnib_access_token, access_token ou token.");
      }

      console.log("✅ Token CNIB obtido do webhook N8N com sucesso (tamanho:", token.length, "caracteres)");
    } catch (error) {
      console.error("❌ Erro ao buscar token CNIB do webhook:", error);
      
      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.name === "AbortError") {
          errorMessage = "Timeout ao buscar token do webhook (30 segundos). Verifique se o webhook está acessível.";
        }
      }
      
      return NextResponse.json(
        {
          error: "Token CNIB não disponível",
          details: errorMessage,
          hint: "Verifique se o webhook N8N está configurado corretamente e acessível.",
        },
        { status: 503 }
      );
    }

    if (!token) {
      return NextResponse.json(
        {
          error: "Token CNIB não disponível",
          details: "Token não retornado pelo webhook N8N.",
        },
        { status: 503 }
      );
    }

    // Validar CPF do usuário da serventia
    if (!cpfUsuario) {
      console.error("❌ CPF da serventia não configurado");
      console.error("📋 Variáveis de ambiente verificadas:", {
        hasCNIB_CPF_USUARIO: !!process.env.CNIB_CPF_USUARIO,
        CNIB_CPF_USUARIO_length: process.env.CNIB_CPF_USUARIO?.length || 0,
      });
      return NextResponse.json(
        {
          error: "Configuração incompleta",
          details: "CPF da SERVENTIA não está configurado. Este é o CPF do cartório cadastrado na CNIB (não o CPF da pessoa consultada). Configure a variável de ambiente CNIB_CPF_USUARIO com o CPF da serventia (11 dígitos, sem formatação). Exemplo: CNIB_CPF_USUARIO=12345678900",
          solution: "Adicione no arquivo .env.local: CNIB_CPF_USUARIO=CPF_DA_SERVENTIA (apenas números, 11 dígitos). Este CPF é o mesmo para todas as consultas e representa o cartório que está fazendo a consulta.",
        },
        { status: 500 }
      );
    }

    const cpfUsuarioLimpo = cpfUsuario.replace(/\D/g, "");
    console.log("👤 CPF da serventia (limpo):", cpfUsuarioLimpo.substring(0, 3) + "***");
    
    if (cpfUsuarioLimpo.length !== 11) {
      return NextResponse.json(
        {
          error: "CPF da serventia inválido",
          details: `O CPF da serventia deve ter 11 dígitos. Encontrado: ${cpfUsuarioLimpo.length} dígitos. Verifique a variável CNIB_CPF_USUARIO.`,
        },
        { status: 400 }
      );
    }

    // Fazer requisição para a API CNIB
    // URLs corretas segundo documentação:
    // Desenvolvimento: https://stg-serventia-api.onr.org.br/api/ordem/consultar
    // Produção: https://serventia-api.onr.org.br/api/ordem/consultar
    const cnibApiUrl = process.env.CNIB_API_URL || "https://serventia-api.onr.org.br/api/ordem/consultar";

    console.log("🌐 Configuração da requisição CNIB:", {
      url: cnibApiUrl,
      urlFromEnv: !!process.env.CNIB_API_URL,
      cpfUsuario: cpfUsuarioLimpo.substring(0, 3) + "***",
      documento: documentoLimpo.substring(0, 3) + "***",
      hasToken: !!token,
      tokenLength: token?.length || 0,
      nodeEnv: process.env.NODE_ENV,
    });

    // Validar URL
    try {
      const urlObj = new URL(cnibApiUrl);
      console.log("✅ URL válida:", {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        pathname: urlObj.pathname,
      });
    } catch (urlError) {
      console.error("❌ URL inválida:", urlError);
      return NextResponse.json(
        {
          error: "URL da API CNIB inválida",
          details: `A URL configurada não é válida: ${cnibApiUrl}`,
          hint: "Verifique a variável de ambiente CNIB_API_URL.",
        },
        { status: 500 }
      );
    }

    let response: Response;
    try {
      console.log("🌐 Preparando requisição para API CNIB:", {
        url: cnibApiUrl,
        method: "POST",
        hasToken: !!token,
        tokenLength: token?.length || 0,
        cpfUsuario: cpfUsuarioLimpo.substring(0, 3) + "***",
        documento: documentoLimpo.substring(0, 3) + "***",
      });

      // Adicionar timeout para evitar requisições infinitas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos
      
      const requestBody = {
        cpf_usuario: cpfUsuarioLimpo,
        documento: documentoLimpo,
      };

      console.log("📤 Enviando requisição para API CNIB...");
      
      response = await fetch(cnibApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log("📊 Status da resposta CNIB:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (fetchError) {
      console.error("❌ Erro ao fazer fetch para API CNIB:", {
        error: fetchError,
        name: fetchError instanceof Error ? fetchError.name : "Unknown",
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
        url: cnibApiUrl,
      });
      
      let errorMessage = "Erro de conexão";
      let hint = "Verifique se a API CNIB está acessível e se a URL está correta (CNIB_API_URL).";
      
      if (fetchError instanceof Error) {
        errorMessage = fetchError.message;
        
        if (fetchError.name === "AbortError") {
          errorMessage = "Timeout ao conectar com API CNIB (60 segundos). A API pode estar lenta ou inacessível.";
          hint = "A requisição demorou mais de 60 segundos para responder. Verifique se a API CNIB está funcionando.";
        } else if (fetchError.message.includes("fetch failed")) {
          errorMessage = "Não foi possível conectar com a API CNIB.";
          hint = "Verifique sua conexão com a internet, se a URL da API está correta e se não há bloqueios de firewall.";
        } else if (fetchError.message.includes("ECONNREFUSED") || fetchError.message.includes("ENOTFOUND")) {
          errorMessage = "Não foi possível resolver o endereço da API CNIB.";
          hint = "Verifique se a URL da API CNIB está correta e se o domínio está acessível.";
        } else if (fetchError.message.includes("CERT") || fetchError.message.includes("SSL")) {
          errorMessage = "Erro de certificado SSL ao conectar com a API CNIB.";
          hint = "Verifique se o certificado SSL da API CNIB está válido.";
        }
      }
      
      return NextResponse.json(
        {
          error: "Erro ao conectar com API CNIB",
          details: errorMessage,
          hint: hint,
          url: cnibApiUrl, // Incluir URL para debug
        },
        { status: 503 }
      );
    }

    if (!response.ok) {
      let errorText = "";
      try {
        errorText = await response.text();
        console.error("❌ Erro na resposta CNIB:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
      } catch (textError) {
        console.error("❌ Erro ao ler resposta de erro:", textError);
        errorText = `Status ${response.status}: ${response.statusText}`;
      }

      return NextResponse.json(
        {
          error: "Erro ao consultar CNIB",
          status: response.status,
          details: errorText || "Erro desconhecido",
        },
        { status: response.status }
      );
    }

    let data: any;
    try {
      // Ler como texto primeiro para debug
      const responseText = await response.text();
      console.log("📥 Resposta bruta da API CNIB:", {
        status: response.status,
        textLength: responseText.length,
        textPreview: responseText.substring(0, 500),
      });

      if (!responseText || responseText.trim().length === 0) {
        console.error("❌ Resposta vazia da API CNIB");
        return NextResponse.json(
          {
            error: "Resposta vazia da API CNIB",
            details: "A API CNIB retornou uma resposta vazia. Verifique se a consulta foi processada corretamente.",
          },
          { status: 500 }
        );
      }

      try {
        data = JSON.parse(responseText);
        console.log("✅ Resposta CNIB parseada com sucesso:", {
          hasData: !!data,
          keys: data ? Object.keys(data) : [],
        });
      } catch (parseError) {
        console.error("❌ Erro ao parsear JSON da resposta CNIB:", parseError);
        console.error("📄 Resposta completa:", responseText);
        return NextResponse.json(
          {
            error: "Erro ao processar resposta da API CNIB",
            details: `Resposta não é um JSON válido: ${responseText.substring(0, 200)}`,
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("❌ Erro geral ao processar resposta:", error);
      return NextResponse.json(
        {
          error: "Erro ao processar resposta da API CNIB",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 500 }
      );
    }

    console.log("✅ Consulta CNIB realizada com sucesso");

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("💥 Erro geral ao processar consulta CNIB:", error);
    console.error("💥 Stack trace:", error instanceof Error ? error.stack : "N/A");
    return NextResponse.json(
      {
        error: "Erro ao processar consulta",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

