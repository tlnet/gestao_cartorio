"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Brain } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

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
      </div>
    </div>
  );
}