"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface LoginFormData {
  email: string;
  password: string;
}

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function LoginClient() {
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [loginError, setLoginError] = useState<string>("");
  const [resetError, setResetError] = useState<string>("");

  const [recoveryReady, setRecoveryReady] = useState(false);

  // Formulário de login
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const [resetPasswordData, setResetPasswordData] =
    useState<ResetPasswordFormData>({
      password: "",
      confirmPassword: "",
    });

  const router = useRouter();
  const searchParams = useSearchParams();

  // Função para limpar erro quando o usuário começar a digitar
  const clearLoginError = () => {
    if (loginError) {
      setLoginError("");
    }
  };

  const clearResetError = () => {
    if (resetError) {
      setResetError("");
    }
  };

  const isRecoveryLink = () => {
    const type = searchParams.get("type");
    const recovery = searchParams.get("recovery");
    if (type === "recovery" || recovery === "1") return true;
    if (typeof window === "undefined") return false;
    const hash = window.location.hash || "";
    // Links de recovery do Supabase podem vir com tokens no hash.
    return (
      hash.includes("type=recovery") ||
      hash.includes("access_token=") ||
      hash.includes("token=")
    );
  };

  const mask = (value: unknown, keepStart = 6, keepEnd = 4) => {
    const str = typeof value === "string" ? value : value == null ? "" : String(value);
    if (!str) return "";
    if (str.length <= keepStart + keepEnd) return "***";
    return `${str.slice(0, keepStart)}***${str.slice(-keepEnd)}`;
  };

  const withTimeout = async <T,>(
    promise: Promise<T>,
    ms: number,
    message: string
  ): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const logRecoveryContext = () => {
    try {
      if (typeof window === "undefined") return;
      const type = searchParams.get("type") || "";
      const code = searchParams.get("code") || "";
      const hash = window.location.hash || "";

      const hasAccessToken = hash.includes("access_token=");
      const hasRefreshToken = hash.includes("refresh_token=");

      console.log("[RECOVERY][CTX]", {
        pathname: window.location.pathname,
        search: window.location.search,
        hasTypeRecovery: type === "recovery",
        hasCode: !!code,
        codeMasked: code ? mask(code) : null,
        hashHasAccessToken: hasAccessToken,
        hashHasRefreshToken: hasRefreshToken,
        hashLength: hash.length,
      });
    } catch (e) {
      console.warn("[RECOVERY][CTX] Falha ao logar contexto:", e);
    }
  };

  const ensureSessionFromRecoveryLink = async (): Promise<void> => {
    if (typeof window === "undefined") return;

    const code = searchParams.get("code");
    if (code) {
      console.log(
        "[RECOVERY] Encontrou code na URL. Chamando exchangeCodeForSession..."
      );
      const { error } = await withTimeout(
        supabase.auth.exchangeCodeForSession(code),
        15000,
        "Timeout ao trocar code por sessão."
      );
      if (error) {
        throw error;
      }
      // Limpar a query `code` para evitar reprocessamento
      router.replace("/login?type=recovery");
      return;
    }

    const hash = window.location.hash || "";
    if (hash.includes("access_token=")) {
      console.log("[RECOVERY] Encontrou access_token no hash.");
    }
  };

  const getAccessTokenFromUrl = (): string | null => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash || "";
    if (!hash.includes("access_token=")) return null;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const token = params.get("access_token");
    return token || null;
  };

  const clearUrlHash = () => {
    if (typeof window === "undefined") return;
    if (!window.location.hash) return;
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`
    );
  };

  const updatePasswordViaRest = async (accessToken: string, password: string) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      throw new Error("Supabase não configurado (URL/ANON).");
    }

    // Endpoint GoTrue: PUT /auth/v1/user
    const res = await fetch(`${url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }

    if (!res.ok) {
      const message =
        json?.msg ||
        json?.message ||
        json?.error_description ||
        json?.error ||
        text ||
        `HTTP ${res.status}`;
      throw new Error(message);
    }

    return json;
  };

  // Detectar modo de recuperação de senha a partir dos parâmetros da URL
  useEffect(() => {
    if (!isRecoveryLink()) {
      setShowResetPassword(false);
      return;
    }

    setShowResetPassword(true);
    setRecoveryReady(false);

    void (async () => {
      console.log("[RECOVERY] Iniciando processamento do link de recuperação...");
      logRecoveryContext();

      try {
        await ensureSessionFromRecoveryLink();
      } catch (error: any) {
        console.error("[RECOVERY] Falha ao iniciar sessão:", error);
        setResetError("Link de recuperação inválido ou expirado.");
        toast.error("Link de recuperação inválido ou expirado.");
        setShowResetPassword(false);
        router.replace("/login");
        return;
      }

      // Se temos access_token no hash, conseguimos atualizar senha via REST mesmo se o storage travar.
      const accessToken = getAccessTokenFromUrl();
      if (accessToken) {
        console.log("[RECOVERY] Link contém access_token (masked):", mask(accessToken));
        setRecoveryReady(true);
        return;
      }

      // Caso contrário (ex.: PKCE), tentamos validar via getUser.
      const { data: userData, error: userError } = await withTimeout(
        supabase.auth.getUser(),
        15000,
        "Timeout ao validar usuário da sessão de recuperação."
      );

      console.log("[RECOVERY] Usuário após processamento:", {
        hasUser: !!userData.user,
        userId: userData.user?.id ?? null,
        error: userError?.message ?? null,
      });

      if (userError || !userData.user) {
        setResetError(
          "Não foi possível iniciar a sessão de recuperação. Solicite um novo link e abra o e-mail novamente."
        );
        toast.error("Sessão de recuperação não iniciada. Solicite um novo link.");
        setShowResetPassword(false);
        router.replace("/login");
        return;
      }

      setRecoveryReady(true);
    })();
  }, [router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(""); // Limpar erro anterior

    // Validação básica
    if (!loginData.email || !loginData.password) {
      const errorMessage = "Por favor, preencha todos os campos";
      setLoginError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      return;
    }

    try {
      console.log("Tentando fazer login com:", loginData.email);

      // Adicionar timeout para evitar travamento
      const loginPromise = supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Tempo de espera excedido. Tente novamente.")),
          15000
        ); // 15 segundos
      });

      const { data, error } = (await Promise.race([
        loginPromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        // Se o erro for "Invalid login credentials" e o usuário acabou de ser criado,
        // pode ser um problema de sincronização - tentar novamente após um delay
        if (error.message?.includes("Invalid login credentials")) {
          console.log(
            "[LOGIN] Credenciais inválidas. Aguardando e tentando novamente..."
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Tentar novamente
          const { data: retryData, error: retryError } =
            await supabase.auth.signInWithPassword({
              email: loginData.email,
              password: loginData.password,
            });

          if (retryError) {
            throw retryError;
          }

          if (retryData?.user) {
            console.log(
              "[LOGIN] Login bem-sucedido na segunda tentativa para:",
              retryData.user.email
            );

            // Buscar informações adicionais do usuário na tabela users
            const { data: userProfile, error: profileError } = await supabase
              .from("users")
              .select("*")
              .eq("id", retryData.user.id)
              .single();

            if (profileError) {
              console.warn("Erro ao buscar perfil do usuário:", profileError);
            } else {
              console.log("Perfil do usuário encontrado:", userProfile);
            }

            toast.success("Login realizado com sucesso!");

            const roles = (userProfile as any)?.roles?.length
              ? (userProfile as any).roles
              : [(userProfile as any)?.role || "atendente"];
            const defaultRoute = roles.includes("admin_geral")
              ? "/admin"
              : roles.includes("financeiro") && !roles.includes("admin")
                ? "/contas"
                : "/dashboard";
            setTimeout(() => {
              router.push(defaultRoute);
            }, 100);
            return;
          }
        }

        throw error;
      }

      if (data.user) {
        console.log("Login bem-sucedido para:", data.user.email);

        // Buscar informações adicionais do usuário na tabela users
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profileError) {
          console.warn("Erro ao buscar perfil do usuário:", profileError);
        } else {
          console.log("Perfil do usuário encontrado:", userProfile);
        }

        toast.success("Login realizado com sucesso!");

        // Usuário financeiro vai para Contas a Pagar; demais para Dashboard
        const roles = (userProfile as any)?.roles?.length
          ? (userProfile as any).roles
          : [(userProfile as any)?.role || "atendente"];
        const defaultRoute = roles.includes("admin_geral")
          ? "/admin"
          : roles.includes("financeiro") && !roles.includes("admin")
            ? "/contas"
            : "/dashboard";
        setTimeout(() => {
          router.push(defaultRoute);
        }, 100);
      }
    } catch (error: any) {
      console.error("Erro no login:", error);

      // Mensagens de erro mais amigáveis
      let errorMessage = "";
      if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Email ou senha incorretos";
      } else if (error.message.includes("Email not confirmed")) {
        errorMessage = "Por favor, confirme seu email antes de fazer login";
      } else if (error.message.includes("Too many requests")) {
        errorMessage = "Muitas tentativas de login. Tente novamente em alguns minutos";
      } else {
        errorMessage = "Erro ao fazer login: " + error.message;
      }

      // Definir erro no formulário
      setLoginError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetError("");

    if (!loginData.email) {
      const message = "Informe o e-mail para recuperar a senha.";
      setResetError(message);
      toast.error(message);
      return;
    }

    try {
      setLoading(true);

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");

      const redirectTo = siteUrl ? `${siteUrl}/login?type=recovery` : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        loginData.email,
        redirectTo ? { redirectTo } : undefined
      );

      if (error) {
        console.error(
          "[FORGOT-PASSWORD] Erro ao solicitar recuperação:",
          error
        );
        toast.error("Erro ao enviar e-mail de recuperação: " + error.message);
        return;
      }

      toast.success(
        "Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha."
      );
    } catch (error: any) {
      console.error("[FORGOT-PASSWORD] Erro inesperado:", error);
      toast.error("Erro inesperado ao solicitar recuperação de senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    if (!resetPasswordData.password || !resetPasswordData.confirmPassword) {
      const message = "Preencha e confirme a nova senha.";
      setResetError(message);
      toast.error(message);
      return;
    }

    if (resetPasswordData.password !== resetPasswordData.confirmPassword) {
      const message = "As senhas não conferem.";
      setResetError(message);
      toast.error(message);
      return;
    }

    try {
      setResetLoading(true);
      console.log("[RESET-PASSWORD] Submit iniciado.");

      console.log("[RESET-PASSWORD] Chamando updateUser(password)...");
      const accessToken = getAccessTokenFromUrl();

      if (accessToken) {
        console.log("[RESET-PASSWORD] Atualizando senha via REST (Bearer access_token).");
        await withTimeout(
          updatePasswordViaRest(accessToken, resetPasswordData.password),
          20000,
          "Timeout ao atualizar a senha (REST)."
        );
        clearUrlHash();
      } else {
        const { error } = await withTimeout(
          supabase.auth.updateUser({
            password: resetPasswordData.password,
          }),
          20000,
          "Timeout ao atualizar a senha."
        );

        if (error) {
          console.error("[RESET-PASSWORD] Erro ao redefinir senha:", error);
          setResetError("Erro ao redefinir senha: " + error.message);
          toast.error("Erro ao redefinir senha: " + error.message);
          return;
        }
      }

      console.log("[RESET-PASSWORD] updateUser OK. Senha atualizada.");
      toast.success("Senha redefinida com sucesso! Você já pode fazer login.");
      setShowResetPassword(false);
      setResetPasswordData({ password: "", confirmPassword: "" });
      setResetError("");

      // Opcionalmente, redirecionar para o dashboard se a sessão já estiver ativa
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    } catch (error: any) {
      console.error("[RESET-PASSWORD] Erro inesperado:", error);
      const msg = error?.message || "Erro inesperado ao redefinir senha. Tente novamente.";
      setResetError(msg);
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setLoginData((prev) => ({ ...prev, [field]: value }));
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
            <CardDescription>
              Faça login para acessar a plataforma de gestão inteligente
            </CardDescription>
          </CardHeader>

          <CardContent>
            {showResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div
                    className="bg-red-50 border border-red-200 rounded-md p-3 transform transition-all duration-300 ease-in-out"
                    style={{
                      animation: "fadeInSlideDown 0.3s ease-out",
                    }}
                  >
                    <p className="text-red-600 text-sm font-medium">
                      {resetError}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="reset-password">Nova senha</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    placeholder="Nova senha segura"
                    value={resetPasswordData.password}
                    onChange={(e) => {
                      setResetPasswordData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }));
                      clearResetError();
                    }}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reset-password-confirm">
                    Confirmar nova senha
                  </Label>
                  <Input
                    id="reset-password-confirm"
                    type="password"
                    placeholder="Confirme a nova senha"
                    value={resetPasswordData.confirmPassword}
                    onChange={(e) => {
                      setResetPasswordData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }));
                      clearResetError();
                    }}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando nova senha...
                    </>
                  ) : (
                    "Redefinir senha"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetPasswordData({ password: "", confirmPassword: "" });
                    setResetError("");
                    router.replace("/login");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2"
                >
                  Voltar para o login
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Exibição de erro com animação */}
                {loginError && (
                  <div
                    className="bg-red-50 border border-red-200 rounded-md p-3 transform transition-all duration-300 ease-in-out"
                    style={{
                      animation: "fadeInSlideDown 0.3s ease-out",
                    }}
                  >
                    <p className="text-red-600 text-sm font-medium">
                      {loginError}
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginData.email}
                    onChange={(e) => {
                      handleInputChange("email", e.target.value);
                      clearLoginError();
                    }}
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <div className="relative mt-1">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={loginData.password}
                      onChange={(e) => {
                        handleInputChange("password", e.target.value);
                        clearLoginError();
                      }}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Sistema de gestão inteligente para cartórios</p>
        </div>
      </div>
    </div>
  );
}

