"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import type {
  ContaPagar,
  StatusConta,
  CategoriaConta,
  FiltrosContas,
  ResumoFinanceiro,
  CategoriaPersonalizada,
} from "@/types";

// Interface para documentos das contas
export interface DocumentoConta {
  id: string;
  contaId: string;
  nomeArquivo: string;
  urlArquivo: string;
  tipoArquivo: string;
  tamanhoArquivo: number;
  dataUpload: Date;
  usuarioUpload?: string;
}
import { useCategoriasPersonalizadas } from "./use-categorias-personalizadas";

interface ContaPagarDB {
  id: string;
  cartorio_id: string;
  descricao: string;
  valor: number;
  categoria: CategoriaConta;
  fornecedor?: string;
  data_vencimento: string;
  data_pagamento?: string;
  status: string; // Permite status personalizados
  observacoes?: string;
  forma_pagamento?: string;
  comprovante_url?: string;
  recorrente?: boolean;
  frequencia_recorrencia?: string;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
  atualizado_por?: string;
}

// Função para converter data do banco (string) para Date local (sem timezone)
const parseLocalDate = (dateString: string | null | undefined): Date => {
  if (!dateString) {
    throw new Error("Data inválida: string nula ou indefinida");
  }

  try {
    // Parse da data no formato YYYY-MM-DD como data local
    const [year, month, day] = dateString.split("T")[0].split("-").map(Number);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error(`Data inválida: ${dateString}`);
    }

    return new Date(year, month - 1, day);
  } catch (error) {
    console.error("Erro ao fazer parse da data:", dateString, error);
    throw new Error(`Erro ao converter data: ${dateString}`);
  }
};

// Função para converter Date para string no formato do banco (YYYY-MM-DD)
const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Função para converter dados do banco para o formato da aplicação
const dbToContaPagar = (data: ContaPagarDB): ContaPagar => {
  try {
    return {
      id: data.id,
      cartorioId: data.cartorio_id,
      descricao: data.descricao,
      valor: data.valor,
      categoria: data.categoria,
      fornecedor: data.fornecedor,
      dataVencimento: parseLocalDate(data.data_vencimento),
      dataPagamento: data.data_pagamento
        ? parseLocalDate(data.data_pagamento)
        : undefined,
      status: data.status,
      observacoes: data.observacoes,
      formaPagamento: data.forma_pagamento,
      comprovanteUrl: data.comprovante_url,
      recorrente: data.recorrente,
      frequenciaRecorrencia: data.frequencia_recorrencia,
      criadoPor: data.criado_por,
      criadoEm: new Date(data.criado_em),
      atualizadoEm: new Date(data.atualizado_em),
      atualizadoPor: data.atualizado_por,
    };
  } catch (error) {
    console.error("Erro ao converter dados do banco:", data, error);
    throw new Error(
      `Erro ao converter conta: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
};

export const useContasPagar = (cartorioId?: string) => {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [resumo, setResumo] = useState<ResumoFinanceiro>({
    totalContas: 0,
    totalPago: 0,
    totalAPagar: 0,
    totalVencido: 0,
    totalPendente: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Hook para categorias personalizadas - só chama se cartorioId existir
  const { categorias: categoriasPersonalizadas, loading: categoriasLoading } =
    useCategoriasPersonalizadas(cartorioId);

  // Função para buscar contas com filtros
  const fetchContas = useCallback(
    async (filtros?: FiltrosContas) => {
      try {
        setLoading(true);
        setError(null);

        if (!cartorioId) {
          setContas([]);
          return;
        }

        let query = supabase
          .from("contas_pagar")
          .select("*")
          .eq("cartorio_id", cartorioId);

        // Aplicar filtros
        if (filtros?.status && filtros.status.length > 0) {
          query = query.in("status", filtros.status);
        }

        if (filtros?.categoria && filtros.categoria.length > 0) {
          query = query.in("categoria", filtros.categoria);
        }

        if (filtros?.dataInicio) {
          query = query.gte(
            "data_vencimento",
            formatDateForDB(filtros.dataInicio)
          );
        }

        if (filtros?.dataFim) {
          query = query.lte(
            "data_vencimento",
            formatDateForDB(filtros.dataFim)
          );
        }

        if (filtros?.fornecedor) {
          query = query.ilike("fornecedor", `%${filtros.fornecedor}%`);
        }

        if (filtros?.busca) {
          query = query.or(
            `descricao.ilike.%${filtros.busca}%,fornecedor.ilike.%${filtros.busca}%,observacoes.ilike.%${filtros.busca}%`
          );
        }

        query = query.order("data_vencimento", { ascending: true });

        const { data, error } = await query;

        if (error) throw error;

        const contasFormatadas = (data || []).map(dbToContaPagar);
        setContas(contasFormatadas);

        // Verificar e atualizar contas vencidas automaticamente
        await verificarContasVencidas();

        // Calcular resumo
        calcularResumo(contasFormatadas);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao carregar contas";
        setError(errorMessage);
        console.error("Erro ao carregar contas:", err);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [cartorioId]
  );

  // Função para calcular resumo financeiro
  const calcularResumo = (contas: ContaPagar[]) => {
    const resumo: ResumoFinanceiro = {
      totalContas: contas.length,
      totalPago: 0,
      totalAPagar: 0,
      totalVencido: 0,
      totalPendente: 0,
    };

    contas.forEach((conta) => {
      switch (conta.status) {
        case "PAGA":
          resumo.totalPago += conta.valor;
          break;
        case "A_PAGAR":
          resumo.totalAPagar += conta.valor;
          resumo.totalPendente += conta.valor;
          break;
        case "VENCIDA":
          resumo.totalVencido += conta.valor;
          resumo.totalPendente += conta.valor;
          break;
        case "AGENDADA":
          resumo.totalPendente += conta.valor;
          break;
      }
    });

    setResumo(resumo);
  };

  // Criar nova conta
  const criarConta = async (
    contaData: Omit<ContaPagar, "id" | "criadoEm" | "atualizadoEm">
  ) => {
    try {
      if (!cartorioId) {
        throw new Error("Cartório não identificado");
      }

      const { data, error } = await supabase
        .from("contas_pagar")
        .insert([
          {
            cartorio_id: cartorioId,
            descricao: contaData.descricao,
            valor: contaData.valor,
            categoria: contaData.categoria,
            fornecedor: contaData.fornecedor,
            data_vencimento: formatDateForDB(contaData.dataVencimento),
            data_pagamento: contaData.dataPagamento
              ? formatDateForDB(contaData.dataPagamento)
              : null,
            status: contaData.status,
            observacoes: contaData.observacoes,
            forma_pagamento: contaData.formaPagamento,
            comprovante_url: contaData.comprovanteUrl,
            recorrente: contaData.recorrente,
            frequencia_recorrencia: contaData.frequenciaRecorrencia,
            criado_por: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const novaConta = dbToContaPagar(data);
      setContas((prev) => [novaConta, ...prev]);
      calcularResumo([novaConta, ...contas]);

      // Verificar se o vencimento está nos próximos 2 dias e criar notificação + disparar webhook
      const dataVencimento = new Date(contaData.dataVencimento);
      dataVencimento.setHours(0, 0, 0, 0);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const proximos2Dias = new Date();
      proximos2Dias.setDate(hoje.getDate() + 2);
      proximos2Dias.setHours(0, 0, 0, 0);

      const hojeTimestamp = hoje.getTime();
      const dataVencimentoTimestamp = dataVencimento.getTime();
      const proximos2DiasTimestamp = proximos2Dias.getTime();

      // Verificar se o vencimento está nos próximos 2 dias
      if (
        dataVencimentoTimestamp >= hojeTimestamp &&
        dataVencimentoTimestamp <= proximos2DiasTimestamp
      ) {
        try {
          // Buscar dados do cartório (incluindo ZDG e WhatsApp)
          const { data: cartorioData, error: cartorioError } = await supabase
            .from("cartorios")
            .select("id, notificacao_whatsapp, whatsapp_contas, tenant_id_zdg, external_id_zdg, api_token_zdg, channel_id_zdg")
            .eq("id", cartorioId)
            .single();

          if (!cartorioError && cartorioData) {
            const diasRestantes = Math.ceil((dataVencimentoTimestamp - hojeTimestamp) / (1000 * 60 * 60 * 24));

            // Criar notificação no sistema imediatamente
            if (user?.id) {
              try {
                const { error: notificacaoError } = await supabase
                  .from("notificacoes")
                  .insert([
                    {
                      usuario_id: user.id,
                      cartorio_id: cartorioId,
                      tipo: "conta_pagar",
                      titulo:
                        diasRestantes === 0
                          ? "Conta vence hoje!"
                          : diasRestantes === 1
                          ? "Conta vence amanhã!"
                          : `Conta vence em ${diasRestantes} dias`,
                      mensagem: `A conta "${
                        contaData.descricao
                      }" no valor de R$ ${contaData.valor
                        .toFixed(2)
                        .replace(".", ",")} vence em ${
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
                        conta_id: novaConta.id,
                        descricao: contaData.descricao,
                        valor: contaData.valor,
                        dias_para_vencer: diasRestantes,
                      },
                      action_url: "/contas",
                      lida: false,
                    },
                  ]);

                if (notificacaoError) {
                  console.error("❌ Erro ao criar notificação:", notificacaoError);
                } else {
                  console.log(`✅ Notificação criada imediatamente para conta ${contaData.descricao} (vencimento em ${diasRestantes} dias)`);
                }
              } catch (notificacaoError: any) {
                console.error("❌ Erro ao criar notificação imediata:", notificacaoError.message);
              }
            }

            // Disparar webhook se WhatsApp estiver habilitado e número configurado
            if (
              cartorioData.notificacao_whatsapp &&
              cartorioData.whatsapp_contas &&
              cartorioData.whatsapp_contas.trim() !== ""
            ) {
              // Preparar payload do webhook com a mesma estrutura do webhook de status de protocolos
              const payload = {
                status_anterior: contaData.status || "A_PAGAR",
                status_novo: contaData.status || "A_PAGAR",
                conta_id: novaConta.id,
                cartorio_id: cartorioId,
                fluxo: "vencimento-conta-pagar",
                // Dados adicionais da conta
                nome_completo_solicitante: contaData.fornecedor || "Fornecedor não informado",
                telefone_solicitante: null,
                servicos_solicitados: [],
                numero_demanda: null,
                numero_protocolo: null,
                // Dados ZDG do cartório
                tenant_id_zdg: cartorioData.tenant_id_zdg || null,
                external_id_zdg: cartorioData.external_id_zdg || null,
                api_token_zdg: cartorioData.api_token_zdg || null,
                channel_id_zdg: cartorioData.channel_id_zdg || null,
                // Dados adicionais da conta
                telefone: cartorioData.whatsapp_contas,
                conta: {
                  id: novaConta.id,
                  descricao: contaData.descricao,
                  valor: contaData.valor,
                  categoria: contaData.categoria,
                  fornecedor: contaData.fornecedor,
                  observacoes: contaData.observacoes,
                  status: contaData.status || "A_PAGAR",
                },
                vencimento: {
                  data_vencimento: dataVencimento.toISOString().split("T")[0],
                  dias_restantes: diasRestantes,
                  vencida: diasRestantes < 0,
                },
              };

              // Disparar webhook
              const webhookResponse = await fetch("https://webhook.cartorio.app.br/webhook/api/webhooks/financeiro/contas-pagar", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });

              if (webhookResponse.ok) {
                console.log(`✅ Webhook disparado imediatamente para conta ${contaData.descricao} (vencimento em ${diasRestantes} dias)`);
              } else {
                const errorText = await webhookResponse.text();
                console.error(
                  `❌ Erro ao disparar webhook para conta ${contaData.descricao}:`,
                  webhookResponse.status,
                  errorText
                );
              }
            }
          }
        } catch (webhookError: any) {
          // Não bloquear a criação da conta se o webhook falhar
          console.error("❌ Erro ao disparar webhook imediato para conta:", webhookError.message);
        }
      }

      toast.success("Conta criada com sucesso!");
      return novaConta;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar conta";
      console.error("Erro ao criar conta:", err);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Atualizar conta
  const atualizarConta = async (
    id: string,
    updates: Partial<Omit<ContaPagar, "id" | "criadoEm" | "atualizadoEm">>
  ) => {
    try {
      const updateData: any = {};

      if (updates.descricao !== undefined)
        updateData.descricao = updates.descricao;
      if (updates.valor !== undefined) updateData.valor = updates.valor;
      if (updates.categoria !== undefined)
        updateData.categoria = updates.categoria;
      if (updates.fornecedor !== undefined)
        updateData.fornecedor = updates.fornecedor;
      if (updates.dataVencimento !== undefined)
        updateData.data_vencimento = formatDateForDB(updates.dataVencimento);
      if (updates.dataPagamento !== undefined)
        updateData.data_pagamento = updates.dataPagamento
          ? formatDateForDB(updates.dataPagamento)
          : null;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.observacoes !== undefined)
        updateData.observacoes = updates.observacoes;
      if (updates.formaPagamento !== undefined)
        updateData.forma_pagamento = updates.formaPagamento;
      if (updates.comprovanteUrl !== undefined)
        updateData.comprovante_url = updates.comprovanteUrl;
      if (updates.recorrente !== undefined)
        updateData.recorrente = updates.recorrente;
      if (updates.frequenciaRecorrencia !== undefined)
        updateData.frequencia_recorrencia = updates.frequenciaRecorrencia;

      updateData.atualizado_por = user?.id;

      const { data, error } = await supabase
        .from("contas_pagar")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const contaAtualizada = dbToContaPagar(data);
      setContas((prev) =>
        prev.map((conta) => (conta.id === id ? contaAtualizada : conta))
      );

      const novasContas = contas.map((conta) =>
        conta.id === id ? contaAtualizada : conta
      );
      calcularResumo(novasContas);

      toast.success("Conta atualizada com sucesso!");
      return contaAtualizada;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar conta";
      console.error("Erro ao atualizar conta:", err);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Marcar conta como paga
  const marcarComoPaga = async (id: string, dataPagamento?: Date) => {
    try {
      const { data, error } = await supabase
        .from("contas_pagar")
        .update({
          status: "PAGA",
          data_pagamento: formatDateForDB(dataPagamento || new Date()),
          atualizado_por: user?.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const contaAtualizada = dbToContaPagar(data);
      setContas((prev) =>
        prev.map((conta) => (conta.id === id ? contaAtualizada : conta))
      );

      const novasContas = contas.map((conta) =>
        conta.id === id ? contaAtualizada : conta
      );
      calcularResumo(novasContas);

      toast.success("Conta marcada como paga!");
      return contaAtualizada;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao marcar conta como paga";
      console.error("Erro ao marcar conta como paga:", err);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Deletar conta
  const deletarConta = async (id: string) => {
    try {
      const { error } = await supabase
        .from("contas_pagar")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setContas((prev) => prev.filter((conta) => conta.id !== id));
      calcularResumo(contas.filter((conta) => conta.id !== id));

      toast.success("Conta excluída com sucesso!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao excluir conta";
      console.error("Erro ao excluir conta:", err);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Buscar contas a vencer nos próximos dias
  const buscarContasAVencer = async (dias: number = 7) => {
    try {
      if (!cartorioId) return [];

      const dataFinal = new Date();
      dataFinal.setDate(dataFinal.getDate() + dias);

      const { data, error } = await supabase
        .from("contas_pagar")
        .select("*")
        .eq("cartorio_id", cartorioId)
        .in("status", ["A_PAGAR", "AGENDADA"])
        .gte("data_vencimento", formatDateForDB(new Date()))
        .lte("data_vencimento", formatDateForDB(dataFinal))
        .order("data_vencimento", { ascending: true });

      if (error) throw error;

      return (data || []).map(dbToContaPagar);
    } catch (err) {
      console.error("Erro ao buscar contas a vencer:", err);
      return [];
    }
  };

  // Buscar contas vencidas
  const buscarContasVencidas = async () => {
    try {
      if (!cartorioId) return [];

      const { data, error } = await supabase
        .from("contas_pagar")
        .select("*")
        .eq("cartorio_id", cartorioId)
        .eq("status", "VENCIDA")
        .order("data_vencimento", { ascending: true });

      if (error) throw error;

      return (data || []).map(dbToContaPagar);
    } catch (err) {
      console.error("Erro ao buscar contas vencidas:", err);
      return [];
    }
  };

  // Verificar e atualizar contas vencidas automaticamente
  const verificarContasVencidas = async () => {
    try {
      if (!cartorioId) return;

      const hoje = new Date();
      const hojeString = formatDateForDB(hoje);

      // Buscar contas que venceram e ainda não estão marcadas como VENCIDA
      const { data: contasVencidas, error } = await supabase
        .from("contas_pagar")
        .select("*")
        .eq("cartorio_id", cartorioId)
        .in("status", ["A_PAGAR", "AGENDADA"])
        .lt("data_vencimento", hojeString);

      if (error) throw error;

      if (contasVencidas && contasVencidas.length > 0) {
        // Atualizar todas as contas vencidas para status VENCIDA
        const { error: updateError } = await supabase
          .from("contas_pagar")
          .update({
            status: "VENCIDA",
            atualizado_por: user?.id,
            atualizado_em: new Date().toISOString(),
          })
          .in(
            "id",
            contasVencidas.map((conta) => conta.id)
          );

        if (updateError) throw updateError;

        // Atualizar o estado local
        const contasAtualizadas = contasVencidas.map((conta) => ({
          ...dbToContaPagar(conta),
          status: "VENCIDA" as StatusConta,
        }));

        setContas((prev) =>
          prev.map((conta) => {
            const contaAtualizada = contasAtualizadas.find(
              (c) => c.id === conta.id
            );
            return contaAtualizada || conta;
          })
        );

        // Recalcular resumo
        const novasContas = contas.map((conta) => {
          const contaAtualizada = contasAtualizadas.find(
            (c) => c.id === conta.id
          );
          return contaAtualizada || conta;
        });
        calcularResumo(novasContas);

        console.log(
          `${contasVencidas.length} conta(s) marcada(s) como vencida(s) automaticamente`
        );
      }
    } catch (err) {
      console.error("Erro ao verificar contas vencidas:", err);
    }
  };

  // Carregar contas ao montar o componente
  useEffect(() => {
    if (cartorioId) {
      fetchContas();
    }
  }, [cartorioId, fetchContas]);

  // Função para obter todas as categorias disponíveis (apenas personalizadas do banco)
  const getTodasCategorias = () => {
    // Se ainda está carregando, retorna array vazio temporariamente
    if (categoriasLoading) {
      return [];
    }

    // Se não há categorias personalizadas, retorna categorias padrão temporárias
    if (!categoriasPersonalizadas || categoriasPersonalizadas.length === 0) {
      return [
        { id: "ALUGUEL", nome: "Aluguel", cor: "#EF4444" },
        { id: "ENERGIA", nome: "Energia Elétrica", cor: "#F59E0B" },
        { id: "AGUA", nome: "Água", cor: "#06B6D4" },
        { id: "INTERNET", nome: "Internet", cor: "#8B5CF6" },
        { id: "SALARIOS", nome: "Salários", cor: "#10B981" },
        { id: "IMPOSTOS", nome: "Impostos", cor: "#DC2626" },
        { id: "OUTROS", nome: "Outros", cor: "#6B7280" },
      ];
    }

    // Retorna apenas as categorias personalizadas do banco de dados
    return categoriasPersonalizadas.map((cat) => ({
      id: cat.id,
      nome: cat.nome,
      cor: cat.cor,
    }));
  };

  // Funções para gerenciar documentos das contas
  const buscarDocumentosConta = useCallback(
    async (contaId: string): Promise<DocumentoConta[]> => {
      try {
        const { data, error } = await supabase
          .from("documentos_contas")
          .select("*")
          .eq("conta_id", contaId)
          .order("data_upload", { ascending: false });

        if (error) throw error;

        return data.map((doc) => ({
          id: doc.id,
          contaId: doc.conta_id,
          nomeArquivo: doc.nome_arquivo,
          urlArquivo: doc.url_arquivo,
          tipoArquivo: doc.tipo_arquivo,
          tamanhoArquivo: doc.tamanho_arquivo,
          dataUpload: new Date(doc.data_upload),
          usuarioUpload: doc.usuario_upload,
        }));
      } catch (error) {
        console.error("Erro ao buscar documentos da conta:", error);
        toast.error("Erro ao carregar documentos");
        return [];
      }
    },
    []
  );

  const adicionarDocumentoConta = useCallback(
    async (
      contaId: string,
      documento: Omit<DocumentoConta, "id" | "contaId" | "dataUpload">,
      silent: boolean = false
    ): Promise<DocumentoConta | null> => {
      console.log("🔍 DEBUG: adicionarDocumentoConta chamada com:", {
        contaId,
        documento,
        userId: user?.id,
      });

      try {
        const insertData = {
          conta_id: contaId,
          nome_arquivo: documento.nomeArquivo,
          url_arquivo: documento.urlArquivo,
          tipo_arquivo: documento.tipoArquivo,
          tamanho_arquivo: documento.tamanhoArquivo,
          usuario_upload: user?.id,
        };

        console.log("🔍 DEBUG: Dados para inserção:", insertData);

        const { data, error } = await supabase
          .from("documentos_contas")
          .insert(insertData)
          .select()
          .single();

        console.log("🔍 DEBUG: Resultado da inserção:", { data, error });

        if (error) {
          console.error("❌ Erro na inserção:", error);
          throw error;
        }

        const resultado = {
          id: data.id,
          contaId: data.conta_id,
          nomeArquivo: data.nome_arquivo,
          urlArquivo: data.url_arquivo,
          tipoArquivo: data.tipo_arquivo,
          tamanhoArquivo: data.tamanho_arquivo,
          dataUpload: new Date(data.data_upload),
          usuarioUpload: data.usuario_upload,
        };

        console.log("✅ DEBUG: Documento salvo com sucesso:", resultado);
        return resultado;
      } catch (error) {
        console.error("❌ Erro ao adicionar documento:", error);
        console.error("❌ Detalhes do erro:", {
          message: error instanceof Error ? error.message : "Erro desconhecido",
          stack: error instanceof Error ? error.stack : undefined,
        });
        if (!silent) {
          toast.error("Erro ao salvar documento");
        }
        return null;
      }
    },
    [user?.id]
  );

  const removerDocumentoConta = useCallback(
    async (documentoId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("documentos_contas")
          .delete()
          .eq("id", documentoId);

        if (error) throw error;

        toast.success("Documento removido com sucesso");
        return true;
      } catch (error) {
        console.error("Erro ao remover documento:", error);
        toast.error("Erro ao remover documento");
        return false;
      }
    },
    []
  );

  return {
    contas,
    resumo,
    loading,
    error,
    fetchContas,
    criarConta,
    atualizarConta,
    marcarComoPaga,
    deletarConta,
    buscarContasAVencer,
    buscarContasVencidas,
    verificarContasVencidas,
    getTodasCategorias,
    // Funções de documentos
    buscarDocumentosConta,
    adicionarDocumentoConta,
    removerDocumentoConta,
  };
};
