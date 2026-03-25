import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { extractCnibTokenStringFromWebhook } from "@/lib/cnib-extract-token-from-webhook";

interface CNIBToken {
  access_token: string;
  expires_at?: string;
}

export const useCNIBToken = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<CNIBToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setToken(null);
        setError("Sessão não encontrada. Faça login novamente.");
        return;
      }

      // Chama API na mesma origem (evita CORS ao webhook externo)
      const response = await fetch("/api/cnib/obter-token-webhook", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        credentials: "include",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        let msg = `Erro ao buscar token: ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error && typeof errJson.error === "string") {
            msg = errJson.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      const data = await response.json();

      const accessToken = extractCnibTokenStringFromWebhook(data);

      if (!accessToken) {
        throw new Error(
          "Token não encontrado na resposta do webhook (esperado: cnib_access_token, cnib_token, access_token ou token)"
        );
      }

      let expiresAt: string | undefined;
      try {
        const tokenParts = accessToken.split(".");
        if (tokenParts.length === 3) {
          const base64Url = tokenParts[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          const payload = JSON.parse(jsonPayload);
          if (payload.exp) {
            expiresAt = new Date(payload.exp * 1000).toISOString();
          }
        }
      } catch (e) {
        console.log("⚠️ Não foi possível decodificar expiração do token:", e);
      }

      setToken({
        access_token: accessToken,
        expires_at: expiresAt,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao buscar token CNIB";
      setError(errorMessage);
      console.error("Erro ao buscar token CNIB:", err);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchToken();

    const interval = setInterval(() => {
      fetchToken();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchToken]);

  return {
    token,
    loading,
    error,
    fetchToken,
    isTokenValid: token !== null,
  };
};
