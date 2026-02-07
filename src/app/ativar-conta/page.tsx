"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

type TokenStatus = "validating" | "valid" | "invalid" | "expired" | "used";

interface UserData {
  name: string;
  email: string;
  telefone: string;
}

export default function AtivarContaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("validating");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Estados do formulário de senha
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validações de senha
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const allValidationsPassed =
    hasMinLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    passwordsMatch;

  // Força da senha
  const getPasswordStrength = () => {
    if (!password) return { label: "", color: "" };
    if (password.length < 8)
      return { label: "Fraca", color: "text-red-600 bg-red-100" };
    if (!hasUpperCase || !hasLowerCase || !hasNumber)
      return { label: "Média", color: "text-amber-600 bg-amber-100" };
    return { label: "Forte", color: "text-green-600 bg-green-100" };
  };

  const passwordStrength = getPasswordStrength();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setTokenStatus("invalid");
      setErrorMessage("Token não fornecido na URL");
      setLoading(false);
      return;
    }

    validateToken(token);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allValidationsPassed) {
      toast.error("Por favor, atenda a todos os requisitos de senha");
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      toast.error("Token inválido");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/users/activate-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Conta ativada com sucesso!");

        // Aguardar 2 segundos antes de redirecionar
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        toast.error(data.error || "Erro ao ativar conta");
      }
    } catch (error) {
      console.error("Erro ao ativar conta:", error);
      toast.error("Erro ao ativar conta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const validateToken = async (token: string) => {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/users/validate-invite?token=${token}`
      );
      const data = await response.json();

      if (response.ok && data.valid) {
        setTokenStatus("valid");
        setUserData(data.user);
        setErrorMessage("");
      } else {
        // Determinar status baseado no motivo do erro
        if (data.reason === "expired") {
          setTokenStatus("expired");
          setErrorMessage(
            data.message ||
              "Este convite expirou. Entre em contato com o administrador para solicitar um novo convite."
          );
        } else if (data.reason === "already_used") {
          setTokenStatus("used");
          setErrorMessage(
            data.message ||
              "Este convite já foi utilizado. Sua conta já está ativa."
          );
        } else {
          setTokenStatus("invalid");
          setErrorMessage(
            data.message ||
              "Token de convite inválido. Verifique o link e tente novamente."
          );
        }
      }
    } catch (error) {
      console.error("Erro ao validar token:", error);
      setTokenStatus("invalid");
      setErrorMessage(
        "Erro ao validar convite. Verifique sua conexão e tente novamente."
      );
    } finally {
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
            <CardTitle>Ativar Conta</CardTitle>
            <CardDescription>
              {tokenStatus === "validating" && "Validando convite..."}
              {tokenStatus === "valid" &&
                "Complete seu cadastro definindo uma senha"}
              {tokenStatus === "invalid" && "Convite inválido"}
              {tokenStatus === "expired" && "Convite expirado"}
              {tokenStatus === "used" && "Convite já utilizado"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Estado: Validando */}
            {loading && tokenStatus === "validating" && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Validando seu convite...</p>
              </div>
            )}

            {/* Estado: Token Válido - Exibir dados do usuário */}
            {!loading && tokenStatus === "valid" && userData && (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Convite válido! Complete seu cadastro abaixo.
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Seus dados cadastrados:
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Nome</p>
                      <p className="text-sm font-medium text-gray-900">
                        {userData.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">E-mail</p>
                      <p className="text-sm font-medium text-gray-900">
                        {userData.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">
                        Telefone
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {userData.telefone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Formulário de definição de senha */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Campo Nova Senha */}
                  <div>
                    <Label htmlFor="password">Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={submitting}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Campo Confirmar Senha */}
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Digite sua senha novamente"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pr-10"
                        disabled={submitting}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        disabled={submitting}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Indicador de força da senha */}
                  {password && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Força da senha:
                      </span>
                      <span
                        className={`text-sm font-medium px-2 py-0.5 rounded ${passwordStrength.color}`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}

                  {/* Requisitos de senha */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Requisitos da senha:
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        {hasMinLength ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span
                          className={
                            hasMinLength ? "text-green-700" : "text-gray-600"
                          }
                        >
                          Pelo menos 8 caracteres
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {hasUpperCase ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span
                          className={
                            hasUpperCase ? "text-green-700" : "text-gray-600"
                          }
                        >
                          Uma letra maiúscula
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {hasLowerCase ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span
                          className={
                            hasLowerCase ? "text-green-700" : "text-gray-600"
                          }
                        >
                          Uma letra minúscula
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {hasNumber ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span
                          className={
                            hasNumber ? "text-green-700" : "text-gray-600"
                          }
                        >
                          Um número
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {passwordsMatch ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400" />
                        )}
                        <span
                          className={
                            passwordsMatch ? "text-green-700" : "text-gray-600"
                          }
                        >
                          As senhas coincidem
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de ativação */}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!allValidationsPassed || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Ativando conta...
                      </>
                    ) : (
                      "Ativar Conta"
                    )}
                  </Button>
                </form>
              </div>
            )}

            {/* Estado: Token Inválido */}
            {!loading && tokenStatus === "invalid" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <XCircle className="h-16 w-16 text-red-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Convite Inválido
                  </h3>
                  <p className="text-gray-600 text-center text-sm">
                    {errorMessage}
                  </p>
                </div>
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800 text-sm">
                    Se você recebeu este link recentemente, verifique se copiou
                    corretamente ou entre em contato com o administrador.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Estado: Token Expirado */}
            {!loading && tokenStatus === "expired" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Convite Expirado
                  </h3>
                  <p className="text-gray-600 text-center text-sm">
                    {errorMessage}
                  </p>
                </div>
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-amber-800 text-sm">
                    <strong>O que fazer agora?</strong>
                    <br />
                    Entre em contato com o administrador do sistema e solicite
                    um novo convite de ativação.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Estado: Token Já Utilizado */}
            {!loading && tokenStatus === "used" && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Conta Já Ativada
                  </h3>
                  <p className="text-gray-600 text-center text-sm">
                    {errorMessage}
                  </p>
                </div>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800 text-sm">
                    Você já pode fazer login no sistema com suas credenciais.
                  </AlertDescription>
                </Alert>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Ir para Login
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
