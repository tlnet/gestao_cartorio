"use client";

import { Badge } from "@/components/ui/badge";
import { StatusConta, STATUS_CONTA_LABELS } from "@/types";
import { CheckCircle2, Clock, XCircle, Calendar, Ban } from "lucide-react";

interface StatusBadgeContaProps {
  status: StatusConta;
  className?: string;
}

const statusConfig: Record<
  StatusConta,
  {
    icon: React.ComponentType<{ className?: string }>;
    variant: string;
    color: string;
  }
> = {
  PAGA: {
    icon: CheckCircle2,
    variant: "default",
    color: "bg-green-500 text-white hover:bg-green-600",
  },
  A_PAGAR: {
    icon: Clock,
    variant: "secondary",
    color: "bg-yellow-500 text-white hover:bg-yellow-600",
  },
  VENCIDA: {
    icon: XCircle,
    variant: "destructive",
    color: "bg-red-500 text-white hover:bg-red-600",
  },
  AGENDADA: {
    icon: Calendar,
    variant: "outline",
    color: "bg-blue-500 text-white hover:bg-blue-600",
  },
  CANCELADA: {
    icon: Ban,
    variant: "outline",
    color: "bg-gray-500 text-white hover:bg-gray-600",
  },
};

export function StatusBadgeConta({ status, className }: StatusBadgeContaProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {STATUS_CONTA_LABELS[status]}
    </Badge>
  );
}
