"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useHistoricoProtocolos } from "@/hooks/use-historico-protocolos";
import { useAuth } from "@/contexts/auth-context";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface AddCommentFormProps {
  protocoloId: string;
  onCommentAdded?: () => void;
}

const AddCommentForm: React.FC<AddCommentFormProps> = ({
  protocoloId,
  onCommentAdded,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createHistorico } = useHistoricoProtocolos(protocoloId);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!comment.trim()) {
      toast.error("Por favor, digite um comentário");
      return;
    }

    try {
      setIsSubmitting(true);

      await createHistorico({
        protocolo_id: protocoloId,
        status_anterior: "Comentário",
        novo_status: "Comentário Adicionado",
        usuario_responsavel: user?.name || "Usuário",
        observacao: comment.trim(),
      });

      setComment("");
      toast.success("Comentário adicionado com sucesso!");
      onCommentAdded?.();
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
      toast.error("Erro ao adicionar comentário");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <MessageSquare className="h-4 w-4" />
        <span>Adicionar comentário ao histórico</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Textarea
            id="comment"
            placeholder="Digite seu comentário aqui..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px] resize-none"
            required
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !comment.trim()}
          >
            {isSubmitting ? "Adicionando..." : "Adicionar Comentário"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddCommentForm;
