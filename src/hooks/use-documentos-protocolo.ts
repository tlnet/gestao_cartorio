"use client";

import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

export interface DocumentoProtocolo {
  id: string;
  protocoloId: string;
  nomeArquivo: string;
  urlArquivo: string;
  tipoArquivo: string;
  tamanhoArquivo: number;
  dataUpload: Date;
  usuarioUpload?: string;
}

export function useDocumentosProtocolo() {
  const { user } = useAuth();

  const buscarDocumentosProtocolo = useCallback(
    async (protocoloId: string): Promise<DocumentoProtocolo[]> => {
      try {
        const { data, error } = await supabase
          .from("documentos_protocolos")
          .select("*")
          .eq("protocolo_id", protocoloId)
          .order("data_upload", { ascending: false });

        if (error) throw error;

        return (data || []).map((doc) => ({
          id: doc.id,
          protocoloId: doc.protocolo_id,
          nomeArquivo: doc.nome_arquivo,
          urlArquivo: doc.url_arquivo,
          tipoArquivo: doc.tipo_arquivo,
          tamanhoArquivo: doc.tamanho_arquivo,
          dataUpload: new Date(doc.data_upload),
          usuarioUpload: doc.usuario_upload,
        }));
      } catch (error) {
        console.error("Erro ao buscar documentos do protocolo:", error);
        return [];
      }
    },
    []
  );

  const adicionarDocumentoProtocolo = useCallback(
    async (
      protocoloId: string,
      documento: Omit<
        DocumentoProtocolo,
        "id" | "protocoloId" | "dataUpload"
      >,
      silent = false
    ): Promise<DocumentoProtocolo | null> => {
      try {
        const { data, error } = await supabase
          .from("documentos_protocolos")
          .insert({
            protocolo_id: protocoloId,
            nome_arquivo: documento.nomeArquivo,
            url_arquivo: documento.urlArquivo,
            tipo_arquivo: documento.tipoArquivo,
            tamanho_arquivo: documento.tamanhoArquivo,
            usuario_upload: user?.id,
          })
          .select()
          .single();

        if (error) throw error;

        return {
          id: data.id,
          protocoloId: data.protocolo_id,
          nomeArquivo: data.nome_arquivo,
          urlArquivo: data.url_arquivo,
          tipoArquivo: data.tipo_arquivo,
          tamanhoArquivo: data.tamanho_arquivo,
          dataUpload: new Date(data.data_upload),
          usuarioUpload: data.usuario_upload,
        };
      } catch (error) {
        console.error("Erro ao adicionar documento ao protocolo:", error);
        if (!silent) {
          toast.error("Erro ao salvar documento do protocolo");
        }
        return null;
      }
    },
    [user?.id]
  );

  const removerDocumentoProtocolo = useCallback(
    async (documentoId: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("documentos_protocolos")
          .delete()
          .eq("id", documentoId);

        if (error) throw error;
        return true;
      } catch (error) {
        console.error("Erro ao remover documento do protocolo:", error);
        toast.error("Erro ao remover documento");
        return false;
      }
    },
    []
  );

  return {
    buscarDocumentosProtocolo,
    adicionarDocumentoProtocolo,
    removerDocumentoProtocolo,
  };
}
