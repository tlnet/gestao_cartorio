import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";

// Dados mockados para evitar chamadas de API durante o build
const mockCartorios = [
  {
    id: "1",
    nome: "Cartório do 1º Ofício de Notas",
    cnpj: "12.345.678/0001-90",
    endereco: "Rua das Flores, 123 - Centro - São Paulo/SP",
    telefone: "(11) 3333-4444",
    email: "contato@cartorio1oficio.com.br",
    ativo: true,
    dias_alerta_vencimento: 3,
    notificacao_whatsapp: true,
    webhook_n8n: "https://webhook.n8n.io/cartorio-123",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockProtocolos = [
  {
    id: "1",
    protocolo: "CERT-2024-001",
    demanda: "Certidão de Nascimento",
    solicitante: "João Silva",
    cpf_cnpj: "123.456.789-00",
    telefone: "(11) 99999-9999",
    email: "joao@email.com",
    servicos: ["Certidão de Nascimento"],
    status: "Em Andamento",
    cartorio_id: "1",
    criado_por: "user-1",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    prazo_execucao: "2024-01-18",
  },
];

const mockUsuarios = [
  {
    id: "1",
    name: "João Silva",
    email: "joao@cartorio.com",
    role: "supervisor",
    telefone: "(11) 99999-9999",
    cartorio_id: null,
    ativo: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockRelatorios = [
  {
    id: "1",
    tipo: "resumo_matricula",
    nome_arquivo: "matricula_123456.pdf",
    status: "concluido",
    usuario_id: "1",
    cartorio_id: "1",
    created_at: "2024-01-15T10:00:00Z",
  },
];

export function useCartorios() {
  const [cartorios, setCartorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCartorios = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("cartorios")
        .select("*")
        .eq("ativo", true);

      if (error) {
        console.error("Erro detalhado do Supabase (cartórios):", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      setCartorios(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar cartórios:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      toast.error(
        "Erro ao carregar cartórios: " + (error?.message || "Erro desconhecido")
      );
      // Fallback para dados mock em caso de erro
      setCartorios(mockCartorios);
    } finally {
      setLoading(false);
    }
  };

  const createCartorio = async (cartorio: any) => {
    try {
      const { data, error } = await supabase
        .from("cartorios")
        .insert([cartorio])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCartorios((prev) => [data, ...prev]);
      toast.success("Cartório criado com sucesso!");
      return data;
    } catch (error: any) {
      toast.error("Erro ao criar cartório: " + error.message);
      throw error;
    }
  };

  const updateCartorio = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from("cartorios")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setCartorios((prev) => prev.map((c) => (c.id === id ? data : c)));
      toast.success("Cartório atualizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao atualizar cartório: " + error.message);
      throw error;
    }
  };

  const deleteCartorio = async (id: string) => {
    try {
      const { error } = await supabase.from("cartorios").delete().eq("id", id);

      if (error) {
        throw error;
      }

      setCartorios((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cartório removido com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao remover cartório: " + error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchCartorios();
  }, []);

  return {
    cartorios,
    loading,
    createCartorio,
    updateCartorio,
    deleteCartorio,
    refetch: fetchCartorios,
  };
}

export function useProtocolos(cartorioId?: string) {
  const [protocolos, setProtocolos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProtocolos = async () => {
    try {
      setLoading(true);

      let query = supabase.from("protocolos").select("*");

      if (cartorioId) {
        query = query.eq("cartorio_id", cartorioId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro detalhado do Supabase (protocolos):", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      setProtocolos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar protocolos:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      toast.error(
        "Erro ao carregar protocolos: " +
          (error?.message || "Erro desconhecido")
      );
      // Fallback para dados mock em caso de erro
      setProtocolos(mockProtocolos);
    } finally {
      setLoading(false);
    }
  };

  const createProtocolo = async (protocolo: any) => {
    try {
      console.log("=== INÍCIO CRIAÇÃO PROTOCOLO ===");
      console.log(
        "Dados do protocolo a ser criado:",
        JSON.stringify(protocolo, null, 2)
      );

      // Verificar se todos os campos obrigatórios estão presentes
      const camposObrigatorios = [
        "protocolo",
        "demanda",
        "solicitante",
        "cpf_cnpj",
        "telefone",
        "servicos",
        "status",
        "cartorio_id",
        "criado_por",
      ];
      const camposFaltando = camposObrigatorios.filter(
        (campo) => !protocolo[campo]
      );

      if (camposFaltando.length > 0) {
        const erro = `Campos obrigatórios faltando: ${camposFaltando.join(
          ", "
        )}`;
        console.error(erro);
        throw new Error(erro);
      }

      console.log("Todos os campos obrigatórios estão presentes");

      const { data, error } = await supabase
        .from("protocolos")
        .insert([protocolo])
        .select()
        .single();

      console.log("Resposta do Supabase:", { data, error });

      if (error) {
        console.error("=== ERRO DO SUPABASE ===");
        console.error("Tipo do erro:", typeof error);
        console.error("Erro completo:", error);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        console.error("Code:", error.code);
        console.error("=== FIM ERRO SUPABASE ===");
        throw error;
      }

      console.log("Protocolo criado com sucesso:", data);
      setProtocolos((prev) => [data, ...prev]);
      toast.success("Protocolo criado com sucesso!");
      return data;
    } catch (error: any) {
      console.error("=== ERRO GERAL ===");
      console.error("Tipo do erro:", typeof error);
      console.error("Erro completo:", error);
      console.error("Message:", error?.message);
      console.error("Stack:", error?.stack);
      console.error("=== FIM ERRO GERAL ===");

      const mensagemErro =
        error?.message || "Erro desconhecido ao criar protocolo";
      toast.error("Erro ao criar protocolo: " + mensagemErro);
      throw error;
    }
  };

  const updateProtocolo = async (id: string, updates: any) => {
    try {
      // Buscar o protocolo atual para comparar mudanças
      const protocoloAtual = protocolos.find((p) => p.id === id);

      const { data, error } = await supabase
        .from("protocolos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Registrar histórico para qualquer alteração
      if (protocoloAtual) {
        try {
          const mudancas = [];

          // Verificar mudanças de status
          if (updates.status && protocoloAtual.status !== updates.status) {
            mudancas.push(
              `Status: "${protocoloAtual.status}" → "${updates.status}"`
            );

            // Disparar webhook quando status for alterado
            try {
              const cartorioId = protocoloAtual.cartorio_id || data?.cartorio_id;
              
              if (cartorioId) {
                // Buscar dados ZDG do cartório
                const { data: cartorioData, error: cartorioError } = await supabase
                  .from("cartorios")
                  .select("tenant_id_zdg, external_id_zdg, api_token_zdg, channel_id_zdg")
                  .eq("id", cartorioId)
                  .maybeSingle();

                if (cartorioError) {
                  console.warn("⚠️ Erro ao buscar dados ZDG:", cartorioError);
                }

                const payload = {
                  status_anterior: protocoloAtual.status,
                  status_novo: updates.status,
                  protocolo_id: id,
                  cartorio_id: cartorioId,
                  fluxo: "status-protocolo",
                  // Dados adicionais do protocolo
                  nome_completo_solicitante: protocoloAtual.solicitante,
                  telefone_solicitante: protocoloAtual.telefone,
                  servicos_solicitados: protocoloAtual.servicos || [],
                  numero_demanda: protocoloAtual.demanda,
                  numero_protocolo: protocoloAtual.protocolo,
                  // Dados ZDG do cartório
                  tenant_id_zdg: cartorioData?.tenant_id_zdg || null,
                  external_id_zdg: cartorioData?.external_id_zdg || null,
                  api_token_zdg: cartorioData?.api_token_zdg || null,
                  channel_id_zdg: cartorioData?.channel_id_zdg || null,
                };

                console.log("📤 Disparando webhook para mudança de status:", {
                  ...payload,
                  servicos_solicitados: payload.servicos_solicitados,
                });

                // Disparar webhook através da API route (evita CORS)
                fetch("/api/levontech/webhook", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(payload),
                })
                  .then(async (response) => {
                    if (response.ok) {
                      console.log("✅ Webhook de mudança de status disparado com sucesso");
                    } else {
                      const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
                      console.warn("⚠️ Webhook retornou erro:", response.status, errorData);
                    }
                  })
                  .catch((webhookError) => {
                    // Não bloquear a atualização se o webhook falhar
                    console.error("❌ Erro ao disparar webhook de mudança de status:", webhookError);
                  });
              } else {
                console.warn("⚠️ Cartório ID não encontrado, webhook não disparado");
              }
            } catch (webhookError) {
              // Não bloquear a atualização se o webhook falhar
              console.error("Erro ao preparar webhook de mudança de status:", webhookError);
            }
          }

          // Verificar outras mudanças importantes
          if (updates.demanda && protocoloAtual.demanda !== updates.demanda) {
            mudancas.push(`Demanda alterada`);
          }

          if (
            updates.solicitante &&
            protocoloAtual.solicitante !== updates.solicitante
          ) {
            mudancas.push(`Solicitante alterado`);
          }

          if (
            updates.observacao &&
            protocoloAtual.observacao !== updates.observacao
          ) {
            mudancas.push(`Observação alterada`);
          }

          if (
            updates.prazo_execucao &&
            protocoloAtual.prazo_execucao !== updates.prazo_execucao
          ) {
            mudancas.push(`Prazo de execução alterado`);
          }

          // Se houve mudanças, registrar no histórico
          if (mudancas.length > 0) {
            await supabase.from("historico_protocolos").insert([
              {
                protocolo_id: id,
                status_anterior: protocoloAtual.status,
                novo_status: updates.status || protocoloAtual.status,
                usuario_responsavel: (user as any)?.name || "Sistema",
                observacao: updates.observacao || mudancas.join(", "),
              },
            ]);
          }
        } catch (histError) {
          console.error("Erro ao criar histórico:", histError);
          // Não falhar a atualização por causa do histórico
        }
      }

      setProtocolos((prev) => prev.map((p) => (p.id === id ? data : p)));
      toast.success("Protocolo atualizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao atualizar protocolo: " + error.message);
      throw error;
    }
  };

  const deleteProtocolo = async (id: string) => {
    try {
      const { error } = await supabase.from("protocolos").delete().eq("id", id);

      if (error) {
        throw error;
      }

      setProtocolos((prev) => prev.filter((p) => p.id !== id));
      toast.success("Protocolo removido com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao remover protocolo: " + error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchProtocolos();
  }, [cartorioId]);

  return {
    protocolos,
    loading,
    createProtocolo,
    updateProtocolo,
    deleteProtocolo,
    refetch: fetchProtocolos,
  };
}

export function useUsuarios(cartorioId?: string) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);

      let query = supabase.from("users").select("*");

      if (cartorioId) {
        query = query.eq("cartorio_id", cartorioId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro detalhado do Supabase (usuários):", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      // Mapear campo 'role' para 'tipo' para compatibilidade
      const usuariosMapeados = (data || []).map((usuario) => ({
        ...usuario,
        tipo: usuario.role,
      }));
      setUsuarios(usuariosMapeados);
    } catch (error: any) {
      console.error("Erro ao carregar usuários:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      toast.error(
        "Erro ao carregar usuários: " + (error?.message || "Erro desconhecido")
      );
      // Fallback para dados mock em caso de erro
      setUsuarios(mockUsuarios);
    } finally {
      setLoading(false);
    }
  };

  const createUsuario = async (usuario: any) => {
    try {
      // Remover campos que não devem ser enviados na criação
      const { id, created_at, updated_at, cartorio, ...usuarioData } = usuario;

      // Garantir que não há campos undefined ou null desnecessários
      const cleanUsuarioData = {
        name: usuarioData.name,
        email: usuarioData.email,
        telefone: usuarioData.telefone,
        role: usuarioData.role,
        cartorio_id:
          usuarioData.cartorio_id === "null" ? null : usuarioData.cartorio_id,
        ativo: usuarioData.ativo !== undefined ? usuarioData.ativo : true,
      };

      console.log("Dados limpos para criação:", cleanUsuarioData);

      // Verificar se todos os campos obrigatórios estão presentes
      if (
        !cleanUsuarioData.name ||
        !cleanUsuarioData.email ||
        !cleanUsuarioData.role
      ) {
        console.error("Campos obrigatórios faltando:", {
          name: cleanUsuarioData.name,
          email: cleanUsuarioData.email,
          role: cleanUsuarioData.role,
        });
        throw new Error("Campos obrigatórios não preenchidos");
      }

      console.log("Todos os campos obrigatórios estão presentes");
      console.log("Tentando inserir usuário no Supabase...");
      const { data, error } = await supabase
        .from("users")
        .insert([cleanUsuarioData])
        .select()
        .single();

      console.log("Resposta do Supabase (usuário):", { data, error });

      if (error) {
        console.error("=== ERRO DO SUPABASE ===");
        console.error("Tipo do erro:", typeof error);
        console.error("Erro completo:", error);
        console.error("Message:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        console.error("Code:", error.code);
        console.error("=== FIM ERRO SUPABASE ===");
        throw error;
      }

      setUsuarios((prev) => [data, ...prev]);
      toast.success("Usuário criado com sucesso!");
      return data;
    } catch (error: any) {
      console.error("=== ERRO GERAL ===");
      console.error("Tipo do erro:", typeof error);
      console.error("Erro completo:", error);
      console.error("Message:", error?.message);
      console.error("Stack:", error?.stack);
      console.error("=== FIM ERRO GERAL ===");

      const errorMessage =
        error?.message || "Erro desconhecido ao criar usuário";
      toast.error("Erro ao criar usuário: " + errorMessage);
      throw error;
    }
  };

  const updateUsuario = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setUsuarios((prev) => prev.map((u) => (u.id === id ? data : u)));
      toast.success("Usuário atualizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao atualizar usuário: " + error.message);
      throw error;
    }
  };

  const deleteUsuario = async (id: string) => {
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) {
        throw error;
      }

      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      toast.success("Usuário removido com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao remover usuário: " + error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [cartorioId]);

  return {
    usuarios,
    loading,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    refetch: fetchUsuarios,
  };
}

export function useRelatoriosIA(cartorioId?: string) {
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRelatorios = async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRelatorios(mockRelatorios);
    } catch (error: any) {
      toast.error("Erro ao carregar relatórios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createRelatorio = async (relatorio: any) => {
    try {
      const newRelatorio = { ...relatorio, id: Date.now().toString() };
      setRelatorios((prev) => [newRelatorio, ...prev]);
      toast.success("Relatório criado com sucesso!");
      return newRelatorio;
    } catch (error: any) {
      toast.error("Erro ao criar relatório: " + error.message);
      throw error;
    }
  };

  const updateRelatorio = async (id: string, updates: any) => {
    try {
      setRelatorios((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
      toast.success("Relatório atualizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao atualizar relatório: " + error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchRelatorios();
  }, [cartorioId]);

  return {
    relatorios,
    loading,
    createRelatorio,
    updateRelatorio,
    refetch: fetchRelatorios,
  };
}
