"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingAnimation } from "@/components/ui/loading-spinner";
import { FileText, Download, Eye, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  useDocumentosProtocolo,
  type DocumentoProtocolo,
} from "@/hooks/use-documentos-protocolo";

interface ProtocoloDocumentosDialogProps {
  protocoloId: string;
  numeroProtocolo?: string;
}

export function ProtocoloDocumentosDialog({
  protocoloId,
  numeroProtocolo,
}: ProtocoloDocumentosDialogProps) {
  const [open, setOpen] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoProtocolo[]>([]);
  const [loading, setLoading] = useState(false);
  const { buscarDocumentosProtocolo } = useDocumentosProtocolo();

  useEffect(() => {
    if (open && protocoloId) {
      carregarDocumentos();
    }
  }, [open, protocoloId]);

  const carregarDocumentos = async () => {
    setLoading(true);
    try {
      const docs = await buscarDocumentosProtocolo(protocoloId);
      setDocumentos(docs);
    } catch (error) {
      console.error("Erro ao carregar documentos do protocolo:", error);
      toast.error("Erro ao carregar documentos");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (tipo: string) => {
    if (tipo.includes("pdf")) return "📄";
    if (tipo.includes("image")) return "🖼️";
    if (tipo.includes("word")) return "📝";
    return "📎";
  };

  const getDocumentUrl = async (documento: DocumentoProtocolo): Promise<string> => {
    try {
      const response = await fetch(documento.urlArquivo, { method: "HEAD" });
      if (response.ok) return documento.urlArquivo;

      const url = new URL(documento.urlArquivo);
      const pathParts = url.pathname.split("/");
      const filePath = pathParts.slice(-3).join("/");

      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Erro ao obter URL do documento:", error);
      throw error;
    }
  };

  const downloadDocument = async (documento: DocumentoProtocolo) => {
    try {
      const validUrl = await getDocumentUrl(documento);
      const response = await fetch(validUrl);
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

  const viewDocument = async (documento: DocumentoProtocolo) => {
    try {
      if (!documento.urlArquivo?.trim()) {
        toast.error("URL do documento não encontrada");
        return;
      }
      const validUrl = await getDocumentUrl(documento);
      window.open(validUrl, "_blank");
    } catch (error) {
      console.error("Erro ao abrir documento:", error);
      toast.error("Erro ao abrir documento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Paperclip className="h-4 w-4 mr-2" />
          Documentos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos do protocolo
          </DialogTitle>
          <DialogDescription>
            {numeroProtocolo
              ? `Protocolo ${numeroProtocolo}`
              : "Arquivos vinculados a este protocolo"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingAnimation size="md" variant="dots" />
          </div>
        ) : documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum documento vinculado a este protocolo.
          </p>
        ) : (
          <div className="space-y-2">
            {documentos.map((documento) => (
              <Card key={documento.id} className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg shrink-0">
                      {getFileIcon(documento.tipoArquivo)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {documento.nomeArquivo}
                      </p>
                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(documento.tamanhoArquivo)}</span>
                        <span>•</span>
                        <span>
                          {documento.dataUpload.toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewDocument(documento)}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadDocument(documento)}
                      title="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
