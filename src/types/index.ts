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
  tipo: 'admin' | 'supervisor' | 'atendente';
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
  tipo: 'resumo_matricula' | 'analise_malote' | 'minuta_documento';
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