"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, Brain, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Verificando autenticação...');
      
      // Testar conexão com Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Erro ao verificar sessão:', error);
        setError('Erro de conexão com Supabase: ' + error.message);
        setLoading(false);
        return;
      }

      console.log('Sessão:', session);
      setUser(session?.user || null);
      
      // Redirecionar baseado no estado de autenticação
      if (session?.user) {
        console.log('Usuário logado, redirecionando para dashboard...');
        router.push('/dashboard');
      } else {
        console.log('Usuário não logado, redirecionando para login...');
        router.push('/login');
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    router.push('/login');
  };

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-lg bg-red-600">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl text-red-600">Erro de Conexão</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Possíveis soluções:</strong></p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Verifique as variáveis de ambiente do Supabase</li>
                <li>Certifique-se de que o projeto Supabase está ativo</li>
                <li>Tente recarregar a página</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                Recarregar
              </Button>
              <Button onClick={goToLogin} className="flex-1">
                Ir para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-lg bg-blue-600">
              <Brain className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">IA Cartórios</h1>
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Verificando autenticação...</p>
          </div>
          <div className="text-sm text-gray-500">
            <p>Se esta tela persistir, verifique o console do navegador</p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback - não deveria chegar aqui normalmente
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-lg bg-blue-600">
              <Brain className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">IA Cartórios</CardTitle>
          <CardDescription>Sistema de Gestão Inteligente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600">
            <p>Status: {user ? 'Logado' : 'Não logado'}</p>
            {user && <p>Email: {user.email}</p>}
          </div>
          <div className="flex gap-2">
            <Button onClick={goToLogin} variant="outline" className="flex-1">
              Login
            </Button>
            <Button onClick={goToDashboard} className="flex-1">
              Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}