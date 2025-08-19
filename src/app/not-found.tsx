"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft, Brain } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-16 w-16 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Página não encontrada</CardTitle>
          <CardDescription>
            A página que você está procurando não existe ou foi movida.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
          </div>
          
          <div className="space-y-2">
            <Link href="/dashboard">
              <Button className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Ir para Dashboard
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500 mt-6">
            <p>Se você acredita que isso é um erro, entre em contato com o suporte.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}