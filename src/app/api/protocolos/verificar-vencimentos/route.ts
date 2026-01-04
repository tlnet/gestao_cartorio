import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Buscar todos os cartórios com notificações WhatsApp habilitadas
    const { data: cartorios, error: cartoriosError } = await supabase
      .from("cartorios")
      .select("id, notificacao_whatsapp, whatsapp_protocolos, tenant_id_zdg, external_id_zdg, api_token_zdg, channel_id_zdg")
      .eq("notificacao_whatsapp", true)
      .not("whatsapp_protocolos", "is", null);

    if (cartoriosError) {
      console.error("Erro ao buscar cartórios:", cartoriosError);
      return NextResponse.json(
        { error: "Erro ao buscar cartórios" },
        { status: 500 }
      );
    }

    if (!cartorios || cartorios.length === 0) {
      return NextResponse.json({
        message: "Nenhum cartório com notificações WhatsApp habilitadas",
        notificacoes_enviadas: 0,
      });
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const notificacoesEnviadas: any[] = [];

    // Processar cada cartório
    for (const cartorio of cartorios) {
      if (!cartorio.whatsapp_protocolos || !cartorio.whatsapp_protocolos.trim()) {
        continue;
      }

      // Buscar protocolos não concluídos do cartório
      const { data: protocolos, error: protocolosError } = await supabase
        .from("protocolos")
        .select("id, protocolo, demanda, solicitante, cpf_cnpj, telefone, email, servicos, status, prazo_execucao, created_at, cartorio_id")
        .eq("cartorio_id", cartorio.id)
        .neq("status", "Concluído")
        .not("servicos", "is", null);

      if (protocolosError) {
        console.error(`Erro ao buscar protocolos do cartório ${cartorio.id}:`, protocolosError);
        continue;
      }

      if (!protocolos || protocolos.length === 0) {
        continue;
      }

      // Buscar serviços do cartório
      const { data: servicos, error: servicosError } = await supabase
        .from("servicos")
        .select("id, nome, prazo_execucao, dias_notificacao_antes_vencimento, ativo")
        .eq("cartorio_id", cartorio.id)
        .eq("ativo", true);

      if (servicosError) {
        console.error(`Erro ao buscar serviços do cartório ${cartorio.id}:`, servicosError);
        continue;
      }

      if (!servicos || servicos.length === 0) {
        continue;
      }

      // Criar mapa de serviços por nome para busca rápida
      const servicosMap = new Map(
        servicos.map((s) => [s.nome.toLowerCase().trim(), s])
      );

      // Processar cada protocolo
      for (const protocolo of protocolos) {
        if (!protocolo.servicos || !Array.isArray(protocolo.servicos)) {
          continue;
        }

        const dataCriacaoProtocolo = new Date(protocolo.created_at);
        dataCriacaoProtocolo.setHours(0, 0, 0, 0);

        // Processar cada serviço do protocolo
        for (const nomeServico of protocolo.servicos) {
          const servico = servicosMap.get(nomeServico.toLowerCase().trim());

          if (!servico || !servico.prazo_execucao || !servico.dias_notificacao_antes_vencimento) {
            continue;
          }

          // Calcular data de vencimento do serviço
          const dataVencimento = new Date(dataCriacaoProtocolo);
          dataVencimento.setDate(dataVencimento.getDate() + servico.prazo_execucao);
          dataVencimento.setHours(0, 0, 0, 0);

          // Calcular data de notificação (vencimento - dias_notificacao)
          const dataNotificacao = new Date(dataVencimento);
          dataNotificacao.setDate(dataNotificacao.getDate() - servico.dias_notificacao_antes_vencimento);
          dataNotificacao.setHours(0, 0, 0, 0);

          // Verificar se hoje é a data de notificação ou já passou (mas ainda não venceu)
          const hojeTimestamp = hoje.getTime();
          const dataNotificacaoTimestamp = dataNotificacao.getTime();
          const dataVencimentoTimestamp = dataVencimento.getTime();

          if (
            hojeTimestamp >= dataNotificacaoTimestamp &&
            hojeTimestamp < dataVencimentoTimestamp
          ) {
            // Preparar payload do webhook
            const payload = {
              telefone: cartorio.whatsapp_protocolos,
              protocolo: {
                id: protocolo.id,
                numero: protocolo.protocolo,
                demanda: protocolo.demanda,
                solicitante: protocolo.solicitante,
                cpf_cnpj: protocolo.cpf_cnpj,
                telefone: protocolo.telefone,
                email: protocolo.email,
                status: protocolo.status,
                data_criacao: protocolo.created_at,
              },
              servico: {
                nome: servico.nome,
                prazo_execucao: servico.prazo_execucao,
                dias_notificacao_antes_vencimento: servico.dias_notificacao_antes_vencimento,
              },
              vencimento: {
                data_vencimento: dataVencimento.toISOString().split("T")[0],
                data_notificacao: dataNotificacao.toISOString().split("T")[0],
                dias_restantes: Math.ceil((dataVencimentoTimestamp - hojeTimestamp) / (1000 * 60 * 60 * 24)),
              },
              cartorio: {
                id: cartorio.id,
              },
              zdg: {
                tenant_id_zdg: cartorio.tenant_id_zdg || null,
                external_id_zdg: cartorio.external_id_zdg || null,
                api_token_zdg: cartorio.api_token_zdg || null,
                channel_id_zdg: cartorio.channel_id_zdg || null,
              },
            };

            // Disparar webhook
            try {
              const webhookUrl = "https://webhook.cartorio.app.br/webhook/api/webhooks/protocolos/vencimento";
              
              const response = await fetch(webhookUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });

              if (response.ok) {
                console.log(`✅ Webhook disparado para protocolo ${protocolo.protocolo}, serviço ${servico.nome}`);
                notificacoesEnviadas.push({
                  protocolo: protocolo.protocolo,
                  servico: servico.nome,
                  data_vencimento: dataVencimento.toISOString().split("T")[0],
                });
              } else {
                const errorText = await response.text();
                console.error(
                  `❌ Erro ao disparar webhook para protocolo ${protocolo.protocolo}, serviço ${servico.nome}:`,
                  response.status,
                  errorText
                );
              }
            } catch (webhookError: any) {
              console.error(
                `❌ Erro ao disparar webhook para protocolo ${protocolo.protocolo}, serviço ${servico.nome}:`,
                webhookError.message
              );
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: "Verificação de vencimentos concluída",
      notificacoes_enviadas: notificacoesEnviadas.length,
      detalhes: notificacoesEnviadas,
    });
  } catch (error: any) {
    console.error("Erro ao verificar vencimentos:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao verificar vencimentos" },
      { status: 500 }
    );
  }
}

