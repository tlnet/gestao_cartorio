"use client";

import { AlertTriangle, Clock, Timer } from "lucide-react";
import { cn, formatDateForDisplay } from "@/lib/utils";
import {
  avaliarPrazo,
  descreverAguardandoInicioPrazo,
  descreverSituacaoPrazo,
  isPrazoAguardandoInicio,
  resolvePrazoProtocolo,
} from "@/lib/prazo-protocolo";
import type { StatusPersonalizado } from "@/hooks/use-status-personalizados";

export type ProtocoloPrazoRow = {
  status?: string | null;
  created_at?: string | null;
  prazo_iniciado_em?: string | null;
  prazo_execucao?: string | null;
  prazo_verificacao?: string | null;
  prazoExecucao?: string | null;
  prazoVerificacao?: string | null;
  prazoIniciadoEm?: string | null;
  servicos?: string[] | string | null;
};

interface PrazoProtocoloCellProps {
  protocolo: ProtocoloPrazoRow;
  statusPersonalizados: StatusPersonalizado[];
  compact?: boolean;
}

function PrazoBox({
  label,
  data,
  aguardando,
  aguardandoTitulo,
  compact,
}: {
  label: string;
  data?: string | null;
  aguardando?: boolean;
  aguardandoTitulo?: string;
  compact?: boolean;
}) {
  const av = !aguardando ? avaliarPrazo(data) : null;
  const vencido = av?.situacao === "vencido";
  const vencendo = av?.situacao === "vencendo";

  return (
    <div
      className={cn(
        "flex min-w-[6.75rem] flex-1 flex-col items-center justify-center rounded-md border bg-muted/40 text-center",
        compact ? "px-1.5 py-1" : "px-2 py-1.5",
        vencido && "border-red-200 bg-red-50/60",
        vencendo && !vencido && "border-amber-200 bg-amber-50/60",
        !vencido && !vencendo && "border-border"
      )}
      title={
        aguardando
          ? aguardandoTitulo
          : av
          ? descreverSituacaoPrazo(av)
          : undefined
      }
    >
      <span
        className={cn(
          "font-medium text-muted-foreground",
          compact ? "text-[9px] leading-tight" : "text-[10px] leading-tight"
        )}
      >
        {label}
      </span>

      {aguardando ? (
        <div
          className={cn(
            "mt-0.5 flex items-center justify-center gap-0.5 text-gray-600",
            compact ? "text-[10px]" : "text-[11px]"
          )}
        >
          <Timer className="h-3 w-3 shrink-0" />
          <span className="whitespace-nowrap leading-tight">Não iniciado</span>
        </div>
      ) : (
        <div
          className={cn(
            "mt-0.5 flex items-center justify-center gap-0.5 font-medium leading-tight",
            compact ? "text-[10px]" : "text-xs",
            vencido && "text-red-600",
            vencendo && "text-amber-600"
          )}
        >
          <span className="whitespace-nowrap">
            {data ? formatDateForDisplay(data) : "-"}
          </span>
          {vencido && (
            <AlertTriangle className="h-3 w-3 shrink-0 text-red-600" />
          )}
          {vencendo && (
            <Clock className="h-3 w-3 shrink-0 text-amber-500" />
          )}
        </div>
      )}
    </div>
  );
}

export function PrazoProtocoloCell({
  protocolo,
  statusPersonalizados,
  compact = false,
}: PrazoProtocoloCellProps) {
  const prazoExecucao =
    protocolo.prazo_execucao ?? protocolo.prazoExecucao ?? null;
  const prazoVerificacao =
    protocolo.prazo_verificacao ?? protocolo.prazoVerificacao ?? null;

  const protocoloNormalizado = {
    status: protocolo.status,
    created_at: protocolo.created_at,
    prazo_iniciado_em:
      protocolo.prazo_iniciado_em ?? protocolo.prazoIniciadoEm ?? null,
    prazo_execucao: prazoExecucao,
    prazo_verificacao: prazoVerificacao,
  };

  const aguardando = isPrazoAguardandoInicio(
    protocoloNormalizado,
    statusPersonalizados
  );
  const prazoInfo = resolvePrazoProtocolo(
    protocoloNormalizado,
    statusPersonalizados
  );

  return (
    <div
      className={cn(
        "inline-flex w-full max-w-[16rem] items-stretch",
        compact ? "gap-1" : "gap-1.5"
      )}
    >
      <PrazoBox
        label="Verificação"
        data={prazoVerificacao}
        compact={compact}
      />
      <PrazoBox
        label="Entrega"
        data={prazoExecucao}
        aguardando={aguardando}
        aguardandoTitulo={descreverAguardandoInicioPrazo(
          prazoInfo.statusInicioNomes
        )}
        compact={compact}
      />
    </div>
  );
}
