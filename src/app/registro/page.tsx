"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Schema de validação para o formulário de registro
const registroSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres."),
  email: z.string().email("Email inválido."),
  telefone: z.string().min(10, "Telefone inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type RegistroFormData = z.infer<typeof registroSchema>;

export default function RegistroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RegistroFormData>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      name: "",
      email: "",
      telefone: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Preencher campos com query params ao carregar a página
  useEffect(() => {
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const telefone = searchParams.get("telefone");
    const cartorioId = searchParams.get("cartorio_id");
    const role = searchParams.get("role");

    if (name) form.setValue("name", decodeURIComponent(name));
    if (email) form.setValue("email", decodeURIComponent(email));
    if (telefone) form.setValue("telefone", decodeURIComponent(telefone));

    // Armazenar cartorio_id e role para usar no submit
    if (cartorioId) {
      (form as any).cartorioId = decodeURIComponent(cartorioId);
    }
    if (role) {
      (form as any).role = decodeURIComponent(role);
    }
  }, [searchParams, form]);

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length > 5) strength++;
    if (password.length > 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(form.watch("password"));

  const onSubmit = async (formData: RegistroFormData) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // Verificar se o usuário já existe na tabela users
      
      let existingUser: any = null;
      let checkError: any = null;

      try {
        // Timeout real que cancela a requisição se demorar muito
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("TIMEOUT")), 3000); // 3 segundos
        });

        // Tentar busca case-insensitive com timeout
        const queryPromise = supabase
          .from("users")
          .select("id, email, account_status, ativo, cartorio_id, role")
          .ilike("email", formData.email) // Case insensitive
          .maybeSingle();

        try {
          const { data, error } = await Promise.race([
            queryPromise,
            timeoutPromise,
          ]) as any;

          existingUser = data;
          checkError = error;
          
        } catch (timeoutError: any) {
          if (timeoutError?.message === "TIMEOUT") {
            console.warn("[REGISTRO] Verificação demorou muito (timeout). Continuando sem verificação...");
            existingUser = null;
            checkError = null;
          } else {
            throw timeoutError;
          }
        }
      } catch (error: any) {
        console.error("[REGISTRO] Erro ao verificar usuário:", error);
        // Continuar mesmo com erro, assumindo que usuário não existe
        existingUser = null;
        checkError = null;
      }

      // Ignorar erro PGRST116 (nenhum resultado encontrado) - é esperado
      if (checkError && checkError.code !== "PGRST116") {
        console.warn("[REGISTRO] Erro ao verificar usuário existente (não crítico):", checkError);
        // Não falhar, apenas logar o erro e continuar
        // Mas ainda tentar usar a API se o usuário foi encontrado
      }

      let userId: string | null = null;

      let authUserId: string;
      let passwordWasSetViaAPI = false;

      // Se o usuário já existe na tabela e está pendente, usar API diretamente
      // Também tentar se houver erro mas o usuário foi encontrado
      if (existingUser) {
        userId = existingUser.id;

        // Verificar se a conta já está ativa
        if (existingUser.account_status === "active" || existingUser.ativo === true) {
          setErrorMessage("Este email já está cadastrado e ativo. Faça login.");
          toast.error("Este email já está cadastrado. Faça login.");
          setLoading(false);
          return;
        }

        // Usuário existe mas está pendente - usar API para definir senha
        
        try {
          // Adicionar timeout para a requisição
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

          const setPasswordResponse = await fetch("/api/users/set-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

            const setPasswordData = await setPasswordResponse.json();


          if (!setPasswordResponse.ok || !setPasswordData.success) {
            let errorMsg = setPasswordData.error || "Erro ao definir senha. Tente novamente.";
            
            // Mensagens mais específicas baseadas no erro
            if (setPasswordResponse.status === 404) {
              errorMsg = "Usuário não encontrado. O administrador deve criar o usuário primeiro.";
            } else if (setPasswordResponse.status === 400) {
              if (setPasswordData.error?.includes("já está ativa")) {
                errorMsg = "Esta conta já está ativa. Faça login.";
              } else {
                errorMsg = setPasswordData.error || "Dados inválidos. Verifique as informações.";
              }
            } else if (setPasswordResponse.status === 500) {
              errorMsg = "Erro interno do servidor. Tente novamente mais tarde ou contate o administrador.";
            }
            
            console.error("[REGISTRO] Erro da API set-password:", {
              status: setPasswordResponse.status,
              error: errorMsg,
              details: setPasswordData.details
            });
            
            throw new Error(errorMsg);
          }

          authUserId = setPasswordData.userId;
          passwordWasSetViaAPI = true;
        } catch (apiError: any) {
          console.error("[REGISTRO] Erro ao chamar API set-password:", apiError);
          
          // Se for erro de timeout ou abort
          if (apiError.name === "AbortError" || apiError.message?.includes("aborted")) {
            throw new Error("A requisição demorou muito. Tente novamente.");
          }
          
          throw apiError;
        }
      } else {
        // Usuário não existe na tabela - criar novo registro
        
        // Adicionar timeout para evitar travamento
        const signUpPromise = supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: undefined, // Não redirecionar para email
            data: {
              name: formData.name,
              telefone: formData.telefone,
            },
          },
        });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Tempo de espera excedido. Tente novamente.")), 30000); // 30 segundos
        });

        const { data: authData, error: authError } = await Promise.race([
          signUpPromise,
          timeoutPromise,
        ]) as any;


        if (authError) {
          console.error("[REGISTRO] Erro no Auth:", authError);
          
          // Se o erro for "already registered", pode ser que o usuário exista no Auth mas não na tabela
          // Neste caso, tentar usar a API para definir senha
          if (
            authError.message?.includes("already registered") || 
            authError.message?.includes("already exists") ||
            authError.message?.includes("User already registered")
          ) {
            
            try {
              // Adicionar timeout para a requisição
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

              const setPasswordResponse = await fetch("/api/users/set-password", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: formData.email,
                  password: formData.password,
                }),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              const setPasswordData = await setPasswordResponse.json();


              if (!setPasswordResponse.ok || !setPasswordData.success) {
                let errorMsg = setPasswordData.error || "Erro ao definir senha. Tente novamente.";
                
                // Mensagens mais específicas baseadas no erro
                if (setPasswordResponse.status === 404) {
                  errorMsg = "Usuário não encontrado. O administrador deve criar o usuário primeiro.";
                } else if (setPasswordResponse.status === 400) {
                  if (setPasswordData.error?.includes("já está ativa")) {
                    errorMsg = "Esta conta já está ativa. Faça login.";
                  } else {
                    errorMsg = setPasswordData.error || "Dados inválidos. Verifique as informações.";
                  }
                } else if (setPasswordResponse.status === 500) {
                  errorMsg = "Erro interno do servidor. Tente novamente mais tarde ou contate o administrador.";
                }
                
                console.error("[REGISTRO] Erro da API set-password (fallback):", {
                  status: setPasswordResponse.status,
                  error: errorMsg,
                  details: setPasswordData.details
                });
                
                throw new Error(errorMsg);
              }

              authUserId = setPasswordData.userId;
              passwordWasSetViaAPI = true;
            } catch (apiError: any) {
              console.error("[REGISTRO] Erro ao chamar API set-password (fallback):", apiError);
              
              // Se for erro de timeout ou abort
              if (apiError.name === "AbortError" || apiError.message?.includes("aborted")) {
                throw new Error("A requisição demorou muito. Tente novamente.");
              }
              
              throw apiError;
            }
          } else {
            throw authError;
          }
        } else if (!authData?.user) {
          console.error("[REGISTRO] Auth não retornou usuário");
          throw new Error("Erro ao criar conta no sistema de autenticação. Verifique se o email já está cadastrado.");
        } else {
          // Sucesso ao criar no Auth
          authUserId = authData.user.id;
        }
      }

      // Obter dados adicionais dos query params
      const cartorioId = (form as any).cartorioId || (existingUser?.cartorio_id) || null;
      const role = (form as any).role || (existingUser?.role) || "atendente";


      // Se a senha foi atualizada via API, ela já sincronizou os IDs e atualizou o status
      // A API já fez todo o trabalho necessário, apenas verificar se está tudo ok
      if (passwordWasSetViaAPI) {
        // A API já fez tudo, não precisamos fazer mais nada
        // Apenas verificar se o usuário existe na tabela com o ID correto
        const { data: verifyUser, error: verifyError } = await supabase
          .from("users")
          .select("id, email, account_status, ativo")
          .eq("id", authUserId)
          .single();

        if (verifyError) {
          console.warn("[REGISTRO] Erro ao verificar usuário (não crítico):", verifyError);
        } else {
        }
        // Não falhar, pois a senha já foi definida e a API já fez a sincronização
      } else if (userId && userId !== authUserId) {
        // Usuário já existe na tabela, mas com ID diferente
        // Deletar o registro antigo e criar um novo com o ID do Auth
        const { error: deleteError } = await supabase
          .from("users")
          .delete()
          .eq("id", userId);

        if (deleteError) {
          console.error("[REGISTRO] Erro ao deletar registro antigo:", deleteError);
          // Continuar mesmo se der erro ao deletar
        }

        // Criar novo registro com o ID do Auth
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: authUserId,
            name: formData.name,
            email: formData.email,
            telefone: formData.telefone,
            role: role,
            cartorio_id: cartorioId,
            account_status: "active",
            ativo: true,
          });

        if (insertError) {
          console.error("[REGISTRO] Erro ao inserir novo registro:", insertError);
          throw insertError;
        }
      } else if (!userId) {
        // Criar novo registro na tabela users
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: authUserId,
            name: formData.name,
            email: formData.email,
            telefone: formData.telefone,
            role: role,
            cartorio_id: cartorioId,
            account_status: "active",
            ativo: true,
          });

        if (insertError) {
          console.error("[REGISTRO] Erro ao criar usuário na tabela:", insertError);
          
          // Se der erro de duplicata, o usuário já existe - buscar e sincronizar IDs
          if (insertError.code === "23505" || insertError.message?.includes("duplicate key")) {
            
            // Buscar o usuário existente pelo email
            const { data: existingUserData, error: fetchError } = await supabase
              .from("users")
              .select("*")
              .ilike("email", formData.email)
              .maybeSingle();

            if (fetchError || !existingUserData) {
              console.error("[REGISTRO] Erro ao buscar usuário existente:", fetchError);
              throw new Error("Erro ao processar registro. Tente novamente.");
            }

              id: existingUserData.id,
              authId: authUserId,
              sameId: existingUserData.id === authUserId
            });

            // Se os IDs forem diferentes, precisamos sincronizar
            if (existingUserData.id !== authUserId) {
              
              // Deletar o registro antigo
              const { error: deleteError } = await supabase
                .from("users")
                .delete()
                .eq("id", existingUserData.id);

              if (deleteError) {
                console.error("[REGISTRO] Erro ao deletar registro antigo:", deleteError);
                // Se não conseguir deletar, tentar atualizar o ID diretamente
                const { error: updateIdError } = await supabase
                  .from("users")
                  .update({ id: authUserId })
                  .eq("email", formData.email);
                
                if (updateIdError) {
                  console.error("[REGISTRO] Erro ao atualizar ID:", updateIdError);
                  throw new Error("Erro ao sincronizar conta. Contate o administrador.");
                }
              } else {
                // Criar novo registro com o ID do Auth
                const { id, created_at, updated_at, ...userDataWithoutId } = existingUserData;
                const { error: insertNewError } = await supabase
                  .from("users")
                  .insert({
                    ...userDataWithoutId,
                    id: authUserId,
                    name: formData.name,
                    telefone: formData.telefone,
                    role: role,
                    cartorio_id: cartorioId,
                    account_status: "active",
                    ativo: true,
                  });

                if (insertNewError) {
                  console.error("[REGISTRO] Erro ao inserir registro com novo ID:", insertNewError);
                  throw insertNewError;
                }
              }
            } else {
              // IDs já são iguais, apenas atualizar dados
              const { error: updateError } = await supabase
                .from("users")
                .update({
                  name: formData.name,
                  telefone: formData.telefone,
                  role: role,
                  cartorio_id: cartorioId,
                  account_status: "active",
                  ativo: true,
                })
                .eq("id", authUserId);

              if (updateError) {
                console.error("[REGISTRO] Erro ao atualizar usuário:", updateError);
                throw updateError;
              }
            }
          } else {
            // Outro tipo de erro
            throw insertError;
          }
        } else {
        }
      } else {
        // Usuário já existe e o ID já corresponde ao Auth, apenas atualizar
        const { error: updateError } = await supabase
          .from("users")
          .update({
            name: formData.name,
            telefone: formData.telefone,
            account_status: "active",
            ativo: true,
          })
          .eq("id", authUserId);

        if (updateError) {
          console.error("[REGISTRO] Erro ao atualizar usuário:", updateError);
          throw updateError;
        }
        console.log("[REGISTRO] Usuário atualizado com sucesso");
      }

      
      // Se a senha foi definida via API, fazer login automático
      if (passwordWasSetViaAPI) {
        toast.success("Conta criada com sucesso! Fazendo login...");
        
        try {
          // Aguardar um pouco para garantir que tudo está sincronizado
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Fazer login automático
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (signInError) {
            console.error("[REGISTRO] Erro ao fazer login automático:", signInError);
            // Se der erro no login automático, redirecionar para login manual
            toast.info("Conta criada! Faça login para continuar.");
            setTimeout(() => {
              router.push("/login");
            }, 1500);
          } else if (signInData?.user) {
            toast.success("Login realizado com sucesso!");
            
            // Aguardar um pouco para o toast aparecer
            setTimeout(() => {
              router.push("/dashboard");
            }, 500);
          }
        } catch (loginError: any) {
          console.error("[REGISTRO] Erro ao fazer login automático:", loginError);
          toast.info("Conta criada! Faça login para continuar.");
          setTimeout(() => {
            router.push("/login");
          }, 1500);
        }
      } else {
        // Se foi criado via signUp normal, pode já ter sessão
        // Verificar se há sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          toast.success("Conta criada com sucesso!");
          setTimeout(() => {
            router.push("/dashboard");
          }, 500);
        } else {
          // Não há sessão, fazer login automático
          toast.success("Conta criada com sucesso! Fazendo login...");
          
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            });

            if (signInError) {
              console.error("[REGISTRO] Erro ao fazer login automático:", signInError);
              toast.info("Conta criada! Faça login para continuar.");
              setTimeout(() => {
                router.push("/login");
              }, 1500);
            } else if (signInData?.user) {
              toast.success("Login realizado com sucesso!");
              setTimeout(() => {
                router.push("/dashboard");
              }, 500);
            }
          } catch (loginError: any) {
            console.error("[REGISTRO] Erro ao fazer login automático:", loginError);
            toast.info("Conta criada! Faça login para continuar.");
            setTimeout(() => {
              router.push("/login");
            }, 1500);
          }
        }
      }
    } catch (error: any) {
      console.error("[REGISTRO] Erro ao criar conta:", error);
      let errorMessage = "Erro ao criar conta. Tente novamente.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `Erro ${error.code}: ${error.message || "Erro desconhecido"}`;
      }
      
      // Mensagens de erro mais amigáveis
      if (error.message?.includes("already registered") || error.message?.includes("already exists")) {
        errorMessage = "Este email já está cadastrado. Faça login ou use outro email.";
      } else if (error.message?.includes("password")) {
        errorMessage = "Erro na senha. Verifique os requisitos e tente novamente.";
      }
      
      setErrorMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      // Garantir que o loading seja sempre desativado
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/icone_iacartorios.png"
                alt="IA Cartórios"
                width={64}
                height={64}
                priority
                className="h-16 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold">Criar Conta</CardTitle>
            <CardDescription>
              Defina sua senha para acessar a plataforma
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm font-medium">{errorMessage}</p>
                </div>
              )}

              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  {...form.register("name")}
                  disabled={true}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  {...form.register("email")}
                  disabled={true}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  {...form.register("telefone")}
                  disabled={true}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                />
                {form.formState.errors.telefone && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.telefone.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    {...form.register("password")}
                    className="pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
                {form.watch("password").length > 0 && (
                  <div className="mt-2">
                    <div className="h-2 w-full bg-gray-200 rounded-full">
                      <div
                        className={
                          `h-full rounded-full ` +
                          (passwordStrength === 0
                            ? "bg-red-500 w-1/6"
                            : passwordStrength === 1
                            ? "bg-orange-500 w-2/6"
                            : passwordStrength === 2
                            ? "bg-yellow-500 w-3/6"
                            : passwordStrength === 3
                            ? "bg-lime-500 w-4/6"
                            : passwordStrength === 4
                            ? "bg-green-500 w-5/6"
                            : "bg-green-600 w-full")
                        }
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Força da senha:{" "}
                      {passwordStrength === 0
                        ? "Muito Fraca"
                        : passwordStrength === 1
                        ? "Fraca"
                        : passwordStrength === 2
                        ? "Média"
                        : passwordStrength === 3
                        ? "Boa"
                        : passwordStrength === 4
                        ? "Forte"
                        : "Muito Forte"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme sua senha"
                    {...form.register("confirmPassword")}
                    className="pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  "Criar Conta"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => router.push("/login")}
                className="text-sm"
              >
                Já tem uma conta? Faça login
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Sistema de gestão inteligente para cartórios</p>
        </div>
      </div>
    </div>
  );
}
