import type { StatusPersonalizado } from "@/hooks/use-status-personalizados";

/** Chave estável para comparar nomes de status (case, acentos, espaços). */
export function normalizeStatusKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

const PADRAO_CORES: Record<string, string> = {
  concluido: "#10b981",
  "em andamento": "#3b82f6",
  "aguardando analise": "#f59e0b",
  pendente: "#ef4444",
  cancelado: "#6b7280",
};

const STATUS_PADRAO_NOMES = [
  "Aguardando Análise",
  "Em Andamento",
  "Pendente",
  "Concluído",
  "Cancelado",
] as const;

export function sanitizeStatusColor(cor: string | undefined | null): string {
  if (!cor?.trim()) return "#6b7280";
  const c = cor.trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(c)) return c;
  if (/^rgba?\(/i.test(c)) return c;
  return "#6b7280";
}

/** Encontra status personalizado mesmo com diferença de maiúsculas/minúsculas ou acentos. */
export function findStatusPersonalizadoMatch(
  status: string,
  list: StatusPersonalizado[]
): StatusPersonalizado | undefined {
  if (!status?.trim()) return undefined;
  const key = normalizeStatusKey(status);
  return list.find((s) => normalizeStatusKey(s.nome) === key);
}

/** Cor do indicador (sempre valor CSS válido para style.backgroundColor). */
export function resolveStatusDotColor(
  status: string,
  list: StatusPersonalizado[]
): string {
  if (!status?.trim()) return "#9ca3af";
  const p = findStatusPersonalizadoMatch(status, list);
  if (p) return sanitizeStatusColor(p.cor);
  const padrao = PADRAO_CORES[normalizeStatusKey(status)];
  return padrao ?? "#6b7280";
}

export type StatusSelectOption = {
  value: string;
  label: string;
  dotColor: string;
};

/**
 * Opções do select: personalizados (ordem do cartório), depois padrões que não colidem,
 * e por último garante o valor atual do protocolo na lista (Radix exige item com value igual).
 */
export function buildStatusSelectOptions(
  personalizados: StatusPersonalizado[],
  currentStatus: string
): StatusSelectOption[] {
  const seenKeys = new Set<string>();
  const out: StatusSelectOption[] = [];

  const push = (value: string, label: string, dotColor: string) => {
    const k = normalizeStatusKey(value);
    if (seenKeys.has(k)) return;
    seenKeys.add(k);
    out.push({ value, label, dotColor });
  };

  for (const s of personalizados) {
    push(s.nome, s.nome, sanitizeStatusColor(s.cor));
  }

  for (const nome of STATUS_PADRAO_NOMES) {
    push(nome, nome, resolveStatusDotColor(nome, personalizados));
  }

  const cur = currentStatus?.trim() ?? "";
  if (cur && !out.some((o) => o.value === cur)) {
    out.unshift({
      value: cur,
      label: cur,
      dotColor: resolveStatusDotColor(cur, personalizados),
    });
  }

  return out;
}
