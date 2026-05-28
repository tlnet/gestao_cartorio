"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { putCartorioUpdate } from "@/lib/admin-cartorio-api";

export interface ChatwootConfigForm {
  sistema_chatwoot: boolean;
  chatwoot_account_id: string;
  chatwoot_token: string;
  chatwoot_inbox_id: string;
}

const EMPTY: ChatwootConfigForm = {
  sistema_chatwoot: false,
  chatwoot_account_id: "",
  chatwoot_token: "",
  chatwoot_inbox_id: "",
};

export const useChatwootConfig = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [config, setConfig] = useState<ChatwootConfigForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartorioId, setCartorioId] = useState<string | null>(null);

  // Cartório do usuário
  useEffect(() => {
    if (authLoading) return;
    const fetchCartorioId = async () => {
      if (!user?.id) {
        setCartorioId(null);
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // Carregar configuração
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
            "sistema_chatwoot, chatwoot_account_id, chatwoot_token, chatwoot_inbox_id"
          )
          .eq("id", cartorioId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setConfig({ ...EMPTY });
            return;
          }
          throw error;
        }

        setConfig({
          sistema_chatwoot: Boolean(data?.sistema_chatwoot) === true,
          chatwoot_account_id: String(data?.chatwoot_account_id || ""),
          chatwoot_token: String(data?.chatwoot_token || ""),
          chatwoot_inbox_id: String(data?.chatwoot_inbox_id || ""),
        });
      } catch (error: any) {
        console.error("Erro ao carregar configuração Chatwoot:", error);
        if (
          !error?.message?.includes("column") &&
          !error?.message?.includes("does not exist") &&
          error?.code !== "PGRST116"
        ) {
          toast.error("Erro ao carregar configuração do Chatwoot");
        }
        setConfig({ ...EMPTY });
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadConfig();

    const channel = supabase
      .channel(`chatwoot-config-${cartorioId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cartorios",
          filter: `id=eq.${cartorioId}`,
        },
        () => void loadConfig()
      )
      .subscribe();

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
    };
  }, [cartorioId]);

  const saveConfig = async (data: ChatwootConfigForm) => {
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
        sistema_chatwoot: data.sistema_chatwoot === true,
      };
      if (data.sistema_chatwoot) {
        updateData.chatwoot_account_id = data.chatwoot_account_id?.trim() || null;
        updateData.chatwoot_token = data.chatwoot_token?.trim() || null;
        updateData.chatwoot_inbox_id = data.chatwoot_inbox_id?.trim() || null;
      } else {
        updateData.chatwoot_account_id = null;
        updateData.chatwoot_token = null;
        updateData.chatwoot_inbox_id = null;
      }

      const { cartorio } = await putCartorioUpdate(
        accessToken,
        cartorioId,
        updateData
      );
      const c = cartorio as Record<string, unknown>;

      setConfig({
        sistema_chatwoot: Boolean(c.sistema_chatwoot) === true,
        chatwoot_account_id: String(c.chatwoot_account_id ?? ""),
        chatwoot_token: String(c.chatwoot_token ?? ""),
        chatwoot_inbox_id: String(c.chatwoot_inbox_id ?? ""),
      });

      toast.success("Configuração do Chatwoot salva com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar configuração Chatwoot:", error);
      toast.error(error.message || "Erro ao salvar configuração do Chatwoot");
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
        sistema_chatwoot: false,
        chatwoot_account_id: null,
        chatwoot_token: null,
        chatwoot_inbox_id: null,
        updated_at: new Date().toISOString(),
      });
      setConfig({ ...EMPTY });
      toast.success("Integração Chatwoot desabilitada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao desabilitar configuração Chatwoot:", error);
      toast.error(error.message || "Erro ao desabilitar configuração do Chatwoot");
      throw error;
    }
  };

  return { config, loading, saveConfig, disableConfig, cartorioId };
};
