"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineTitle,
  TimelineIcon,
  TimelineDescription,
  TimelineContent,
} from "@/components/ui/timeline";
import {
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Edit,
  Download,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useHistoricoProtocolos } from "@/hooks/use-historico-protocolos";
import AddCommentForm from "./add-comment-form";
import HistoricoFallback from "./historico-fallback";
import { formatDateForDisplay } from "@/lib/utils";
import { toast } from "sonner";

interface ProtocoloDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (protocolo: any) => void;
  protocolo: {
    id: string;
    demanda: string;
    protocolo: string;
    dataAbertura: string;
    servicos: string[];
    solicitante: string;
    cpfCnpj: string;
    telefone: string;
    apresentante?: string;
    email?: string;
    status: string;
    prazoExecucao: string;
    observacao?: string;
  };
  showEditButton?: boolean;
}

const ProtocoloDetails: React.FC<ProtocoloDetailsProps> = ({
  isOpen,
  onClose,
  onEdit,
  protocolo,
  showEditButton = true,
}) => {
  const {
    historico,
    loading: historicoLoading,
    error: historicoError,
    fetchHistorico,
  } = useHistoricoProtocolos(protocolo.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído":
        return "bg-green-100 text-green-800";
      case "Em Andamento":
        return "bg-blue-100 text-blue-800";
      case "Aguardando Análise":
        return "bg-yellow-100 text-yellow-800";
      case "Pendente":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Concluído":
        return "✅";
      case "Em Andamento":
        return "🔄";
      case "Aguardando Análise":
        return "⏳";
      case "Pendente":
        return "⚠️";
      default:
        return "📋";
    }
  };

  // Função para remover acentos e caracteres especiais
  const removerAcentos = (str: string) => {
    if (!str || typeof str !== "string") {
      return "";
    }
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim();
  };

  // Função para quebrar texto em múltiplas linhas
  const quebrarTexto = (
    doc: any,
    texto: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number = 5
  ) => {
    const palavras = texto.split(" ");
    let linha = "";
    let yAtual = y;

    for (let i = 0; i < palavras.length; i++) {
      const palavra = palavras[i];
      const testeLinha = linha + (linha ? " " : "") + palavra;
      const larguraTexto = doc.getTextWidth(testeLinha);

      if (larguraTexto > maxWidth && linha) {
        doc.text(linha, x, yAtual);
        linha = palavra;
        yAtual += lineHeight;
      } else {
        linha = testeLinha;
      }
    }

    if (linha) {
      doc.text(linha, x, yAtual);
    }

    return yAtual + lineHeight;
  };

  // Função para verificar espaço na página
  const verificarEspacoPagina = (doc: any, alturaNecessaria: number) => {
    const pageHeight = doc.internal.pageSize.height;
    const margemInferior = 30;
    const yAtual =
      doc.internal.getCurrentPageInfo().pageNumber === 1
        ? doc.lastAutoTable?.finalY || 0
        : 0;

    return yAtual + alturaNecessaria < pageHeight - margemInferior;
  };

  // Função para adicionar nova página se necessário
  const adicionarNovaPaginaSeNecessario = (
    doc: any,
    alturaNecessaria: number
  ) => {
    if (!verificarEspacoPagina(doc, alturaNecessaria)) {
      doc.addPage();

      // Adicionar cabeçalho na nova página
      const darkColor = [33, 37, 41];
      const primaryColor = [59, 130, 246];

      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("IA CARTORIOS", 20, 15);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema de Gestao de Protocolos", 20, 20);

      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(8);
      doc.text(
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
        doc.internal.pageSize.width - 60,
        20
      );

      // Linha separadora
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 30, doc.internal.pageSize.width - 20, 30);

      return 40; // Y inicial da nova página
    }
    return doc.internal.getCurrentPageInfo().pageNumber === 1
      ? (doc.lastAutoTable?.finalY || 0) + 10
      : 20;
  };

  const exportarPDF = async () => {
    try {
      // Importar dinamicamente para evitar problemas de SSR
      const { jsPDF } = await import("jspdf");
      const autoTable = await import("jspdf-autotable");

      const doc = new jsPDF();

      // Cores do tema
      const darkColor = [33, 37, 41];
      const lightGray = [248, 249, 250];
      const mediumGray = [108, 117, 125];
      const primaryColor = [59, 130, 246];

      // Cabeçalho
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.rect(0, 0, doc.internal.pageSize.width, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("IA CARTORIOS", 20, 15);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Sistema de Gestao de Protocolos", 20, 20);

      doc.setFontSize(8);
      doc.text(
        `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
        doc.internal.pageSize.width - 60,
        20
      );

      // Linha separadora
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(20, 30, doc.internal.pageSize.width - 20, 30);

      let yPosition = 45;

      // Título do protocolo
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(
        `PROTOCOLO ${removerAcentos(protocolo.protocolo)}`,
        20,
        yPosition
      );

      yPosition += 10;

      // Status do protocolo
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
      doc.text(`Status: ${removerAcentos(protocolo.status)}`, 20, yPosition);

      yPosition += 15;

      // Informações do Protocolo
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("INFORMACOES DO PROTOCOLO", 20, yPosition);

      yPosition += 10;

      // Demanda
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text("Demanda:", 20, yPosition);
      yPosition = quebrarTexto(
        doc,
        removerAcentos(protocolo.demanda),
        50,
        yPosition,
        140,
        5
      );

      yPosition += 5;

      // Serviços
      doc.text("Servicos:", 20, yPosition);
      const servicosTexto = Array.isArray(protocolo.servicos)
        ? protocolo.servicos.map((s) => removerAcentos(s)).join(", ")
        : removerAcentos(protocolo.servicos || "");
      yPosition = quebrarTexto(doc, servicosTexto, 50, yPosition, 140, 5);

      yPosition += 5;

      // Data de abertura
      doc.text("Data de Abertura:", 20, yPosition);
      doc.text(formatDateForDisplay(protocolo.dataAbertura), 50, yPosition);
      yPosition += 8;

      // Prazo de execução
      doc.text("Prazo de Execucao:", 20, yPosition);
      doc.text(formatDateForDisplay(protocolo.prazoExecucao), 50, yPosition);
      yPosition += 8;

      // Observações
      if (protocolo.observacao) {
        doc.text("Observacoes:", 20, yPosition);
        yPosition = quebrarTexto(
          doc,
          removerAcentos(protocolo.observacao),
          50,
          yPosition,
          140,
          5
        );
        yPosition += 5;
      }

      yPosition += 10;

      // Dados do Solicitante
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("DADOS DO SOLICITANTE", 20, yPosition);

      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Nome
      doc.text("Nome:", 20, yPosition);
      doc.text(removerAcentos(protocolo.solicitante), 50, yPosition);
      yPosition += 8;

      // CPF/CNPJ
      doc.text("CPF/CNPJ:", 20, yPosition);
      doc.text(removerAcentos(protocolo.cpfCnpj), 50, yPosition);
      yPosition += 8;

      // Telefone
      doc.text("Telefone:", 20, yPosition);
      doc.text(removerAcentos(protocolo.telefone), 50, yPosition);
      yPosition += 8;

      // Email
      if (protocolo.email) {
        doc.text("E-mail:", 20, yPosition);
        doc.text(removerAcentos(protocolo.email), 50, yPosition);
        yPosition += 8;
      }

      // Apresentante
      if (protocolo.apresentante) {
        doc.text("Apresentante:", 20, yPosition);
        doc.text(removerAcentos(protocolo.apresentante), 50, yPosition);
        yPosition += 8;
      }

      yPosition += 10;

      // Histórico de Alterações
      if (historico && historico.length > 0) {
        // Verificar espaço para histórico
        const alturaHistorico = 50 + historico.length * 40;
        yPosition = adicionarNovaPaginaSeNecessario(doc, alturaHistorico);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text("HISTORICO DE ALTERACOES", 20, yPosition);

        yPosition += 15;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        historico.forEach((item, index) => {
          // Verificar espaço para cada item do histórico
          yPosition = adicionarNovaPaginaSeNecessario(doc, 40);

          const dataFormatada = format(
            new Date(item.created_at),
            "dd/MM/yyyy HH:mm",
            { locale: ptBR }
          );

          // Data e usuário responsável
          doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
          doc.setFont("helvetica", "bold");
          doc.text(
            `${dataFormatada} - ${removerAcentos(item.usuario_responsavel)}`,
            20,
            yPosition
          );

          yPosition += 10;

          // Status
          doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
          doc.setFont("helvetica", "normal");
          if (item.status_anterior) {
            doc.text(
              `Status: ${removerAcentos(
                item.status_anterior
              )} → ${removerAcentos(item.novo_status)}`,
              30,
              yPosition
            );
          } else {
            doc.text(
              `Status: ${removerAcentos(item.novo_status)}`,
              30,
              yPosition
            );
          }

          yPosition += 10;

          // Observação
          if (item.observacao) {
            doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
            doc.text("Observacao:", 30, yPosition);
            yPosition += 8;

            // Quebrar texto da observação manualmente
            const observacaoTexto = removerAcentos(item.observacao);
            const palavras = observacaoTexto.split(" ");
            let linha = "";
            let yAtual = yPosition;

            for (let i = 0; i < palavras.length; i++) {
              const palavra = palavras[i];
              const testeLinha = linha + (linha ? " " : "") + palavra;
              const larguraTexto = doc.getTextWidth(testeLinha);

              if (larguraTexto > 150 && linha) {
                doc.text(linha, 40, yAtual);
                linha = palavra;
                yAtual += 6;
              } else {
                linha = testeLinha;
              }
            }

            if (linha) {
              doc.text(linha, 40, yAtual);
              yAtual += 6;
            }

            yPosition = yAtual + 5;
          } else {
            yPosition += 10;
          }

          // Linha separadora entre itens
          if (index < historico.length - 1) {
            yPosition += 5;
            doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
            doc.setLineWidth(0.3);
            doc.line(
              20,
              yPosition,
              doc.internal.pageSize.width - 20,
              yPosition
            );
            yPosition += 10;
          }
        });
      }

      // Rodapé
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setFontSize(8);
        doc.setTextColor(mediumGray[0], mediumGray[1], mediumGray[2]);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width - 30,
          doc.internal.pageSize.height - 10
        );
      }

      // Salvar o PDF
      const nomeArquivo = `protocolo_${removerAcentos(protocolo.protocolo)}_${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(nomeArquivo);

      toast.success("Protocolo exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar protocolo:", error);
      toast.error("Erro ao exportar protocolo em PDF");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Protocolo #{protocolo.protocolo}</span>
            <Badge className={getStatusColor(protocolo.status)}>
              {protocolo.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Detalhes completos do protocolo e histórico de alterações
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações Principais */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informações do Protocolo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Demanda
                  </label>
                  <p className="text-sm">{protocolo.demanda}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Serviços
                  </label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {protocolo.servicos.map((servico, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {servico}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Data Abertura
                    </label>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDateForDisplay(protocolo.dataAbertura)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Prazo Execução
                    </label>
                    <p className="text-sm flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDateForDisplay(protocolo.prazoExecucao)}
                    </p>
                  </div>
                </div>

                {protocolo.observacao && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Observações
                    </label>
                    <p className="text-sm bg-gray-50 p-2 rounded">
                      {protocolo.observacao}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Solicitante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Nome
                  </label>
                  <p className="text-sm">{protocolo.solicitante}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    CPF/CNPJ
                  </label>
                  <p className="text-sm">{protocolo.cpfCnpj}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Telefone
                  </label>
                  <p className="text-sm flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {protocolo.telefone}
                  </p>
                </div>

                {protocolo.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      E-mail
                    </label>
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {protocolo.email}
                    </p>
                  </div>
                )}

                {protocolo.apresentante && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Apresentante
                    </label>
                    <p className="text-sm">{protocolo.apresentante}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Histórico */}
          <div className="space-y-6">
            {historicoError ? (
              <HistoricoFallback
                protocoloId={protocolo.id}
                onRetry={fetchHistorico}
                errorType={
                  historicoError.includes?.(
                    "invalid input syntax for type uuid"
                  ) || historicoError.includes?.("usuario_responsavel")
                    ? "data_type_error"
                    : "unknown"
                }
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Histórico de Alterações
                  </CardTitle>
                  <CardDescription>
                    Linha do tempo com todas as mudanças e comentários
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historicoLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">
                        Carregando histórico...
                      </p>
                    </div>
                  ) : historico.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Nenhum histórico disponível
                      </h3>
                      <p className="text-gray-500">
                        O histórico de alterações aparecerá aqui conforme o
                        protocolo for sendo atualizado.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {historico.map((item, index) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                              {getStatusIcon(item.novo_status)}
                            </div>
                            {index < historico.length - 1 && (
                              <div className="w-px h-12 bg-gray-200 mt-2" />
                            )}
                          </div>

                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">
                                {item.status_anterior
                                  ? `${item.status_anterior} → ${item.novo_status}`
                                  : item.novo_status}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {format(
                                  new Date(item.created_at),
                                  "dd/MM/yyyy HH:mm",
                                  { locale: ptBR }
                                )}
                              </span>
                            </div>

                            <p className="text-xs text-gray-600 mt-1">
                              Por: {item.usuario_responsavel}
                            </p>

                            {item.observacao && (
                              <p className="text-xs text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                                {item.observacao}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input de Comentário - Estilo Chat */}
                  <div className="border-t pt-4 mt-4">
                    <AddCommentForm
                      protocoloId={protocolo.id}
                      onCommentAdded={fetchHistorico}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-between pt-6 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportarPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </div>

          <div className="flex gap-2">
            {showEditButton && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(protocolo);
                  onClose();
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProtocoloDetails;
