"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CamposPendentesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camposPendentes: string[];
  mensagensErro?: string[];
  mensagensAlerta?: string[];
  relatorioId: string;
  onCamposPreenchidos: (dados: Record<string, string>) => void;
}

// Mapeamento de campos para labels mais amigáveis
const campoLabels: Record<string, string> = {
  DATA_CASAMENTO: "Data do Casamento",
  MATRICULA_CERTIDAO_CASAMENTO: "Matrícula da Certidão de Casamento",
  CIDADE_CARTORIO_CASAMENTO: "Cidade do Cartório de Casamento",
  DATA_EMISSAO_CERTIDAO_CASAMENTO: "Data de Emissão da Certidão de Casamento",
  NOME_VENDEDOR_2_SOLTEIRA: "Nome do Vendedor 2 (Solteira)",
  DATA_CONTRATO_PARTICULAR: "Data do Contrato Particular",
};

// Função para obter o label do campo
const getCampoLabel = (campo: string): string => {
  return campoLabels[campo] || campo.replace(/_/g, " ");
};

// Função para determinar o tipo de input baseado no nome do campo
const getInputType = (campo: string): string => {
  if (campo.includes("DATA") || campo.includes("DATA_")) {
    return "date";
  }
  if (campo.includes("EMAIL")) {
    return "email";
  }
  if (campo.includes("TELEFONE") || campo.includes("PHONE")) {
    return "tel";
  }
  return "text";
};

export const CamposPendentesDialog: React.FC<CamposPendentesDialogProps> = ({
  open,
  onOpenChange,
  camposPendentes,
  mensagensErro = [],
  mensagensAlerta = [],
  relatorioId,
  onCamposPreenchidos,
}) => {
  const [dados, setDados] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Inicializar dados vazios quando o dialog abrir
  useEffect(() => {
    if (open && camposPendentes.length > 0) {
      const initialData: Record<string, string> = {};
      camposPendentes.forEach((campo) => {
        initialData[campo] = "";
      });
      setDados(initialData);
    }
  }, [open, camposPendentes]);

  const handleInputChange = (campo: string, value: string) => {
    setDados((prev) => ({
      ...prev,
      [campo]: value,
    }));
  };

  const handleSubmit = async () => {
    // Validar se todos os campos foram preenchidos
    const camposVazios = camposPendentes.filter(
      (campo) => !dados[campo] || dados[campo].trim() === ""
    );

    if (camposVazios.length > 0) {
      toast.error(
        `Por favor, preencha todos os campos. Faltam: ${camposVazios
          .map(getCampoLabel)
          .join(", ")}`
      );
      return;
    }

    setLoading(true);

    try {
      // Chamar callback com os dados preenchidos
      onCamposPreenchidos(dados);
      
      toast.success("Campos preenchidos com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao enviar campos preenchidos:", error);
      toast.error("Erro ao enviar os dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Informações Faltantes
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para completar a geração da minuta de documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mensagens de Erro */}
          {mensagensErro.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erros Encontrados</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {mensagensErro.map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Mensagens de Alerta */}
          {mensagensAlerta.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Avisos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {mensagensAlerta.map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Campos Pendentes */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">
              Campos Obrigatórios ({camposPendentes.length})
            </h3>
            {camposPendentes.map((campo) => (
              <div key={campo} className="space-y-2">
                <Label htmlFor={campo}>{getCampoLabel(campo)}</Label>
                <Input
                  id={campo}
                  type={getInputType(campo)}
                  value={dados[campo] || ""}
                  onChange={(e) => handleInputChange(campo, e.target.value)}
                  placeholder={`Digite ${getCampoLabel(campo).toLowerCase()}`}
                  required
                />
              </div>
            ))}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Enviar Dados
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
