"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center">
        {/* Logo da plataforma */}
        <div className="flex justify-center mb-12">
          <Image
            src="/logo_iacartorios.png"
            alt="IA Cartórios"
            width={200}
            height={80}
            priority
            className="h-20 w-auto object-contain"
          />
        </div>

        {/* Header centralizado */}
        <div className="mb-12">
          <div className="relative inline-block mb-8">
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
              404
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Oops! Página não encontrada
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            A página que você está procurando não existe, foi movida ou está
            temporariamente indisponível.
          </p>
        </div>

        {/* Ações principais */}
        <div className="flex justify-center">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/dashboard">
              <Button className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300">
                <Home className="mr-2 h-5 w-5" />
                Ir para Dashboard
              </Button>
            </Link>
            <Button
              variant="outline"
              className="h-12 px-8 border-2 border-blue-300 hover:bg-blue-50 text-blue-700 font-medium transition-all duration-300"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
