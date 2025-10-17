import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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

    const body = await request.json();

    // Validar dados recebidos do N8N
    const {
      relatorio_id,
      status,
      relatorio_pdf,
      relatorio_doc,
      relatorio_docx,
      resumo,
      error_message,
      // Campos específicos para resumo de matrícula
      matricula_resumida_url,
      dados_extraidos,
      tipo_processamento,
    } = body;

    if (!relatorio_id) {
      return NextResponse.json(
        { error: "relatorio_id é obrigatório" },
        { status: 400 }
      );
    }

    // Atualizar o relatório no banco de dados
    const updates: any = {
      status: status || "erro",
      updated_at: new Date().toISOString(),
    };

    // Campos gerais (verificar se existem antes de adicionar)
    if (relatorio_pdf) updates.relatorio_pdf = relatorio_pdf;
    if (relatorio_doc) updates.relatorio_doc = relatorio_doc;
    if (relatorio_docx) updates.relatorio_docx = relatorio_docx;

    // Tratar resumo com verificação de existência da coluna
    if (resumo) {
      updates.resumo = resumo;
    }
    if (error_message) {
      updates.resumo = { ...(updates.resumo || {}), error: error_message };
    }

    // Campos específicos para resumo de matrícula
    if (matricula_resumida_url) {
      updates.arquivo_resultado = matricula_resumida_url;
    }

    if (dados_extraidos) {
      updates.resultado_final = {
        ...(updates.resultado_final || {}),
        dados_extraidos,
        tipo_processamento: tipo_processamento || "resumo_matricula",
        timestamp_conclusao: new Date().toISOString(),
      };
    }

    const { data, error } = await supabase
      .from("relatorios_ia")
      .update(updates)
      .eq("id", relatorio_id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar relatório:", error);
      return NextResponse.json(
        { error: "Erro ao atualizar relatório no banco de dados" },
        { status: 500 }
      );
    }

    console.log("Relatório atualizado com sucesso:", data);

    return NextResponse.json({
      success: true,
      message: "Relatório atualizado com sucesso",
      data,
    });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Endpoint para testar a conexão
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook endpoint funcionando",
    timestamp: new Date().toISOString(),
  });
}
