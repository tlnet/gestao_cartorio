import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * Endpoint assíncrono para receber informações de campos pendentes
 * Chamado diretamente pelo N8N quando detecta campos faltantes na minuta
 * 
 * POST /api/ia/campos-pendentes
 * Body:
 * {
 *   relatorio_id: string,
 *   status: "ERROR",
 *   mensagens_erro?: string[],
 *   mensagens_alerta?: string[],
 *   campos_pendentes: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      return NextResponse.json(
        { error: "Variáveis de ambiente do Supabase não configuradas" },
        { status: 503 }
      );
    }

    // Parse do body
    const body = await request.json();
    const {
      relatorio_id,
      status,
      mensagens_erro,
      mensagens_alerta,
      campos_pendentes,
    } = body;

    // Validações
    if (!relatorio_id) {
      return NextResponse.json(
        { error: "relatorio_id é obrigatório" },
        { status: 400 }
      );
    }

    if (status !== "ERROR" && status !== "error") {
      return NextResponse.json(
        { error: "Status deve ser 'ERROR' ou 'error'" },
        { status: 400 }
      );
    }

    if (!campos_pendentes || !Array.isArray(campos_pendentes) || campos_pendentes.length === 0) {
      return NextResponse.json(
        { error: "campos_pendentes é obrigatório e deve ser um array não vazio" },
        { status: 400 }
      );
    }

    // Verificar se o relatório existe
    const { data: relatorioExistente, error: fetchError } = await supabase
      .from("relatorios_ia")
      .select("id, status, resumo")
      .eq("id", relatorio_id)
      .single();

    if (fetchError || !relatorioExistente) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      );
    }

    // Preparar dados de erro e campos pendentes
    const errorData: any = {
      requer_preenchimento: true,
      campos_pendentes: campos_pendentes,
    };

    if (mensagens_erro && Array.isArray(mensagens_erro) && mensagens_erro.length > 0) {
      errorData.mensagens_erro = mensagens_erro;
    }

    if (mensagens_alerta && Array.isArray(mensagens_alerta) && mensagens_alerta.length > 0) {
      errorData.mensagens_alerta = mensagens_alerta;
    }

    // Preparar atualização do relatório
    const resumoAtual = relatorioExistente.resumo || {};
    const updates: any = {
      status: "analise_incompleta",
      resumo: {
        ...resumoAtual,
        ...errorData,
      },
    };

    // Adicionar updated_at apenas se a coluna existir (será atualizado automaticamente se houver trigger)
    // O Supabase pode ter trigger automático para updated_at

    // Atualizar o relatório no banco de dados
    const { data: relatorioAtualizado, error: updateError } = await supabase
      .from("relatorios_ia")
      .update(updates)
      .eq("id", relatorio_id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar relatório:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar relatório no banco de dados", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("✅ Campos pendentes registrados com sucesso:", {
      relatorio_id,
      campos_pendentes: campos_pendentes.length,
      mensagens_erro: mensagens_erro?.length || 0,
      mensagens_alerta: mensagens_alerta?.length || 0,
      timestamp: new Date().toISOString(),
    });

    // Retornar sucesso imediatamente (assíncrono)
    return NextResponse.json({
      success: true,
      message: "Campos pendentes registrados com sucesso",
      data: {
        relatorio_id: relatorioAtualizado.id,
        status: "analise_incompleta",
        campos_pendentes: campos_pendentes.length,
        requer_preenchimento: true,
      },
    });
  } catch (error) {
    console.error("❌ Erro no endpoint de campos pendentes:", error);
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint GET para verificar se o endpoint está funcionando
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Endpoint de campos pendentes funcionando",
    endpoint: "/api/ia/campos-pendentes",
    method: "POST",
    expectedBody: {
      relatorio_id: "string (obrigatório)",
      status: "ERROR | error (obrigatório)",
      mensagens_erro: "string[] (opcional)",
      mensagens_alerta: "string[] (opcional)",
      campos_pendentes: "string[] (obrigatório)",
    },
    timestamp: new Date().toISOString(),
  });
}
