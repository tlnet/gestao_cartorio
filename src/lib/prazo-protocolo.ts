import type { StatusPersonalizado } from "@/hooks/use-status-personalizados";
import {
  getStatusInicioPrazoNomes,
  hasStatusInicioPrazo,
  isStatusInicioPrazo,
} from "@/lib/status-resolve";
import { parseLocalDate } from "@/lib/utils";

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type ServicoPrazo = {
  nome: string;
  prazo_execucao?: number | null;
  prazo_verificacao?: number | null;
};

function calcularMaiorPrazoPorCampo(
  dataBase: Date | undefined | null,
  servicosNomes: string[],
  catalogo: ServicoPrazo[],
  campo: "prazo_execucao" | "prazo_verificacao"
): Date | null {
  if (!dataBase || servicosNomes.length === 0) return null;

  let maiorPrazoDias = 0;
  for (const nome of servicosNomes) {
    const info = catalogo.find((s) => s.nome === nome);
    const dias = info?.[campo];
    if (dias && dias > maiorPrazoDias) {
      maiorPrazoDias = dias;
    }
  }
  if (maiorPrazoDias <= 0) return null;

  const prazo = startOfDay(dataBase);
  prazo.setDate(prazo.getDate() + maiorPrazoDias);
  return prazo;
}

/**
 * Prazo de entrega = data base da contagem (status de início do prazo)
 * + maior prazo_execucao (dias) entre os serviços.
 */
export function calcularPrazoExecucaoPorServicos(
  dataBase: Date | undefined | null,
  servicosNomes: string[],
  catalogo: ServicoPrazo[]
): Date | null {
  return calcularMaiorPrazoPorCampo(
    dataBase,
    servicosNomes,
    catalogo,
    "prazo_execucao"
  );
}

/**
 * Prazo de verificação = data de abertura
 * + maior prazo_verificacao (dias) entre os serviços.
 */
export function calcularPrazoVerificacaoPorServicos(
  dataAbertura: Date | undefined | null,
  servicosNomes: string[],
  catalogo: ServicoPrazo[]
): Date | null {
  return calcularMaiorPrazoPorCampo(
    dataAbertura,
    servicosNomes,
    catalogo,
    "prazo_verificacao"
  );
}

export type ProtocoloPrazoInput = {
  status?: string | null;
  created_at?: string | Date | null;
  prazo_iniciado_em?: string | Date | null;
  prazo_execucao?: string | Date | null;
};

export type PrazoProtocoloInfo = {
  /** O cartório tem ao menos um status marcado como início de prazo. */
  regraAtiva: boolean;
  /** A contagem já vale para este protocolo. */
  iniciado: boolean;
  /** Data a partir da qual o prazo conta (null quando ainda não iniciou). */
  dataInicio: Date | null;
  /** Nomes dos status que dão início à contagem. */
  statusInicioNomes: string[];
};

/**
 * Resolve a base de contagem do prazo de um protocolo.
 *
 * - Sem status de início configurado: conta da abertura (comportamento antigo).
 * - Com a regra ativa: conta de `prazo_iniciado_em`; enquanto ele for nulo o
 *   prazo não vale. Protocolos antigos (com prazo já definido) foram
 *   preenchidos na migração e seguem contando normalmente.
 */
export function resolvePrazoProtocolo(
  protocolo: ProtocoloPrazoInput,
  statusPersonalizados: StatusPersonalizado[]
): PrazoProtocoloInfo {
  const regraAtiva = hasStatusInicioPrazo(statusPersonalizados);
  const statusInicioNomes = getStatusInicioPrazoNomes(statusPersonalizados);

  const toDate = (v: string | Date | null | undefined): Date | null => {
    if (!v) return null;
    const d = v instanceof Date ? v : parseLocalDate(v);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  };

  const inicioRegistrado = toDate(protocolo.prazo_iniciado_em);
  if (inicioRegistrado) {
    return {
      regraAtiva,
      iniciado: true,
      dataInicio: inicioRegistrado,
      statusInicioNomes,
    };
  }

  if (!regraAtiva) {
    const abertura = toDate(protocolo.created_at);
    return {
      regraAtiva,
      iniciado: !!abertura,
      dataInicio: abertura,
      statusInicioNomes,
    };
  }

  // Regra ativa e sem registro: só conta se o status atual já for de início
  // (protocolo criado direto no status configurado, antes de salvar a data).
  if (isStatusInicioPrazo(protocolo.status ?? "", statusPersonalizados)) {
    const abertura = toDate(protocolo.created_at);
    return {
      regraAtiva,
      iniciado: !!abertura,
      dataInicio: abertura,
      statusInicioNomes,
    };
  }

  return { regraAtiva, iniciado: false, dataInicio: null, statusInicioNomes };
}

/** Texto curto para exibir enquanto a contagem não começou. */
export function descreverAguardandoInicioPrazo(
  statusInicioNomes: string[]
): string {
  if (statusInicioNomes.length === 0) return "Prazo não iniciado";
  if (statusInicioNomes.length === 1) {
    return `Prazo inicia em "${statusInicioNomes[0]}"`;
  }
  return `Prazo inicia em: ${statusInicioNomes
    .map((n) => `"${n}"`)
    .join(", ")}`;
}

/**
 * A data do prazo só vale depois que o protocolo passou pelo status que inicia
 * a contagem (o de pagamento). Enquanto isso não acontece o protocolo fica como
 * "não iniciado", mesmo que já exista uma data gravada em `prazo_execucao`
 * (protocolos antigos ou prazo preenchido antes da regra entrar em vigor).
 */
export function isPrazoAguardandoInicio(
  protocolo: ProtocoloPrazoInput,
  statusPersonalizados: StatusPersonalizado[]
): boolean {
  return !resolvePrazoProtocolo(protocolo, statusPersonalizados).iniciado;
}

export type SituacaoPrazo = "vencido" | "vencendo" | "no-prazo";

export type AvaliacaoPrazo = {
  situacao: SituacaoPrazo;
  /** Dias até o vencimento; negativo indica dias de atraso. */
  dias: number;
};

/**
 * Situação do prazo de entrega em relação a hoje. Compara dia a dia (ignora
 * horas) para que "vence hoje" não vire atraso no fim do expediente.
 */
export function avaliarPrazo(
  prazo: string | Date | null | undefined,
  diasAlerta = 2
): AvaliacaoPrazo | null {
  if (!prazo) return null;
  const d = prazo instanceof Date ? prazo : parseLocalDate(prazo);
  if (Number.isNaN(d.getTime())) return null;

  const dias = Math.round(
    (startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000
  );

  if (dias < 0) return { situacao: "vencido", dias };
  if (dias <= diasAlerta) return { situacao: "vencendo", dias };
  return { situacao: "no-prazo", dias };
}

/** Texto do tooltip para a situação do prazo. */
export function descreverSituacaoPrazo(av: AvaliacaoPrazo): string {
  if (av.situacao === "vencido") {
    const atraso = Math.abs(av.dias);
    return atraso === 1 ? "Atrasado há 1 dia" : `Atrasado há ${atraso} dias`;
  }
  if (av.dias === 0) return "Vence hoje";
  if (av.dias === 1) return "Vence amanhã";
  return `Vence em ${av.dias} dias`;
}
