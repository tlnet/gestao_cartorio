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

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: "admin" | "supervisor" | "atendente";
  cartorioId?: string;
  ativo: boolean;
  criadoEm: Date;
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
