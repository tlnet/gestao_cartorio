"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingAnimation } from "@/components/ui/loading-spinner";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { File, Download, Eye, X, Paperclip, Loader2 } from "lucide-react";
import { useContasPagar, DocumentoConta } from "@/hooks/use-contas-pagar";
import { toast } from "sonner";

interface DocumentosBadgeProps {
  contaId: string;
  onDocumentosChange?: (documentos: DocumentoConta[]) => void;
  refreshTrigger?: number; // Para forçar refresh quando mudar
}

export function DocumentosBadge({
  contaId,
  onDocumentosChange,
  refreshTrigger,
}: DocumentosBadgeProps) {
  const [documentos, setDocumentos] = useState<DocumentoConta[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const { buscarDocumentosConta, removerDocumentoConta } = useContasPagar();

  // Carregar documentos quando o componente monta ou contaId muda
  useEffect(() => {
    if (contaId) {
      carregarDocumentos();
    }
  }, [contaId]);

  // Refresh quando refreshTrigger mudar
  useEffect(() => {
    if (contaId && refreshTrigger !== undefined) {
      console.log(
        "🔍 DEBUG: DocumentosBadge - refreshTrigger mudou:",
        refreshTrigger
      );
      carregarDocumentos();
    }
  }, [refreshTrigger, contaId]);

  const carregarDocumentos = async () => {
    setLoading(true);
    try {
      const docs = await buscarDocumentosConta(contaId);
      setDocumentos(docs);
      onDocumentosChange?.(docs);
    } catch (error) {
      console.error("Erro ao carregar documentos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Função para obter ícone do tipo de arquivo
  const getFileIcon = (tipo: string) => {
    if (tipo.includes("pdf")) return "📄";
    if (tipo.includes("image")) return "🖼️";
    if (tipo.includes("word")) return "📝";
    return "📎";
  };

  // Função para baixar documento
  const downloadDocument = async (documento: DocumentoConta) => {
    try {
      const response = await fetch(documento.urlArquivo);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documento.nomeArquivo;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
      toast.error("Erro ao baixar documento");
    }
  };

  // Função para gerar URL assinada se necessário
  const getDocumentUrl = async (documento: DocumentoConta): Promise<string> => {
    try {
      // Primeiro, tentar a URL pública
      const response = await fetch(documento.urlArquivo, { method: "HEAD" });
      if (response.ok) {
        console.log("✅ DEBUG: DocumentosBadge - URL pública funcionando");
        return documento.urlArquivo;
      }

      console.log(
        "⚠️ DEBUG: DocumentosBadge - URL pública não acessível, tentando URL assinada"
      );

      // Se a URL pública não funcionar, gerar URL assinada
      const url = new URL(documento.urlArquivo);
      const pathParts = url.pathname.split("/");
      const filePath = pathParts.slice(-3).join("/"); // Pega os últimos 3 segmentos do path

      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(filePath, 3600); // URL válida por 1 hora

      if (error) {
        console.error(
          "❌ DEBUG: DocumentosBadge - Erro ao gerar URL assinada:",
          error
        );
        throw error;
      }

      console.log(
        "✅ DEBUG: DocumentosBadge - URL assinada gerada:",
        data.signedUrl
      );
      return data.signedUrl;
    } catch (error) {
      console.error(
        "❌ DEBUG: DocumentosBadge - Erro ao obter URL do documento:",
        error
      );
      throw error;
    }
  };

  // Função para visualizar documento
  const viewDocument = async (documento: DocumentoConta) => {
    console.log("🔍 DEBUG: DocumentosBadge - viewDocument chamada com:", {
      nome: documento.nomeArquivo,
      url: documento.urlArquivo,
      tipo: documento.tipoArquivo,
    });

    try {
      // Verificar se a URL é válida
      if (!documento.urlArquivo || documento.urlArquivo.trim() === "") {
        console.error("❌ DEBUG: URL do documento está vazia");
        toast.error("URL do documento não encontrada");
        return;
      }

      // Obter URL válida (pública ou assinada)
      const validUrl = await getDocumentUrl(documento);

      console.log(
        "🔍 DEBUG: DocumentosBadge - Abrindo documento em nova aba:",
        validUrl
      );
      window.open(validUrl, "_blank");
    } catch (error) {
      console.error(
        "❌ DEBUG: DocumentosBadge - Erro ao abrir documento:",
        error
      );
      toast.error("Erro ao abrir documento");
    }
  };

  // Função para remover documento
  const removeDocument = async (documento: DocumentoConta) => {
    try {
      const success = await removerDocumentoConta(documento.id);
      if (success) {
        // Atualizar lista local
        const novosDocumentos = documentos.filter(
          (doc) => doc.id !== documento.id
        );
        setDocumentos(novosDocumentos);
        onDocumentosChange?.(novosDocumentos);
      }
    } catch (error) {
      console.error("Erro ao remover documento:", error);
    }
  };

  if (loading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <LoadingAnimation size="sm" variant="dots" />
      </Badge>
    );
  }

  if (documentos.length === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Nenhum documento
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 px-2">
          <Paperclip className="h-3 w-3 mr-1" />
          {documentos.length} doc{documentos.length > 1 ? "s" : ""}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Documentos Anexados ({documentos.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {documentos.map((documento) => (
            <Card key={documento.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-lg">
                    {getFileIcon(documento.tipoArquivo)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {documento.nomeArquivo}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(documento.tamanhoArquivo)}</span>
                      <span>•</span>
                      <span>{documento.dataUpload.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(
                        "🔍 DEBUG: DocumentosBadge - Botão de visualizar clicado para:",
                        documento.nomeArquivo
                      );
                      viewDocument(documento);
                    }}
                    title="Visualizar documento"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(
                        "🔍 DEBUG: DocumentosBadge - Botão de download clicado para:",
                        documento.nomeArquivo
                      );
                      downloadDocument(documento);
                    }}
                    title="Baixar documento"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(documento)}
                    title="Remover"
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
