"use client";

import { useState, useEffect } from "react";

interface AlertasFechados {
  vencidas: boolean;
  aVencer: boolean;
}

export function useAlertasPersistentes() {
  const [alertasFechados, setAlertasFechados] = useState<AlertasFechados>({
    vencidas: false,
    aVencer: false,
  });

  // Verificar se os alertas foram fechados hoje
  useEffect(() => {
    const hoje = new Date().toDateString();
    const alertasFechadosHoje = localStorage.getItem("alertasFechados");

    if (alertasFechadosHoje) {
      try {
        const dados = JSON.parse(alertasFechadosHoje);
        if (dados.data === hoje) {
          setAlertasFechados({
            vencidas: dados.vencidas || false,
            aVencer: dados.aVencer || false,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar alertas do localStorage:", error);
        // Se houver erro, limpar o localStorage
        localStorage.removeItem("alertasFechados");
      }
    }
  }, []);

  const fecharAlertaVencidas = () => {
    const hoje = new Date().toDateString();
    const novosAlertas = { vencidas: true, aVencer: alertasFechados.aVencer };
    setAlertasFechados(novosAlertas);

    // Salvar no localStorage com a data atual
    localStorage.setItem(
      "alertasFechados",
      JSON.stringify({
        data: hoje,
        vencidas: true,
        aVencer: alertasFechados.aVencer,
      })
    );
  };

  const fecharAlertaAVencer = () => {
    const hoje = new Date().toDateString();
    const novosAlertas = { vencidas: alertasFechados.vencidas, aVencer: true };
    setAlertasFechados(novosAlertas);

    // Salvar no localStorage com a data atual
    localStorage.setItem(
      "alertasFechados",
      JSON.stringify({
        data: hoje,
        vencidas: alertasFechados.vencidas,
        aVencer: true,
      })
    );
  };

  const resetarAlertas = () => {
    setAlertasFechados({ vencidas: false, aVencer: false });
    localStorage.removeItem("alertasFechados");
  };

  return {
    alertasFechados,
    fecharAlertaVencidas,
    fecharAlertaAVencer,
    resetarAlertas,
  };
}
