import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte uma string de data no formato YYYY-MM-DD para um objeto Date local
 * Evita problemas de fuso horário ao interpretar datas como UTC
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();

  // Se já é um objeto Date, retorna ele mesmo
  if (dateString instanceof Date) return dateString;

  // Se contém T (formato ISO), usa new Date normal
  if (dateString.includes("T")) {
    return new Date(dateString);
  }

  // Para formato YYYY-MM-DD, cria data local
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Converte um objeto Date para string no formato YYYY-MM-DD
 * Mantém a data local sem conversão de fuso horário
 */
export function formatDateForDatabase(date: Date): string {
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data para exibição em português brasileiro
 * Trata corretamente strings de data no formato YYYY-MM-DD
 */
export function formatDateForDisplay(dateString: string | Date): string {
  if (!dateString) return "Não definido";

  const date =
    typeof dateString === "string" ? parseLocalDate(dateString) : dateString;
  return date.toLocaleDateString("pt-BR");
}
