import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Configuração Supabase:', {
  url: supabaseUrl ? 'Configurada' : 'FALTANDO',
  key: supabaseAnonKey ? 'Configurada' : 'FALTANDO'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Presente' : 'Ausente');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Tipos para o banco de dados
export interface Database {
  public: {
    Tables: {
      cartorios: {
        Row: {
          id: string
          nome: string
          cnpj: string
          endereco: string
          telefone: string
          email: string
          ativo: boolean
          dias_alerta_vencimento: number
          notificacao_whatsapp: boolean
          webhook_n8n: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj: string
          endereco: string
          telefone: string
          email: string
          ativo?: boolean
          dias_alerta_vencimento?: number
          notificacao_whatsapp?: boolean
          webhook_n8n?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string
          endereco?: string
          telefone?: string
          email?: string
          ativo?: boolean
          dias_alerta_vencimento?: number
          notificacao_whatsapp?: boolean
          webhook_n8n?: string | null
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: string
          cartorio_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: string
          cartorio_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: string
          cartorio_id?: string | null
          updated_at?: string
        }
      }
      protocolos: {
        Row: {
          id: string
          protocolo: string
          demanda: string
          solicitante: string
          cpf_cnpj: string
          telefone: string
          email: string | null
          apresentante: string | null
          servicos: string[]
          status: string
          observacao: string | null
          prazo_execucao: string | null
          cartorio_id: string
          criado_por: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          protocolo: string
          demanda: string
          solicitante: string
          cpf_cnpj: string
          telefone: string
          email?: string | null
          apresentante?: string | null
          servicos: string[]
          status: string
          observacao?: string | null
          prazo_execucao?: string | null
          cartorio_id: string
          criado_por: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          protocolo?: string
          demanda?: string
          solicitante?: string
          cpf_cnpj?: string
          telefone?: string
          email?: string | null
          apresentante?: string | null
          servicos?: string[]
          status?: string
          observacao?: string | null
          prazo_execucao?: string | null
          cartorio_id?: string
          criado_por?: string
          updated_at?: string
        }
      }
      historico_protocolos: {
        Row: {
          id: string
          protocolo_id: string
          status_anterior: string | null
          novo_status: string
          usuario_responsavel: string
          observacao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          protocolo_id: string
          status_anterior?: string | null
          novo_status: string
          usuario_responsavel: string
          observacao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          protocolo_id?: string
          status_anterior?: string | null
          novo_status?: string
          usuario_responsavel?: string
          observacao?: string | null
        }
      }
      relatorios_ia: {
        Row: {
          id: string
          tipo: 'resumo_matricula' | 'analise_malote' | 'minuta_documento'
          nome_arquivo: string
          arquivo_original: string
          relatorio_pdf: string | null
          relatorio_doc: string | null
          relatorio_docx: string | null
          resumo: any
          status: 'processando' | 'concluido' | 'erro'
          usuario_id: string
          cartorio_id: string
          created_at: string
        }
        Insert: {
          id?: string
          tipo: 'resumo_matricula' | 'analise_malote' | 'minuta_documento'
          nome_arquivo: string
          arquivo_original: string
          relatorio_pdf?: string | null
          relatorio_doc?: string | null
          relatorio_docx?: string | null
          resumo?: any
          status?: 'processando' | 'concluido' | 'erro'
          usuario_id: string
          cartorio_id: string
          created_at?: string
        }
        Update: {
          id?: string
          tipo?: 'resumo_matricula' | 'analise_malote' | 'minuta_documento'
          nome_arquivo?: string
          arquivo_original?: string
          relatorio_pdf?: string | null
          relatorio_doc?: string | null
          relatorio_docx?: string | null
          resumo?: any
          status?: 'processando' | 'concluido' | 'erro'
          usuario_id?: string
          cartorio_id?: string
        }
      }
      servicos: {
        Row: {
          id: string
          nome: string
          prazo_execucao: number
          ativo: boolean
          cartorio_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          prazo_execucao: number
          ativo?: boolean
          cartorio_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          prazo_execucao?: number
          ativo?: boolean
          cartorio_id?: string
          updated_at?: string
        }
      }
      status_personalizados: {
        Row: {
          id: string
          nome: string
          cor: string
          ordem: number
          cartorio_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cor: string
          ordem: number
          cartorio_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cor?: string
          ordem?: number
          cartorio_id?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}