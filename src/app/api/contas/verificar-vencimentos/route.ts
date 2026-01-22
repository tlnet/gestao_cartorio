import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Buscar todos os cartórios com notificações WhatsApp habilitadas
    const { data: cartorios, error: cartoriosError } = await supabase
      .from("cartorios")
      .select("id, notificacao_whatsapp, whatsapp_contas, tenant_id_zdg, external_id_zdg, api_token_zdg, channel_id_zdg")
      .eq("notificacao_whatsapp", true)
      .not("whatsapp_contas", "is", null);

    if (cartoriosError) {
      console.error("Erro ao buscar cartórios:", cartoriosError);
      return NextResponse.json(
        { error: "Erro ao buscar cartórios" },
        { status: 500 }
      );
    }

    if (!cartorios || cartorios.length === 0) {
      return NextResponse.json({
        message: "Nenhum cartório com notificações WhatsApp habilitadas para contas a pagar",
        notificacoes_enviadas: 0,
      });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const proximos7Dias = new Date();
    proximos7Dias.setDate(hoje.getDate() + 7);
    proximos7Dias.setHours(0, 0, 0, 0);
    
    const notificacoesEnviadas: any[] = [];

    // Processar cada cartório
    for (const cartorio of cartorios) {
      if (!cartorio.whatsapp_contas || !cartorio.whatsapp_contas.trim()) {
        continue;
      }

      // Buscar contas próximas do vencimento (próximos 7 dias) ou vencidas
      const { data: contas, error: contasError } = await supabase
        .from("contas_pagar")
        .select("id, descricao, valor, data_vencimento, status, fornecedor, categoria, observacoes, cartorio_id")
        .eq("cartorio_id", cartorio.id)
        .in("status", ["A_PAGAR", "AGENDADA", "VENCIDA"])
        .lte("data_vencimento", proximos7Dias.toISOString().split("T")[0]);

      if (contasError) {
        console.error(`Erro ao buscar contas do cartório ${cartorio.id}:`, contasError);
        continue;
      }

      if (!contas || contas.length === 0) {
        continue;
      }

      // Processar cada conta
      for (const conta of contas) {
        const dataVencimento = new Date(conta.data_vencimento);
        dataVencimento.setHours(0, 0, 0, 0);
        
        const hojeTimestamp = hoje.getTime();
        const dataVencimentoTimestamp = dataVencimento.getTime();
        const diasRestantes = Math.ceil((dataVencimentoTimestamp - hojeTimestamp) / (1000 * 60 * 60 * 24));

        // Preparar payload do webhook com a mesma estrutura do webhook de status de protocolos
        const payload = {
          status_anterior: conta.status,
          status_novo: conta.status, // Mantém o mesmo status, pois é apenas notificação de vencimento
          conta_id: conta.id,
          cartorio_id: cartorio.id,
          fluxo: "vencimento-conta-pagar",
          // Dados adicionais da conta
          nome_completo_solicitante: conta.fornecedor || "Fornecedor não informado",
          telefone_solicitante: null, // Contas a pagar não têm telefone do solicitante
          servicos_solicitados: [], // Contas a pagar não têm serviços
          numero_demanda: null, // Contas a pagar não têm demanda
          numero_protocolo: null, // Contas a pagar não têm protocolo
          // Dados ZDG do cartório
          tenant_id_zdg: cartorio.tenant_id_zdg || null,
          external_id_zdg: cartorio.external_id_zdg || null,
          api_token_zdg: cartorio.api_token_zdg || null,
          channel_id_zdg: cartorio.channel_id_zdg || null,
          // Dados adicionais da conta
          telefone: cartorio.whatsapp_contas,
          conta: {
            id: conta.id,
            descricao: conta.descricao,
            valor: conta.valor,
            categoria: conta.categoria,
            fornecedor: conta.fornecedor,
            observacoes: conta.observacoes,
            status: conta.status,
          },
          vencimento: {
            data_vencimento: dataVencimento.toISOString().split("T")[0],
            dias_restantes: diasRestantes,
            vencida: diasRestantes < 0,
          },
        };

        // Disparar webhook
        try {
          const webhookUrl = "https://webhook.cartorio.app.br/webhook/api/webhooks/financeiro/contas-pagar";
          
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            console.log(`✅ Webhook disparado para conta ${conta.descricao}, vencimento: ${dataVencimento.toISOString().split("T")[0]}`);
            notificacoesEnviadas.push({
              conta: conta.descricao,
              data_vencimento: dataVencimento.toISOString().split("T")[0],
              dias_restantes: diasRestantes,
            });
          } else {
            const errorText = await response.text();
            console.error(
              `❌ Erro ao disparar webhook para conta ${conta.descricao}:`,
              response.status,
              errorText
            );
          }
        } catch (webhookError: any) {
          console.error(
            `❌ Erro ao disparar webhook para conta ${conta.descricao}:`,
            webhookError.message
          );
        }
      }
    }

    return NextResponse.json({
      message: "Verificação de vencimentos de contas a pagar concluída",
      notificacoes_enviadas: notificacoesEnviadas.length,
      detalhes: notificacoesEnviadas,
    });
  } catch (error: any) {
    console.error("Erro ao verificar vencimentos de contas a pagar:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao verificar vencimentos de contas a pagar" },
      { status: 500 }
    );
  }
}
