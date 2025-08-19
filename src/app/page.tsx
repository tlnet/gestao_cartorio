"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';

export default function Home() {
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
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.href = '/login'} 
              variant="outline" 
              className="flex-1"
            >
              Login
            </Button>
            <Button 
              onClick={() => window.location.href = '/dashboard'} 
              className="flex-1"
            >
              Dashboard
            </Button>
          </div>
          <div className="text-center text-sm text-gray-500">
            <p>✅ Sistema funcionando!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}