import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { buildCnibTokenWebhookRequestBody } from "@/lib/cnib-webhook-token-body";
import { createSupabaseWithUserJwt } from "@/lib/supabase-with-user-jwt";

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
    let accessToken: string | null = null;
    
    try {
      // Se tiver token no header Authorization, usar ele (método preferido)
      if (authHeader && authHeader.startsWith("Bearer ")) {
        accessToken = authHeader.replace("Bearer ", "");
        console.log("🔑 Token encontrado no header Authorization");
        
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(accessToken);
        
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
          
          accessToken = cookieMap.get("sb-access-token") || 
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
    console.log("🔑 Token disponível:", !!accessToken);

    const dbUser = accessToken
      ? createSupabaseWithUserJwt(accessToken)
      : supabase;

    // Obter cartório do usuário (RLS exige requisição com JWT do usuário)
    let cartorioIdFromUser: string | null = null;
    try {
      if (!accessToken) {
        console.warn(
          "⚠️ JWT da sessão ausente; cartorio_id pode ficar null (RLS em users)"
        );
      }
      const { data: userData, error: userDataError } = await dbUser
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      if (userDataError) {
        console.warn(
          "⚠️ Erro ao ler cartorio_id (users):",
          userDataError.message
        );
      } else if (userData?.cartorio_id) {
        cartorioIdFromUser = String(userData.cartorio_id);
      }
    } catch (e) {
      console.warn("⚠️ Não foi possível obter cartorio_id do usuário:", e);
    }

    // Log de presença (sem vazar segredos) das credenciais CNIB para verificação
    try {
      if (cartorioIdFromUser) {
        const { data: cartorioData, error: cartorioDataError } = await dbUser
          .from("cartorios")
          .select("cnib_client_id, cnib_client_secret")
          .eq("id", cartorioIdFromUser)
          .single();

        if (!cartorioDataError) {
          console.log("🔎 CNIB credenciais por cartório:", {
            cartorio_id: cartorioIdFromUser,
            hasCnibClientId: !!cartorioData?.cnib_client_id,
            hasCnibClientSecret: !!cartorioData?.cnib_client_secret,
          });
        } else {
          console.warn(
            "⚠️ Erro ao verificar credenciais CNIB no banco:",
            cartorioDataError
          );
        }
      } else {
        console.log("🔎 CNIB credenciais por cartório: cartorio_id não encontrado para o usuário");
      }
    } catch (e) {
      console.warn("⚠️ Falha ao checar credenciais CNIB por cartório:", e);
    }

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
        const { data: userData, error: userError } = await dbUser
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

    const cnibTokenWebhookBody = buildCnibTokenWebhookRequestBody(
      cartorioIdFromUser,
      user.id
    );

    console.log("📨 Webhook N8N CNIB (POST body):", cnibTokenWebhookBody);

    let token: string | null = null;

    try {
      console.log("📡 Fazendo requisição POST para webhook...");

      // Adicionar timeout para evitar requisições infinitas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

      const tokenResponse = await fetch(cnibWebhookUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cnibTokenWebhookBody),
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
      let errorData: any = null;
      
      try {
        errorText = await response.text();
        
        // Tentar parsear como JSON para extrair detalhes
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          // Se não for JSON, usar como texto
          errorData = { message: errorText };
        }
        
        console.error("❌ Erro na resposta CNIB:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          parsedError: errorData,
        });
      } catch (textError) {
        console.error("❌ Erro ao ler resposta de erro:", textError);
        errorText = `Status ${response.status}: ${response.statusText}`;
      }

      // Extrair informações específicas do erro
      let errorMessage = "Erro ao consultar CNIB";
      let errorDetails = errorText || "Erro desconhecido";
      let errorHint = "";
      
      if (errorData) {
        // Verificar se há notificações com detalhes específicos
        if (errorData.notifications && Array.isArray(errorData.notifications) && errorData.notifications.length > 0) {
          const notification = errorData.notifications[0];
          errorMessage = notification.reason || errorData.message || errorMessage;
          errorDetails = errorData.message || errorDetails;
          
          // Informações adicionais
          if (notification.title) {
            errorDetails += `\nDocumento consultado: ${notification.title}`;
          }
          
          // Dica específica para erro de autorização
          if (notification.reason && notification.reason.includes("autorização")) {
            errorHint = `O CPF da serventia (${cpfUsuarioLimpo.substring(0, 3)}***) não possui autorização na API CNIB. Verifique se o CPF está correto e se a serventia está cadastrada na CNIB.`;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
          errorDetails = errorText;
        }
      }

      // Buscar cartório do usuário para salvar a consulta com erro
      let cartorioId: string | null = null;
      try {
        const { data: userData } = await dbUser
          .from("users")
          .select("cartorio_id")
          .eq("id", user.id)
          .single();

        if (userData?.cartorio_id) {
          cartorioId = userData.cartorio_id;
        }
      } catch (error) {
        console.warn("⚠️ Erro ao buscar cartório do usuário (não crítico):", error);
      }

      // Salvar consulta com erro no banco de dados
      if (cartorioId) {
        try {
          const tipoDocumento = documentoLimpo.length === 11 ? "CPF" : "CNPJ";
          const { data: insertedData, error: insertError } = await dbUser
            .from("consultas_cnib")
            .insert([
              {
                documento: documentoLimpo,
                tipo_documento: tipoDocumento,
                status: "erro",
                mensagem_erro: errorMessage || errorText || `Erro ${response.status}: ${response.statusText}`,
                usuario_id: user.id,
                cartorio_id: cartorioId,
              },
            ])
            .select();

          if (insertError) {
            console.error("❌ Erro ao salvar consulta com erro no banco:", {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
            });
          } else {
            console.log("✅ Consulta com erro salva no banco:", insertedData);
          }
        } catch (error) {
          console.error("❌ Erro ao salvar consulta com erro no banco:", error);
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          status: response.status,
          details: errorDetails,
          hint: errorHint,
          // Incluir informações de debug (apenas em desenvolvimento)
          ...(process.env.NODE_ENV === 'development' && {
            debug: {
              documentoConsultado: documentoLimpo,
              cpfServentia: cpfUsuarioLimpo.substring(0, 3) + "***",
              errorData: errorData,
            }
          }),
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
    console.log("📦 Estrutura completa dos dados recebidos:", JSON.stringify(data, null, 2));
    
    // Log detalhado da estrutura para debug - especialmente para hash
    console.log("🔍 Análise detalhada da estrutura (foco em hash):", {
      nivel1: {
        keys: data ? Object.keys(data) : [],
        hasData: !!data?.data,
        identifierRequest: data?.identifierRequest || "NÃO ENCONTRADO",
        hasHash: !!data?.hash,
        hash: data?.hash || "NÃO ENCONTRADO",
      },
      nivel2: data?.data ? {
        keys: Object.keys(data.data),
        hasData: !!data.data.data,
        identifierRequest: data.data.identifierRequest || "NÃO ENCONTRADO",
        hasDadosUsuario: !!data.data.dados_usuario,
        dadosUsuarioHash: data.data.dados_usuario?.hash || "NÃO ENCONTRADO",
      } : null,
      nivel3: data?.data?.data ? {
        keys: Object.keys(data.data.data),
        hasDadosUsuario: !!data.data.data.dados_usuario,
        dadosUsuarioHash: data.data.data.dados_usuario?.hash || "NÃO ENCONTRADO",
        identifierRequest: data.data.data.identifierRequest || "NÃO ENCONTRADO",
      } : null,
    });

    // Buscar cartório do usuário para salvar a consulta
    let cartorioId: string | null = null;
    
    try {
      // Criar cliente Supabase autenticado para buscar cartório
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("❌ Variáveis de ambiente do Supabase não configuradas");
      } else {
        // Criar cliente autenticado
        const supabaseClient = accessToken 
          ? createClient(supabaseUrl, supabaseAnonKey, {
              global: {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            })
          : supabase;

        const { data: userData, error: userError } = await supabaseClient
          .from("users")
          .select("cartorio_id")
          .eq("id", user.id)
          .single();

        if (!userError && userData?.cartorio_id) {
          cartorioId = userData.cartorio_id;
          console.log("✅ Cartório encontrado:", cartorioId);
        } else {
          console.error("❌ Erro ao buscar cartório:", userError);
        }
      }
    } catch (error) {
      console.error("❌ Erro ao buscar cartório do usuário:", error);
    }

    // Salvar consulta no banco de dados
    if (cartorioId) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error("❌ Variáveis de ambiente do Supabase não configuradas");
        } else {
          // Criar cliente autenticado com o token
          const supabaseClient = accessToken 
            ? createClient(supabaseUrl, supabaseAnonKey, {
                global: {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                },
              })
            : supabase;

          const tipoDocumento = documentoLimpo.length === 11 ? "CPF" : "CNPJ";
          
          // A resposta da API CNIB tem estrutura: { success: true, data: { data: { ... }, identifierRequest: "..." } }
          // Quando retornamos { success: true, data: data }, o frontend recebe o objeto completo
          // Então aqui, `data` já é o objeto completo com `success` e `data`
          // Precisamos acessar data.data.data para os dados reais
          const dadosReais = data?.data?.data || data?.data || data;
          
          console.log("🔍 Estrutura dos dados para extração:", {
            hasData: !!data,
            hasDataData: !!data?.data,
            hasDataDataData: !!data?.data?.data,
            keysData: data ? Object.keys(data) : [],
            keysDataData: data?.data ? Object.keys(data.data) : [],
            keysDataDataData: data?.data?.data ? Object.keys(data.data.data) : [],
            dadosUsuario: dadosReais?.dados_usuario,
            dadosUsuarioHash: dadosReais?.dados_usuario?.hash,
            identifierRequest: data?.data?.identifierRequest,
          });
          
          // Extrair nome/razão social - pode estar em vários lugares na resposta
          // Tentar múltiplas possibilidades de estrutura
          // Nota: A API CNIB pode não retornar nome/razão social quando não há indisponibilidade
          let nomeRazaoSocial = dadosReais?.nomeRazao || 
                                  dadosReais?.nome || 
                                  dadosReais?.razaoSocial || 
                                dadosReais?.nomeRazaoSocial ||
                                dadosReais?.nomeRazaoSocial ||
                                data?.data?.nomeRazao ||
                                data?.data?.nome ||
                                data?.data?.razaoSocial ||
                                data?.data?.nomeRazaoSocial ||
                                data?.nomeRazao ||
                                data?.nome ||
                                data?.razaoSocial ||
                                data?.nomeRazaoSocial ||
                                  null;
          
          // Se ainda não encontrou, tentar extrair de dados_usuario (pode conter nome do usuário que fez a consulta)
          // Mas isso não é o nome/razão social do documento consultado, então só usar como último recurso
          if (!nomeRazaoSocial) {
            // Verificar se há algum campo que possa conter o nome
            const possivelNome = dadosReais?.dados_usuario?.nome ||
                                 dadosReais?.dadosUsuario?.nome ||
                                 data?.data?.dados_usuario?.nome ||
                                 data?.data?.dadosUsuario?.nome ||
                                 null;
            
            // Só usar se realmente não houver outra opção (pode ser o nome do usuário, não do documento)
            // Por enquanto, deixar como null se não encontrar
            // nomeRazaoSocial = possivelNome; // Comentado - pode ser confuso
          }
          
          // Extrair hash - pode estar em vários lugares
          // Prioridade: dados_usuario.hash > identifierRequest > hash direto
          // IMPORTANTE: identifierRequest geralmente é o hash da consulta retornado pela API CNIB
          let hashConsulta = dadosReais?.dados_usuario?.hash ||
                              dadosReais?.dadosUsuario?.hash ||
                            data?.data?.dados_usuario?.hash ||
                            data?.data?.dadosUsuario?.hash ||
                            data?.dados_usuario?.hash ||
                            data?.dadosUsuario?.hash ||
                            null;
          
          // Se não encontrou em dados_usuario, tentar identifierRequest
          // identifierRequest é geralmente o hash principal retornado pela API CNIB
          // IMPORTANTE: Só usar identifierRequest se não for um UUID (que começa com números e hífens)
          // Hash válido da CNIB geralmente é uma string alfanumérica curta (ex: "s7dtr75wf6")
          if (!hashConsulta) {
            const identifierRequest = data?.data?.identifierRequest ||
                              data?.identifierRequest ||
                                    dadosReais?.identifierRequest ||
                              null;
            
            // Verificar se identifierRequest parece ser um hash válido (não um UUID)
            // Hash CNIB geralmente tem 10-15 caracteres alfanuméricos
            // UUID tem formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
            if (identifierRequest) {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifierRequest);
              const isHashLike = /^[a-z0-9]{8,20}$/i.test(identifierRequest);
              
              // Só usar identifierRequest se parecer um hash válido (não UUID)
              if (isHashLike && !isUUID) {
                hashConsulta = identifierRequest;
                console.log("✅ Hash encontrado em identifierRequest (formato válido):", identifierRequest);
              } else {
                console.warn("⚠️ identifierRequest encontrado mas não parece ser um hash válido:", {
                  identifierRequest,
                  isUUID,
                  isHashLike,
                  length: identifierRequest.length,
                });
              }
            }
          }
          
          // Última tentativa: hash direto (só se parecer válido)
          if (!hashConsulta) {
            const hashDireto = dadosReais?.hash || data?.hash || null;
            if (hashDireto) {
              const isHashLike = /^[a-z0-9]{8,20}$/i.test(hashDireto);
              if (isHashLike) {
                hashConsulta = hashDireto;
              } else {
                console.warn("⚠️ Hash direto encontrado mas não parece válido:", hashDireto);
              }
            }
          }
          
          // Log específico do hash
          if (hashConsulta) {
            console.log("✅ Hash encontrado e validado:", {
              hash: hashConsulta,
              hashLength: hashConsulta.length,
              origem: dadosReais?.dados_usuario?.hash ? "dados_usuario.hash" :
                      dadosReais?.dadosUsuario?.hash ? "dadosUsuario.hash" :
                      data?.data?.identifierRequest ? "data.data.identifierRequest" :
                      data?.identifierRequest ? "data.identifierRequest" :
                      "outro",
            });
          } else {
            console.warn("⚠️ Hash não encontrado ou não é válido. NÃO será salvo no banco.");
            console.warn("📋 Estrutura data:", {
              hasData: !!data,
              hasDataData: !!data?.data,
              keysData: data ? Object.keys(data) : [],
              keysDataData: data?.data ? Object.keys(data.data) : [],
              identifierRequest: data?.data?.identifierRequest || data?.identifierRequest,
              dadosUsuario: data?.data?.dados_usuario || data?.dados_usuario,
            });
          }
          
          // Log detalhado para debug
          console.log("🔍 Extração de dados:", {
            nomeRazaoSocial: nomeRazaoSocial || "NÃO ENCONTRADO",
            hashConsulta: hashConsulta ? hashConsulta.substring(0, 20) + "..." : "NÃO ENCONTRADO",
            estruturaDadosReais: {
              hasNomeRazao: !!dadosReais?.nomeRazao,
              hasNome: !!dadosReais?.nome,
              hasRazaoSocial: !!dadosReais?.razaoSocial,
              hasDadosUsuario: !!dadosReais?.dados_usuario,
              hasDadosUsuarioHash: !!dadosReais?.dados_usuario?.hash,
            },
            estruturaData: {
              hasData: !!data?.data,
              hasIdentifierRequest: !!data?.data?.identifierRequest,
              hasHash: !!data?.hash,
            },
          });
          
          const indisponivel = dadosReais?.indisponivel || false;
          const quantidadeOrdens = dadosReais?.qtdOrdens || 
                                  dadosReais?.quantidadeOrdens || 
                                  0;

          console.log("💾 Tentando salvar consulta no banco:", {
            documento: documentoLimpo.substring(0, 3) + "***",
            tipo_documento: tipoDocumento,
            nome_razao_social: nomeRazaoSocial,
            hash_consulta: hashConsulta || "NÃO ENCONTRADO",
            hash_consulta_length: hashConsulta?.length || 0,
            indisponivel,
            quantidade_ordens: quantidadeOrdens,
            usuario_id: user.id,
            cartorio_id: cartorioId,
            hasToken: !!accessToken,
            estruturaHash: {
              dadosReaisHasDadosUsuario: !!dadosReais?.dados_usuario,
              dadosReaisHasDadosUsuarioHash: !!dadosReais?.dados_usuario?.hash,
              dadosReaisHash: dadosReais?.hash,
              dataDataIdentifierRequest: data?.data?.identifierRequest,
            },
          });

          // Preparar dados para inserção
          const dadosInsercao: any = {
            documento: documentoLimpo,
            tipo_documento: tipoDocumento,
            nome_razao_social: nomeRazaoSocial || null, // Garantir que seja null se não encontrado, não undefined
            indisponivel: indisponivel,
            quantidade_ordens: quantidadeOrdens,
            dados_consulta: data,
            status: "sucesso",
            usuario_id: user.id,
            cartorio_id: cartorioId,
          };

          // Sempre adicionar hash_consulta APENAS se existir e for válido
          // IMPORTANTE: Não salvar valores que não são hashes válidos (como UUIDs)
          // Se a coluna não existir, o fallback tentará sem ela
          if (hashConsulta) {
            // Validação final: garantir que é um hash válido
            const isHashValid = /^[a-z0-9]{8,20}$/i.test(hashConsulta);
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hashConsulta);
            
            if (isHashValid && !isUUID) {
            dadosInsercao.hash_consulta = hashConsulta;
              console.log("✅ Hash válido incluído nos dados de inserção:", {
                hash: hashConsulta.substring(0, 20) + "...",
                hashCompleto: hashConsulta,
                hashLength: hashConsulta.length,
              });
          } else {
              console.warn("⚠️ Hash encontrado mas não é válido (não será salvo):", {
                hash: hashConsulta,
                isHashValid,
                isUUID,
                length: hashConsulta.length,
              });
              // NÃO adicionar hash_consulta aos dados de inserção
            }
          } else {
            console.warn("⚠️ Hash não encontrado nos dados da consulta - NÃO será salvo");
            console.warn("🔍 Estrutura completa para debug:", JSON.stringify(data, null, 2));
          }

          // Log final antes de inserir
          console.log("💾 Dados finais para inserção:", {
            documento: dadosInsercao.documento.substring(0, 3) + "***",
            tipo_documento: dadosInsercao.tipo_documento,
            nome_razao_social: dadosInsercao.nome_razao_social || "NULL",
            hash_consulta: dadosInsercao.hash_consulta ? dadosInsercao.hash_consulta.substring(0, 20) + "..." : "NULL",
            indisponivel: dadosInsercao.indisponivel,
            quantidade_ordens: dadosInsercao.quantidade_ordens,
            hasDadosConsulta: !!dadosInsercao.dados_consulta,
          });

          const { data: insertedData, error: insertError } = await supabaseClient
            .from("consultas_cnib")
            .insert([dadosInsercao])
            .select("id, documento, tipo_documento, nome_razao_social, hash_consulta, indisponivel, quantidade_ordens, status, created_at");

          if (insertError) {
            console.error("❌ Erro ao salvar consulta no banco:", {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              fullError: insertError,
            });
            
            // Log dos dados que tentaram ser inseridos
            console.error("📋 Dados que tentaram ser inseridos:", {
              documento: dadosInsercao.documento.substring(0, 3) + "***",
              nome_razao_social: dadosInsercao.nome_razao_social || "NULL",
              hash_consulta: dadosInsercao.hash_consulta ? dadosInsercao.hash_consulta.substring(0, 20) + "..." : "NULL",
            });
            
            // Se o erro for por coluna não existir, tentar sem hash_consulta
            // Mas primeiro verificar se o erro é realmente da coluna hash_consulta
            const isHashColumnError = insertError.message?.includes("hash_consulta") || 
                                     insertError.details?.includes("hash_consulta") ||
                                     insertError.hint?.includes("hash_consulta");
            
            if ((insertError.code === "42703" || insertError.message.includes("column") || insertError.message.includes("does not exist")) && isHashColumnError) {
              console.log("⚠️ Erro na coluna hash_consulta. Tentando salvar sem hash_consulta (coluna pode não existir)");
              
              // Preparar dados sem hash_consulta
              const dadosInsercaoSemHash: any = {
                    documento: documentoLimpo,
                    tipo_documento: tipoDocumento,
                nome_razao_social: nomeRazaoSocial || null,
                    indisponivel: indisponivel,
                    quantidade_ordens: quantidadeOrdens,
                    dados_consulta: data,
                    status: "sucesso",
                    usuario_id: user.id,
                    cartorio_id: cartorioId,
              };
              
              console.log("💾 Tentando salvar sem hash_consulta:", {
                nome_razao_social: nomeRazaoSocial || "NÃO ENCONTRADO",
                documento: documentoLimpo.substring(0, 3) + "***",
                hash_consulta: "REMOVIDO (coluna não existe)",
              });
              
              const { data: insertedDataRetry, error: insertErrorRetry } = await supabaseClient
                .from("consultas_cnib")
                .insert([dadosInsercaoSemHash])
                .select("id, documento, tipo_documento, nome_razao_social, hash_consulta, indisponivel, quantidade_ordens, status, created_at");

              if (insertErrorRetry) {
                console.error("❌ Erro ao salvar consulta no banco (tentativa sem hash):", {
                  code: insertErrorRetry.code,
                  message: insertErrorRetry.message,
                  details: insertErrorRetry.details,
                  hint: insertErrorRetry.hint,
                });
              } else {
                console.log("✅ Consulta salva no banco de dados com sucesso (sem hash):", {
                  id: insertedDataRetry?.[0]?.id,
                  documento: insertedDataRetry?.[0]?.documento?.substring(0, 3) + "***",
                  nome_razao_social: insertedDataRetry?.[0]?.nome_razao_social || "NULL",
                  hash_consulta: insertedDataRetry?.[0]?.hash_consulta || "NULL",
                });
              }
            }
          } else {
            console.log("✅ Consulta salva no banco de dados com sucesso:", {
              id: insertedData?.[0]?.id,
              documento: insertedData?.[0]?.documento?.substring(0, 3) + "***",
              nome_razao_social: insertedData?.[0]?.nome_razao_social || "NULL",
              hash_consulta: insertedData?.[0]?.hash_consulta || "NULL",
              dadosCompletos: insertedData?.[0],
            });
            
            // Verificar se os dados foram salvos corretamente
            if (insertedData && insertedData[0]) {
              if (!insertedData[0].nome_razao_social && nomeRazaoSocial) {
                console.warn("⚠️ ATENÇÃO: nome_razao_social não foi salvo mesmo tendo valor:", nomeRazaoSocial);
              }
              if (!insertedData[0].hash_consulta && hashConsulta) {
                console.warn("⚠️ ATENÇÃO: hash_consulta não foi salvo mesmo tendo valor:", hashConsulta.substring(0, 20) + "...");
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Erro ao salvar consulta no banco:", error);
        if (error instanceof Error) {
          console.error("Stack trace:", error.stack);
        }
      }
    } else {
      console.warn("⚠️ Cartório não encontrado, consulta não será salva no histórico");
    }

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

