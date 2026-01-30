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
import { Loader2, UserPlus, LogIn, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type AuthMode = "login" | "register";

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  nome: string;
  email: string;
  telefone: string;
  password: string;
  confirmPassword: string;
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginError, setLoginError] = useState<string>("");

  // Formulário de login
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  // Formulário de registro
  const [registerData, setRegisterData] = useState<RegisterFormData>({
    nome: "",
    email: "",
    telefone: "",
    password: "",
    confirmPassword: "",
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
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

        // Aguardar um pouco para o toast aparecer antes do redirecionamento
        setTimeout(() => {
          router.push("/dashboard");
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validações
    if (
      !registerData.nome ||
      !registerData.email ||
      !registerData.telefone ||
      !registerData.password ||
      !registerData.confirmPassword
    ) {
      toast.error("Por favor, preencha todos os campos");
      setLoading(false);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error("As senhas não coincidem");
      setLoading(false);
      return;
    }

    if (registerData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      setLoading(false);
      return;
    }

    // Validação do telefone
    const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!phoneRegex.test(registerData.telefone)) {
      toast.error(
        "Por favor, insira um telefone válido no formato (11) 99999-9999"
      );
      setLoading(false);
      return;
    }

    try {
      console.log("Iniciando criação de usuário...");

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            nome: registerData.nome,
            telefone: registerData.telefone,
          },
        },
      });

      if (authError) {
        console.error("Erro no Auth:", authError);
        throw authError;
      }

      console.log("Usuário criado no Auth:", authData);

      if (authData.user) {
        console.log("Aguardando confirmação do usuário...");

        // Aguardar um pouco para o usuário estar disponível em auth.users
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log("Tentando criar perfil na tabela users...");

        // Criar perfil do usuário na tabela users (usando UPSERT para evitar duplicatas)
        const { data: profileData, error: profileError } = await supabase
          .from("users")
          .upsert([
            {
              id: authData.user.id,
              name: registerData.nome,
              email: registerData.email,
              role: "atendente",
              telefone: registerData.telefone,
              cartorio_id: null,
              ativo: true,
              created_at: new Date().toISOString(),
            },
          ])
          .select();

        if (profileError) {
          console.error("Erro ao criar perfil:", profileError);
          console.error(
            "Detalhes do erro:",
            JSON.stringify(profileError, null, 2)
          );

          toast.error("Erro ao criar perfil do usuário. Tente novamente.");
        } else {
          console.log("Perfil criado/atualizado com sucesso:", profileData);
          toast.success("Conta criada com sucesso!");
          router.push("/dashboard");
        }

        // Limpar formulário
        setRegisterData({
          nome: "",
          email: "",
          telefone: "",
          password: "",
          confirmPassword: "",
        });

        // Voltar para o login
        setMode("login");
      }
    } catch (error: any) {
      console.error("Erro no registro:", error);

      // Mensagens de erro mais amigáveis
      if (error.message.includes("User already registered")) {
        toast.error(
          "Este email já está cadastrado. Faça login ou use outro email."
        );
      } else if (error.message.includes("Password should be at least")) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
      } else if (error.message.includes("Invalid email")) {
        toast.error("Por favor, insira um email válido");
      } else if (error.message.includes("permission denied")) {
        toast.error(
          "Erro de permissão. Verifique se as políticas de segurança estão configuradas corretamente."
        );
      } else {
        toast.error("Erro ao criar conta: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setLoginError(""); // Limpar erro ao trocar de modo
  };

  const handleInputChange = (
    field: keyof LoginFormData | keyof RegisterFormData,
    value: string
  ) => {
    if (mode === "login") {
      setLoginData((prev) => ({ ...prev, [field]: value }));
    } else {
      // Aplicar máscara para telefone
      if (field === "telefone") {
        // Remove tudo que não é número
        const numbers = value.replace(/\D/g, "");

        // Aplica a máscara (11) 99999-9999
        if (numbers.length <= 2) {
          value = numbers;
        } else if (numbers.length <= 6) {
          value = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        } else if (numbers.length <= 10) {
          value = `(${numbers.slice(0, 2)}) ${numbers.slice(
            2,
            6
          )}-${numbers.slice(6)}`;
        } else {
          value = `(${numbers.slice(0, 2)}) ${numbers.slice(
            2,
            7
          )}-${numbers.slice(7, 11)}`;
        }
      }

      setRegisterData((prev) => ({ ...prev, [field]: value }));
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
            <CardDescription>
              {mode === "login"
                ? "Faça login para acessar a plataforma de gestão inteligente"
                : "Crie sua conta para começar a usar a plataforma"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Tabs de navegação */}
            <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => switchMode("login")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  mode === "login"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <LogIn className="h-4 w-4 inline mr-2" />
                Entrar
              </button>
              <button
                onClick={() => switchMode("register")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  mode === "register"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <UserPlus className="h-4 w-4 inline mr-2" />
                Registrar
              </button>
            </div>

            {/* Formulário de Login */}
            {mode === "login" && (
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
            )}

            {/* Formulário de Registro */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-nome">Nome Completo</Label>
                  <Input
                    id="register-nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={registerData.nome}
                    onChange={(e) => handleInputChange("nome", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-email">E-mail</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={registerData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-telefone">Telefone</Label>
                  <Input
                    id="register-telefone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={registerData.telefone}
                    onChange={(e) =>
                      handleInputChange("telefone", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={registerData.password}
                      onChange={(e) =>
                        handleInputChange("password", e.target.value)
                      }
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
                <div>
                  <Label htmlFor="register-confirm-password">
                    Confirmar Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme sua senha"
                      value={registerData.confirmPassword}
                      onChange={(e) =>
                        handleInputChange("confirmPassword", e.target.value)
                      }
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
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
                      Criando conta...
                    </>
                  ) : (
                    "Criar Conta"
                  )}
                </Button>
              </form>
            )}

            {/* Links de ajuda */}
            {mode === "login" && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => switchMode("register")}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Não tem uma conta? Registre-se
                </button>
              </div>
            )}

            {mode === "register" && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => switchMode("login")}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Já tem uma conta? Faça login
                </button>
              </div>
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
