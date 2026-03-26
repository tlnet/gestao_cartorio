import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { putCartorioUpdate } from "@/lib/admin-cartorio-api";

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
    role: "atendente",
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

export function useCartorios(cartorioId?: string) {
  const [cartorios, setCartorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { session, loading: authLoading } = useAuth();

  const fetchCartorios = async () => {
    try {
      setLoading(true);

      let query = supabase.from("cartorios").select("*").eq("ativo", true);
      if (cartorioId) {
        query = query.eq("id", cartorioId);
      }

      const { data, error } = await query;

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
    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error("Sessão expirada. Faça login novamente.");
      throw new Error("Sessão expirada");
    }

    try {
      const { cartorio } = await putCartorioUpdate(accessToken, id, updates);
      setCartorios((prev) => prev.map((c) => (c.id === id ? cartorio : c)));
      toast.success("Cartório atualizado com sucesso!");
      return cartorio;
    } catch (error: any) {
      toast.error("Erro ao atualizar cartório: " + (error?.message || "Erro desconhecido"));
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
    if (authLoading) return;
    fetchCartorios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartorioId, authLoading]);

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
  const { user, loading: authLoading } = useAuth();

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

      // Verificar se algum serviço tem vencimento nos próximos 2 dias e disparar webhook
      try {
        // Buscar dados do cartório (incluindo ZDG e WhatsApp)
        const { data: cartorioData, error: cartorioError } = await supabase
          .from("cartorios")
          .select("id, notificacao_whatsapp, whatsapp_protocolos, tenant_id_zdg, external_id_zdg, api_token_zdg, channel_id_zdg")
          .eq("id", protocolo.cartorio_id)
          .single();

        if (!cartorioError && cartorioData) {
          // Disparar webhook se WhatsApp estiver habilitado e número configurado
          if (
            cartorioData.notificacao_whatsapp &&
            cartorioData.whatsapp_protocolos &&
            cartorioData.whatsapp_protocolos.trim() !== ""
          ) {
            // Buscar serviços do cartório para obter prazo de execução
            const { data: servicos, error: servicosError } = await supabase
              .from("servicos")
              .select("id, nome, prazo_execucao, dias_notificacao_antes_vencimento, ativo")
              .eq("cartorio_id", protocolo.cartorio_id)
              .eq("ativo", true);

            if (!servicosError && servicos && servicos.length > 0) {
              // Criar mapa de serviços por nome para busca rápida
              const servicosMap = new Map(
                servicos.map((s) => [s.nome.toLowerCase().trim(), s])
              );

              const hoje = new Date();
              hoje.setHours(0, 0, 0, 0);
              const proximos2Dias = new Date();
              proximos2Dias.setDate(hoje.getDate() + 2);
              proximos2Dias.setHours(0, 0, 0, 0);

              const hojeTimestamp = hoje.getTime();
              const proximos2DiasTimestamp = proximos2Dias.getTime();
              const dataCriacaoProtocolo = new Date(data.created_at);
              dataCriacaoProtocolo.setHours(0, 0, 0, 0);

              // Processar cada serviço do protocolo
              if (protocolo.servicos && Array.isArray(protocolo.servicos)) {
                for (const nomeServico of protocolo.servicos) {
                  const servico = servicosMap.get(nomeServico.toLowerCase().trim());

                  if (!servico || !servico.prazo_execucao) {
                    continue;
                  }

                  // Calcular data de vencimento do serviço
                  const dataVencimento = new Date(dataCriacaoProtocolo);
                  dataVencimento.setDate(dataVencimento.getDate() + servico.prazo_execucao);
                  dataVencimento.setHours(0, 0, 0, 0);

                  const dataVencimentoTimestamp = dataVencimento.getTime();

                  // Verificar se o vencimento está nos próximos 2 dias
                  if (
                    dataVencimentoTimestamp >= hojeTimestamp &&
                    dataVencimentoTimestamp <= proximos2DiasTimestamp
                  ) {
                    // Calcular data de notificação (vencimento - dias_notificacao)
                    const dataNotificacao = new Date(dataVencimento);
                    if (servico.dias_notificacao_antes_vencimento) {
                      dataNotificacao.setDate(dataNotificacao.getDate() - servico.dias_notificacao_antes_vencimento);
                    }
                    dataNotificacao.setHours(0, 0, 0, 0);

                    const diasRestantes = Math.ceil((dataVencimentoTimestamp - hojeTimestamp) / (1000 * 60 * 60 * 24));

                    // Criar notificação no sistema imediatamente
                    if (user?.id) {
                      try {
                        const { error: notificacaoError } = await supabase
                          .from("notificacoes")
                          .insert([
                            {
                              usuario_id: user.id,
                              cartorio_id: protocolo.cartorio_id,
                              protocolo_id: data.id,
                              tipo: "prazo_vencimento",
                              titulo:
                                diasRestantes === 0
                                  ? `Serviço "${servico.nome}" vence hoje!`
                                  : diasRestantes === 1
                                  ? `Serviço "${servico.nome}" vence amanhã!`
                                  : `Serviço "${servico.nome}" vence em ${diasRestantes} dias`,
                              mensagem: `O serviço "${servico.nome}" do protocolo ${protocolo.protocolo} (${
                                protocolo.solicitante
                              }) vence em ${
                                diasRestantes === 0
                                  ? "hoje"
                                  : diasRestantes === 1
                                  ? "amanhã"
                                  : `${diasRestantes} dias`
                              }.`,
                              prioridade:
                                diasRestantes <= 1
                                  ? "urgente"
                                  : diasRestantes <= 3
                                  ? "alta"
                                  : "normal",
                              data_vencimento: dataVencimento.toISOString().split("T")[0],
                              data_notificacao: new Date().toISOString(),
                              metadata: {
                                protocolo: protocolo.protocolo,
                                solicitante: protocolo.solicitante,
                                servico: servico.nome,
                                dias_para_vencer: diasRestantes,
                                tipo_vencimento: "servico",
                              },
                              action_url: "/protocolos",
                              lida: false,
                            },
                          ]);

                        if (notificacaoError) {
                          console.error(`❌ Erro ao criar notificação para serviço ${servico.nome}:`, notificacaoError);
                        } else {
                          console.log(`✅ Notificação criada imediatamente para protocolo ${protocolo.protocolo}, serviço ${servico.nome} (vencimento em ${diasRestantes} dias)`);
                        }
                      } catch (notificacaoError: any) {
                        console.error(`❌ Erro ao criar notificação imediata para serviço ${servico.nome}:`, notificacaoError.message);
                      }
                    }

                    // Preparar payload do webhook com a mesma estrutura do webhook de status de protocolos
                    const payload = {
                      status_anterior: protocolo.status,
                      status_novo: protocolo.status,
                      protocolo_id: data.id,
                      cartorio_id: protocolo.cartorio_id,
                      fluxo: "vencimento-protocolo",
                      // Dados adicionais do protocolo
                      nome_completo_solicitante: protocolo.solicitante,
                      telefone_solicitante: protocolo.telefone,
                      servicos_solicitados: protocolo.servicos || [],
                      numero_demanda: protocolo.demanda,
                      numero_protocolo: protocolo.protocolo,
                      // Dados ZDG do cartório
                      tenant_id_zdg: cartorioData.tenant_id_zdg || null,
                      external_id_zdg: cartorioData.external_id_zdg || null,
                      api_token_zdg: cartorioData.api_token_zdg || null,
                      channel_id_zdg: cartorioData.channel_id_zdg || null,
                      // Dados adicionais de vencimento
                      telefone: cartorioData.whatsapp_protocolos,
                      servico: {
                        nome: servico.nome,
                        prazo_execucao: servico.prazo_execucao,
                        dias_notificacao_antes_vencimento: servico.dias_notificacao_antes_vencimento || 0,
                      },
                      vencimento: {
                        data_vencimento: dataVencimento.toISOString().split("T")[0],
                        data_notificacao: dataNotificacao.toISOString().split("T")[0],
                        dias_restantes: diasRestantes,
                      },
                    };

                    // Disparar webhook
                    try {
                    const webhookResponse = await fetch(
                      "https://webhook.conversix.com.br/webhook/api/webhooks/protocolos/vencimento",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                      }
                    );

                      if (webhookResponse.ok) {
                        console.log(`✅ Webhook disparado imediatamente para protocolo ${protocolo.protocolo}, serviço ${servico.nome} (vencimento em ${diasRestantes} dias)`);
                      } else {
                        const errorText = await webhookResponse.text();
                        console.error(
                          `❌ Erro ao disparar webhook para protocolo ${protocolo.protocolo}, serviço ${servico.nome}:`,
                          webhookResponse.status,
                          errorText
                        );
                      }
                    } catch (webhookError: any) {
                      console.error(
                        `❌ Erro ao disparar webhook para protocolo ${protocolo.protocolo}, serviço ${servico.nome}:`,
                        webhookError.message
                      );
                    }
                  }
                }
              }

              // Verificar também o prazo de execução do protocolo (se definido)
              if (protocolo.prazo_execucao) {
                const dataVencimentoProtocolo = new Date(protocolo.prazo_execucao);
                dataVencimentoProtocolo.setHours(0, 0, 0, 0);
                const dataVencimentoProtocoloTimestamp = dataVencimentoProtocolo.getTime();

                // Verificar se o vencimento do protocolo está nos próximos 2 dias
                if (
                  dataVencimentoProtocoloTimestamp >= hojeTimestamp &&
                  dataVencimentoProtocoloTimestamp <= proximos2DiasTimestamp
                ) {
                  const diasRestantesProtocolo = Math.ceil((dataVencimentoProtocoloTimestamp - hojeTimestamp) / (1000 * 60 * 60 * 24));

                  // Criar notificação no sistema imediatamente para prazo do protocolo
                  if (user?.id) {
                    try {
                      const { error: notificacaoError } = await supabase
                        .from("notificacoes")
                        .insert([
                          {
                            usuario_id: user.id,
                            cartorio_id: protocolo.cartorio_id,
                            protocolo_id: data.id,
                            tipo: "prazo_vencimento",
                            titulo:
                              diasRestantesProtocolo === 0
                                ? "Prazo do protocolo vence hoje!"
                                : diasRestantesProtocolo === 1
                                ? "Prazo do protocolo vence amanhã!"
                                : `Prazo do protocolo vence em ${diasRestantesProtocolo} dias`,
                            mensagem: `O prazo de execução do protocolo ${protocolo.protocolo} (${
                              protocolo.solicitante
                            }) vence em ${
                              diasRestantesProtocolo === 0
                                ? "hoje"
                                : diasRestantesProtocolo === 1
                                ? "amanhã"
                                : `${diasRestantesProtocolo} dias`
                            }.`,
                            prioridade:
                              diasRestantesProtocolo <= 1
                                ? "urgente"
                                : diasRestantesProtocolo <= 3
                                ? "alta"
                                : "normal",
                            data_vencimento: dataVencimentoProtocolo.toISOString().split("T")[0],
                            data_notificacao: new Date().toISOString(),
                            metadata: {
                              protocolo: protocolo.protocolo,
                              solicitante: protocolo.solicitante,
                              dias_para_vencer: diasRestantesProtocolo,
                              tipo_vencimento: "protocolo",
                            },
                            action_url: "/protocolos",
                            lida: false,
                          },
                        ]);

                      if (notificacaoError) {
                        console.error(`❌ Erro ao criar notificação para prazo do protocolo:`, notificacaoError);
                      } else {
                        console.log(`✅ Notificação criada imediatamente para prazo do protocolo ${protocolo.protocolo} (vencimento em ${diasRestantesProtocolo} dias)`);
                      }
                    } catch (notificacaoError: any) {
                      console.error(`❌ Erro ao criar notificação imediata para prazo do protocolo:`, notificacaoError.message);
                    }
                  }

                  // Preparar payload do webhook para prazo do protocolo
                  const payloadProtocolo = {
                    status_anterior: protocolo.status,
                    status_novo: protocolo.status,
                    protocolo_id: data.id,
                    cartorio_id: protocolo.cartorio_id,
                    fluxo: "vencimento-protocolo",
                    nome_completo_solicitante: protocolo.solicitante,
                    telefone_solicitante: protocolo.telefone,
                    servicos_solicitados: protocolo.servicos || [],
                    numero_demanda: protocolo.demanda,
                    numero_protocolo: protocolo.protocolo,
                    tenant_id_zdg: cartorioData.tenant_id_zdg || null,
                    external_id_zdg: cartorioData.external_id_zdg || null,
                    api_token_zdg: cartorioData.api_token_zdg || null,
                    channel_id_zdg: cartorioData.channel_id_zdg || null,
                    telefone: cartorioData.whatsapp_protocolos,
                    servico: {
                      nome: "Prazo de Execução do Protocolo",
                      prazo_execucao: null,
                      dias_notificacao_antes_vencimento: null,
                    },
                    vencimento: {
                      data_vencimento: dataVencimentoProtocolo.toISOString().split("T")[0],
                      data_notificacao: dataVencimentoProtocolo.toISOString().split("T")[0],
                      dias_restantes: diasRestantesProtocolo,
                    },
                  };

                  // Disparar webhook para prazo do protocolo
                  try {
                    const webhookResponseProtocolo = await fetch(
                      "https://webhook.conversix.com.br/webhook/api/webhooks/protocolos/vencimento",
                      {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(payloadProtocolo),
                      }
                    );

                    if (webhookResponseProtocolo.ok) {
                      console.log(`✅ Webhook disparado imediatamente para prazo do protocolo ${protocolo.protocolo} (vencimento em ${diasRestantesProtocolo} dias)`);
                    } else {
                      const errorText = await webhookResponseProtocolo.text();
                      console.error(
                        `❌ Erro ao disparar webhook para prazo do protocolo ${protocolo.protocolo}:`,
                        webhookResponseProtocolo.status,
                        errorText
                      );
                    }
                  } catch (webhookError: any) {
                    console.error(
                      `❌ Erro ao disparar webhook para prazo do protocolo ${protocolo.protocolo}:`,
                      webhookError.message
                    );
                  }
                }
              }
            }
          }
        }
      } catch (webhookError: any) {
        // Não bloquear a criação do protocolo se o webhook falhar
        console.error("❌ Erro ao disparar webhook imediato para protocolo:", webhookError.message);
      }

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
                // Buscar dados ZDG + nome do cartório
                const { data: cartorioData, error: cartorioError } = await supabase
                  .from("cartorios")
                  .select(
                    "nome, tenant_id_zdg, external_id_zdg, api_token_zdg, channel_id_zdg"
                  )
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
                  cartorio_nome: cartorioData?.nome || null,
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

                // Logar payload completo antes de enviar pro webhook
                // (mas mascaramos api_token_zdg para não vazar credenciais no console)
                const payloadForLog = {
                  ...payload,
                  api_token_zdg: payload.api_token_zdg
                    ? "***"
                    : null,
                };

                console.log("📤 Disparando webhook (status-protocolo):", payloadForLog);

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
    if (authLoading) return;
    fetchProtocolos();
  }, [cartorioId, authLoading]);

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
  const { session, loading: authLoading } = useAuth();

  const fetchUsuarios = async () => {
    try {
      setLoading(true);

      // Selecionar campos base primeiro, depois tentar campos opcionais de convite
      let query = supabase
        .from("users")
        .select(
          "id, name, email, telefone, role, roles, cartorio_id, ativo, created_at, updated_at"
        );

      if (cartorioId) {
        query = query.eq("cartorio_id", cartorioId);
      }

      const { data, error } = await query;

      // Se erro for relacionado a coluna não existir (42703), tentar sem campos de convite
      if (error && error.code === "42703") {
        console.warn(
          "Campos de convite não encontrados, buscando apenas campos básicos"
        );
        // Tentar novamente sem campos de convite
        let fallbackQuery = supabase
          .from("users")
          .select("id, name, email, telefone, role, roles, cartorio_id, ativo, created_at, updated_at");

        if (cartorioId) {
          fallbackQuery = fallbackQuery.eq("cartorio_id", cartorioId);
        }

        const { data: fallbackData, error: fallbackError } =
          await fallbackQuery;

        if (fallbackError) {
          console.error("Erro ao carregar usuários (fallback):", {
            message: fallbackError.message,
            details: fallbackError.details,
            hint: fallbackError.hint,
            code: fallbackError.code,
          });
          throw fallbackError;
        }

        const usuariosMapeados = (fallbackData || []).map((usuario) => ({
          ...usuario,
          tipo: usuario.role,
          roles: (usuario as any).roles?.length ? (usuario as any).roles : (usuario.role ? [usuario.role] : []),
          account_status: usuario.ativo ? "active" : "inactive",
        }));
        setUsuarios(usuariosMapeados);
        return;
      }

      if (error) {
        console.error("Erro detalhado do Supabase (usuários):", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }

      const usuariosMapeados = (data || []).map((usuario) => ({
        ...usuario,
        tipo: usuario.role,
        roles: (usuario as any).roles?.length ? (usuario as any).roles : (usuario.role ? [usuario.role] : []),
        account_status: (usuario as any).account_status || (usuario.ativo ? "active" : "inactive"),
        invite_status: (usuario as any).invite_status || null,
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
      const roles = Array.isArray(usuarioData.roles) && usuarioData.roles.length > 0
        ? usuarioData.roles
        : (usuarioData.role ? [usuarioData.role] : ["atendente"]);
      const cleanUsuarioData: any = {
        name: usuarioData.name,
        email: usuarioData.email,
        telefone: usuarioData.telefone,
        role: roles[0],
        roles,
        cartorio_id:
          usuarioData.cartorio_id === "null" ? null : usuarioData.cartorio_id,
        ativo: usuarioData.ativo !== undefined ? usuarioData.ativo : true,
      };

      if (usuarioData.account_status) {
        cleanUsuarioData.account_status = usuarioData.account_status;
      }

      console.log("Dados limpos para criação:", cleanUsuarioData);

      if (!cleanUsuarioData.name || !cleanUsuarioData.email || roles.length === 0) {
        console.error("Campos obrigatórios faltando:", {
          name: cleanUsuarioData.name,
          email: cleanUsuarioData.email,
          roles,
        });
        throw new Error("Campos obrigatórios não preenchidos (nome, email e ao menos uma permissão)");
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
    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error("Sessão expirada. Faça login novamente.");
      throw new Error("Sessão expirada");
    }

    let res: Response;
    try {
      res = await fetch("/api/admin/editar-usuario", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id, updates }),
      });
    } catch {
      toast.error("Erro de rede ao atualizar usuário.");
      throw new Error("Erro de rede");
    }

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof payload?.error === "string"
          ? payload.error
          : "Erro ao atualizar usuário.";
      toast.error(msg);
      throw new Error(msg);
    }

    const raw = payload.usuario;
    const mapped = {
      ...raw,
      tipo: raw.role,
      roles: raw.roles?.length
        ? raw.roles
        : raw.role
          ? [raw.role]
          : [],
      account_status:
        raw.account_status || (raw.ativo ? "active" : "inactive"),
      invite_status: raw.invite_status ?? null,
    };

    setUsuarios((prev) => prev.map((u) => (u.id === id ? mapped : u)));
    toast.success("Usuário atualizado com sucesso!");
    return mapped;
  };

  const deleteUsuario = async (id: string) => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error("Sessão expirada. Faça login novamente.");
      throw new Error("Sessão expirada");
    }

    let res: Response;
    try {
      res = await fetch(
        `/api/admin/deletar-usuario?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch {
      toast.error("Erro de rede ao remover usuário.");
      throw new Error("Erro de rede");
    }

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        typeof payload?.error === "string"
          ? payload.error
          : "Erro ao remover usuário.";
      toast.error(msg);
      throw new Error(msg);
    }

    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    toast.success("Usuário removido com sucesso!");
  };

  useEffect(() => {
    if (authLoading) return;
    fetchUsuarios();
  }, [cartorioId, authLoading]);

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
