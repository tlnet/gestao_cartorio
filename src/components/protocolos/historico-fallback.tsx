"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MessageSquare, AlertTriangle, Database } from "lucide-react";

interface HistoricoFallbackProps {
  protocoloId: string;
  onRetry?: () => void;
  errorType?: "table_not_found" | "data_type_error" | "unknown";
}

const HistoricoFallback: React.FC<HistoricoFallbackProps> = ({
  protocoloId,
  onRetry,
  errorType = "unknown",
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Histórico de Alterações
        </CardTitle>
        <CardDescription>
          Linha do tempo com todas as mudanças e comentários
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              {errorType === "data_type_error" ? (
                <>
                  <p>
                    <strong>
                      Erro de tipo de dados na tabela de histórico.
                    </strong>{" "}
                    A coluna
                    <code className="bg-gray-100 px-1 rounded">
                      usuario_responsavel
                    </code>{" "}
                    está configurada como UUID, mas deveria ser TEXT.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Database className="h-4 w-4" />
                    <span>Execute: fix-historico-table-schema.sql</span>
                  </div>
                </>
              ) : errorType === "table_not_found" ? (
                <>
                  <p>
                    <strong>Tabela de histórico não encontrada.</strong> Para
                    ativar o histórico de alterações, execute o script SQL no
                    Supabase.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Database className="h-4 w-4" />
                    <span>Execute: create-historico-table-complete.sql</span>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    <strong>Erro no histórico de alterações.</strong> Verifique
                    os logs do console para mais detalhes.
                  </p>
                </>
              )}
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="mt-2"
                >
                  Tentar Novamente
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default HistoricoFallback;
