"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { putCartorioUpdate } from "@/lib/admin-cartorio-api";

interface LevontechConfig {
  sistema_levontech: boolean;
  levontech_url: string;
  levontech_username: string;
  levontech_password: string;
}

export const useLevontechConfig = () => {
  const { user, session } = useAuth();
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
    if (!cartorioId) {
      setLoading(false);
      setConfig(null);
      return;
    }

    let isActive = true;

    const loadConfig = async () => {
      try {
        if (!isActive) return;
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
            console.log(
              "Nenhuma configuração Levontech encontrada, usando padrão"
            );
            setConfig({
              sistema_levontech: false,
              levontech_url: "",
              levontech_username: "",
              levontech_password: "",
            });
            return;
          }
          throw error;
        }

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
          setConfig({
            sistema_levontech: false,
            levontech_url: "",
            levontech_username: "",
            levontech_password: "",
          });
        }
      } catch (error: any) {
        console.error("Erro ao carregar configuração Levontech:", error);
        if (
          !error?.message?.includes("column") &&
          !error?.message?.includes("does not exist") &&
          error?.code !== "PGRST116"
        ) {
          toast.error("Erro ao carregar configuração do Levontech");
        }
        setConfig({
          sistema_levontech: false,
          levontech_url: "",
          levontech_username: "",
          levontech_password: "",
        });
      } finally {
        if (isActive) setLoading(false);
      }
    };

    // Primeira carga
    void loadConfig();

    // Realtime: se alguém atualizar a config no mesmo cartório,
    // os outros usuários com a tela aberta também devem refletir.
    const channel = supabase
      .channel(`levontech-config-${cartorioId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cartorios",
          filter: `id=eq.${cartorioId}`,
        },
        () => {
          // Recarrega do banco para garantir consistência
          void loadConfig();
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [cartorioId]);

  // Salvar configuração do Levontech (via API admin — evita falha por RLS)
  const saveConfig = async (configData: LevontechConfig) => {
    if (!cartorioId) {
      toast.error("Cartório não identificado");
      throw new Error("Cartório não identificado");
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error("Sessão expirada. Faça login novamente.");
      throw new Error("Sessão expirada");
    }

    try {
      const updateData: Record<string, unknown> = {
        sistema_levontech: configData.sistema_levontech === true,
      };

      if (configData.sistema_levontech) {
        updateData.levontech_url = configData.levontech_url?.trim() || null;
        updateData.levontech_username = configData.levontech_username?.trim() || null;
        updateData.levontech_password = configData.levontech_password?.trim() || null;
      } else {
        updateData.levontech_url = null;
        updateData.levontech_username = null;
        updateData.levontech_password = null;
      }

      const { cartorio } = await putCartorioUpdate(accessToken, cartorioId, updateData);
      const c = cartorio as Record<string, unknown>;

      setConfig({
        sistema_levontech: Boolean(c.sistema_levontech) === true,
        levontech_url: String(c.levontech_url ?? ""),
        levontech_username: String(c.levontech_username ?? ""),
        levontech_password: String(c.levontech_password ?? ""),
      });

      toast.success("Configuração do Levontech salva com sucesso!");
    } catch (error: any) {
      console.error("❌ Erro ao salvar configuração Levontech:", error);
      const errorMessage =
        error.message || "Erro ao salvar configuração do Levontech";
      toast.error(errorMessage);
      throw error;
    }
  };

  const disableConfig = async () => {
    if (!cartorioId) {
      toast.error("Cartório não identificado");
      return;
    }

    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    try {
      await putCartorioUpdate(accessToken, cartorioId, {
        sistema_levontech: false,
        levontech_url: null,
        levontech_username: null,
        levontech_password: null,
        updated_at: new Date().toISOString(),
      });

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

