import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export interface Notificacao {
  id: string;
  usuario_id: string;
  cartorio_id?: string;
  protocolo_id?: string;
  tipo:
    | "prazo_vencimento"
    | "ia_processado"
    | "protocolo_criado"
    | "protocolo_atualizado"
    | "sistema"
    | "info"
    | "conta_pagar"; // Tipo existente na tabela
  titulo: string;
  mensagem: string;
  lida: boolean;
  prioridade?: "baixa" | "normal" | "alta" | "urgente";
  data_notificacao?: string;
  data_vencimento?: string;
  metadata?: any;
  action_url?: string; // Coluna existente na tabela
  created_at?: string;
  updated_at?: string;
}

export const useNotifications = () => {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchNotificacoes = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        setNotificacoes([]);
        setUnreadCount(0);
        return;
      }

      const { data, error } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotificacoes(data || []);
      setUnreadCount(data?.filter((n) => !n.lida).length || 0);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar notificações";
      setError(errorMessage);
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificacaoId: string) => {
    try {
      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("id", notificacaoId);

      if (error) throw error;

      setNotificacoes((prev) =>
        prev.map((n) => (n.id === notificacaoId ? { ...n, lida: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Erro ao marcar notificação como lida:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!user?.id) return;

      const { error } = await supabase
        .from("notificacoes")
        .update({ lida: true })
        .eq("usuario_id", user.id)
        .eq("lida", false);

      if (error) throw error;

      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setUnreadCount(0);
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch (err) {
      console.error("Erro ao marcar todas as notificações como lidas:", err);
      toast.error("Erro ao marcar notificações como lidas");
    }
  };

  const deleteNotificacao = async (notificacaoId: string) => {
    try {
      const { error } = await supabase
        .from("notificacoes")
        .delete()
        .eq("id", notificacaoId);

      if (error) throw error;

      setNotificacoes((prev) => prev.filter((n) => n.id !== notificacaoId));

      // Atualizar contador se a notificação não estava lida
      const notificacao = notificacoes.find((n) => n.id === notificacaoId);
      if (notificacao && !notificacao.lida) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Erro ao deletar notificação:", err);
      toast.error("Erro ao deletar notificação");
    }
  };

  const createNotificacao = async (notificacaoData: {
    cartorio_id?: string;
    protocolo_id?: string;
    tipo: Notificacao["tipo"];
    titulo: string;
    mensagem: string;
    prioridade?: Notificacao["prioridade"];
    data_vencimento?: string;
    metadata?: any;
    action_url?: string;
  }) => {
    try {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("notificacoes")
        .insert([
          {
            ...notificacaoData,
            usuario_id: user.id,
            prioridade: notificacaoData.prioridade || "normal",
            data_notificacao: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Atualizar lista local
      setNotificacoes((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);

      return data;
    } catch (err: any) {
      console.error("Erro detalhado ao criar notificação:", {
        error: err,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        notificacaoData,
      });

      const errorMessage =
        err?.message || err?.details || "Erro ao criar notificação";
      throw new Error(errorMessage);
    }
  };

  const getNotificacoesByTipo = React.useCallback(
    (tipo: Notificacao["tipo"]) => {
      const notificacoesFiltradas = notificacoes.filter((n) => n.tipo === tipo);

      // Para notificações de prazo, filtrar protocolos concluídos
      if (tipo === "prazo_vencimento") {
        // Por enquanto, retornar todas as notificações de prazo
        // A filtragem de protocolos concluídos será implementada no backend
        return notificacoesFiltradas;
      }

      return notificacoesFiltradas;
    },
    [notificacoes]
  );

  // Função para filtrar notificações de prazo excluindo protocolos concluídos
  const getNotificacoesPrazoValidas = async () => {
    if (!user?.id) return [];

    const notificacoesPrazo = notificacoes.filter(
      (n) => n.tipo === "prazo_vencimento"
    );

    if (notificacoesPrazo.length === 0) return [];

    // Buscar status atual dos protocolos
    const protocoloIds = notificacoesPrazo
      .map((n) => n.protocolo_id)
      .filter(Boolean);

    if (protocoloIds.length === 0) return notificacoesPrazo;

    const { data: protocolos, error } = await supabase
      .from("protocolos")
      .select("id, status")
      .in("id", protocoloIds);

    if (error) {
      console.error("Erro ao verificar status dos protocolos:", error);
      return notificacoesPrazo; // Retorna todas em caso de erro
    }

    // Filtrar notificações de protocolos não concluídos
    const protocolosConcluidos = new Set(
      protocolos?.filter((p) => p.status === "Concluído").map((p) => p.id) || []
    );

    return notificacoesPrazo.filter(
      (n) => !n.protocolo_id || !protocolosConcluidos.has(n.protocolo_id)
    );
  };

  const getNotificacoesByPrioridade = React.useCallback(
    (prioridade: Notificacao["prioridade"]) => {
      return notificacoes.filter((n) => n.prioridade === prioridade);
    },
    [notificacoes]
  );

  const getNotificacoesNaoLidas = React.useCallback(() => {
    return notificacoes.filter((n) => !n.lida);
  }, [notificacoes]);

  const getNotificacoesUrgentes = React.useCallback(() => {
    return notificacoes.filter((n) => n.prioridade === "urgente" && !n.lida);
  }, [notificacoes]);

  // Função para limpar notificações duplicadas
  const limparNotificacoesDuplicadas = async () => {
    try {
      if (!user?.id) return;

      // Buscar notificações duplicadas (mesmo tipo, mesmo metadata, criadas no mesmo dia)
      const hoje = new Date();
      const inicioDoDia = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        hoje.getDate()
      );

      const { data: notificacoesDuplicadas, error } = await supabase
        .from("notificacoes")
        .select("id, tipo, metadata, created_at")
        .eq("usuario_id", user.id)
        .gte("created_at", inicioDoDia.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar notificações duplicadas:", error);
        return;
      }

      // Agrupar por tipo e metadata para identificar duplicatas
      const grupos = new Map<string, Notificacao[]>();

      notificacoesDuplicadas?.forEach((notif) => {
        if (!notif) return;
        const chave = `${notif.tipo}_${JSON.stringify(notif.metadata)}`;
        if (!grupos.has(chave)) {
          grupos.set(chave, []);
        }
        const grupo = grupos.get(chave);
        if (grupo) {
          grupo.push(notif as Notificacao);
        }
      });

      // Remover duplicatas, mantendo apenas a mais recente
      for (const [chave, grupo] of grupos) {
        if (grupo.length > 1) {
          // Ordenar por data de criação (mais recente primeiro)
          grupo.sort(
            (a: Notificacao, b: Notificacao) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
          );

          // Manter apenas a primeira (mais recente) e remover as outras
          const duplicatas = grupo.slice(1);
          const idsParaRemover = duplicatas.map((d: Notificacao) => d.id);

          if (idsParaRemover.length > 0) {
            const { error: deleteError } = await supabase
              .from("notificacoes")
              .delete()
              .in("id", idsParaRemover);

            if (deleteError) {
              console.error(
                "Erro ao remover notificações duplicadas:",
                deleteError
              );
            } else {
              console.log(
                `Removidas ${idsParaRemover.length} notificações duplicadas para ${chave}`
              );
            }
          }
        }
      }

      // Recarregar notificações após limpeza
      await fetchNotificacoes();
    } catch (err) {
      console.error("Erro ao limpar notificações duplicadas:", err);
    }
  };

  // Verificar contas a pagar próximas do vencimento
  const checkContasPagar = async () => {
    try {
      if (!user?.id) {
        console.log("checkContasPagar: Usuário não autenticado");
        return;
      }

      // Buscar cartório do usuário
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Erro ao buscar cartório do usuário:", userError);
        return;
      }

      if (!userData?.cartorio_id) {
        console.log("checkContasPagar: Usuário não possui cartório associado");
        return;
      }

      // Buscar dados do cartório (incluindo ZDG e WhatsApp)
      const { data: cartorioData, error: cartorioError } = await supabase
        .from("cartorios")
        .select("id, notificacao_whatsapp, whatsapp_contas, tenant_id_zdg, external_id_zdg, api_token_zdg, channel_id_zdg")
        .eq("id", userData.cartorio_id)
        .single();

      if (cartorioError) {
        console.error("Erro ao buscar dados do cartório:", cartorioError);
        return;
      }

      // Buscar contas próximas do vencimento (7 dias) ou vencidas
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const proximos7Dias = new Date();
      proximos7Dias.setDate(hoje.getDate() + 7);
      proximos7Dias.setHours(0, 0, 0, 0);

      const { data: contas, error } = await supabase
        .from("contas_pagar")
        .select("id, descricao, valor, data_vencimento, status, fornecedor, categoria, observacoes")
        .eq("cartorio_id", userData.cartorio_id)
        .in("status", ["A_PAGAR", "AGENDADA", "VENCIDA"])
        .lte("data_vencimento", proximos7Dias.toISOString().split("T")[0])
        .gte("data_vencimento", hoje.toISOString().split("T")[0]);

      if (error) {
        console.error("Erro ao buscar contas a pagar:", error);
        return;
      }

      // Criar notificações e disparar webhooks para contas próximas do vencimento
      for (const conta of contas || []) {
        try {
          const dataVencimento = new Date(conta.data_vencimento);
          const diasParaVencer = Math.ceil(
            (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Verificar se já existe notificação para esta conta nas últimas 24 horas
          const vinteQuatroHorasAtras = new Date();
          vinteQuatroHorasAtras.setHours(vinteQuatroHorasAtras.getHours() - 24);

          const { data: notificacaoExistente } = await supabase
            .from("notificacoes")
            .select("id, created_at")
            .eq("metadata->>conta_id", conta.id)
            .eq("tipo", "conta_pagar")
            .eq("usuario_id", user.id)
            .gte("created_at", vinteQuatroHorasAtras.toISOString())
            .single();

          if (!notificacaoExistente) {
            await createNotificacao({
              cartorio_id: userData.cartorio_id,
              tipo: "conta_pagar",
              titulo:
                diasParaVencer === 0
                  ? "Conta vence hoje!"
                  : diasParaVencer === 1
                  ? "Conta vence amanhã!"
                  : `Conta vence em ${diasParaVencer} dias`,
              mensagem: `A conta "${
                conta.descricao
              }" no valor de R$ ${conta.valor
                .toFixed(2)
                .replace(".", ",")} vence em ${
                diasParaVencer === 0
                  ? "hoje"
                  : diasParaVencer === 1
                  ? "amanhã"
                  : `${diasParaVencer} dias`
              }.`,
              prioridade:
                diasParaVencer <= 1
                  ? "urgente"
                  : diasParaVencer <= 3
                  ? "alta"
                  : "normal",
              data_vencimento: conta.data_vencimento,
              metadata: {
                conta_id: conta.id,
                descricao: conta.descricao,
                valor: conta.valor,
                dias_para_vencer: diasParaVencer,
              },
              action_url: "/contas",
            });
          }

          // Disparar webhook se WhatsApp estiver habilitado e número configurado
          if (
            cartorioData?.notificacao_whatsapp &&
            cartorioData?.whatsapp_contas &&
            cartorioData.whatsapp_contas.trim() !== ""
          ) {
            try {
              // Preparar payload do webhook com a mesma estrutura do webhook de status de protocolos
              const payload = {
                status_anterior: conta.status,
                status_novo: conta.status, // Mantém o mesmo status, pois é apenas notificação de vencimento
                conta_id: conta.id,
                cartorio_id: userData.cartorio_id,
                fluxo: "vencimento-conta-pagar",
                // Dados adicionais da conta
                nome_completo_solicitante: conta.fornecedor || "Fornecedor não informado",
                telefone_solicitante: null, // Contas a pagar não têm telefone do solicitante
                servicos_solicitados: [], // Contas a pagar não têm serviços
                numero_demanda: null, // Contas a pagar não têm demanda
                numero_protocolo: null, // Contas a pagar não têm protocolo
                // Dados ZDG do cartório
                tenant_id_zdg: cartorioData.tenant_id_zdg || null,
                external_id_zdg: cartorioData.external_id_zdg || null,
                api_token_zdg: cartorioData.api_token_zdg || null,
                channel_id_zdg: cartorioData.channel_id_zdg || null,
                // Dados adicionais da conta
                telefone: cartorioData.whatsapp_contas,
                conta: {
                  id: conta.id,
                  descricao: conta.descricao,
                  valor: conta.valor,
                  categoria: conta.categoria,
                  fornecedor: conta.fornecedor,
                  observacoes: conta.observacoes,
                  status: conta.status,
                },
                vencimento: {
                  data_vencimento: dataVencimento.toISOString().split("T")[0],
                  dias_restantes: diasParaVencer,
                  vencida: diasParaVencer < 0,
                },
              };

              // Disparar webhook diretamente
              const webhookResponse = await fetch("https://webhook.cartorio.app.br/webhook/api/webhooks/financeiro/contas-pagar", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });

              if (webhookResponse.ok) {
                console.log(`✅ Webhook disparado para conta ${conta.descricao}`);
              } else {
                const errorText = await webhookResponse.text();
                console.error(
                  `❌ Erro ao disparar webhook para conta ${conta.descricao}:`,
                  webhookResponse.status,
                  errorText
                );
              }
            } catch (webhookError: any) {
              // Não bloquear a criação da notificação se o webhook falhar
              console.error(`❌ Erro ao disparar webhook para conta ${conta.descricao}:`, webhookError.message);
            }
          }
        } catch (contaError) {
          console.error(`Erro ao processar conta ${conta.id}:`, contaError);
          // Continuar com a próxima conta
        }
      }
    } catch (err) {
      console.error("Erro ao verificar contas a pagar:", err);
    }
  };

  // Verificar protocolos próximos do vencimento
  const checkProtocolosVencendo = async () => {
    try {
      if (!user?.id) {
        console.log("checkProtocolosVencendo: Usuário não autenticado");
        return;
      }

      // Buscar cartório do usuário
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Erro ao buscar cartório do usuário:", userError);
        return;
      }

      if (!userData?.cartorio_id) {
        console.log(
          "checkProtocolosVencendo: Usuário não possui cartório associado"
        );
        return;
      }

      // Buscar protocolos não concluídos do cartório
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const proximos7Dias = new Date();
      proximos7Dias.setDate(hoje.getDate() + 7);
      proximos7Dias.setHours(0, 0, 0, 0);

      const { data: protocolos, error } = await supabase
        .from("protocolos")
        .select("id, protocolo, solicitante, prazo_execucao, status, servicos, created_at, demanda, telefone, email")
        .eq("cartorio_id", userData.cartorio_id)
        .neq("status", "Concluído")
        .not("servicos", "is", null);

      if (error) {
        console.error("Erro ao buscar protocolos:", error);
        return;
      }

      if (!protocolos || protocolos.length === 0) {
        return;
      }

      // Buscar serviços do cartório
      const { data: servicos, error: servicosError } = await supabase
        .from("servicos")
        .select("id, nome, prazo_execucao, dias_notificacao_antes_vencimento, ativo")
        .eq("cartorio_id", userData.cartorio_id)
        .eq("ativo", true);

      if (servicosError) {
        console.error("Erro ao buscar serviços:", servicosError);
        return;
      }

      if (!servicos || servicos.length === 0) {
        return;
      }

      // Criar mapa de serviços por nome para busca rápida
      const servicosMap = new Map(
        servicos.map((s) => [s.nome.toLowerCase().trim(), s])
      );

      // Criar notificações para protocolos próximos do vencimento
      for (const protocolo of protocolos || []) {
        try {
          const dataCriacaoProtocolo = new Date(protocolo.created_at);
          dataCriacaoProtocolo.setHours(0, 0, 0, 0);
          const hojeTimestamp = hoje.getTime();

          // Verificar prazo de execução do protocolo (se definido)
          if (protocolo.prazo_execucao) {
            const dataVencimentoProtocolo = new Date(protocolo.prazo_execucao);
            dataVencimentoProtocolo.setHours(0, 0, 0, 0);
            const dataVencimentoProtocoloTimestamp = dataVencimentoProtocolo.getTime();
            const diasParaVencerProtocolo = Math.ceil((dataVencimentoProtocoloTimestamp - hojeTimestamp) / (1000 * 60 * 60 * 24));

            if (diasParaVencerProtocolo <= 7 && diasParaVencerProtocolo >= -1) {
              // Verificar se já existe notificação para este protocolo nas últimas 24 horas
              const vinteQuatroHorasAtras = new Date();
              vinteQuatroHorasAtras.setHours(vinteQuatroHorasAtras.getHours() - 24);

              const { data: notificacaoExistente } = await supabase
                .from("notificacoes")
                .select("id, created_at")
                .eq("protocolo_id", protocolo.id)
                .eq("tipo", "prazo_vencimento")
                .eq("usuario_id", user.id)
                .eq("metadata->>tipo_vencimento", "protocolo")
                .gte("created_at", vinteQuatroHorasAtras.toISOString())
                .single();

              if (!notificacaoExistente) {
                await createNotificacao({
                  cartorio_id: userData.cartorio_id,
                  protocolo_id: protocolo.id,
                  tipo: "prazo_vencimento",
                  titulo:
                    diasParaVencerProtocolo === 0
                      ? "Prazo do protocolo vence hoje!"
                      : diasParaVencerProtocolo === 1
                      ? "Prazo do protocolo vence amanhã!"
                      : `Prazo do protocolo vence em ${diasParaVencerProtocolo} dias`,
                  mensagem: `O prazo de execução do protocolo ${protocolo.protocolo} (${
                    protocolo.solicitante
                  }) vence em ${
                    diasParaVencerProtocolo === 0
                      ? "hoje"
                      : diasParaVencerProtocolo === 1
                      ? "amanhã"
                      : `${diasParaVencerProtocolo} dias`
                  }.`,
                  prioridade:
                    diasParaVencerProtocolo <= 1
                      ? "urgente"
                      : diasParaVencerProtocolo <= 3
                      ? "alta"
                      : "normal",
                  data_vencimento: protocolo.prazo_execucao,
                  metadata: {
                    protocolo: protocolo.protocolo,
                    solicitante: protocolo.solicitante,
                    dias_para_vencer: diasParaVencerProtocolo,
                    tipo_vencimento: "protocolo",
                  },
                });
              }
            }
          }

          // Verificar prazos dos serviços do protocolo
          if (protocolo.servicos && Array.isArray(protocolo.servicos)) {
            for (const nomeServico of protocolo.servicos) {
              const servico = servicosMap.get(nomeServico.toLowerCase().trim());

              if (!servico || !servico.prazo_execucao || !servico.dias_notificacao_antes_vencimento) {
                continue;
              }

              // Calcular data de vencimento do serviço
              const dataVencimentoServico = new Date(dataCriacaoProtocolo);
              dataVencimentoServico.setDate(dataVencimentoServico.getDate() + servico.prazo_execucao);
              dataVencimentoServico.setHours(0, 0, 0, 0);

              // Calcular data de notificação (vencimento - dias_notificacao)
              const dataNotificacao = new Date(dataVencimentoServico);
              dataNotificacao.setDate(dataNotificacao.getDate() - servico.dias_notificacao_antes_vencimento);
              dataNotificacao.setHours(0, 0, 0, 0);

              const dataNotificacaoTimestamp = dataNotificacao.getTime();
              const dataVencimentoServicoTimestamp = dataVencimentoServico.getTime();

              // Verificar se hoje é a data de notificação ou já passou (mas ainda não venceu)
              if (
                hojeTimestamp >= dataNotificacaoTimestamp &&
                hojeTimestamp < dataVencimentoServicoTimestamp
              ) {
                const diasRestantes = Math.ceil((dataVencimentoServicoTimestamp - hojeTimestamp) / (1000 * 60 * 60 * 24));

                // Verificar se já existe notificação para este serviço nas últimas 24 horas
                const vinteQuatroHorasAtras = new Date();
                vinteQuatroHorasAtras.setHours(vinteQuatroHorasAtras.getHours() - 24);

                const { data: notificacaoExistente } = await supabase
                  .from("notificacoes")
                  .select("id, created_at")
                  .eq("protocolo_id", protocolo.id)
                  .eq("tipo", "prazo_vencimento")
                  .eq("usuario_id", user.id)
                  .eq("metadata->>servico", servico.nome)
                  .gte("created_at", vinteQuatroHorasAtras.toISOString())
                  .single();

                if (!notificacaoExistente) {
                  await createNotificacao({
                    cartorio_id: userData.cartorio_id,
                    protocolo_id: protocolo.id,
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
                    data_vencimento: dataVencimentoServico.toISOString().split("T")[0],
                    metadata: {
                      protocolo: protocolo.protocolo,
                      solicitante: protocolo.solicitante,
                      servico: servico.nome,
                      dias_para_vencer: diasRestantes,
                      tipo_vencimento: "servico",
                    },
                  });
                }
              }
            }
          }
        } catch (protocoloError) {
          console.error(
            `Erro ao processar protocolo ${protocolo.id}:`,
            protocoloError
          );
          // Continuar com o próximo protocolo
        }
      }
    } catch (err) {
      console.error("Erro ao verificar protocolos vencendo:", err);
    }
  };

  // Configurar polling para verificar notificações periodicamente
  useEffect(() => {
    if (!user?.id) return;

    fetchNotificacoes();

    // Limpar notificações duplicadas na inicialização
    limparNotificacoesDuplicadas();

    // Verificar protocolos e contas vencendo a cada 30 minutos (reduzido de 5 minutos)
    const interval = setInterval(() => {
      checkProtocolosVencendo();
      checkContasPagar();
    }, 30 * 60 * 1000);

    // Verificar notificações a cada 2 minutos (reduzido de 30 segundos)
    const notificationInterval = setInterval(() => {
      fetchNotificacoes();
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(notificationInterval);
    };
  }, [user]);

  return {
    notificacoes,
    loading,
    error,
    unreadCount,
    fetchNotificacoes,
    markAsRead,
    markAllAsRead,
    deleteNotificacao,
    createNotificacao,
    getNotificacoesByTipo,
    getNotificacoesByPrioridade,
    getNotificacoesNaoLidas,
    getNotificacoesUrgentes,
    getNotificacoesPrazoValidas,
    checkProtocolosVencendo,
    checkContasPagar,
    limparNotificacoesDuplicadas,
  };
};
