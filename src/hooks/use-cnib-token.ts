import { useState, useEffect } from "react";

interface CNIBToken {
  access_token: string;
  expires_at?: string;
}

export const useCNIBToken = () => {
  const [token, setToken] = useState<CNIBToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToken = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar token do webhook N8N
      const webhookUrl = process.env.NEXT_PUBLIC_CNIB_WEBHOOK_URL || 
        "https://webhook.conversix.com.br/webhook/56a42f09-36f7-4912-b9cb-c4363d5ca7ad";

      const response = await fetch(webhookUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar token: ${response.status}`);
      }

      const data = await response.json();
      
      // O webhook retorna o token no formato: { "cnib_access_token": "..." }
      const accessToken = data.cnib_access_token || data.access_token || data.token;

      if (!accessToken) {
        throw new Error("Token não encontrado na resposta do webhook");
      }

      // Decodificar JWT para obter expiração (opcional, para validação)
      let expiresAt: string | undefined;
      try {
        const tokenParts = accessToken.split(".");
        if (tokenParts.length === 3) {
          // Usar atob (disponível no navegador) em vez de Buffer
          const base64Url = tokenParts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          if (payload.exp) {
            expiresAt = new Date(payload.exp * 1000).toISOString();
          }
        }
      } catch (e) {
        // Ignorar erro de decodificação
        console.log("⚠️ Não foi possível decodificar expiração do token:", e);
      }

      setToken({
        access_token: accessToken,
        expires_at: expiresAt,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro ao buscar token CNIB";
      setError(errorMessage);
      console.error("Erro ao buscar token CNIB:", err);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();

    // Atualizar token a cada 5 minutos para pegar tokens novos
    const interval = setInterval(() => {
      fetchToken();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    token,
    loading,
    error,
    fetchToken,
    isTokenValid: token !== null,
  };
};

