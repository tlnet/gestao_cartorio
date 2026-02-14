export interface Protocolo {
  id: string;
  status: string;
  demanda: string;
  protocolo: string;
  dataAbertura: Date;
  servicos: string[];
  solicitante: string;
  cpfCnpj: string;
  telefone: string;
  apresentante?: string;
  email?: string;
  observacao?: string;
  prazoExecucao?: Date;
  cartorioId: string;
  criadoPor: string;
  atualizadoEm: Date;
}

export interface HistoricoProtocolo {
  id: string;
  protocoloId: string;
  dataHora: Date;
  statusAnterior: string;
  novoStatus: string;
  usuarioResponsavel: string;
  observacao?: string;
}

// =====================================================
// TIPOS PARA SISTEMA DE HIERARQUIA E PERMISSÕES
// =====================================================

/**
 * Tipos de usuário disponíveis no sistema.
 * - admin: Acesso total ao sistema, incluindo gerenciamento de usuários e configurações
 * - atendente: Acesso limitado às funcionalidades operacionais
 * - financeiro: Acesso apenas a Contas a Pagar e Notificações (apenas de contas a pagar)
 */
export type TipoUsuario = "admin" | "atendente" | "financeiro";

/**
 * Rotas protegidas do sistema que requerem permissões específicas
 */
export type RotaProtegida = 
  | "/usuarios"
  | "/configuracoes";

/**
 * Interface de permissões por tipo de usuário
 */
export interface PermissoesUsuario {
  /** Pode acessar página de gerenciamento de usuários */
  podeGerenciarUsuarios: boolean;
  /** Pode acessar página de configurações */
  podeAcessarConfiguracoes: boolean;
  /** Pode modificar configurações do cartório */
  podeModificarConfiguracoes: boolean;
  /** Pode criar/editar/desativar outros usuários */
  podeGerenciarPermissoes: boolean;
  /** Lista de rotas que o usuário pode acessar */
  rotasPermitidas: string[];
  /** Lista de rotas bloqueadas para o usuário */
  rotasBloqueadas: RotaProtegida[];
}

/**
 * Mapeamento de permissões por tipo de usuário
 */
export const PERMISSOES_POR_TIPO: Record<TipoUsuario, PermissoesUsuario> = {
  admin: {
    podeGerenciarUsuarios: true,
    podeAcessarConfiguracoes: true,
    podeModificarConfiguracoes: true,
    podeGerenciarPermissoes: true,
    rotasPermitidas: [
      "/dashboard",
      "/protocolos",
      "/contas",
      "/relatorios",
      "/ia",
      "/cnib",
      "/notificacoes",
      "/perfil",
      "/usuarios",
      "/configuracoes",
    ],
    rotasBloqueadas: [],
  },
  atendente: {
    podeGerenciarUsuarios: false,
    podeAcessarConfiguracoes: false,
    podeModificarConfiguracoes: false,
    podeGerenciarPermissoes: false,
    rotasPermitidas: [
      "/dashboard",
      "/protocolos",
      "/relatorios",
      "/ia",
      "/cnib",
      "/notificacoes",
      "/perfil",
    ],
    rotasBloqueadas: ["/usuarios", "/configuracoes", "/contas"],
  },
  financeiro: {
    podeGerenciarUsuarios: false,
    podeAcessarConfiguracoes: false,
    podeModificarConfiguracoes: false,
    podeGerenciarPermissoes: false,
    rotasPermitidas: ["/contas", "/notificacoes", "/perfil"],
    rotasBloqueadas: ["/usuarios", "/configuracoes"],
  },
};

/**
 * Type guard: verifica se o usuário é administrador
 */
export function isAdmin(tipo: TipoUsuario | null | undefined): boolean {
  return tipo === "admin";
}

/**
 * Type guard: verifica se o usuário é atendente
 */
export function isAtendente(tipo: TipoUsuario | null | undefined): boolean {
  return tipo === "atendente";
}

/**
 * Type guard: verifica se o usuário é financeiro
 */
export function isFinanceiro(tipo: TipoUsuario | null | undefined): boolean {
  return tipo === "financeiro";
}

/**
 * Obtém as permissões de um tipo de usuário
 * @param tipo - Tipo do usuário
 * @returns Objeto de permissões ou permissões de atendente se tipo for inválido (fallback seguro)
 */
export function getPermissoes(tipo: TipoUsuario | null | undefined): PermissoesUsuario {
  if (!tipo) {
    // Fallback seguro: sem tipo = atendente (mais restritivo)
    return PERMISSOES_POR_TIPO.atendente;
  }
  return PERMISSOES_POR_TIPO[tipo] || PERMISSOES_POR_TIPO.atendente;
}

/**
 * Mescla permissões de múltiplos tipos (união: qualquer permissão concedida por um tipo é concedida).
 * Admin sempre ganha tudo; rotas permitidas = união; rotas bloqueadas = só bloqueia se nenhum tipo permitir.
 */
export function getPermissoesForRoles(roles: TipoUsuario[] | null | undefined): PermissoesUsuario {
  if (!roles?.length) {
    return PERMISSOES_POR_TIPO.atendente;
  }
  const tipos = roles.filter((t): t is TipoUsuario => t in PERMISSOES_POR_TIPO) as TipoUsuario[];
  if (tipos.length === 0) return PERMISSOES_POR_TIPO.atendente;

  const merged: PermissoesUsuario = {
    podeGerenciarUsuarios: false,
    podeAcessarConfiguracoes: false,
    podeModificarConfiguracoes: false,
    podeGerenciarPermissoes: false,
    rotasPermitidas: [],
    rotasBloqueadas: [],
  };

  const rotasPermitidasSet = new Set<string>();

  for (const t of tipos) {
    const p = PERMISSOES_POR_TIPO[t];
    if (!p) continue;
    merged.podeGerenciarUsuarios = merged.podeGerenciarUsuarios || p.podeGerenciarUsuarios;
    merged.podeAcessarConfiguracoes = merged.podeAcessarConfiguracoes || p.podeAcessarConfiguracoes;
    merged.podeModificarConfiguracoes = merged.podeModificarConfiguracoes || p.podeModificarConfiguracoes;
    merged.podeGerenciarPermissoes = merged.podeGerenciarPermissoes || p.podeGerenciarPermissoes;
    p.rotasPermitidas.forEach((r) => rotasPermitidasSet.add(r));
  }

  merged.rotasPermitidas = Array.from(rotasPermitidasSet);
  // União de permissões: rota bloqueada só se nenhum tipo permitir (já não está em rotasPermitidas)
  merged.rotasBloqueadas = [];
  return merged;
}

/** Ordem de prioridade para exibição do "tipo principal" (maior = mais importante) */
const ORDEM_TIPO_PRIORIDADE: Record<TipoUsuario, number> = {
  admin: 3,
  financeiro: 2,
  atendente: 1,
};

/**
 * Retorna o tipo "principal" para exibição quando o usuário tem múltiplos roles.
 */
export function getTipoPrincipal(roles: TipoUsuario[] | null | undefined): TipoUsuario {
  if (!roles?.length) return "atendente";
  const ordenados = [...roles].filter((t) => t in PERMISSOES_POR_TIPO) as TipoUsuario[];
  if (ordenados.length === 0) return "atendente";
  return ordenados.sort((a, b) => ORDEM_TIPO_PRIORIDADE[b] - ORDEM_TIPO_PRIORIDADE[a])[0];
}

/**
 * Normaliza valor do banco (role único ou array roles) para array de TipoUsuario.
 */
export function normalizarRoles(role: string | null | undefined, roles: string[] | null | undefined): TipoUsuario[] {
  if (roles?.length) {
    return roles.filter((r): r is TipoUsuario => r === "admin" || r === "atendente" || r === "financeiro");
  }
  if (role && (role === "admin" || role === "atendente" || role === "financeiro")) {
    return [role];
  }
  return ["atendente"];
}

/**
 * Verifica se um tipo de usuário pode acessar uma rota específica
 * @param tipo - Tipo do usuário (ou array de tipos para múltiplas permissões)
 * @param rota - Rota a ser verificada
 * @returns true se pode acessar, false caso contrário
 */
export function podeAcessarRota(
  tipo: TipoUsuario | TipoUsuario[] | null | undefined,
  rota: string
): boolean {
  const roles = Array.isArray(tipo) ? tipo : tipo != null ? [tipo] : null;
  const permissoes = getPermissoesForRoles(roles);
  if (permissoes.rotasBloqueadas.some((r) => rota.startsWith(r))) {
    return false;
  }
  return permissoes.rotasPermitidas.some((r) => rota.startsWith(r));
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: TipoUsuario;
  /** Múltiplas permissões/roles do usuário (quando usado, união das permissões) */
  roles?: TipoUsuario[];
  cartorioId?: string;
  ativo: boolean;
  criadoEm: Date;
  // Campos do sistema de convites
  inviteToken?: string | null;
  inviteCreatedAt?: Date | null;
  inviteExpiresAt?: Date | null;
  inviteStatus?: 'pending' | 'accepted' | 'expired' | 'cancelled' | null;
  inviteAcceptedAt?: Date | null;
  accountStatus?: 'active' | 'pending_activation' | 'inactive';
}

export interface Cartorio {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  statusPersonalizados: StatusPersonalizado[];
  configuracoes: ConfiguracaoCartorio;
  ativo: boolean;
}

export interface StatusPersonalizado {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  cartorioId: string;
}

export interface Servico {
  id: string;
  nome: string;
  prazoExecucao: number; // em dias
  ativo: boolean;
}

export interface ConfiguracaoCartorio {
  diasAlertaVencimento: number;
  notificacaoWhatsApp: boolean;
  webhookN8N: string;
}

export interface RelatorioIA {
  id: string;
  tipo: "resumo_matricula" | "analise_malote" | "minuta_documento";
  nomeArquivo: string;
  arquivoOriginal: string;
  relatorioPDF: string;
  relatorioDoc?: string;
  relatorioDocx?: string;
  processadoEm: Date;
  usuarioId: string;
  cartorioId: string;
}

export interface DashboardMetricas {
  processosHoje: number;
  processosSemana: number;
  processosMes: number;
  distribuicaoPorStatus: { status: string; quantidade: number; cor: string }[];
  processosVencendoPrazo: number;
}

// =====================================================
// TIPOS PARA SISTEMA DE CONTAS A PAGAR
// =====================================================

export type StatusConta =
  | "A_PAGAR"
  | "PAGA"
  | "VENCIDA"
  | "AGENDADA"
  | "CANCELADA"
  | string; // Permite status personalizados

export type CategoriaConta =
  | "ALUGUEL"
  | "ENERGIA"
  | "AGUA"
  | "INTERNET"
  | "TELEFONE"
  | "MATERIAL_ESCRITORIO"
  | "SALARIOS"
  | "IMPOSTOS"
  | "SERVICOS_TERCEIROS"
  | "MANUTENCAO"
  | "SOFTWARE"
  | "OUTROS"
  | string; // Para categorias personalizadas

export interface ContaPagar {
  id: string;
  cartorioId: string;

  // Informações principais
  descricao: string;
  valor: number;
  categoria: CategoriaConta;
  fornecedor?: string;

  // Datas
  dataVencimento: Date;
  dataPagamento?: Date;

  // Status
  status: StatusConta;

  // Informações adicionais
  observacoes?: string;
  formaPagamento?: string;
  comprovanteUrl?: string;

  // Recorrência (para futuras implementações)
  recorrente?: boolean;
  frequenciaRecorrencia?: string;

  // Auditoria
  criadoPor?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  atualizadoPor?: string;
}

export interface ResumoFinanceiro {
  totalContas: number;
  totalPago: number;
  totalAPagar: number;
  totalVencido: number;
  totalPendente: number;
}

export interface FiltrosContas {
  status?: StatusConta[];
  categoria?: CategoriaConta[];
  dataInicio?: Date;
  dataFim?: Date;
  fornecedor?: string;
  busca?: string;
  valorMin?: number;
  valorMax?: number;
}

export interface CategoriaPersonalizada {
  id: string;
  cartorioId: string;
  nome: string;
  descricao?: string;
  cor: string;
  ativo: boolean;
  ordem: number;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor?: string;
  atualizadoPor?: string;
}

// Labels para exibição
export const CATEGORIA_LABELS: Record<CategoriaConta, string> = {
  ALUGUEL: "Aluguel",
  ENERGIA: "Energia Elétrica",
  AGUA: "Água",
  INTERNET: "Internet",
  TELEFONE: "Telefone",
  MATERIAL_ESCRITORIO: "Material de Escritório",
  SALARIOS: "Salários",
  IMPOSTOS: "Impostos",
  SERVICOS_TERCEIROS: "Serviços Terceiros",
  MANUTENCAO: "Manutenção",
  SOFTWARE: "Software/Licenças",
  OUTROS: "Outros",
};

export const STATUS_CONTA_LABELS: Record<StatusConta, string> = {
  A_PAGAR: "A Pagar",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  AGENDADA: "Agendada",
  CANCELADA: "Cancelada",
};

export const STATUS_CONTA_COLORS: Record<StatusConta, string> = {
  A_PAGAR: "bg-yellow-500",
  PAGA: "bg-green-500",
  VENCIDA: "bg-red-500",
  AGENDADA: "bg-blue-500",
  CANCELADA: "bg-gray-500",
};
