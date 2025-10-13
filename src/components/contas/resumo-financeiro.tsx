"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumoFinanceiro } from "@/types";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CreditCard,
} from "lucide-react";

interface ResumoFinanceiroProps {
  resumo: ResumoFinanceiro;
  loading?: boolean;
}

export function ResumoFinanceiroCard({
  resumo,
  loading,
}: ResumoFinanceiroProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const cards = [
    {
      title: "Total de Contas",
      value: resumo.totalContas,
      icon: CreditCard,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "contas cadastradas",
    },
    {
      title: "Total Pago",
      value: formatCurrency(resumo.totalPago),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "pagamentos realizados",
    },
    {
      title: "A Pagar",
      value: formatCurrency(resumo.totalAPagar),
      icon: DollarSign,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      description: "contas pendentes",
    },
    {
      title: "Vencidas",
      value: formatCurrency(resumo.totalVencido),
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      description: "contas atrasadas",
    },
    {
      title: "Total Pendente",
      value: formatCurrency(resumo.totalPendente),
      icon: TrendingDown,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "total a pagar + vencido",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`${card.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
