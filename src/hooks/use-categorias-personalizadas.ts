"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import type { CategoriaPersonalizada } from "@/types";

interface CategoriaPersonalizadaDB {
  id: string;
  cartorio_id: string;
  nome: string;
  descricao?: string;
  cor: string;
  ativo: boolean;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
  criado_por?: string;
  atualizado_por?: string;
}

// Função para converter dados do banco para o formato da interface
const dbToCategoriaPersonalizada = (
  data: CategoriaPersonalizadaDB
): CategoriaPersonalizada => ({
  id: data.id,
  cartorioId: data.cartorio_id,
  nome: data.nome,
  descricao: data.descricao,
  cor: data.cor,
  ativo: data.ativo,
  ordem: data.ordem,
  criadoEm: new Date(data.criado_em),
  atualizadoEm: new Date(data.atualizado_em),
  criadoPor: data.criado_por,
  atualizadoPor: data.atualizado_por,
});

export const useCategoriasPersonalizadas = (cartorioId?: string) => {
  const [categorias, setCategorias] = useState<CategoriaPersonalizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Função para buscar categorias
  const fetchCategorias = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!cartorioId) {
        setCategorias([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("categorias_personalizadas")
        .select("*")
        .eq("cartorio_id", cartorioId)
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) {
        throw error;
      }

      const categoriasFormatadas = (data || []).map(dbToCategoriaPersonalizada);
      setCategorias(categoriasFormatadas);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao carregar categorias";
      setError(errorMessage);
      console.error("Erro ao carregar categorias:", err);
    } finally {
      setLoading(false);
    }
  }, [cartorioId]);

  // Criar nova categoria
  const criarCategoria = async (categoriaData: {
    nome: string;
    descricao?: string;
    cor: string;
    ordem?: number;
  }) => {
    try {
      if (!cartorioId) {
        throw new Error("Cartório não identificado");
      }

      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      // Verificar se já existe categoria com o mesmo nome
      const { data: categoriaExistente } = await supabase
        .from("categorias_personalizadas")
        .select("id")
        .eq("cartorio_id", cartorioId)
        .eq("nome", categoriaData.nome)
        .single();

      if (categoriaExistente) {
        throw new Error("Já existe uma categoria com este nome");
      }

      // Buscar a próxima ordem
      const { data: ultimaCategoria } = await supabase
        .from("categorias_personalizadas")
        .select("ordem")
        .eq("cartorio_id", cartorioId)
        .order("ordem", { ascending: false })
        .limit(1)
        .single();

      const proximaOrdem = (ultimaCategoria?.ordem || 0) + 1;

      const { data, error } = await supabase
        .from("categorias_personalizadas")
        .insert([
          {
            cartorio_id: cartorioId,
            nome: categoriaData.nome,
            descricao: categoriaData.descricao,
            cor: categoriaData.cor,
            ordem: categoriaData.ordem || proximaOrdem,
            criado_por: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const novaCategoria = dbToCategoriaPersonalizada(data);
      setCategorias((prev) =>
        [...prev, novaCategoria].sort((a, b) => a.ordem - b.ordem)
      );

      toast.success("Categoria criada com sucesso!");
      return novaCategoria;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar categoria";
      console.error("Erro ao criar categoria:", err);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Atualizar categoria
  const atualizarCategoria = async (
    id: string,
    categoriaData: {
      nome?: string;
      descricao?: string;
      cor?: string;
      ordem?: number;
      ativo?: boolean;
    }
  ) => {
    try {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      // Se estiver alterando o nome, verificar se já existe
      if (categoriaData.nome) {
        const { data: categoriaExistente } = await supabase
          .from("categorias_personalizadas")
          .select("id")
          .eq("cartorio_id", cartorioId)
          .eq("nome", categoriaData.nome)
          .neq("id", id)
          .single();

        if (categoriaExistente) {
          throw new Error("Já existe uma categoria com este nome");
        }
      }

      const { data, error } = await supabase
        .from("categorias_personalizadas")
        .update({
          ...categoriaData,
          atualizado_por: user.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const categoriaAtualizada = dbToCategoriaPersonalizada(data);
      setCategorias((prev) =>
        prev
          .map((cat) => (cat.id === id ? categoriaAtualizada : cat))
          .sort((a, b) => a.ordem - b.ordem)
      );

      toast.success("Categoria atualizada com sucesso!");
      return categoriaAtualizada;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao atualizar categoria";
      console.error("Erro ao atualizar categoria:", err);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Deletar categoria (soft delete)
  const deletarCategoria = async (id: string) => {
    try {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase
        .from("categorias_personalizadas")
        .update({
          ativo: false,
          atualizado_por: user.id,
        })
        .eq("id", id);

      if (error) throw error;

      setCategorias((prev) => prev.filter((cat) => cat.id !== id));

      toast.success("Categoria removida com sucesso!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao remover categoria";
      console.error("Erro ao remover categoria:", err);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Reordenar categorias
  const reordenarCategorias = async (
    categoriasReordenadas: CategoriaPersonalizada[]
  ) => {
    try {
      if (!user?.id) {
        throw new Error("Usuário não autenticado");
      }

      const updates = categoriasReordenadas.map((categoria, index) => ({
        id: categoria.id,
        ordem: index + 1,
        atualizado_por: user.id,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("categorias_personalizadas")
          .update({
            ordem: update.ordem,
            atualizado_por: update.atualizado_por,
          })
          .eq("id", update.id);

        if (error) throw error;
      }

      setCategorias(categoriasReordenadas);
      toast.success("Ordem das categorias atualizada!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao reordenar categorias";
      console.error("Erro ao reordenar categorias:", err);
      toast.error(errorMessage);
      throw err;
    }
  };

  // Buscar categoria por ID
  const getCategoriaById = useCallback(
    (id: string) => {
      return categorias.find((cat) => cat.id === id);
    },
    [categorias]
  );

  // Buscar categorias por nome
  const getCategoriasByNome = useCallback(
    (nome: string) => {
      return categorias.filter((cat) =>
        cat.nome.toLowerCase().includes(nome.toLowerCase())
      );
    },
    [categorias]
  );

  // Carregar categorias quando o cartório mudar
  useEffect(() => {
    if (cartorioId) {
      fetchCategorias();
    } else {
      setCategorias([]);
      setLoading(false);
    }
  }, [cartorioId, fetchCategorias]);

  return {
    categorias,
    loading,
    error,
    fetchCategorias,
    criarCategoria,
    atualizarCategoria,
    deletarCategoria,
    reordenarCategorias,
    getCategoriaById,
    getCategoriasByNome,
  };
};
