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
    getTodasCategorias,
  };
};
