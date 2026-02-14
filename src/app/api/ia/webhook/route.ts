import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    console.log("🔔 Webhook recebido:", {
      headers: Object.fromEntries(request.headers.entries()),
      contentType: request.headers.get("content-type"),
      timestamp: new Date().toISOString(),
    });

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

    // Verificar se é um arquivo binário ou JSON
    const contentType = request.headers.get("content-type");
    let body;

    if (contentType?.includes("application/json")) {
      body = await request.json();
      console.log("📄 Dados JSON recebidos:", body);
    } else if (
      contentType?.includes("multipart/form-data") ||
      contentType?.includes("application/octet-stream")
    ) {
      // Lidar com arquivo binário
      const formData = await request.formData();
      const file = formData.get("file") as File;
      const metadata = formData.get("metadata") as string;

      if (!file) {
        return NextResponse.json(
          { error: "Arquivo não encontrado no payload" },
          { status: 400 }
        );
      }

      body = {
        relatorio_id: metadata ? JSON.parse(metadata).relatorio_id : null,
        status: "concluido",
        arquivo_binario: file,
        tipo_arquivo: file.type,
        nome_arquivo: file.name,
        tamanho_arquivo: file.size,
      };

      console.log("📁 Arquivo binário recebido:", {
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        relatorio_id: body.relatorio_id,
      });
    } else {
      return NextResponse.json(
        { error: "Tipo de conteúdo não suportado" },
        { status: 400 }
      );
    }

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
      // Campos para arquivo binário
      arquivo_binario,
      tipo_arquivo,
      nome_arquivo,
      tamanho_arquivo,
      // Campos para erro de minuta com campos pendentes
      mensagens_erro,
      mensagens_alerta,
      campos_pendentes,
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

    // Se recebeu arquivo binário, fazer upload para o Supabase Storage
    if (arquivo_binario) {
      try {
        console.log("📤 Fazendo upload do arquivo binário...");
        console.log("📊 Dados do arquivo:", {
          relatorio_id,
          nome_arquivo,
          tipo_arquivo,
          tamanho_arquivo,
          status,
        });

        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const fileExtension = nome_arquivo.split(".").pop() || "pdf";
        const fileName = `relatorio-${relatorio_id}-${timestamp}.${fileExtension}`;

        // Upload para Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("documentos-ia")
          .upload(fileName, arquivo_binario, {
            contentType: tipo_arquivo,
            upsert: false,
          });

        if (uploadError) {
          console.error("❌ Erro no upload:", uploadError);
          throw uploadError;
        }

        // Obter URL pública
        const {
          data: { publicUrl },
        } = supabase.storage.from("documentos-ia").getPublicUrl(fileName);

        console.log("✅ Arquivo enviado com sucesso:", publicUrl);

        // Atualizar campos do relatório baseado no tipo de arquivo
        if (tipo_arquivo === "application/pdf") {
          updates.relatorio_pdf = publicUrl;
        } else if (
          tipo_arquivo === "application/msword" ||
          tipo_arquivo ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          updates.relatorio_doc = publicUrl;
        } else {
          updates.arquivo_resultado = publicUrl;
        }

        updates.status = "concluido";
      } catch (uploadError) {
        console.error("❌ Erro no upload do arquivo:", uploadError);
        updates.status = "erro";
        updates.resumo = {
          ...(updates.resumo || {}),
          error: "Erro no upload do arquivo processado",
        };
      }
    } else {
      // Lógica original para dados JSON
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

      // Tratar retorno de erro com campos pendentes (minuta de documento)
      if (status === "ERROR" || status === "error") {
        updates.status = "erro";
        
        // Salvar informações de erro e campos pendentes
        const errorData: any = {};
        
        if (mensagens_erro && Array.isArray(mensagens_erro) && mensagens_erro.length > 0) {
          errorData.mensagens_erro = mensagens_erro;
        }
        
        if (mensagens_alerta && Array.isArray(mensagens_alerta) && mensagens_alerta.length > 0) {
          errorData.mensagens_alerta = mensagens_alerta;
        }
        
        if (campos_pendentes && Array.isArray(campos_pendentes) && campos_pendentes.length > 0) {
          errorData.campos_pendentes = campos_pendentes;
          errorData.requer_preenchimento = true;
        }
        
        if (Object.keys(errorData).length > 0) {
          updates.resumo = {
            ...(updates.resumo || {}),
            ...errorData,
          };
        }
      }
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

    console.log("✅ Relatório atualizado com sucesso:", {
      relatorio_id,
      status: updates.status,
      timestamp: new Date().toISOString(),
      data,
    });

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
