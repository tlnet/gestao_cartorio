"use client";

import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SimpleConfirmDialog } from "@/components/ui/simple-confirm-dialog";
import {
  Upload,
  File,
  X,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface DocumentoAnexo {
  id: string;
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
  dataUpload: Date;
}

interface DocumentUploadProps {
  contaId?: string;
  documentos: DocumentoAnexo[];
  onDocumentsChange: (documentos: DocumentoAnexo[]) => void;
  onRemoveDocument?: (documentoId: string) => Promise<boolean>;
  onDocumentosMarcadosChange?: (documentos: string[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export function DocumentUpload({
  contaId,
  documentos = [],
  onDocumentsChange,
  onRemoveDocument,
  onDocumentosMarcadosChange,
  disabled = false,
  maxFiles = 5,
  acceptedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [documentoParaRemover, setDocumentoParaRemover] =
    useState<DocumentoAnexo | null>(null);
  const [documentosMarcadosParaRemocao, setDocumentosMarcadosParaRemocao] =
    useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Log quando o componente é montado/desmontado
  useEffect(() => {
    console.log("🔍 DEBUG: DocumentUpload montado");

    return () => {
      console.log("🔍 DEBUG: DocumentUpload desmontado");
    };
  }, []);

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

  // Função para validar arquivo
  const validateFile = (file: File): string | null => {
    if (file.size > 10 * 1024 * 1024) {
      // 10MB
      return "Arquivo muito grande. Máximo 10MB.";
    }

    if (!acceptedTypes.includes(file.type)) {
      return "Tipo de arquivo não suportado.";
    }

    if (documentos.length >= maxFiles) {
      return `Máximo de ${maxFiles} arquivos permitidos.`;
    }

    return null;
  };

  // Função para fazer upload do arquivo
  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${fileExt}`;
    const filePath = `contas-pagar/${contaId || "temp"}/${fileName}`;

    console.log("🔍 DEBUG: uploadFile iniciado:", {
      fileName,
      filePath,
      fileSize: file.size,
      fileType: file.type,
    });

    const { data, error } = await supabase.storage
      .from("documentos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("❌ DEBUG: Erro no upload:", error);
      throw new Error(`Erro no upload: ${error.message}`);
    }

    console.log("✅ DEBUG: Upload bem-sucedido:", data);

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from("documentos")
      .getPublicUrl(filePath);

    console.log("🔍 DEBUG: URL pública gerada:", urlData.publicUrl);

    return urlData.publicUrl;
  };

  // Função para marcar documento para remoção
  const removeDocument = (documento: DocumentoAnexo) => {
    console.log("🔍 DEBUG: removeDocument chamada para:", documento.nome);

    try {
      setDocumentoParaRemover(documento);
      console.log("🔍 DEBUG: Documento definido para remoção");

      setShowConfirmDialog(true);
      console.log("🔍 DEBUG: Diálogo de confirmação aberto");
    } catch (error) {
      console.error("❌ DEBUG: Erro ao abrir diálogo de remoção:", error);
    }
  };

  // Função para confirmar remoção
  const confirmRemoveDocument = () => {
    console.log("🔍 DEBUG: confirmRemoveDocument chamada");

    if (!documentoParaRemover) {
      console.log("❌ DEBUG: documentoParaRemover é null");
      return;
    }

    console.log(
      "🔍 DEBUG: Processando remoção do documento:",
      documentoParaRemover.nome
    );

    try {
      // Marcar documento para remoção
      const novosMarcados = [
        ...documentosMarcadosParaRemocao,
        documentoParaRemover.id,
      ];
      setDocumentosMarcadosParaRemocao(novosMarcados);

      console.log("🔍 DEBUG: Documentos marcados atualizados:", novosMarcados);

      // Notificar componente pai
      onDocumentosMarcadosChange?.(novosMarcados);

      console.log("🔍 DEBUG: Componente pai notificado");

      // Remover da lista local (visualmente)
      const novosDocumentos = documentos.filter(
        (doc) => doc.id !== documentoParaRemover.id
      );

      console.log("🔍 DEBUG: Documentos filtrados:", {
        original: documentos.length,
        filtrado: novosDocumentos.length,
      });

      onDocumentsChange(novosDocumentos);

      console.log("🔍 DEBUG: Lista local atualizada");

      console.log("🔍 DEBUG: Documento marcado para remoção:", {
        documentoId: documentoParaRemover.id,
        totalMarcados: novosMarcados.length,
      });

      toast.success("Documento será removido ao salvar a conta");

      console.log("🔍 DEBUG: Fechando diálogo");
      setShowConfirmDialog(false);
      setDocumentoParaRemover(null);

      console.log("✅ DEBUG: Remoção confirmada com sucesso");
    } catch (error) {
      console.error("❌ DEBUG: Erro ao confirmar remoção:", error);
      toast.error("Erro ao marcar documento para remoção");
    }
  };

  // Função para cancelar remoção
  const cancelRemoveDocument = () => {
    setShowConfirmDialog(false);
    setDocumentoParaRemover(null);
  };

  // Função para executar remoção em lote (chamada pelo componente pai)
  const executeRemocaoEmLote = async () => {
    if (documentosMarcadosParaRemocao.length === 0) return;

    console.log("🔍 DEBUG: Executando remoção em lote:", {
      documentosParaRemover: documentosMarcadosParaRemocao.length,
      contaId: contaId,
    });

    try {
      // Remover do banco se há callback
      if (onRemoveDocument && contaId) {
        for (const documentoId of documentosMarcadosParaRemocao) {
          await onRemoveDocument(documentoId);
        }
      }

      // Remover do storage
      for (const documento of documentos.filter((doc) =>
        documentosMarcadosParaRemocao.includes(doc.id)
      )) {
        const url = new URL(documento.url);
        const pathParts = url.pathname.split("/");
        const filePath = pathParts.slice(-3).join("/");

        await supabase.storage.from("documentos").remove([filePath]);
      }

      console.log("✅ DEBUG: Remoção em lote concluída");
      setDocumentosMarcadosParaRemocao([]);
    } catch (error) {
      console.error("❌ Erro na remoção em lote:", error);
      throw error;
    }
  };

  // Função para baixar documento
  const downloadDocument = async (documento: DocumentoAnexo) => {
    try {
      const response = await fetch(documento.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documento.nome;
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
  const getDocumentUrl = async (documento: DocumentoAnexo): Promise<string> => {
    try {
      // Primeiro, tentar a URL pública
      const response = await fetch(documento.url, { method: "HEAD" });
      if (response.ok) {
        console.log("✅ DEBUG: URL pública funcionando");
        return documento.url;
      }

      console.log("⚠️ DEBUG: URL pública não acessível, tentando URL assinada");

      // Se a URL pública não funcionar, gerar URL assinada
      const url = new URL(documento.url);
      const pathParts = url.pathname.split("/");
      const filePath = pathParts.slice(-3).join("/"); // Pega os últimos 3 segmentos do path

      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(filePath, 3600); // URL válida por 1 hora

      if (error) {
        console.error("❌ DEBUG: Erro ao gerar URL assinada:", error);
        throw error;
      }

      console.log("✅ DEBUG: URL assinada gerada:", data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      console.error("❌ DEBUG: Erro ao obter URL do documento:", error);
      throw error;
    }
  };

  // Função para visualizar documento
  const viewDocument = async (documento: DocumentoAnexo) => {
    console.log("🔍 DEBUG: viewDocument chamada com:", {
      nome: documento.nome,
      url: documento.url,
      tipo: documento.tipo,
    });

    try {
      // Verificar se a URL é válida
      if (!documento.url || documento.url.trim() === "") {
        console.error("❌ DEBUG: URL do documento está vazia");
        toast.error("URL do documento não encontrada");
        return;
      }

      // Obter URL válida (pública ou assinada)
      const validUrl = await getDocumentUrl(documento);

      console.log("🔍 DEBUG: Abrindo documento em nova aba:", validUrl);
      window.open(validUrl, "_blank");
    } catch (error) {
      console.error("❌ DEBUG: Erro ao abrir documento:", error);
      toast.error("Erro ao abrir documento");
    }
  };

  // Função para processar arquivos
  const processFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validar arquivos
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const novosDocumentos: DocumentoAnexo[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress((i / validFiles.length) * 100);

        try {
          const url = await uploadFile(file);
          const novoDocumento: DocumentoAnexo = {
            id: `${Date.now()}-${i}`,
            nome: file.name,
            url: url,
            tipo: file.type,
            tamanho: file.size,
            dataUpload: new Date(),
          };
          novosDocumentos.push(novoDocumento);
        } catch (error) {
          console.error(`Erro ao fazer upload de ${file.name}:`, error);
          toast.error(`Erro ao fazer upload de ${file.name}`);
        }
      }

      // Adicionar novos documentos à lista
      const todosDocumentos = [...documentos, ...novosDocumentos];
      onDocumentsChange(todosDocumentos);

      toast.success(
        `${novosDocumentos.length} documento(s) enviado(s) com sucesso!`
      );
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao fazer upload dos documentos");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handlers de drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Enviando documentos...
                </p>
                <Progress value={uploadProgress} className="w-full max-w-xs" />
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {dragActive
                      ? "Solte os arquivos aqui"
                      : "Clique para selecionar ou arraste arquivos"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX, JPG, PNG (máx. 10MB cada)
                  </p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Lista de Documentos */}
      {documentos.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Documentos Anexados ({documentos.length})
          </h4>
          <div className="space-y-2">
            {documentos.map((documento) => (
              <Card key={documento.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <span className="text-lg">
                      {getFileIcon(documento.tipo)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {documento.nome}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(documento.tamanho)}</span>
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
                          "🔍 DEBUG: Botão de visualizar clicado para:",
                          documento.nome
                        );
                        viewDocument(documento);
                      }}
                      disabled={disabled}
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
                          "🔍 DEBUG: Botão de download clicado para:",
                          documento.nome
                        );
                        downloadDocument(documento);
                      }}
                      disabled={disabled}
                      title="Baixar documento"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(
                          "🔍 DEBUG: Botão de remoção clicado para:",
                          documento.nome
                        );
                        removeDocument(documento);
                      }}
                      disabled={disabled}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Informações sobre limites */}
      <div className="text-xs text-muted-foreground">
        <p>• Máximo {maxFiles} arquivos por conta</p>
        <p>• Tamanho máximo: 10MB por arquivo</p>
        <p>• Formatos aceitos: PDF, DOC, DOCX, JPG, PNG</p>
      </div>

      {/* Diálogo de Confirmação */}
      <SimpleConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Confirmar Remoção"
        description={`Tem certeza que deseja remover o documento "${documentoParaRemover?.nome}"? Esta ação será executada ao salvar a conta.`}
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={confirmRemoveDocument}
        onCancel={cancelRemoveDocument}
        variant="destructive"
      />
    </div>
  );
}
