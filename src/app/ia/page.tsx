"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import MinutaDocumentoForm from "@/components/ia/minuta-documento-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Brain,
  FileText,
  Package,
  Upload,
  Download,
  Eye,
  Clock,
  CheckCircle,
  Webhook,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRelatoriosIA, RelatorioIA } from "@/hooks/use-relatorios-ia";
import { useN8NConfig } from "@/hooks/use-n8n-config";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";

const AnaliseIA = () => {
  const { user } = useAuth();
  const {
    relatorios,
    loading,
    createRelatorio,
    updateRelatorio,
    uploadFile,
    callN8NWebhook,
    processarResumoMatricula,
    processarAnaliseMalote,
    processarMinutaDocumento,
    fetchRelatorios,
    limparRelatoriosProcessando,
  } = useRelatoriosIA();

  const { config: n8nConfig, getWebhookUrl } = useN8NConfig();

  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{
    [key: string]: File | null;
  }>({});
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(
    new Set()
  );
  const [openDialogs, setOpenDialogs] = useState<Set<string>>(new Set());
  const [metricas, setMetricas] = useState({
    analisesHoje: 0,
    tempoMedio: "0min",
    taxaSucesso: "0%",
    webhooksAtivos: 1,
  });

  const tiposAnaliseSimples = [
    {
      id: "resumo_matricula",
      titulo: "Resumir Matrícula",
      descricao: "Extrai informações principais de matrículas imobiliárias",
      icon: FileText,
      color: "bg-blue-500",
    },
    {
      id: "analise_malote",
      titulo: "Analisar Malote",
      descricao: "Processa e organiza documentos em lote",
      icon: Package,
      color: "bg-green-500",
    },
  ];

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "resumo_matricula":
        return "Resumo de Matrícula";
      case "analise_malote":
        return "Análise de Malote";
      case "minuta_documento":
        return "Minuta de Documento";
      default:
        return tipo;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluido":
        return "bg-green-100 text-green-800";
      case "processando":
        return "bg-yellow-100 text-yellow-800";
      case "erro":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluido":
        return <CheckCircle className="h-4 w-4" />;
      case "processando":
        return <Clock className="h-4 w-4" />;
      case "erro":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  // Função para obter URL do arquivo original
  const getArquivoOriginalUrl = (relatorio: any) => {
    // Tentar obter URL do arquivo original dos dados de processamento
    const dadosProcessamento = relatorio.dados_processamento;

    if (dadosProcessamento) {
      // Se há dados de processamento, tentar obter a URL do arquivo original
      if (
        dadosProcessamento.arquivos_urls &&
        dadosProcessamento.arquivos_urls.length > 0
      ) {
        return dadosProcessamento.arquivos_urls[0];
      }
    }

    // Se não encontrou nos dados de processamento, tentar arquivo_resultado
    if (relatorio.arquivo_resultado) {
      return relatorio.arquivo_resultado;
    }

    return null;
  };

  // Função para fazer download direto
  const downloadFile = async (url: string, filename: string) => {
    try {
      // Buscar o arquivo
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Erro ao baixar arquivo");
      }

      // Criar blob
      const blob = await response.blob();

      // Criar URL temporária
      const blobUrl = window.URL.createObjectURL(blob);

      // Criar link de download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;

      // Adicionar ao DOM temporariamente e clicar
      document.body.appendChild(link);
      link.click();

      // Limpar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success("Download iniciado!");
    } catch (error) {
      console.error("Erro no download:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  // Calcular métricas baseadas nos dados reais
  useEffect(() => {
    const hoje = new Date().toDateString();
    const relatoriosHoje = relatorios.filter(
      (r) => new Date(r.created_at).toDateString() === hoje
    );

    const concluidos = relatorios.filter((r) => r.status === "concluido");
    const taxaSucesso =
      relatorios.length > 0
        ? ((concluidos.length / relatorios.length) * 100).toFixed(1)
        : "0";

    setMetricas({
      analisesHoje: relatoriosHoje.length,
      tempoMedio: "2.5min", // TODO: Calcular baseado em dados reais
      taxaSucesso: `${taxaSucesso}%`,
      webhooksAtivos: n8nConfig ? 1 : 0, // Usar configuração real do N8N
    });
  }, [relatorios, n8nConfig]);

  // Polling otimizado para atualizar status em tempo real
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const startPolling = () => {
      intervalId = setInterval(() => {
        // Verificar se há relatórios processando
        const hasProcessing = relatorios.some(
          (r) => r.status === "processando"
        );
        if (hasProcessing) {
          // Atualização silenciosa - sem logs visíveis para o usuário
          fetchRelatorios();
        } else {
          // Se não há processando, parar o polling
          clearInterval(intervalId);
        }
      }, 30000); // Verificar a cada 30 segundos (tempo médio da automação é 2min)
    };

    // Só iniciar polling se há relatórios processando
    const hasProcessing = relatorios.some((r) => r.status === "processando");
    if (hasProcessing) {
      startPolling();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [relatorios, fetchRelatorios]);

  const handleFileSelect = (tipoAnalise: string, file: File) => {
    setSelectedFiles((prev) => ({
      ...prev,
      [tipoAnalise]: file,
    }));
    toast.success(
      `Arquivo ${file.name} selecionado. Clique em "Iniciar Análise" para processar.`
    );
  };

  const handleStartAnalysis = async (tipoAnalise: string) => {
    const file = selectedFiles[tipoAnalise];
    if (!file) {
      toast.error("Nenhum arquivo selecionado");
      return;
    }

    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    // Proteção contra múltiplas execuções
    if (processingFiles.has(tipoAnalise)) {
      toast.error("Análise já está sendo processada. Aguarde...");
      return;
    }

    setProcessingFiles((prev) => new Set(prev).add(tipoAnalise));
    setUploadingFile(tipoAnalise);

    // Fechar o dialog/popup automaticamente
    setOpenDialogs((prev) => {
      const newSet = new Set(prev);
      newSet.delete(tipoAnalise);
      return newSet;
    });

    try {
      console.log("Iniciando análise do arquivo:", file.name);

      // Buscar cartório do usuário
      console.log("Buscando cartório do usuário...");
      const { data: userData } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      console.log("Dados do usuário:", userData);

      // Verificar se o usuário tem cartório associado
      if (!userData?.cartorio_id) {
        toast.error(
          "Usuário não possui cartório associado. Entre em contato com o administrador."
        );
        return;
      }

      // Usar função específica para cada tipo de análise
      if (tipoAnalise === "resumo_matricula") {
        console.log("Processando resumo de matrícula...");
        const webhookUrl = getWebhookUrl("resumo_matricula");
        await processarResumoMatricula(
          file,
          user.id,
          userData.cartorio_id,
          webhookUrl
        );
        return;
      }

      if (tipoAnalise === "analise_malote") {
        console.log("Processando análise de malote...");
        const webhookUrl = getWebhookUrl("analise_malote");
        await processarAnaliseMalote(
          file,
          user.id,
          userData.cartorio_id,
          webhookUrl
        );
        return;
      }

      // Para outros tipos, usar o fluxo genérico
      console.log("Processando análise genérica...");

      // Upload do arquivo para o storage
      console.log("Fazendo upload para o storage...");
      const arquivoUrl = await uploadFile(file);
      console.log("Upload concluído, URL:", arquivoUrl);

      // Verificar se o webhook N8N está configurado ANTES de criar o relatório
      console.log("Verificando configuração do webhook N8N...");
      if (!n8nConfig?.webhook_url) {
        toast.error(
          <div className="space-y-3 p-2">
            <div className="font-bold text-red-800 text-lg">
              ⚠️ Webhook N8N não configurado
            </div>
            <div className="text-red-700">
              Para realizar análises de IA, você precisa configurar a URL do
              webhook N8N primeiro.
            </div>
            <div className="pt-2">
              <a
                href="/configuracoes"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = "/configuracoes";
                }}
              >
                🔧 Configurar Webhook N8N
              </a>
            </div>
          </div>,
          {
            duration: 10000,
            style: {
              border: "2px solid #dc2626",
              backgroundColor: "#fef2f2",
            },
          }
        );
        return;
      }

      // Criar relatório no banco APENAS se o webhook estiver configurado
      console.log("Criando relatório no banco...");
      const relatorio = await createRelatorio({
        tipo: tipoAnalise as any,
        nome_arquivo: file.name,
        usuario_id: user.id,
        cartorio_id: userData.cartorio_id,
        dados_processamento: {
          arquivo_original: file.name,
          arquivo_url: arquivoUrl,
        },
        arquivo_resultado: arquivoUrl,
      });
      console.log("Relatório criado:", relatorio);

      // Chamar webhook N8N
      console.log("Chamando webhook N8N...");
      await callN8NWebhook({
        relatorio_id: relatorio.id,
        tipo: tipoAnalise,
        arquivo_url: arquivoUrl,
        webhook_callback: `${window.location.origin}/api/ia/webhook`,
      });
      console.log("Webhook N8N chamado com sucesso");

      toast.success(
        `Arquivo ${file.name} enviado para análise: ${getTipoLabel(
          tipoAnalise
        )}`
      );

      // Limpar arquivo selecionado após análise iniciada
      setSelectedFiles((prev) => ({
        ...prev,
        [tipoAnalise]: null,
      }));

      // Recarregar relatórios para mostrar o novo status
      fetchRelatorios();
    } catch (error) {
      console.error("Erro detalhado na análise:", {
        error: error,
        message: error instanceof Error ? error.message : "Erro desconhecido",
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error,
      });

      // Tratamento específico para erro de webhook não configurado
      if (error instanceof Error && error.message.includes("Webhook para")) {
        toast.error(
          <div className="space-y-3 p-2">
            <div className="font-bold text-red-800 text-lg">
              ⚠️ Webhook não configurado
            </div>
            <div className="text-red-700">{error.message}</div>
            <div className="pt-2">
              <p className="text-sm text-gray-600">
                Execute o script SQL fornecido para configurar os webhooks.
              </p>
            </div>
          </div>,
          {
            duration: 10000,
            style: {
              border: "2px solid #dc2626",
              backgroundColor: "#fef2f2",
            },
          }
        );
      } else {
        toast.error("Erro ao enviar arquivo para análise");
      }
    } finally {
      setUploadingFile(null);
      setProcessingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tipoAnalise);
        return newSet;
      });
    }
  };

  const handleProcessComplete = (result: any) => {
    // Esta função será chamada quando o N8N retornar o resultado
    toast.success("Novo relatório adicionado ao histórico!");
  };

  return (
    <MainLayout
      title="Análise Inteligente de Documentos"
      subtitle="Processamento automatizado com inteligência artificial"
    >
      <div className="space-y-6">
        {/* Cards de Tipos de Análise */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Análises Simples */}
          {tiposAnaliseSimples.map((tipo) => {
            const Icon = tipo.icon;
            const isUploading = uploadingFile === tipo.id;

            return (
              <Card key={tipo.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${tipo.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tipo.titulo}</CardTitle>
                    </div>
                  </div>
                  <CardDescription>{tipo.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog
                    open={openDialogs.has(tipo.id)}
                    onOpenChange={(open) => {
                      if (!open) {
                        setOpenDialogs((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(tipo.id);
                          return newSet;
                        });
                      } else {
                        setOpenDialogs((prev) => new Set(prev).add(tipo.id));
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="w-full" disabled={isUploading}>
                        {isUploading ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Enviar Documento
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{tipo.titulo}</DialogTitle>
                        <DialogDescription>{tipo.descricao}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="file">Selecionar Arquivo</Label>
                          <Input
                            id="file"
                            type="file"
                            accept=".pdf,.doc,.docx,.zip"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileSelect(tipo.id, file);
                              }
                            }}
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Formatos aceitos: PDF, DOC, DOCX, ZIP
                          </p>
                          {selectedFiles[tipo.id] && (
                            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                              <p className="text-sm text-green-800">
                                ✅ Arquivo selecionado:{" "}
                                {selectedFiles[tipo.id]?.name}
                              </p>
                            </div>
                          )}
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => handleStartAnalysis(tipo.id)}
                          disabled={!selectedFiles[tipo.id] || isUploading}
                        >
                          {isUploading ? (
                            <>
                              <Clock className="mr-2 h-4 w-4 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <Brain className="mr-2 h-4 w-4" />
                              Iniciar Análise
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}

          {/* Minuta de Documento - Componente Especial */}
          <MinutaDocumentoForm onProcessComplete={handleProcessComplete} />
        </div>

        {/* Histórico de Análises */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Histórico de Análises</CardTitle>
                <CardDescription>
                  Relatórios processados pela inteligência artificial
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {relatorios.some((r) => r.status === "processando") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={limparRelatoriosProcessando}
                  >
                    🧹 Limpar Processando
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            ) : relatorios.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma análise encontrada
                </h3>
                <p className="text-gray-500 mb-4">
                  Ainda não há análises de IA processadas no sistema.
                </p>
                <p className="text-sm text-gray-400">
                  Envie um documento para análise usando os cards acima.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Análise</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Processado em</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorios.map((relatorio) => (
                    <TableRow key={relatorio.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {getTipoLabel(relatorio.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {(() => {
                          const arquivoOriginalUrl =
                            getArquivoOriginalUrl(relatorio);

                          return arquivoOriginalUrl ? (
                            <button
                              onClick={() => {
                                console.log(
                                  "🔍 Abrindo arquivo original:",
                                  arquivoOriginalUrl
                                );
                                // Abrir o arquivo original em uma nova aba
                                window.open(arquivoOriginalUrl, "_blank");
                              }}
                              className="text-gray-600 hover:text-gray-800 hover:font-bold cursor-pointer text-left transition-all duration-200"
                              title="Clique para visualizar o arquivo original"
                            >
                              📄 {relatorio.nome_arquivo}
                            </button>
                          ) : (
                            <span
                              className="text-gray-500"
                              title="Arquivo original não disponível"
                            >
                              📄 {relatorio.nome_arquivo}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {new Date(relatorio.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {relatorio.usuario?.name || "Usuário não encontrado"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {relatorio.status === "processando" ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <Badge variant="secondary">Processando...</Badge>
                            </>
                          ) : (
                            <Badge className={getStatusColor(relatorio.status)}>
                              <div className="flex items-center space-x-1">
                                {getStatusIcon(relatorio.status)}
                                <span>
                                  {relatorio.status === "concluido"
                                    ? "Concluído"
                                    : relatorio.status === "processando"
                                    ? "Processando"
                                    : "Erro"}
                                </span>
                              </div>
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {relatorio.status === "concluido" && (
                            <>
                              {/* Priorizar relatorio_pdf, depois relatorio_doc, depois arquivo_resultado */}
                              {relatorio.relatorio_pdf && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(
                                        relatorio.relatorio_pdf,
                                        "_blank"
                                      )
                                    }
                                    title="Visualizar análise PDF"
                                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      downloadFile(
                                        relatorio.relatorio_pdf,
                                        `analise_${relatorio.nome_arquivo}.pdf`
                                      );
                                    }}
                                    title="Download análise PDF"
                                    className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {!relatorio.relatorio_pdf &&
                                relatorio.relatorio_doc && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        window.open(
                                          relatorio.relatorio_doc,
                                          "_blank"
                                        )
                                      }
                                      title="Visualizar análise DOC"
                                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        downloadFile(
                                          relatorio.relatorio_doc,
                                          `analise_${relatorio.nome_arquivo}.doc`
                                        );
                                      }}
                                      title="Download análise DOC"
                                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              {!relatorio.relatorio_pdf &&
                                !relatorio.relatorio_doc &&
                                relatorio.arquivo_resultado && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        window.open(
                                          relatorio.arquivo_resultado,
                                          "_blank"
                                        )
                                      }
                                      title="Visualizar análise"
                                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        downloadFile(
                                          relatorio.arquivo_resultado,
                                          `analise_${relatorio.nome_arquivo}`
                                        );
                                      }}
                                      title="Download análise"
                                      className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                            </>
                          )}
                          {relatorio.status === "processando" && (
                            <Button variant="ghost" size="sm" disabled>
                              <Clock className="h-4 w-4" />
                            </Button>
                          )}
                          {relatorio.status === "erro" && (
                            <Button variant="ghost" size="sm" disabled>
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas de Uso */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Análises Hoje
              </CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.analisesHoje}</div>
              <p className="text-xs text-muted-foreground">
                {metricas.analisesHoje > 0
                  ? "Documentos processados hoje"
                  : "Nenhuma análise hoje"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.tempoMedio}</div>
              <p className="text-xs text-muted-foreground">
                Por documento processado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Sucesso
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.taxaSucesso}</div>
              <p className="text-xs text-muted-foreground">
                Análises bem-sucedidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Webhooks Ativos
              </CardTitle>
              <Webhook className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metricas.webhooksAtivos}
              </div>
              <p className="text-xs text-muted-foreground">Integrações N8N</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default AnaliseIA;
