"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  ArrowLeft,
  Search,
  FileText,
  Users,
  Settings,
  BarChart3,
  HelpCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  RefreshCw,
  Brain,
} from "lucide-react";

export default function NotFound() {
  const quickLinks = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: BarChart3,
      description: "Visão geral do sistema",
    },
    {
      href: "/protocolos",
      label: "Protocolos",
      icon: FileText,
      description: "Gerenciar protocolos",
    },
    {
      href: "/usuarios",
      label: "Usuários",
      icon: Users,
      description: "Gestão de usuários",
    },
    {
      href: "/relatorios",
      label: "Relatórios",
      icon: BarChart3,
      description: "Análises e relatórios",
    },
    {
      href: "/configuracoes",
      label: "Configurações",
      icon: Settings,
      description: "Configurações do sistema",
    },
  ];

  const supportInfo = [
    {
      icon: Mail,
      text: "suporte@cartorio.com.br",
      href: "mailto:suporte@cartorio.com.br",
    },
    { icon: Phone, text: "(11) 99999-9999", href: "tel:+5511999999999" },
    { icon: MapPin, text: "São Paulo - SP", href: "#" },
    { icon: Clock, text: "Seg-Sex: 8h às 18h", href: "#" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Logo da plataforma */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-12">
            <Brain className="h-12 w-12 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">IA Cartórios</h1>
              <p className="text-sm text-gray-600">Gestão Inteligente</p>
            </div>
          </div>
        </div>

        {/* Header centralizado */}
        <div className="text-center mb-16">
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
        <div className="flex justify-center mb-12">
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

        {/* Cards de navegação e suporte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Navegação Rápida */}
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-gray-800 flex items-center">
                <Search className="mr-3 h-6 w-6 text-blue-600" />
                Navegação Rápida
              </CardTitle>
              <CardDescription className="text-gray-600">
                Acesse rapidamente as principais seções do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickLinks.map((link, index) => (
                <Link key={index} href={link.href}>
                  <div className="flex items-center space-x-4 p-4 rounded-lg hover:bg-blue-50 transition-colors duration-200 group border border-transparent hover:border-blue-200">
                    <div className="flex-shrink-0">
                      <link.icon className="h-5 w-5 text-blue-600 group-hover:text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 group-hover:text-blue-700">
                        {link.label}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Informações de suporte */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center">
                <HelpCircle className="mr-3 h-6 w-6 text-blue-200" />
                Precisa de Ajuda?
              </CardTitle>
              <CardDescription className="text-blue-100">
                Nossa equipe está pronta para ajudar você
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {supportInfo.map((info, index) => (
                <a
                  key={index}
                  href={info.href}
                  className="flex items-center space-x-4 p-3 rounded-lg hover:bg-white/10 transition-colors duration-200 group"
                >
                  <info.icon className="h-5 w-5 text-blue-200 group-hover:text-white flex-shrink-0" />
                  <span className="text-sm group-hover:text-white">
                    {info.text}
                  </span>
                </a>
              ))}
              <div className="pt-4 border-t border-blue-400/30">
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white border-0 hover:bg-white/30"
                >
                  <Clock className="mr-2 h-3 w-3" />
                  Resposta em até 2h
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer minimalista */}
        <div className="text-center mt-16">
          <p className="text-gray-400 text-sm">
            © 2024 Sistema de Gestão Cartorial. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
