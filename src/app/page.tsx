"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";

export default function Home() {
  const goToLogin = () => {
    window.location.href = "/login";
  };

  const goToDashboard = () => {
    window.location.href = "/dashboard";
  };

  const goToTest = () => {
    window.location.href = "/test";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-lg bg-blue-600">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">IA Cartórios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Sistema de Gestão Inteligente para Cartórios
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={goToTest} variant="outline">
              🧪 Página de Teste
            </Button>
            <Button onClick={goToLogin} variant="outline">
              🔐 Login
            </Button>
            <Button onClick={goToDashboard}>📊 Dashboard</Button>
          </div>
          <div className="text-center text-sm text-gray-500">
            <p>✅ Sistema funcionando!</p>
            <p className="mt-1">Versão: 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
