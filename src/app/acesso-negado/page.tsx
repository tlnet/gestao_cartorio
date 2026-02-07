"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Página de Acesso Negado (403)
 * Exibida quando um usuário tenta acessar uma página para a qual não tem permissão
 */
export default function AcessoNegadoPage() {
  const router = useRouter();

  const handleVoltar = () => {
    router.back();
  };

  const handleDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-10 w-10 text-red-600" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Acesso Negado
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Você não tem permissão para acessar esta página
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-gray-500">
            Esta página é restrita a usuários com permissões específicas. Entre
            em contato com o administrador se você acredita que deveria ter
            acesso a este recurso.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={handleDashboard}
              className="w-full"
              size="lg"
            >
              Voltar ao Dashboard
            </Button>
            <Button
              onClick={handleVoltar}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Voltar à Página Anterior
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
