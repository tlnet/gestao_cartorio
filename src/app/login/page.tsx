"use client";

import React, { useState } from "react";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string>("");

  // Formulário de login
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const router = useRouter();

  // Função para limpar erro quando o usuário começar a digitar
  const clearLoginError = () => {
    if (loginError) {
      setLoginError("");
    }
  };

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
        setTimeout(() => reject(new Error("Tempo de espera excedido. Tente novamente.")), 15000); // 15 segundos
      });

      const { data, error } = await Promise.race([
        loginPromise,
        timeoutPromise,
      ]) as any;

      if (error) {
        // Se o erro for "Invalid login credentials" e o usuário acabou de ser criado,
        // pode ser um problema de sincronização - tentar novamente após um delay
        if (error.message?.includes("Invalid login credentials")) {
          console.log("[LOGIN] Credenciais inválidas. Aguardando e tentando novamente...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Tentar novamente
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: loginData.email,
            password: loginData.password,
          });

          if (retryError) {
            throw retryError;
          }

          if (retryData?.user) {
            console.log("[LOGIN] Login bem-sucedido na segunda tentativa para:", retryData.user.email);
            
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

            const roles = (userProfile as any)?.roles?.length ? (userProfile as any).roles : [(userProfile as any)?.role || "atendente"];
            const defaultRoute = roles.includes("financeiro") && !roles.includes("admin") ? "/contas" : "/dashboard";
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
        const roles = (userProfile as any)?.roles?.length ? (userProfile as any).roles : [(userProfile as any)?.role || "atendente"];
        const defaultRoute = roles.includes("financeiro") && !roles.includes("admin") ? "/contas" : "/dashboard";
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
        errorMessage =
          "Muitas tentativas de login. Tente novamente em alguns minutos";
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
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
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
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Sistema de gestão inteligente para cartórios</p>
        </div>
      </div>
    </div>
  );
}
