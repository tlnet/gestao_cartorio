"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

interface LevontechConfig {
  sistema_levontech: boolean;
  levontech_url: string;
  levontech_username: string;
  levontech_password: string;
}

export const useLevontechConfig = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<LevontechConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartorioId, setCartorioId] = useState<string | null>(null);

  // Buscar cartório do usuário
  useEffect(() => {
    const fetchCartorioId = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("cartorio_id")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setCartorioId(data?.cartorio_id || null);
      } catch (error) {
        console.error("Erro ao buscar cartório do usuário:", error);
      }
    };

    fetchCartorioId();
  }, [user]);

  // Carregar configuração do Levontech
  useEffect(() => {
    const loadConfig = async () => {
      if (!cartorioId) {
        setLoading(false);
        setConfig(null);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cartorios")
          .select(
            "sistema_levontech, levontech_url, levontech_username, levontech_password"
          )
          .eq("id", cartorioId)
          .single();

        if (error) {
          // Se não encontrar registro (PGRST116), não é erro crítico
          if (error.code === "PGRST116") {
            console.log("Nenhuma configuração Levontech encontrada, usando padrão");
            setConfig({
              sistema_levontech: false,
              levontech_url: "",
              levontech_username: "",
              levontech_password: "",
            });
            setLoading(false);
            return;
          }
          throw error;
        }

        // Sempre setar config, mesmo se null
        if (data) {
          const configValue = {
            sistema_levontech: Boolean(data.sistema_levontech) === true,
            levontech_url: String(data.levontech_url || ""),
            levontech_username: String(data.levontech_username || ""),
            levontech_password: String(data.levontech_password || ""),
          };
          console.log("📥 Configuração carregada do banco:", {
            ...configValue,
            levontech_password: "***",
          });
          setConfig(configValue);
        } else {
          // Se data for null, setar valores padrão
          console.log("📥 Data é null, usando valores padrão");
          setConfig({
            sistema_levontech: false,
            levontech_url: "",
            levontech_username: "",
            levontech_password: "",
          });
        }
      } catch (error: any) {
        console.error("Erro ao carregar configuração Levontech:", error);
        // Não mostrar erro se a coluna não existir ainda (migração pendente)
        if (
          !error.message?.includes("column") &&
          !error.message?.includes("does not exist") &&
          error.code !== "PGRST116"
        ) {
          toast.error("Erro ao carregar configuração do Levontech");
        }
        // Setar valores padrão em caso de erro
        setConfig({
          sistema_levontech: false,
          levontech_url: "",
          levontech_username: "",
          levontech_password: "",
        });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [cartorioId]);

  // Salvar configuração do Levontech
  const saveConfig = async (configData: LevontechConfig) => {
    if (!cartorioId) {
      toast.error("Cartório não identificado");
      throw new Error("Cartório não identificado");
    }

    try {
      // Verificar autenticação
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        const errorMsg = "Usuário não autenticado. Faça login novamente.";
        console.error("❌", errorMsg, authError);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log("💾 Salvando configuração Levontech:", {
        cartorioId,
        userId: authUser.id,
        configData: {
          ...configData,
          levontech_password: "***", // Não logar senha
        },
      });

      // Primeiro, verificar se o cartório existe e se o usuário tem acesso
      const { data: cartorioExists, error: checkError } = await supabase
        .from("cartorios")
        .select("id, nome")
        .eq("id", cartorioId)
        .maybeSingle();

      if (checkError) {
        console.error("❌ Erro ao verificar cartório:", checkError);
        if (checkError.code === "PGRST116") {
          const errorMsg = `Cartório com ID ${cartorioId} não encontrado ou sem permissão de acesso`;
          toast.error("Cartório não encontrado ou sem permissão. Verifique se o cartório está cadastrado e você tem acesso.");
          throw new Error(errorMsg);
        }
        throw checkError;
      }

      if (!cartorioExists) {
        const errorMsg = `Cartório com ID ${cartorioId} não encontrado no banco de dados`;
        console.error("❌", errorMsg);
        toast.error("Cartório não encontrado. Verifique se o cartório está cadastrado.");
        throw new Error(errorMsg);
      }

      console.log("✅ Cartório encontrado:", cartorioExists.nome);

      const updateData: any = {
        sistema_levontech: configData.sistema_levontech === true,
      };

      // Se sistema está ativo, salvar credenciais
      if (configData.sistema_levontech) {
        updateData.levontech_url = configData.levontech_url?.trim() || null;
        updateData.levontech_username = configData.levontech_username?.trim() || null;
        updateData.levontech_password = configData.levontech_password?.trim() || null;
      } else {
        // Se sistema está desativado, limpar credenciais
        updateData.levontech_url = null;
        updateData.levontech_username = null;
        updateData.levontech_password = null;
      }

      // Não incluir updated_at manualmente, deixar o trigger fazer isso
      console.log("📝 Dados para update:", {
        ...updateData,
        levontech_password: "***",
        cartorioId,
      });

      // Tentar fazer o update - usar .select() para verificar se funcionou
      const { data: updateResult, error: updateError } = await supabase
        .from("cartorios")
        .update(updateData)
        .eq("id", cartorioId)
        .select("id, sistema_levontech, levontech_url, levontech_username")
        .maybeSingle();

      if (updateError) {
        console.error("❌ Erro ao fazer update:", updateError);
        
        // Se for erro de RLS, dar mensagem mais específica
        if (updateError.code === "42501" || updateError.message?.includes("permission") || updateError.message?.includes("policy")) {
          const errorMsg = "Erro de permissão (RLS). Verifique se as políticas RLS estão configuradas corretamente para permitir UPDATE na tabela cartorios.";
          console.error("❌", errorMsg);
          toast.error("Erro de permissão ao salvar. Verifique as políticas RLS do banco de dados.");
          throw new Error(errorMsg);
        }
        
        throw updateError;
      }

      // Verificar se o update retornou dados (significa que funcionou)
      if (!updateResult) {
        // Se não retornou dados mas também não deu erro, pode ser problema de RLS
        // Tentar buscar os dados para confirmar
        console.warn("⚠️ Update não retornou dados, verificando se foi salvo...");
        
        const { data: checkData, error: checkError } = await supabase
          .from("cartorios")
          .select("sistema_levontech, levontech_url, levontech_username, levontech_password")
          .eq("id", cartorioId)
          .maybeSingle();
        
        if (checkError) {
          const errorMsg = "Nenhuma linha foi atualizada. Verifique as permissões RLS ou se o registro existe.";
          console.error("❌", errorMsg, checkError);
          toast.error("Erro ao salvar: nenhuma linha foi atualizada. Verifique as permissões RLS.");
          throw new Error(errorMsg);
        }
        
        if (checkData) {
          // Verificar se os dados foram realmente atualizados
          const wasUpdated = 
            Boolean(checkData.sistema_levontech) === configData.sistema_levontech &&
            (checkData.levontech_url || "") === (configData.levontech_url?.trim() || "");
          
          if (wasUpdated) {
            console.log("✅ Dados foram atualizados (verificado via select):", {
              ...checkData,
              levontech_password: "***",
            });
            setConfig({
              sistema_levontech: Boolean(checkData.sistema_levontech) === true,
              levontech_url: String(checkData.levontech_url || ""),
              levontech_username: String(checkData.levontech_username || ""),
              levontech_password: String(checkData.levontech_password || ""),
            });
          } else {
            const errorMsg = "Nenhuma linha foi atualizada. Verifique as permissões RLS.";
            console.error("❌", errorMsg, "Dados no banco:", checkData, "Dados esperados:", configData);
            toast.error("Erro ao salvar: nenhuma linha foi atualizada. Verifique as permissões RLS.");
            throw new Error(errorMsg);
          }
        } else {
          const errorMsg = "Nenhuma linha foi atualizada. Verifique as permissões RLS ou se o registro existe.";
          console.error("❌", errorMsg);
          toast.error("Erro ao salvar: nenhuma linha foi atualizada. Verifique as permissões RLS.");
          throw new Error(errorMsg);
        }
      } else {
        // Update retornou dados, sucesso!
        console.log("✅ Update realizado com sucesso:", {
          ...updateResult,
          levontech_password: "***",
        });

        // Buscar a senha separadamente (não retornamos ela no select por segurança)
        const { data: fullData, error: selectError } = await supabase
          .from("cartorios")
          .select("levontech_password")
          .eq("id", cartorioId)
          .maybeSingle();

        if (selectError) {
          console.warn("⚠️ Não foi possível buscar senha, usando dados do update");
        }

        // Atualizar estado local com os dados retornados
        setConfig({
          sistema_levontech: Boolean(updateResult.sistema_levontech) === true,
          levontech_url: String(updateResult.levontech_url || ""),
          levontech_username: String(updateResult.levontech_username || ""),
          levontech_password: fullData?.levontech_password ? String(fullData.levontech_password) : configData.levontech_password,
        });
      }

      toast.success("Configuração do Levontech salva com sucesso!");
    } catch (error: any) {
      console.error("❌ Erro ao salvar configuração Levontech:", error);
      const errorMessage = error.message || "Erro ao salvar configuração do Levontech";
      toast.error(errorMessage);
      throw error;
    }
  };

  // Desabilitar integração Levontech
  const disableConfig = async () => {
    if (!cartorioId) {
      toast.error("Cartório não identificado");
      return;
    }

    try {
      const { error } = await supabase
        .from("cartorios")
        .update({
          sistema_levontech: false,
          levontech_url: null,
          levontech_username: null,
          levontech_password: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cartorioId);

      if (error) throw error;

      setConfig({
        sistema_levontech: false,
        levontech_url: "",
        levontech_username: "",
        levontech_password: "",
      });
      toast.success("Integração Levontech desabilitada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao desabilitar configuração Levontech:", error);
      toast.error(
        error.message || "Erro ao desabilitar configuração do Levontech"
      );
      throw error;
    }
  };

  return {
    config,
    loading,
    saveConfig,
    disableConfig,
    cartorioId,
  };
};

