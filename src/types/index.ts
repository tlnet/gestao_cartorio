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
 */
export type TipoUsuario = "admin" | "atendente";

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
      "/contas",
      "/relatorios",
      "/ia",
      "/cnib",
      "/notificacoes",
      "/perfil",
    ],
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
 * Verifica se um tipo de usuário pode acessar uma rota específica
 * @param tipo - Tipo do usuário
 * @param rota - Rota a ser verificada
 * @returns true se pode acessar, false caso contrário
 */
export function podeAcessarRota(
  tipo: TipoUsuario | null | undefined,
  rota: string
): boolean {
  const permissoes = getPermissoes(tipo);
  
  // Verificar se está explicitamente bloqueada
  if (permissoes.rotasBloqueadas.some((r) => rota.startsWith(r))) {
    return false;
  }
  
  // Verificar se está na lista de permitidas
  return permissoes.rotasPermitidas.some((r) => rota.startsWith(r));
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: TipoUsuario;
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
