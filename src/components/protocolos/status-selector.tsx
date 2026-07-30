"use client";

import React, { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useStatusPersonalizados } from "@/hooks/use-status-personalizados";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import {
  buildStatusSelectOptions,
  isStatusConclusao,
  normalizeStatusKey,
  resolveStatusDotColor,
} from "@/lib/status-resolve";
import { canAlterarStatusProtocolo } from "@/lib/protocolo-permissoes";

interface StatusSelectorProps {
  protocoloId: string;
  currentStatus: string;
  responsavelServicoId?: string | null;
  onStatusChange?: (newStatus: string) => void;
  updateProtocoloFn: (id: string, updates: any) => Promise<void>;
  className?: string;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({
  protocoloId,
  currentStatus,
  responsavelServicoId,
  onStatusChange,
  updateProtocoloFn,
  className = "",
}) => {
  const { user, userType, userRoles } = useAuth();
  const { statusPersonalizados, loading } = useStatusPersonalizados();
  const [isUpdating, setIsUpdating] = useState(false);

  const podeAlterar = canAlterarStatusProtocolo({
    userId: user?.id,
    userType,
    userRoles,
    responsavelServicoId,
  });

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    if (!podeAlterar) {
      toast.error(
        "Você só pode alterar o status de protocolos em que é o responsável."
      );
      return;
    }

    try {
      setIsUpdating(true);

      onStatusChange?.(newStatus);

      const updateData: any = {
        status: newStatus,
        observacao: `Status alterado de "${currentStatus}" para "${newStatus}"`,
      };

      if (isStatusConclusao(newStatus, statusPersonalizados)) {
        updateData.data_conclusao = new Date().toISOString();
      } else if (isStatusConclusao(currentStatus ?? "", statusPersonalizados)) {
        updateData.data_conclusao = null;
      }

      await updateProtocoloFn(protocoloId, updateData);
    } catch (error: any) {
      console.error("Erro ao atualizar status:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      toast.error(
        "Erro ao atualizar status do protocolo" +
          (error?.message ? `: ${error.message}` : "")
      );
      onStatusChange?.(currentStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const key = normalizeStatusKey(status);
    switch (key) {
      case normalizeStatusKey("Concluído"):
        return "bg-green-100 text-green-800";
      case normalizeStatusKey("Em Andamento"):
        return "bg-blue-100 text-blue-800";
      case normalizeStatusKey("Aguardando Análise"):
        return "bg-yellow-100 text-yellow-800";
      case normalizeStatusKey("Pendente"):
        return "bg-red-100 text-red-800";
      case normalizeStatusKey("Cancelado"):
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const selectOptions = useMemo(
    () => buildStatusSelectOptions(statusPersonalizados, currentStatus ?? ""),
    [statusPersonalizados, currentStatus]
  );

  const triggerDotColor = resolveStatusDotColor(
    currentStatus ?? "",
    statusPersonalizados
  );

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (statusPersonalizados.length === 0 || !podeAlterar) {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
        title={
          !podeAlterar
            ? "Somente o responsável (ou um administrador) pode alterar o status"
            : undefined
        }
      >
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: triggerDotColor }}
          aria-hidden
        />
        <Badge className={getStatusBadgeClass(currentStatus ?? "")}>
          {currentStatus?.trim() ? currentStatus : "Sem status"}
        </Badge>
      </div>
    );
  }

  const selectValue =
    currentStatus?.trim() !== "" ? currentStatus : undefined;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select
        value={selectValue}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-48 min-w-[12rem]">
          {selectValue ? (
            <SelectValue placeholder="Selecionar status" />
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#9ca3af]"
                aria-hidden
              />
              <SelectValue placeholder="Selecionar status" />
            </div>
          )}
        </SelectTrigger>
        <SelectContent>
          {selectOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.dotColor }}
                />
                <span className="truncate">{opt.label}</span>
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
