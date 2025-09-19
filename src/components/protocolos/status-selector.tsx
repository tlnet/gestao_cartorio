"use client";

import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStatusPersonalizados } from "@/hooks/use-status-personalizados";
import { useProtocolos } from "@/hooks/use-supabase";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";

interface StatusSelectorProps {
  protocoloId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({
  protocoloId,
  currentStatus,
  onStatusChange,
  className = "",
}) => {
  const { statusPersonalizados, loading } = useStatusPersonalizados();
  const { updateProtocolo } = useProtocolos();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    try {
      setIsUpdating(true);

      // Atualizar o estado local imediatamente para feedback visual
      onStatusChange?.(newStatus);

      // Preparar dados para atualização
      const updateData: any = {
        status: newStatus,
        observacao: `Status alterado de "${currentStatus}" para "${newStatus}"`,
      };

      // Se o novo status for "Concluído", definir data_conclusao
      if (newStatus === "Concluído") {
        updateData.data_conclusao = new Date().toISOString();
      }

      await updateProtocolo(protocoloId, updateData);

      // Não mostrar toast aqui pois o hook já mostra
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do protocolo");
      // Reverter o estado local em caso de erro
      onStatusChange?.(currentStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusPersonalizado = statusPersonalizados.find(
      (s) => s.nome === status
    );
    if (statusPersonalizado) {
      return statusPersonalizado.cor;
    }

    // Cores padrão para status não personalizados
    switch (status) {
      case "Concluído":
        return "bg-green-100 text-green-800";
      case "Em Andamento":
        return "bg-blue-100 text-blue-800";
      case "Aguardando Análise":
        return "bg-yellow-100 text-yellow-800";
      case "Pendente":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (statusPersonalizados.length === 0) {
    return (
      <Badge className={`${getStatusColor(currentStatus)} ${className}`}>
        {currentStatus}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusPersonalizados.map((status) => (
            <SelectItem key={status.id} value={status.nome}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.cor }}
                />
                {status.nome}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isUpdating && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      )}
    </div>
  );
};

export default StatusSelector;
