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
    | "info"; // Tipo existente na tabela
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

      // Buscar protocolos próximos do vencimento (7 dias)
      const hoje = new Date();
      const proximos7Dias = new Date();
      proximos7Dias.setDate(hoje.getDate() + 7);

      const { data: protocolos, error } = await supabase
        .from("protocolos")
        .select("id, protocolo, solicitante, prazo_execucao, status")
        .eq("cartorio_id", userData.cartorio_id)
        .not("prazo_execucao", "is", null)
        .neq("status", "Concluído") // Excluir protocolos concluídos
        .gte("prazo_execucao", hoje.toISOString().split("T")[0])
        .lte("prazo_execucao", proximos7Dias.toISOString().split("T")[0]);

      if (error) {
        console.error("Erro ao buscar protocolos:", error);
        return;
      }

      // Criar notificações para protocolos próximos do vencimento
      for (const protocolo of protocolos || []) {
        try {
          const dataVencimento = new Date(protocolo.prazo_execucao);
          const diasParaVencer = Math.ceil(
            (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Verificar se já existe notificação para este protocolo
          const { data: notificacaoExistente } = await supabase
            .from("notificacoes")
            .select("id")
            .eq("protocolo_id", protocolo.id)
            .eq("tipo", "prazo_vencimento")
            .eq("usuario_id", user.id)
            .single();

          if (!notificacaoExistente) {
            await createNotificacao({
              cartorio_id: userData.cartorio_id,
              protocolo_id: protocolo.id,
              tipo: "prazo_vencimento",
              titulo:
                diasParaVencer === 0
                  ? "Protocolo vence hoje!"
                  : diasParaVencer === 1
                  ? "Protocolo vence amanhã!"
                  : `Protocolo vence em ${diasParaVencer} dias`,
              mensagem: `O protocolo ${protocolo.protocolo} (${
                protocolo.solicitante
              }) vence em ${
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
              data_vencimento: protocolo.prazo_execucao,
              metadata: {
                protocolo: protocolo.protocolo,
                solicitante: protocolo.solicitante,
                dias_para_vencer: diasParaVencer,
              },
            });
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

    // Verificar protocolos vencendo a cada 5 minutos
    const interval = setInterval(() => {
      checkProtocolosVencendo();
    }, 5 * 60 * 1000);

    // Verificar notificações a cada 30 segundos
    const notificationInterval = setInterval(() => {
      fetchNotificacoes();
    }, 30 * 1000);

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
  };
};
