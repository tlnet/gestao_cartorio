import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  console.error("❌ ERRO: Variáveis de ambiente do Supabase não configuradas!");
  console.error(`Variáveis faltando: ${missingVars.join(", ")}`);
  console.error("Por favor, crie um arquivo .env.local na raiz do projeto com as variáveis necessárias.");
  console.error("Veja o arquivo env.template para referência.");
  
  // Em desenvolvimento, usar valores placeholder para evitar crash
  // Em produção, isso deve falhar explicitamente
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️ Usando valores placeholder em modo desenvolvimento");
  }
}

// Criar cliente apenas se as variáveis estiverem configuradas
// Caso contrário, usar valores placeholder para evitar crash
const finalUrl = supabaseUrl || "https://placeholder.supabase.co";
const finalKey = supabaseAnonKey || "placeholder-key";

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Tipos para o banco de dados
export interface Database {
  public: {
    Tables: {
      cartorios: {
        Row: {
          id: string;
          nome: string;
          cnpj: string;
          endereco: string;
          telefone: string;
          email: string;
          ativo: boolean;
          dias_alerta_vencimento: number;
          notificacao_whatsapp: boolean;
          webhook_n8n: string | null;
          sistema_levontech: boolean | null;
          levontech_url: string | null;
          levontech_username: string | null;
          levontech_password: string | null;
          tenant_id_zdg: string | null;
          external_id_zdg: string | null;
          api_token_zdg: string | null;
          channel_id_zdg: string | null;
          whatsapp_contas: string | null;
          whatsapp_protocolos: string | null;
          cidade: string | null;
          estado: string | null;
          numero_oficio: string | null;
          tabeliao_responsavel: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cnpj: string;
          endereco: string;
          telefone: string;
          email: string;
          ativo?: boolean;
          dias_alerta_vencimento?: number;
          notificacao_whatsapp?: boolean;
          webhook_n8n?: string | null;
          sistema_levontech?: boolean | null;
          levontech_url?: string | null;
          levontech_username?: string | null;
          levontech_password?: string | null;
          tenant_id_zdg?: string | null;
          external_id_zdg?: string | null;
          api_token_zdg?: string | null;
          channel_id_zdg?: string | null;
          whatsapp_contas?: string | null;
          whatsapp_protocolos?: string | null;
          cidade?: string | null;
          estado?: string | null;
          numero_oficio?: string | null;
          tabeliao_responsavel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          cnpj?: string;
          endereco?: string;
          telefone?: string;
          email?: string;
          ativo?: boolean;
          dias_alerta_vencimento?: number;
          notificacao_whatsapp?: boolean;
          webhook_n8n?: string | null;
          sistema_levontech?: boolean | null;
          levontech_url?: string | null;
          levontech_username?: string | null;
          levontech_password?: string | null;
          tenant_id_zdg?: string | null;
          external_id_zdg?: string | null;
          api_token_zdg?: string | null;
          channel_id_zdg?: string | null;
          whatsapp_contas?: string | null;
          whatsapp_protocolos?: string | null;
          cidade?: string | null;
          estado?: string | null;
          numero_oficio?: string | null;
          tabeliao_responsavel?: string | null;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          name: string | null;
          email: string;
          role: string;
          telefone: string | null;
          cartorio_id: string | null;
          ativo: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email: string;
          role?: string;
          telefone?: string | null;
          cartorio_id?: string | null;
          ativo?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          email?: string;
          role?: string;
          telefone?: string | null;
          cartorio_id?: string | null;
          ativo?: boolean;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      protocolos: {
        Row: {
          id: string;
          protocolo: string;
          demanda: string;
          solicitante: string;
          cpf_cnpj: string;
          telefone: string;
          email: string | null;
          apresentante: string | null;
          servicos: string[];
          status: string;
          observacao: string | null;
          prazo_execucao: string | null;
          data_conclusao: string | null;
          cartorio_id: string;
          criado_por: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          protocolo: string;
          demanda: string;
          solicitante: string;
          cpf_cnpj: string;
          telefone: string;
          email?: string | null;
          apresentante?: string | null;
          servicos: string[];
          status: string;
          observacao?: string | null;
          prazo_execucao?: string | null;
          data_conclusao?: string | null;
          cartorio_id: string;
          criado_por: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          protocolo?: string;
          demanda?: string;
          solicitante?: string;
          cpf_cnpj?: string;
          telefone?: string;
          email?: string | null;
          apresentante?: string | null;
          servicos?: string[];
          status?: string;
          observacao?: string | null;
          prazo_execucao?: string | null;
          data_conclusao?: string | null;
          cartorio_id?: string;
          criado_por?: string;
          updated_at?: string;
        };
      };
      historico_protocolos: {
        Row: {
          id: string;
          protocolo_id: string;
          status_anterior: string | null;
          novo_status: string;
          usuario_responsavel: string;
          observacao: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          protocolo_id: string;
          status_anterior?: string | null;
          novo_status: string;
          usuario_responsavel: string;
          observacao?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          protocolo_id?: string;
          status_anterior?: string | null;
          novo_status?: string;
          usuario_responsavel?: string;
          observacao?: string | null;
        };
      };
      relatorios_ia: {
        Row: {
          id: string;
          tipo: "resumo_matricula" | "analise_malote" | "minuta_documento";
          nome_arquivo: string;
          arquivo_original: string;
          relatorio_pdf: string | null;
          relatorio_doc: string | null;
          relatorio_docx: string | null;
          resumo: any;
          status: "processando" | "concluido" | "erro";
          usuario_id: string;
          cartorio_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tipo: "resumo_matricula" | "analise_malote" | "minuta_documento";
          nome_arquivo: string;
          arquivo_original: string;
          relatorio_pdf?: string | null;
          relatorio_doc?: string | null;
          relatorio_docx?: string | null;
          resumo?: any;
          status?: "processando" | "concluido" | "erro";
          usuario_id: string;
          cartorio_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tipo?: "resumo_matricula" | "analise_malote" | "minuta_documento";
          nome_arquivo?: string;
          arquivo_original?: string;
          relatorio_pdf?: string | null;
          relatorio_doc?: string | null;
          relatorio_docx?: string | null;
          resumo?: any;
          status?: "processando" | "concluido" | "erro";
          usuario_id?: string;
          cartorio_id?: string;
        };
      };
      servicos: {
        Row: {
          id: string;
          nome: string;
          prazo_execucao: number;
          ativo: boolean;
          cartorio_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          prazo_execucao: number;
          ativo?: boolean;
          cartorio_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          prazo_execucao?: number;
          ativo?: boolean;
          cartorio_id?: string;
          updated_at?: string;
        };
      };
      status_personalizados: {
        Row: {
          id: string;
          nome: string;
          cor: string;
          ordem: number;
          cartorio_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cor: string;
          ordem: number;
          cartorio_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          cor?: string;
          ordem?: number;
          cartorio_id?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
