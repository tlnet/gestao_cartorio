import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Criar cliente admin com Service Role Key para operações administrativas
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Variáveis de ambiente do Supabase Admin não configuradas. Configure SUPABASE_SERVICE_ROLE_KEY no .env.local");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Função auxiliar para criar usuário no Auth
async function createAuthUser(adminClient: any, email: string, password: string, userData: any) {
  const createOptions: any = {
    email: email,
    password: password,
    email_confirm: true,
    user_metadata: {
      name: userData.name || email,
    },
  };

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser(createOptions);

  if (createError || !createdUser?.user) {
    throw createError || new Error("Usuário não foi criado");
  }

  return createdUser.user;
}

// Função auxiliar para atualizar senha
async function updateAuthPassword(adminClient: any, userId: string, password: string) {
  const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    password: password,
    email_confirm: true,
  });

  if (updateError) {
    console.error("[SET-PASSWORD] Erro ao atualizar senha:", updateError);
    throw updateError;
  }

  return updatedUser.user;
}

// Função auxiliar para sincronizar IDs
async function syncUserIds(adminClient: any, oldId: string, newId: string, email: string) {
  
  // Buscar dados completos do usuário antes de atualizar
  const { data: fullUserData, error: fetchError } = await adminClient
    .from("users")
    .select("*")
    .eq("id", oldId)
    .single();

  if (fetchError || !fullUserData) {
    console.error("[SET-PASSWORD] Erro ao buscar dados do usuário:", fetchError);
    // Tentar atualizar por email como fallback
    const { error: updateError } = await adminClient
      .from("users")
      .update({ 
        id: newId,
        account_status: "active",
        ativo: true,
      })
      .eq("email", email);
    
    if (updateError) {
      console.error("[SET-PASSWORD] Erro ao atualizar ID por email:", updateError);
    } else {
    }
    return;
  }

  // Deletar registro antigo
  const { error: deleteError } = await adminClient
    .from("users")
    .delete()
    .eq("id", oldId);

  if (deleteError) {
    console.error("[SET-PASSWORD] Erro ao deletar registro antigo:", deleteError);
    // Tentar atualizar por email como fallback
    const { error: updateError } = await adminClient
      .from("users")
      .update({ 
        id: newId,
        account_status: "active",
        ativo: true,
      })
      .eq("email", email);
    
    if (updateError) {
      console.error("[SET-PASSWORD] Erro ao atualizar ID por email:", updateError);
    } else {
    }
    return;
  }

  // Criar novo com ID do Auth
  const { id, created_at, updated_at, ...userDataWithoutId } = fullUserData;
  const { error: insertError } = await adminClient
    .from("users")
    .insert({
      ...userDataWithoutId,
      id: newId,
      account_status: "active", // Garantir que o status seja ativo
      ativo: true, // Garantir que esteja ativo
    });

  if (insertError) {
    console.error("[SET-PASSWORD] Erro ao inserir registro com novo ID:", insertError);
    // Tentar atualizar por email como fallback
    const { error: updateError } = await adminClient
      .from("users")
      .update({ 
        id: newId,
        account_status: "active",
        ativo: true,
      })
      .eq("email", email);
    
    if (updateError) {
      console.error("[SET-PASSWORD] Erro ao atualizar ID por email:", updateError);
    } else {
    }
  } else {
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email e senha são obrigatórios",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "A senha deve ter pelo menos 6 caracteres",
        },
        { status: 400 }
      );
    }

    
    // Criar cliente admin primeiro para garantir acesso à tabela
    let adminClient;
    try {
      adminClient = getAdminClient();
    } catch (error: any) {
      console.error("[SET-PASSWORD] Erro ao criar cliente admin:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Erro de configuração do servidor. Contate o administrador.",
          details: error.message,
        },
        { status: 500 }
      );
    }
    
    // Buscar usuário na tabela users pelo email (case insensitive)
    // Usar cliente admin para evitar problemas de RLS
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("id, email, account_status, ativo, name")
      .ilike("email", email) // Case insensitive
      .maybeSingle(); // Usar maybeSingle para não dar erro se não encontrar

      hasUser: !!userData, 
      hasError: !!userError,
      errorCode: userError?.code,
      errorMessage: userError?.message,
      userId: userData?.id,
      accountStatus: userData?.account_status,
      ativo: userData?.ativo
    });

    if (userError) {
      console.error("[SET-PASSWORD] Erro ao buscar usuário:", userError);
      // Se o erro for "nenhum resultado encontrado", retornar erro específico
      if (userError.code === "PGRST116") {
        return NextResponse.json(
          {
            success: false,
            error: "Usuário não encontrado. O administrador deve criar o usuário primeiro.",
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao verificar usuário",
          details: userError.message,
        },
        { status: 500 }
      );
    }

    // Se o usuário não foi encontrado na tabela, verificar se existe no Auth
    // Se existir no Auth, criar o registro na tabela
    if (!userData) {
      
      try {
        // Buscar usuário no Auth pelo email
        const { data: usersList, error: listError } = await adminClient.auth.admin.listUsers();
        
        if (listError) {
          console.error("[SET-PASSWORD] Erro ao listar usuários:", listError);
          return NextResponse.json(
            {
              success: false,
              error: "Usuário não encontrado. O administrador deve criar o usuário primeiro.",
            },
            { status: 404 }
          );
        }
        
        // Procurar usuário na lista pelo email
        const existingAuthUser = usersList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (existingAuthUser) {
          
          // Buscar dados do usuário dos query params ou usar dados básicos
          // Como não temos os dados completos, vamos criar com dados mínimos
          // O admin deve ter criado o usuário com nome, telefone, role, etc.
          // Por enquanto, vamos criar com dados básicos e atualizar depois
          
          const { error: insertError } = await adminClient
            .from("users")
            .insert({
              id: existingAuthUser.id,
              email: email,
              name: existingAuthUser.user_metadata?.name || existingAuthUser.email?.split("@")[0] || "Usuário",
              account_status: "pending_activation",
              ativo: false,
            });
          
          if (insertError) {
            console.error("[SET-PASSWORD] Erro ao criar registro na tabela:", insertError);
            // Se der erro de duplicata, o usuário pode ter sido criado entre a busca e a inserção
            if (insertError.code === "23505") {
              // Buscar novamente
              const { data: retryUserData } = await adminClient
                .from("users")
                .select("id, email, account_status, ativo, name")
                .ilike("email", email)
                .maybeSingle();
              
              if (retryUserData) {
                userData = retryUserData;
              } else {
                return NextResponse.json(
                  {
                    success: false,
                    error: "Erro ao criar registro do usuário. Contate o administrador.",
                    details: insertError.message,
                  },
                  { status: 500 }
                );
              }
            } else {
              return NextResponse.json(
                {
                  success: false,
                  error: "Erro ao criar registro do usuário. Contate o administrador.",
                  details: insertError.message,
                },
                { status: 500 }
              );
            }
          } else {
            // Usuário criado na tabela, usar os dados criados
            userData = {
              id: existingAuthUser.id,
              email: email,
              account_status: "pending_activation",
              ativo: false,
              name: existingAuthUser.user_metadata?.name || existingAuthUser.email?.split("@")[0] || "Usuário",
            };
          }
        } else {
          // Usuário não existe nem na tabela nem no Auth
          return NextResponse.json(
            {
              success: false,
              error: "Usuário não encontrado. O administrador deve criar o usuário primeiro.",
            },
            { status: 404 }
          );
        }
      } catch (error: any) {
        console.error("[SET-PASSWORD] Erro ao verificar usuário no Auth:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Erro ao verificar usuário",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }


    // Verificar se o usuário já está ativo
    // Considerar ativo se account_status for "active" OU se ativo for true
    // Se account_status for NULL, considerar pendente se ativo for false
    const isActive = userData.account_status === "active" || userData.ativo === true;
    
    if (isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Esta conta já está ativa. Faça login.",
        },
        { status: 400 }
      );
    }

    // Se account_status for NULL, considerar como pendente de ativação
    const isPending = !userData.account_status || 
                     userData.account_status === "pending_activation" || 
                     userData.ativo === false;

    if (!isPending) {
      return NextResponse.json(
        {
          success: false,
          error: "Status da conta não permite ativação. Contate o administrador.",
        },
        { status: 400 }
      );
    }

    // Verificar se o usuário existe no Auth
    // Primeiro, tentar buscar pelo email (mais confiável)
    let authUser;
    try {
      // Buscar usuário no Auth pelo email
      const { data: usersList, error: listError } = await adminClient.auth.admin.listUsers();
      
      if (listError) {
        console.error("[SET-PASSWORD] Erro ao listar usuários:", listError);
        // Se der erro ao listar, tentar buscar pelo ID da tabela
        const { data: authUserData, error: getUserError } = await adminClient.auth.admin.getUserById(userData.id);
        
        if (getUserError || !authUserData?.user) {
          // Usuário não existe no Auth, criar novo
          authUser = await createAuthUser(adminClient, email, password, userData);
        } else {
          authUser = authUserData.user;
          // Atualizar senha
          await updateAuthPassword(adminClient, authUser.id, password);
        }
      } else {
        // Procurar usuário na lista pelo email
        const existingAuthUser = usersList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (existingAuthUser) {
          authUser = existingAuthUser;
          
          // Se o ID do Auth for diferente do ID na tabela, atualizar a tabela
          if (authUser.id !== userData.id) {
            await syncUserIds(adminClient, userData.id, authUser.id, email);
          }
          
          // Atualizar senha
          await updateAuthPassword(adminClient, authUser.id, password);
        } else {
          // Usuário não existe no Auth, criar novo
          authUser = await createAuthUser(adminClient, email, password, userData);
          
          // Se o ID do Auth for diferente do ID na tabela, atualizar a tabela
          if (authUser.id !== userData.id) {
            await syncUserIds(adminClient, userData.id, authUser.id, email);
          }
        }
      }
    } catch (error: any) {
      console.error("[SET-PASSWORD] Erro ao verificar/criar usuário no Auth:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Erro ao processar conta no sistema de autenticação",
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Atualizar status na tabela users usando cliente admin
    // Usar o ID do Auth para garantir que estamos atualizando o registro correto
    const { error: dbUpdateError } = await adminClient
      .from("users")
      .update({
        account_status: "active",
        ativo: true,
      })
      .eq("id", authUser.id);

    if (dbUpdateError) {
      console.error("[SET-PASSWORD] Erro ao atualizar tabela users:", dbUpdateError);
      // Não falhar se der erro na tabela, pois a senha já foi atualizada
    }

    return NextResponse.json(
      {
        success: true,
        message: "Senha definida com sucesso!",
        userId: authUser.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[SET-PASSWORD] Erro interno:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno do servidor",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
