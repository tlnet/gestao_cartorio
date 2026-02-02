"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import MainLayout from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { LoadingAnimation } from "@/components/ui/loading-spinner";
import { FadeInUp } from "@/components/ui/page-transition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Search, FileText, AlertCircle, CheckCircle, XCircle, User, Building2, Calendar, Hash, Shield, ShieldCheck, AlertTriangle, Eye, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCPFCNPJ, formatCPF, formatCNPJ, isValidCPF, isValidCNPJ } from "@/lib/formatters";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useCNIBToken } from "@/hooks/use-cnib-token";
import { useConsultasCNIB } from "@/hooks/use-consultas-cnib";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const cnibConsultaSchema = z.object({
  cpfCnpj: z
    .string()
    .min(1, "CPF/CNPJ é obrigatório")
    .refine((value) => {
      const numbers = value.replace(/\D/g, "");
      if (numbers.length === 11) {
        return isValidCPF(value);
      } else if (numbers.length === 14) {
        return isValidCNPJ(value);
      }
      return false;
    }, "CPF/CNPJ inválido"),
});

type CNIBConsultaFormData = z.infer<typeof cnibConsultaSchema>;

interface CNIBResultado {
  success: boolean;
  data?: {
    documento?: string;
    nomeRazao?: string;
    nome?: string;
    razaoSocial?: string;
    indisponivel?: boolean;
    qtdOrdens?: number;
    quantidadeOrdens?: number;
    protocolos?: any[];
    hash?: string;
    identifierRequest?: string;
    data?: string;
    dados_usuario?: {
      hash?: string;
      data?: string;
      nome?: string;
      documento?: string;
      organizacao?: string;
      filtros?: any;
    };
    dadosUsuario?: {
      hash?: string;
      data?: string;
      nome?: string;
      documento?: string;
      organizacao?: string;
      filtros?: any;
    };
    [key: string]: any; // Permite campos adicionais dinâmicos da API
  };
  error?: string;
  details?: string;
}

const CNIBPage = () => {
  const { user } = useAuth();
  const { token, loading: tokenLoading, isTokenValid, error: tokenError } = useCNIBToken();
  const { consultas, loading: consultasLoading, fetchConsultas } = useConsultasCNIB();
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultedDocument, setConsultedDocument] = useState<string | null>(
    null
  );
  const [resultado, setResultado] = useState<CNIBResultado | null>(null);
  const [showConsultaDialog, setShowConsultaDialog] = useState(false);
  const [consultaSelecionada, setConsultaSelecionada] = useState<CNIBResultado | null>(null);

  const form = useForm<CNIBConsultaFormData>({
    resolver: zodResolver(cnibConsultaSchema),
    defaultValues: {
      cpfCnpj: "",
    },
  });

  const cpfCnpjValue = form.watch("cpfCnpj");

  // Aplicar máscara automaticamente
  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCPFCNPJ(value);
    form.setValue("cpfCnpj", formatted, { shouldValidate: false });
  };

  // Validar se documento é válido
  const isDocumentValid = () => {
    if (!cpfCnpjValue) return false;
    const numbers = cpfCnpjValue.replace(/\D/g, "");
    if (numbers.length === 11) {
      return isValidCPF(cpfCnpjValue);
    } else if (numbers.length === 14) {
      return isValidCNPJ(cpfCnpjValue);
    }
    return false;
  };

  const onSubmit = async (data: CNIBConsultaFormData) => {
    // Validação adicional antes de enviar
    const numbers = data.cpfCnpj.replace(/\D/g, "");
    if (numbers.length !== 11 && numbers.length !== 14) {
      toast.error("CPF/CNPJ inválido", {
        description: "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido",
      });
      return;
    }

    if (numbers.length === 11 && !isValidCPF(data.cpfCnpj)) {
      toast.error("CPF inválido", {
        description: "O CPF informado não é válido",
      });
      return;
    }

    if (numbers.length === 14 && !isValidCNPJ(data.cpfCnpj)) {
      toast.error("CNPJ inválido", {
        description: "O CNPJ informado não é válido",
      });
      return;
    }

    // Verificar se o token está disponível
    if (!isTokenValid) {
      toast.error("Token CNIB não disponível", {
        description: "O token CNIB não está disponível ou expirou. Aguarde alguns instantes ou verifique a configuração do webhook.",
        duration: 5000,
      });
      return;
    }

    setIsConsulting(true);
    setConsultedDocument(data.cpfCnpj);
    setResultado(null);

    try {
      // Obter token de acesso da sessão do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      // Fazer requisição para a API de consulta CNIB com timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout
      
      let response: Response;
      try {
        response = await fetch("/api/cnib/consultar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          credentials: "include", // Incluir cookies na requisição
          body: JSON.stringify({
            documento: numbers,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === "AbortError") {
          toast.error("Timeout na consulta", {
            description: "A consulta demorou muito para responder. Tente novamente.",
            duration: 8000,
          });
          throw new Error("Timeout na consulta CNIB");
        }
        
        // Erro de rede
        toast.error("Erro de conexão", {
          description: "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.",
          duration: 8000,
        });
        throw new Error("Erro de conexão com o servidor");
      }

      // Ler a resposta como texto primeiro para debug
      const responseText = await response.text();
      const contentType = response.headers.get("content-type") || "";
      
      console.log("📥 Resposta bruta da API:", {
        status: response.status,
        statusText: response.statusText,
        contentType: contentType,
        textLength: responseText.length,
        textPreview: responseText.substring(0, 200),
      });

      // Verificar se a resposta é HTML (erro de servidor como 502)
      if (contentType.includes("text/html") || responseText.trim().startsWith("<")) {
        let errorMessage = "Erro no servidor";
        let errorDetails = "O servidor retornou uma resposta HTML em vez de JSON";
        
        // Tentar extrair mensagem de erro do HTML
        if (response.status === 502) {
          errorMessage = "Erro 502 - Bad Gateway";
          errorDetails = "O servidor não conseguiu se conectar ao serviço upstream. Tente novamente em alguns instantes.";
        } else if (response.status >= 500) {
          errorMessage = `Erro ${response.status} - Erro no Servidor`;
          errorDetails = "O servidor encontrou um erro temporário. Tente novamente em alguns instantes.";
        }
        
        console.error("❌ Resposta HTML recebida (erro de servidor):", {
          status: response.status,
          statusText: response.statusText,
          preview: responseText.substring(0, 500),
        });
        
        toast.error(errorMessage, {
          description: errorDetails,
          duration: 10000,
        });
        
        throw new Error(errorMessage);
      }

      let result: CNIBResultado;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Erro ao parsear JSON da resposta:", parseError);
        console.error("📄 Resposta completa:", responseText);
        
        let errorMessage = "Resposta inválida da API";
        let errorDetails = "A resposta não está em formato JSON válido";
        
        if (response.status >= 500) {
          errorMessage = "Erro no servidor";
          errorDetails = "O servidor retornou uma resposta inválida. Tente novamente em alguns instantes.";
        }
        
        toast.error(errorMessage, {
          description: errorDetails,
          duration: 8000,
        });
        
        throw new Error(errorMessage);
      }

      if (!response.ok) {
        // Mensagem de erro mais detalhada
        const errorMessage = result.error || result.details || "Erro ao consultar CNIB";
        const solution = (result as any).solution || (result as any).hint || "";
        
        // Log detalhado para debug (de forma segura)
        console.error("❌ Erro na resposta da API:");
        console.error("  Status:", response.status);
        console.error("  Status Text:", response.statusText);
        console.error("  Erro:", errorMessage);
        if (result.details) {
          console.error("  Detalhes:", result.details);
        }
        if ((result as any).hint) {
          console.error("  Dica:", (result as any).hint);
        }
        
        // Tratamento específico para diferentes tipos de erro
        if (response.status === 502 || response.status === 503 || response.status === 504) {
          toast.error("Erro no servidor", {
            description: "O servidor está temporariamente indisponível. Tente novamente em alguns instantes.",
            duration: 10000,
          });
        } else if (errorMessage.includes("Configuração incompleta")) {
          toast.error(errorMessage, {
            description: solution || "Configure a variável CNIB_CPF_USUARIO no arquivo .env.local",
            duration: 8000,
          });
        } else if (errorMessage.includes("Token CNIB não disponível")) {
          toast.error(errorMessage, {
            description: solution || "Verifique se o webhook N8N está configurado e acessível",
            duration: 8000,
          });
        } else if (errorMessage.includes("Erro ao conectar")) {
          toast.error(errorMessage, {
            description: solution || "Verifique sua conexão com a internet e se a API CNIB está acessível",
            duration: 8000,
          });
        } else if (errorMessage.includes("autorização") || errorMessage.includes("não possui autorização")) {
          // Erro específico de autorização
          const hint = (result as any).hint || solution || "O CPF da serventia não possui autorização na API CNIB. Verifique se o CPF está correto e se a serventia está cadastrada na CNIB.";
          toast.error("Erro de Autorização", {
            description: errorMessage + (hint ? `\n\n${hint}` : ""),
            duration: 12000,
          });
        } else {
          toast.error(errorMessage, {
            description: solution || result.details || "Erro desconhecido na consulta CNIB",
            duration: 8000,
          });
        }
        
        throw new Error(errorMessage);
      }

      // A API retorna { success: true, data: {...} }
      // onde data contém a resposta completa da API CNIB
      // A estrutura da API CNIB é: { data: { documento, nomeRazao, ... }, identifierRequest, success, message, status }
      console.log("📦 Dados recebidos da API (completo):", JSON.stringify(result, null, 2));
      
      // Ajustar estrutura: result.data contém a resposta da API CNIB
      // A resposta da API CNIB pode ter estrutura: { documento, nomeRazao, dados_usuario, ... } ou { data: { ... } }
      const cnibResponse = result.data;
      console.log("📦 Estrutura CNIB:", {
        hasData: !!cnibResponse,
        keys: cnibResponse ? Object.keys(cnibResponse) : [],
        fullObject: cnibResponse,
      });
      
      // A resposta da API CNIB pode ter os dados diretamente ou dentro de um campo 'data'
      // Se tiver um campo 'data' dentro, usamos ele, senão usamos o objeto diretamente
      let consultaData: any = cnibResponse;
      
      // Se a resposta tem um campo 'data', extrair ele
      if (cnibResponse && typeof cnibResponse === 'object' && 'data' in cnibResponse && cnibResponse.data && typeof cnibResponse.data === 'object') {
        consultaData = cnibResponse.data;
        console.log("📦 Dados extraídos de cnibResponse.data:", consultaData);
      } else {
        console.log("📦 Usando cnibResponse diretamente:", consultaData);
      }
      
      // Log detalhado de todos os campos disponíveis
      const consultaDataAny = consultaData as any;
      console.log("📦 Campos disponíveis em consultaData:", {
        documento: consultaDataAny?.documento,
        nomeRazao: consultaDataAny?.nomeRazao,
        nome: consultaDataAny?.nome,
        razaoSocial: consultaDataAny?.razaoSocial,
        indisponivel: consultaDataAny?.indisponivel,
        qtdOrdens: consultaDataAny?.qtdOrdens,
        quantidadeOrdens: consultaDataAny?.quantidadeOrdens,
        protocolos: consultaDataAny?.protocolos,
        dados_usuario: consultaDataAny?.dados_usuario,
        dadosUsuario: consultaDataAny?.dadosUsuario,
        hash: consultaDataAny?.hash,
        identifierRequest: consultaDataAny?.identifierRequest,
        allKeys: consultaDataAny ? Object.keys(consultaDataAny) : [],
      });
      
      setResultado({
        success: result.success,
        data: consultaData, // Dados da consulta (documento, nomeRazao, dados_usuario, etc)
      });
      
      // Recarregar histórico de consultas após um pequeno delay
      // para garantir que o banco tenha processado a inserção
      setTimeout(async () => {
        await fetchConsultas();
      }, 500);
      
      toast.success("Consulta realizada com sucesso", {
        description: "Resultados carregados",
      });
    } catch (error) {
      console.error("Erro ao consultar CNIB:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      setResultado({
        success: false,
        error: errorMessage,
      });

      toast.error("Erro ao consultar CNIB", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsConsulting(false);
    }
  };

  const handleNovaConsulta = () => {
    form.reset();
    setConsultedDocument(null);
    setResultado(null);
  };

  return (
    <ProtectedRoute>
      <MainLayout
        title="Consulta CNIB"
        subtitle="Verificação de indisponibilidade de bens"
      >
        <div className="space-y-6">
          <FadeInUp delay={100}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Consulta CNIB
                </CardTitle>
                <CardDescription>
                  Consulte a indisponibilidade de bens através do sistema CNIB
                  inserindo CPF ou CNPJ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF/CNPJ</FormLabel>
                          <FormControl>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input
                                {...field}
                                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                onChange={handleCpfCnpjChange}
                                className="flex-1"
                                disabled={isConsulting}
                              />
                              <Button
                                type="submit"
                                disabled={!isDocumentValid() || isConsulting}
                                className="min-w-full sm:min-w-[120px]"
                              >
                                {isConsulting ? (
                                  <>
                                    <LoadingAnimation
                                      size="sm"
                                      variant="dots"
                                      className="mr-2"
                                    />
                                    Consultando...
                                  </>
                                ) : (
                                  <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Consultar
                                  </>
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                          {cpfCnpjValue && !isDocumentValid() && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Digite um CPF (11 dígitos) ou CNPJ (14 dígitos)
                              válido
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
          </FadeInUp>

          {consultedDocument && (
            <FadeInUp delay={200}>
              <Card id="resultado-consulta">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      Resultado da Consulta
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNovaConsulta}
                      className="w-full sm:w-auto"
                    >
                      Nova Consulta
                    </Button>
                  </div>
                  <CardDescription className="mt-2">
                    Documento consultado: {consultedDocument}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isConsulting ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <LoadingAnimation size="lg" variant="wave" />
                      <p className="mt-4 text-muted-foreground">
                        Consultando CNIB...
                      </p>
                    </div>
                  ) : resultado ? (
                    <div className="space-y-6">
                      {resultado.success && resultado.data ? (
                        <>
                          {/* Status Principal */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="h-5 w-5" />
                              <span className="font-medium">Consulta realizada com sucesso</span>
                            </div>
                            {resultado.data.indisponivel !== undefined && (
                              <Badge 
                                variant={resultado.data.indisponivel ? "destructive" : "default"}
                                className="text-sm px-3 py-1"
                              >
                                {resultado.data.indisponivel ? (
                                  <>
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    Indisponível
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="h-4 w-4 mr-1" />
                                    Disponível
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>

                          <Separator />

                          {/* Informações do Documento Consultado */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <FileText className="h-5 w-5 text-blue-600" />
                              Informações do Documento
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-muted/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                  <FileText className="h-4 w-4" />
                                  Documento
                                </div>
                                <p className="font-semibold text-lg">
                                  {consultedDocument || resultado.data?.documento || "N/A"}
                                </p>
                              </div>

                              <div className="bg-muted/50 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                  <User className="h-4 w-4" />
                                  Nome / Razão Social
                                </div>
                                <p className="font-semibold text-lg">
                                  {resultado.data?.nomeRazao || resultado.data?.nome || resultado.data?.razaoSocial || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Status de Indisponibilidade e Ordens */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-muted/30">
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                                    <p className="text-2xl font-bold">
                                      {resultado.data?.indisponivel ? (
                                        <span className="text-red-600">Indisponível</span>
                                      ) : (
                                        <span className="text-green-600">Disponível</span>
                                      )}
                                    </p>
                                  </div>
                                  {resultado.data?.indisponivel ? (
                                    <Shield className="h-8 w-8 text-red-600" />
                                  ) : (
                                    <ShieldCheck className="h-8 w-8 text-green-600" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="bg-muted/30">
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Quantidade de Ordens</p>
                                    <p className="text-2xl font-bold">
                                      {resultado.data?.qtdOrdens ?? resultado.data?.quantidadeOrdens ?? 0}
                                    </p>
                                  </div>
                                  <AlertCircle className="h-8 w-8 text-blue-600" />
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Protocolos */}
                          {resultado.data?.protocolos && resultado.data.protocolos.length > 0 && (
                            <div className="space-y-4">
                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-orange-600" />
                                Protocolos ({resultado.data.protocolos.length})
                              </h3>
                              <div className="space-y-2">
                                {resultado.data.protocolos.map((protocolo: any, index: number) => (
                                  <Card key={index} className="bg-orange-50 border-orange-200">
                                    <CardContent className="pt-4">
                                      <pre className="text-sm overflow-auto">
                                        {JSON.stringify(protocolo, null, 2)}
                                      </pre>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dados da Consulta */}
                          <Separator />
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <Building2 className="h-5 w-5 text-purple-600" />
                              Dados da Consulta
                            </h3>
                            
                            <Card className="bg-muted/30">
                              <CardContent className="pt-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Hash da Consulta - Sempre exibir se disponível */}
                                  {(resultado.data?.dados_usuario?.hash || resultado.data?.hash || resultado.data?.identifierRequest) && (
                                    <div className="md:col-span-2">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <Hash className="h-4 w-4" />
                                        Hash da Consulta
                                      </div>
                                      <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                                        {resultado.data?.dados_usuario?.hash || resultado.data?.hash || resultado.data?.identifierRequest || "N/A"}
                                      </p>
                                    </div>
                                  )}

                                  {/* Data, Hora, Minuto e Segundo - Sempre exibir se disponível */}
                                  {(resultado.data?.dados_usuario?.data || resultado.data?.data) && (
                                    <div className="md:col-span-2">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <Calendar className="h-4 w-4" />
                                        Data e Hora da Consulta
                                      </div>
                                      <p className="font-medium text-lg">
                                        {resultado.data?.dados_usuario?.data || resultado.data?.data || "N/A"}
                                      </p>
                                    </div>
                                  )}

                                  {/* Se não houver hash ou data, mostrar mensagem ou dados brutos para debug */}
                                  {!(resultado.data?.dados_usuario?.hash || resultado.data?.hash || resultado.data?.identifierRequest || resultado.data?.dados_usuario?.data || resultado.data?.data) && (
                                    <div className="md:col-span-2 space-y-2">
                                      <p className="text-sm text-muted-foreground italic">
                                        Dados adicionais da consulta não disponíveis na resposta da API.
                                      </p>
                                      {/* Debug: mostrar estrutura completa dos dados */}
                                      {process.env.NODE_ENV === 'development' && (
                                        <details className="mt-2">
                                          <summary className="text-xs text-muted-foreground cursor-pointer">
                                            Ver estrutura completa dos dados (debug)
                                          </summary>
                                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                                            {JSON.stringify(resultado.data, null, 2)}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  )}

                                  {/* Nome do Usuário */}
                                  {(resultado.data?.dados_usuario?.nome || resultado.data?.dadosUsuario?.nome) && (
                                    <div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <User className="h-4 w-4" />
                                        Usuário
                                      </div>
                                      <p className="font-medium">
                                        {resultado.data?.dados_usuario?.nome || resultado.data?.dadosUsuario?.nome || "N/A"}
                                      </p>
                                    </div>
                                  )}

                                  {/* CPF do Usuário */}
                                  {(resultado.data?.dados_usuario?.documento || resultado.data?.dadosUsuario?.documento) && (
                                    <div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <FileText className="h-4 w-4" />
                                        CPF do Usuário
                                      </div>
                                      <p className="font-medium">
                                        {resultado.data?.dados_usuario?.documento || resultado.data?.dadosUsuario?.documento || "N/A"}
                                      </p>
                                    </div>
                                  )}

                                  {/* Organização */}
                                  {resultado.data?.dados_usuario?.organizacao && (
                                    <div className="md:col-span-2">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                        <Building2 className="h-4 w-4" />
                                        Organização
                                      </div>
                                      <p className="font-medium">
                                        {resultado.data.dados_usuario.organizacao}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="h-5 w-5" />
                            <span className="font-medium">Erro na consulta</span>
                          </div>
                          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                            <p className="text-sm text-red-800">
                              <strong>Erro:</strong> {resultado.error || "Erro desconhecido"}
                            </p>
                            {resultado.details && (
                              <p className="text-sm text-red-600 mt-2">
                                {resultado.details}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        Os resultados da consulta aparecerão aqui após a pesquisa
                      </p>
                      {!isTokenValid && !tokenLoading && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">
                              Token CNIB não disponível. {tokenError || "Aguarde alguns instantes ou verifique a configuração do webhook."}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeInUp>
          )}

          {/* Histórico de Consultas */}
          <FadeInUp delay={300}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Histórico de Consultas
                </CardTitle>
                <CardDescription>
                  Consultas CNIB realizadas anteriormente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {consultasLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : consultas.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma consulta encontrada
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Ainda não há consultas CNIB realizadas no sistema.
                    </p>
                    <p className="text-sm text-gray-400">
                      Realize uma consulta usando o formulário acima.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Nome / Razão Social</TableHead>
                        <TableHead>Hash da Consulta</TableHead>
                        <TableHead>Consultado em</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consultas.map((consulta) => (
                        <TableRow key={consulta.id}>
                          <TableCell className="font-medium">
                            {consulta.tipo_documento === "CPF"
                              ? formatCPF(consulta.documento)
                              : formatCNPJ(consulta.documento)}
                          </TableCell>
                          <TableCell>
                            {consulta.nome_razao_social || "N/A"}
                          </TableCell>
                          <TableCell>
                            {consulta.hash_consulta ? (
                              <span className="font-mono text-xs" title={consulta.hash_consulta}>
                                {consulta.hash_consulta.length > 20 
                                  ? consulta.hash_consulta.substring(0, 20) + "..." 
                                  : consulta.hash_consulta}
                              </span>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(consulta.created_at).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            {consulta.usuario?.name || "Usuário não encontrado"}
                          </TableCell>
                          <TableCell>
                            {consulta.status === "sucesso" ? (
                              <Badge
                                className="bg-green-100 text-green-800 hover:bg-green-100 cursor-default"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sucesso
                              </Badge>
                            ) : (
                              <Badge
                                className="bg-red-100 text-red-800 hover:bg-red-100 cursor-default"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Erro
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {consulta.status === "sucesso" && consulta.dados_consulta && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  try {
                                    // Garantir que dados_consulta seja um objeto
                                    let dadosConsulta = consulta.dados_consulta;
                                    
                                    // Se for string, fazer parse
                                    if (typeof dadosConsulta === 'string') {
                                      dadosConsulta = JSON.parse(dadosConsulta);
                                    }
                                    
                                    // Extrair os dados reais da estrutura salva
                                    // A estrutura salva pode ser: { success: true, data: { data: {...} } } ou { data: {...} } ou {...}
                                    let dadosReais = dadosConsulta;
                                    
                                    // Se tiver estrutura aninhada, extrair os dados reais
                                    if (dadosConsulta?.data?.data) {
                                      dadosReais = dadosConsulta.data.data;
                                    } else if (dadosConsulta?.data) {
                                      dadosReais = dadosConsulta.data;
                                    } else if (dadosConsulta) {
                                      dadosReais = dadosConsulta;
                                    }
                                    
                                    // Garantir que dadosReais seja um objeto válido
                                    if (!dadosReais || typeof dadosReais !== 'object') {
                                      throw new Error("Estrutura de dados inválida");
                                    }
                                    
                                    // Formatar o documento para exibição
                                    const documentoFormatado = consulta.tipo_documento === "CPF"
                                      ? formatCPF(consulta.documento)
                                      : formatCNPJ(consulta.documento);
                                    
                                    // Preparar dados para o dialog
                                    const consultaData: CNIBResultado = {
                                      success: true,
                                      data: {
                                        ...dadosReais,
                                        documento: consulta.documento,
                                      },
                                    };
                                    
                                    setConsultaSelecionada(consultaData);
                                    setShowConsultaDialog(true);
                                  } catch (error) {
                                    console.error("Erro ao processar dados da consulta:", error);
                                    toast.error("Erro ao carregar dados da consulta", {
                                      description: error instanceof Error ? error.message : "Não foi possível processar os dados salvos",
                                    });
                                  }
                                }}
                                title="Visualizar resultado da consulta"
                                className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </FadeInUp>

          {/* Dialog de Detalhes da Consulta */}
          <Dialog open={showConsultaDialog} onOpenChange={setShowConsultaDialog}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
              <DialogHeader className="pb-3">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Detalhes da Consulta
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {consultaSelecionada?.data?.documento && (
                    <>Documento consultado: {formatCPFCNPJ(consultaSelecionada.data.documento)}</>
                  )}
                </DialogDescription>
              </DialogHeader>

              {consultaSelecionada && (
                <div className="space-y-4">
                  {consultaSelecionada.success && consultaSelecionada.data ? (
                    <>
                      {/* Status Principal */}
                      <div className="flex items-center justify-between pb-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">Consulta realizada com sucesso</span>
                        </div>
                        {consultaSelecionada.data.indisponivel !== undefined && (
                          <Badge 
                            variant={consultaSelecionada.data.indisponivel ? "destructive" : "default"}
                            className="text-xs px-2 py-0.5"
                          >
                            {consultaSelecionada.data.indisponivel ? (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Indisponível
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Disponível
                              </>
                            )}
                          </Badge>
                        )}
                      </div>

                      <Separator className="my-2" />

                      {/* Informações do Documento Consultado */}
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Informações do Documento
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <FileText className="h-3 w-3" />
                              Documento
                            </div>
                            <p className="font-semibold text-base">
                              {consultaSelecionada.data.documento ? formatCPFCNPJ(consultaSelecionada.data.documento) : "N/A"}
                            </p>
                          </div>

                          <div className="bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <User className="h-3 w-3" />
                              Nome / Razão Social
                            </div>
                            <p className="font-semibold text-base">
                              {consultaSelecionada.data?.nomeRazao || consultaSelecionada.data?.nome || consultaSelecionada.data?.razaoSocial || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status de Indisponibilidade e Ordens */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Status</p>
                                <p className="text-xl font-bold">
                                  {consultaSelecionada.data?.indisponivel ? (
                                    <span className="text-red-600">Indisponível</span>
                                  ) : (
                                    <span className="text-green-600">Disponível</span>
                                  )}
                                </p>
                              </div>
                              {consultaSelecionada.data?.indisponivel ? (
                                <Shield className="h-6 w-6 text-red-600" />
                              ) : (
                                <ShieldCheck className="h-6 w-6 text-green-600" />
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-muted/30">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Quantidade de Ordens</p>
                                <p className="text-xl font-bold">
                                  {consultaSelecionada.data?.qtdOrdens ?? consultaSelecionada.data?.quantidadeOrdens ?? 0}
                                </p>
                              </div>
                              <AlertCircle className="h-6 w-6 text-blue-600" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Protocolos */}
                      {consultaSelecionada.data?.protocolos && consultaSelecionada.data.protocolos.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-base font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-orange-600" />
                            Protocolos ({consultaSelecionada.data.protocolos.length})
                          </h3>
                          <div className="space-y-2">
                            {consultaSelecionada.data.protocolos.map((protocolo: any, index: number) => (
                              <Card key={index} className="bg-orange-50 border-orange-200">
                                <CardContent className="pt-3 pb-3">
                                  <pre className="text-xs overflow-auto max-h-32">
                                    {JSON.stringify(protocolo, null, 2)}
                                  </pre>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dados da Consulta */}
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-purple-600" />
                          Dados da Consulta
                        </h3>
                        
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4 pb-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Hash da Consulta */}
                              {(consultaSelecionada.data?.dados_usuario?.hash || consultaSelecionada.data?.hash || consultaSelecionada.data?.identifierRequest) && (
                                <div className="md:col-span-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <Hash className="h-3 w-3" />
                                    Hash da Consulta
                                  </div>
                                  <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                                    {consultaSelecionada.data?.dados_usuario?.hash || consultaSelecionada.data?.hash || consultaSelecionada.data?.identifierRequest || "N/A"}
                                  </p>
                                </div>
                              )}

                              {/* Data e Hora */}
                              {(consultaSelecionada.data?.dados_usuario?.data || consultaSelecionada.data?.data) && (
                                <div className="md:col-span-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <Calendar className="h-3 w-3" />
                                    Data e Hora da Consulta
                                  </div>
                                  <p className="font-medium text-sm">
                                    {consultaSelecionada.data?.dados_usuario?.data || consultaSelecionada.data?.data || "N/A"}
                                  </p>
                                </div>
                              )}

                              {/* Nome do Usuário */}
                              {(consultaSelecionada.data?.dados_usuario?.nome || consultaSelecionada.data?.dadosUsuario?.nome) && (
                                <div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <User className="h-3 w-3" />
                                    Usuário
                                  </div>
                                  <p className="font-medium text-sm">
                                    {consultaSelecionada.data?.dados_usuario?.nome || consultaSelecionada.data?.dadosUsuario?.nome || "N/A"}
                                  </p>
                                </div>
                              )}

                              {/* CPF do Usuário */}
                              {(consultaSelecionada.data?.dados_usuario?.documento || consultaSelecionada.data?.dadosUsuario?.documento) && (
                                <div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <FileText className="h-3 w-3" />
                                    CPF do Usuário
                                  </div>
                                  <p className="font-medium text-sm">
                                    {consultaSelecionada.data?.dados_usuario?.documento || consultaSelecionada.data?.dadosUsuario?.documento || "N/A"}
                                  </p>
                                </div>
                              )}

                              {/* Organização */}
                              {consultaSelecionada.data?.dados_usuario?.organizacao && (
                                <div className="md:col-span-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <Building2 className="h-3 w-3" />
                                    Organização
                                  </div>
                                  <p className="font-medium text-sm">
                                    {consultaSelecionada.data.dados_usuario.organizacao}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Erro na consulta</span>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <p className="text-sm text-red-800">
                          <strong>Erro:</strong> {consultaSelecionada.error || "Erro desconhecido"}
                        </p>
                        {consultaSelecionada.details && (
                          <p className="text-sm text-red-600 mt-2">
                            {consultaSelecionada.details}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default CNIBPage;
