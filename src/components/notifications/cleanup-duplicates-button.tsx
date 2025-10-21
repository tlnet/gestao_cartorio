"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { toast } from "sonner";

interface CleanupDuplicatesButtonProps {
  className?: string;
}

export function CleanupDuplicatesButton({
  className,
}: CleanupDuplicatesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { limparNotificacoesDuplicadas } = useNotifications();

  const handleCleanup = async () => {
    try {
      setIsLoading(true);
      await limparNotificacoesDuplicadas();
      toast.success("Notificações duplicadas removidas com sucesso!");
    } catch (error) {
      console.error("Erro ao limpar notificações duplicadas:", error);
      toast.error("Erro ao remover notificações duplicadas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCleanup}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      <span className="ml-2">
        {isLoading ? "Limpando..." : "Limpar Duplicatas"}
      </span>
    </Button>
  );
}

