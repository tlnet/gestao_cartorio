"use client";

import { useEffect, useState } from "react";
import { useContasPagar } from "@/hooks/use-contas-pagar";
import { useAlertasPersistentes } from "@/hooks/use-alertas-persistentes";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingAnimation } from "@/components/ui/loading-spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Calendar, X } from "lucide-react";
import { ContaPagar } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContasAlertasProps {
  cartorioId?: string;
}

export function ContasAlertas({ cartorioId }: ContasAlertasProps) {
  const [contasVencidas, setContasVencidas] = useState<ContaPagar[]>([]);
  const [contasAVencer, setContasAVencer] = useState<ContaPagar[]>([]);
  const [loading, setLoading] = useState(true);

  // Hook para gerenciar alertas persistentes
  const { alertasFechados, fecharAlertaVencidas, fecharAlertaAVencer } =
    useAlertasPersistentes();

  const { buscarContasVencidas, buscarContasAVencer } =
    useContasPagar(cartorioId);

  useEffect(() => {
    const carregarAlertas = async () => {
      if (!cartorioId) return;

      setLoading(true);
      try {
        const [vencidas, aVencer] = await Promise.all([
          buscarContasVencidas(),
          buscarContasAVencer(7), // Próximos 7 dias
        ]);

        setContasVencidas(vencidas);
        setContasAVencer(aVencer);
      } catch (error) {
        console.error("Erro ao carregar alertas:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarAlertas();
  }, [cartorioId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const getDiasAteVencimento = (dataVencimento: Date) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diff = Math.ceil(
      (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Pagamento</CardTitle>
          <CardDescription>
            <LoadingAnimation size="sm" variant="dots" />
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (
    (contasVencidas.length === 0 || alertasFechados.vencidas) &&
    (contasAVencer.length === 0 || alertasFechados.aVencer)
  ) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Contas Vencidas */}
      {contasVencidas.length > 0 && !alertasFechados.vencidas && (
        <div className="relative bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  {contasVencidas.length}{" "}
                  {contasVencidas.length === 1
                    ? "Conta Vencida"
                    : "Contas Vencidas"}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Ação imediata necessária
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fecharAlertaVencidas}
              className="text-red-600 hover:text-red-800 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {contasVencidas.slice(0, 3).map((conta) => (
              <div
                key={conta.id}
                className="flex justify-between items-center bg-white rounded-md p-3 border border-red-200"
              >
                <span className="font-medium text-gray-900">
                  {conta.descricao}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-600">
                    {formatCurrency(conta.valor)}
                  </span>
                  <Badge
                    variant="destructive"
                    className="bg-red-100 text-red-800 border-red-300"
                  >
                    {formatDate(conta.dataVencimento)}
                  </Badge>
                </div>
              </div>
            ))}
            {contasVencidas.length > 3 && (
              <p className="text-sm text-red-600 font-medium">
                + {contasVencidas.length - 3} contas vencidas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contas a Vencer */}
      {contasAVencer.length > 0 && !alertasFechados.aVencer && (
        <div className="relative bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900">
                  {contasAVencer.length}{" "}
                  {contasAVencer.length === 1
                    ? "Conta Vence nos Próximos 7 Dias"
                    : "Contas Vencem nos Próximos 7 Dias"}
                </h3>
                <p className="text-sm text-orange-700 mt-1">
                  Atenção aos vencimentos próximos
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fecharAlertaAVencer}
              className="text-orange-600 hover:text-orange-800 hover:bg-orange-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {contasAVencer.slice(0, 3).map((conta) => {
              const dias = getDiasAteVencimento(conta.dataVencimento);
              return (
                <div
                  key={conta.id}
                  className="flex justify-between items-center bg-white rounded-md p-3 border border-orange-200"
                >
                  <span className="font-medium text-gray-900">
                    {conta.descricao}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(conta.valor)}
                    </span>
                    <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                      {dias === 0
                        ? "Hoje"
                        : dias === 1
                        ? "Amanhã"
                        : `${dias} dias`}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {contasAVencer.length > 3 && (
              <p className="text-sm text-orange-600 font-medium">
                + {contasAVencer.length - 3} contas a vencer
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
