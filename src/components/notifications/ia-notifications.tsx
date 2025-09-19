"use client";

import React from "react";
import { Bot, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

const IANotifications = () => {
  const { getNotificacoesByTipo } = useNotifications();

  const notificacoesIA = getNotificacoesByTipo("ia_processado");

  if (notificacoesIA.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processado":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "processando":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "erro":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "processado":
        return "bg-green-100 text-green-800 border-green-200";
      case "processando":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "erro":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-purple-600" />
          <span>Relatórios de IA</span>
          <Badge variant="secondary" className="ml-auto">
            {notificacoesIA.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notificacoesIA.slice(0, 3).map((notificacao) => {
          const status = notificacao.metadata?.status || "processado";

          return (
            <div
              key={notificacao.id}
              className={`p-3 rounded-lg border ${getStatusColor(status)}`}
            >
              <div className="flex items-start space-x-3">
                {getStatusIcon(status)}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{notificacao.titulo}</h4>
                  <p className="text-xs mt-1 opacity-90">
                    {notificacao.mensagem}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getStatusColor(status)}`}
                    >
                      {status === "processado"
                        ? "Processado"
                        : status === "processando"
                        ? "Processando"
                        : status === "erro"
                        ? "Erro"
                        : "Desconhecido"}
                    </Badge>
                    <span className="text-xs opacity-75">
                      {formatDistanceToNow(
                        new Date(
                          notificacao.data_notificacao ||
                            notificacao.created_at ||
                            new Date()
                        ),
                        { addSuffix: true, locale: ptBR }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {notificacoesIA.length > 3 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600 text-center">
              E mais {notificacoesIA.length - 3} relatório(s) de IA
            </p>
          </div>
        )}

        <div className="pt-3">
          <Link href="/ia">
            <Button variant="outline" size="sm" className="w-full">
              Ver relatórios de IA
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default IANotifications;
