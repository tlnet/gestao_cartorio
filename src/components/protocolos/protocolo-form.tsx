"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatPhone,
  formatCPFCNPJ,
  formatProtocol,
  formatEmail,
  isValidCPF,
  isValidCNPJ,
  isValidPhone,
  isValidEmail,
} from "@/lib/formatters";
import { useStatusPersonalizados } from "@/hooks/use-status-personalizados";
import { useServicos } from "@/hooks/use-servicos";
import { LoadingAnimation } from "@/components/ui/loading-spinner";
import { useLevontechConfig } from "@/hooks/use-levontech-config";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const protocoloSchema = z.object({
  demanda: z.string().min(1, "Demanda é obrigatória"),
  protocolo: z.string().min(1, "Número do protocolo é obrigatório"),
  solicitante: z.string().min(1, "Nome do solicitante é obrigatório"),
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
  telefone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine((value) => isValidPhone(value), "Telefone inválido"),
  servicos: z
    .array(z.string())
    .min(1, "Pelo menos um serviço deve ser selecionado"),
  status: z.string().min(1, "Status é obrigatório"),
  apresentante: z.string().optional(),
  email: z
    .string()
    .refine((value) => !value || isValidEmail(value), "Email inválido")
    .optional()
    .or(z.literal("")),
  observacao: z.string().optional(),
  prazoExecucao: z.date().optional(),
});

type ProtocoloFormData = z.infer<typeof protocoloSchema>;

interface ProtocoloFormProps {
  onSubmit: (data: ProtocoloFormData) => void;
  onCancel: () => void;
  initialData?: Partial<ProtocoloFormData>;
  isEditing?: boolean;
}

const ProtocoloForm: React.FC<ProtocoloFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}) => {
  const [servicosSelecionados, setServicosSelecionados] = React.useState<
    string[]
  >(initialData?.servicos || []);
  
  // Estado para armazenar avisos de prazos
  const [avisosPrazos, setAvisosPrazos] = React.useState<
    Array<{
      servico: string;
      tipo: "warning" | "info" | "success";
      mensagem: string;
    }>
  >([]);

  const { statusPersonalizados } = useStatusPersonalizados();
  const { servicos, loading: servicosLoading, createServico } = useServicos();
  const { config: levontechConfig, loading: levontechLoading } = useLevontechConfig();
  const { user } = useAuth();
  
  // Estado para controlar loading do webhook
  const [consultingLevontech, setConsultingLevontech] = React.useState(false);
  
  // Estado para armazenar dados recebidos do webhook (preparado para uso futuro)
  const [levontechData, setLevontechData] = React.useState<any>(null);
  
  // Ref para debounce do webhook
  const webhookTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Debug: Log da configuração Levontech
  React.useEffect(() => {
    console.log("🔍 Levontech Config:", {
      config: levontechConfig,
      loading: levontechLoading,
      sistema_levontech: levontechConfig?.sistema_levontech,
      hasCredentials: !!(levontechConfig?.levontech_url && levontechConfig?.levontech_username && levontechConfig?.levontech_password),
    });
  }, [levontechConfig, levontechLoading]);

  // Combinar status padrão com status personalizados
  const statusOptions = [
    "Aguardando Análise",
    "Em Andamento",
    "Pendente",
    "Concluído",
    "Cancelado",
    // Adicionar apenas status personalizados que não sejam duplicatas dos padrão
    ...statusPersonalizados
      .filter((status) => {
        const statusPadrao = [
          "Aguardando Análise",
          "Em Andamento",
          "Pendente",
          "Concluído",
          "Cancelado",
        ];
        return !statusPadrao.includes(status.nome);
      })
      .map((status) => status.nome),
  ];

  // Remover duplicatas e garantir chaves únicas
  const statusOptionsUnicos = [...new Set(statusOptions)];

  // Usar serviços personalizados do banco de dados
  const servicosDisponiveis = [
    ...new Set(
      servicos
        .filter((servico) => servico.ativo) // Apenas serviços ativos
        .map((servico) => servico.nome)
    ),
  ].sort(); // Remover duplicatas e ordenar alfabeticamente

  const form = useForm<ProtocoloFormData>({
    resolver: zodResolver(protocoloSchema),
    defaultValues: {
      demanda: initialData?.demanda || "",
      protocolo: initialData?.protocolo || "",
      solicitante: initialData?.solicitante || "",
      cpfCnpj: initialData?.cpfCnpj || "",
      telefone: initialData?.telefone || "",
      servicos: initialData?.servicos || [],
      status: initialData?.status || "Aguardando Análise",
      apresentante: initialData?.apresentante || "",
      email: initialData?.email || "",
      observacao: initialData?.observacao || "",
      prazoExecucao: initialData?.prazoExecucao,
    },
  });

  // Função para atualizar avisos de prazos
  const atualizarAvisosPrazos = React.useCallback((servicosParaVerificar: string[]) => {
    const prazoExecucaoProtocolo = form.getValues("prazoExecucao");
    const novosAvisos: Array<{
      servico: string;
      tipo: "warning" | "info" | "success";
      mensagem: string;
    }> = [];
    
    if (prazoExecucaoProtocolo && servicosParaVerificar.length > 0) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataVencimentoProtocolo = new Date(prazoExecucaoProtocolo);
      dataVencimentoProtocolo.setHours(0, 0, 0, 0);
      
      servicosParaVerificar.forEach((nomeServico) => {
        const servicoInfo = servicos.find((s) => s.nome === nomeServico);
        
        if (servicoInfo && servicoInfo.prazo_execucao) {
          // Calcular data de vencimento do serviço (hoje + prazo do serviço)
          const dataVencimentoServico = new Date(hoje);
          dataVencimentoServico.setDate(dataVencimentoServico.getDate() + servicoInfo.prazo_execucao);
          dataVencimentoServico.setHours(0, 0, 0, 0);
          
          // Comparar prazos
          if (dataVencimentoServico > dataVencimentoProtocolo) {
            novosAvisos.push({
              servico: nomeServico,
              tipo: "warning",
              mensagem: `O prazo do serviço "${nomeServico}" (${servicoInfo.prazo_execucao} dias) ultrapassa o prazo de execução do protocolo (${prazoExecucaoProtocolo.toLocaleDateString("pt-BR")}).`,
            });
          } else if (dataVencimentoServico <= dataVencimentoProtocolo) {
            const diasDiferenca = Math.ceil((dataVencimentoProtocolo.getTime() - dataVencimentoServico.getTime()) / (1000 * 60 * 60 * 24));
            if (diasDiferenca > 0) {
              novosAvisos.push({
                servico: nomeServico,
                tipo: "info",
                mensagem: `O prazo do serviço "${nomeServico}" (${servicoInfo.prazo_execucao} dias) está dentro do prazo do protocolo. Há ${diasDiferenca} dia(s) de margem.`,
              });
            } else {
              novosAvisos.push({
                servico: nomeServico,
                tipo: "success",
                mensagem: `O prazo do serviço "${nomeServico}" (${servicoInfo.prazo_execucao} dias) coincide com o prazo do protocolo.`,
              });
            }
          }
        }
      });
    }
    
    setAvisosPrazos(novosAvisos);
  }, [form, servicos]);

  const adicionarServico = (servico: string) => {
    if (!servicosSelecionados.includes(servico)) {
      const novosServicos = [...servicosSelecionados, servico];
      setServicosSelecionados(novosServicos);
      form.setValue("servicos", novosServicos);
      
      // Atualizar avisos de prazos
      atualizarAvisosPrazos(novosServicos);
    }
  };

  const removerServico = (servico: string) => {
    const novosServicos = servicosSelecionados.filter((s) => s !== servico);
    setServicosSelecionados(novosServicos);
    form.setValue("servicos", novosServicos);
    
    // Atualizar avisos de prazos
    atualizarAvisosPrazos(novosServicos);
  };

  const handleSubmit = (data: ProtocoloFormData) => {
    onSubmit({
      ...data,
      servicos: servicosSelecionados,
    });
  };

  // Handlers de formatação
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    form.setValue("telefone", formatted);
  };

  const handleCPFCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPFCNPJ(e.target.value);
    form.setValue("cpfCnpj", formatted);
  };

  const handleProtocolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatProtocol(e.target.value);
    form.setValue("protocolo", formatted);
    
    // Limpar timeout anterior se existir
    if (webhookTimeoutRef.current) {
      clearTimeout(webhookTimeoutRef.current);
    }
    
    // Debug: Log do que está acontecendo
    const shouldTrigger = !isEditing && 
                          formatted && 
                          formatted.length >= 3 && 
                          !levontechLoading &&
                          levontechConfig?.sistema_levontech === true;
    
    console.log("📝 Protocolo alterado:", {
      formatted,
      isEditing,
      levontechLoading,
      levontechConfig: levontechConfig,
      sistema_levontech: levontechConfig?.sistema_levontech,
      length: formatted.length,
      shouldTrigger,
    });
    
    // Disparar webhook Levontech com debounce (aguardar 500ms após parar de digitar)
    if (shouldTrigger) {
      console.log("⏳ Agendando webhook Levontech em 500ms...");
      webhookTimeoutRef.current = setTimeout(() => {
        console.log("🚀 Disparando webhook Levontech agora!");
        dispararWebhookLevontech(formatted);
      }, 500);
    } else {
      // Resetar dados se protocolo for apagado ou muito curto
      if (formatted.length < 3) {
        setLevontechData(null);
        setConsultingLevontech(false);
      }
      
      // Log do motivo de não disparar
      if (isEditing) {
        console.log("❌ Não disparando: está editando");
      } else if (!formatted || formatted.length < 3) {
        console.log("❌ Não disparando: protocolo muito curto");
      } else if (levontechLoading) {
        console.log("❌ Não disparando: ainda carregando configuração");
      } else if (levontechConfig?.sistema_levontech !== true) {
        console.log("❌ Não disparando: Levontech não está ativo", {
          sistema_levontech: levontechConfig?.sistema_levontech,
          config: levontechConfig,
        });
      }
    }
  };
  
  // Limpar timeout ao desmontar componente
  React.useEffect(() => {
    return () => {
      if (webhookTimeoutRef.current) {
        clearTimeout(webhookTimeoutRef.current);
      }
    };
  }, []);

  // Validar prazos quando o prazo de execução do protocolo for alterado
  const prazoExecucaoProtocolo = form.watch("prazoExecucao");
  React.useEffect(() => {
    atualizarAvisosPrazos(servicosSelecionados);
  }, [prazoExecucaoProtocolo, servicosSelecionados, atualizarAvisosPrazos]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEmail(e.target.value);
    form.setValue("email", formatted);
  };

  // Função para disparar webhook Levontech
  const dispararWebhookLevontech = async (numeroProtocolo: string) => {
    console.log("🔧 dispararWebhookLevontech chamado:", {
      numeroProtocolo,
      length: numeroProtocolo.length,
      levontechConfig,
      sistema_levontech: levontechConfig?.sistema_levontech,
    });
    
    // Só disparar se tiver número de protocolo completo (mínimo de caracteres)
    if (numeroProtocolo.length < 3) {
      console.log("❌ Protocolo muito curto, abortando");
      return;
    }
    
    if (!levontechConfig?.sistema_levontech) {
      console.log("❌ Levontech não está ativo, abortando");
      return;
    }
    
    try {
      setConsultingLevontech(true);
      setLevontechData(null); // Resetar dados anteriores
      
      // Buscar cartorio_id do usuário
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user?.id)
        .single();

      if (userError || !userData?.cartorio_id) {
        console.error("Erro ao buscar cartório do usuário:", userError);
        toast.error("Erro ao consultar dados: cartório não encontrado");
        return;
      }

      // Verificar se as credenciais estão configuradas
      if (!levontechConfig.levontech_url || !levontechConfig.levontech_username || !levontechConfig.levontech_password) {
        toast.warning("Credenciais do Levontech incompletas. Verifique as configurações.");
        return;
      }

      // Buscar o valor do campo "demanda" do formulário
      const demanda = form.getValues("demanda") || "";

      // Preparar payload para webhook
      const payload = {
        numero_protocolo: numeroProtocolo,
        demanda: demanda,
        cartorio_id: userData.cartorio_id,
        fluxo: "protocolo",
        credenciais_levontech: {
          url: levontechConfig.levontech_url,
          username: levontechConfig.levontech_username,
          password: levontechConfig.levontech_password,
        },
      };

      console.log("📤 Disparando webhook Levontech:", {
        numero_protocolo: numeroProtocolo,
        demanda: demanda,
        cartorio_id: userData.cartorio_id,
        fluxo: "protocolo",
      });

      // Disparar webhook através da API route do Next.js (evita CORS)
      const response = await fetch("/api/levontech/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        let responseData;
        try {
          responseData = await response.json();
        } catch (parseError) {
          console.error("❌ Erro ao parsear resposta da API:", parseError);
          setLevontechData(null);
          toast.info("Protocolo consultado no Levontech, mas nenhum dado estruturado foi retornado. Preencha os campos manualmente.");
          return;
        }

        // A API route retorna { data: ... } ou { error: ... }
        if (responseData.error) {
          console.error("❌ Erro retornado pela API:", responseData.error);
          toast.warning(`Erro ao consultar Levontech: ${responseData.error}`);
          setLevontechData(null);
          return;
        }

        const data = responseData.data;
        console.log("✅ Resposta do webhook Levontech:", data);
        
        // Verificar se o webhook retornou dados úteis
        // A resposta pode ser um array ou um objeto
        let hasUsefulData = false;
        
        if (Array.isArray(data) && data.length > 0) {
          // Se for array, verificar se o primeiro elemento tem dados úteis
          const primeiroItem = data[0];
          hasUsefulData = primeiroItem && 
            typeof primeiroItem === 'object' &&
            (
              primeiroItem.solicitante ||
              primeiroItem.status ||
              primeiroItem.tipoDeServico ||
              primeiroItem.prazoExecucao ||
              primeiroItem.observacoes
            );
        } else if (data && typeof data === 'object') {
          // Se for objeto, verificar se não é apenas mensagem de confirmação
          const isOnlyWorkflowMessage = 
            Object.keys(data).length === 1 && 
            (data.message === "Workflow was started" || data.message === "workflow started");
          
          hasUsefulData = !isOnlyWorkflowMessage &&
            Object.keys(data).length > 0 &&
            (
              data.solicitante || 
              data.cpf_cnpj || 
              data.cpfCnpj ||
              data.telefone || 
              data.email || 
              data.servicos || 
              data.dados ||
              data.protocolo ||
              data.demanda ||
              data.status ||
              data.tipoDeServico ||
              // Verificar se há qualquer propriedade que não seja apenas metadados
              (Object.keys(data).some(key => 
                !['message', 'status', 'success', 'workflow', 'id'].includes(key.toLowerCase())
              ))
            );
        }
        
        if (hasUsefulData) {
          // Armazenar dados recebidos para uso futuro
          setLevontechData(data);
          
          // ============================================================
          // PREENCHIMENTO AUTOMÁTICO DOS CAMPOS
          // ============================================================
          try {
            // O webhook retorna um array, então pegamos o primeiro elemento
            const protocoloData = Array.isArray(data) ? data[0] : data;
            
            if (protocoloData) {
              // Preencher Status
              if (protocoloData.status) {
                // Normalizar o status para corresponder às opções disponíveis
                const statusNormalizado = protocoloData.status
                  .toUpperCase()
                  .trim();
                
                // Mapear status do Levontech para os status do sistema
                const statusMap: Record<string, string> = {
                  "CONCLUIDO": "Concluído",
                  "CONCLUÍDO": "Concluído",
                  "EM ANDAMENTO": "Em Andamento",
                  "AGUARDANDO ANÁLISE": "Aguardando Análise",
                  "PENDENTE": "Pendente",
                  "CANCELADO": "Cancelado",
                };
                
                const statusMapeado = statusMap[statusNormalizado] || statusNormalizado;
                
                // Verificar se o status existe nas opções disponíveis
                if (statusOptionsUnicos.includes(statusMapeado)) {
                  form.setValue("status", statusMapeado);
                } else if (statusOptionsUnicos.some(s => s.toUpperCase() === statusNormalizado)) {
                  // Tentar encontrar por comparação case-insensitive
                  const statusEncontrado = statusOptionsUnicos.find(
                    s => s.toUpperCase() === statusNormalizado
                  );
                  if (statusEncontrado) {
                    form.setValue("status", statusEncontrado);
                  }
                }
              }
              
              // Preencher Prazo de Execução
              if (protocoloData.prazoExecucao) {
                try {
                  const dataPrazo = new Date(protocoloData.prazoExecucao);
                  if (!isNaN(dataPrazo.getTime())) {
                    form.setValue("prazoExecucao", dataPrazo);
                  }
                } catch (error) {
                  console.error("Erro ao converter data do prazo:", error);
                }
              }
              
              // Preencher dados do Solicitante
              if (protocoloData.solicitante) {
                const solicitante = protocoloData.solicitante;
                
                // Nome do Solicitante
                if (solicitante.nome) {
                  form.setValue("solicitante", solicitante.nome.trim());
                }
                
                // CPF/CNPJ
                if (solicitante.documento) {
                  const documentoFormatado = formatCPFCNPJ(solicitante.documento);
                  form.setValue("cpfCnpj", documentoFormatado);
                }
                
                // Telefone (pegar o primeiro telefone da lista)
                if (solicitante.telefones && Array.isArray(solicitante.telefones) && solicitante.telefones.length > 0) {
                  const telefoneFormatado = formatPhone(solicitante.telefones[0]);
                  form.setValue("telefone", telefoneFormatado);
                }
                
                // Email (pegar o primeiro email da lista)
                if (solicitante.emails && Array.isArray(solicitante.emails) && solicitante.emails.length > 0) {
                  form.setValue("email", solicitante.emails[0].trim());
                }
              }
              
              // Preencher Apresentante
              if (protocoloData.apresentante && protocoloData.apresentante.trim() !== "") {
                form.setValue("apresentante", protocoloData.apresentante.trim());
              }
              
              // Preencher Serviço
              if (protocoloData.tipoDeServico) {
                const servicoNome = protocoloData.tipoDeServico.trim();
                
                // Verificar se o serviço existe na lista de serviços disponíveis
                const servicoExiste = servicosDisponiveis.includes(servicoNome);
                
                if (servicoExiste) {
                  // Se o serviço existe, apenas adicionar se não estiver já selecionado
                  if (!servicosSelecionados.includes(servicoNome)) {
                    const novosServicos = [...servicosSelecionados, servicoNome];
                    setServicosSelecionados(novosServicos);
                    form.setValue("servicos", novosServicos);
                  }
                } else {
                  // Se o serviço não existir, criar automaticamente
                  try {
                    await createServico({
                      nome: servicoNome,
                      prazo_execucao: 3, // Valor padrão
                      dias_notificacao_antes_vencimento: 1, // Valor padrão
                      ativo: true,
                    });
                    
                    // Após criar, adicionar o serviço à lista de selecionados
                    if (!servicosSelecionados.includes(servicoNome)) {
                      const novosServicos = [...servicosSelecionados, servicoNome];
                      setServicosSelecionados(novosServicos);
                      form.setValue("servicos", novosServicos);
                    }
                    
                    // Mostrar mensagem informando que o serviço foi criado
                    toast.info(`Serviço "${servicoNome}" foi criado automaticamente e adicionado ao protocolo.`);
                  } catch (error) {
                    console.error("Erro ao criar serviço automaticamente:", error);
                    // Mesmo com erro, tentar adicionar o serviço ao formulário
                    if (!servicosSelecionados.includes(servicoNome)) {
                      const novosServicos = [...servicosSelecionados, servicoNome];
                      setServicosSelecionados(novosServicos);
                      form.setValue("servicos", novosServicos);
                    }
                    toast.warning(`Não foi possível criar o serviço "${servicoNome}" automaticamente, mas ele foi adicionado ao protocolo.`);
                  }
                }
              }
              
              // Preencher Observações
              if (protocoloData.observacoes) {
                form.setValue("observacao", protocoloData.observacoes.trim());
              }
              
              console.log("✅ Campos preenchidos automaticamente com dados do Levontech");
            }
          } catch (error) {
            console.error("Erro ao preencher campos automaticamente:", error);
            toast.warning("Dados recebidos, mas houve erro ao preencher alguns campos. Verifique manualmente.");
          }
          // ============================================================
          
          toast.success("Dados do protocolo consultados e preenchidos automaticamente no sistema Levontech");
        } else {
          // Webhook foi chamado mas não retornou dados úteis
          setLevontechData(null);
          toast.info("Protocolo consultado no Levontech, mas nenhum dado foi retornado. Preencha os campos manualmente.");
        }
      } else {
        // Se a resposta não for OK, tentar ler o erro da API route
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const errorText = await response.text().catch(() => "Erro desconhecido");
          errorData = { error: `Erro ${response.status}: ${response.statusText}`, details: errorText };
        }
        
        console.error("Erro na resposta da API:", response.status, errorData);
        
        // Mensagem mais específica para erro 404
        if (response.status === 404) {
          toast.error(
            errorData.details 
              ? `Webhook não encontrado (404): ${errorData.details}. Verifique se a URL está correta.`
              : "Webhook não encontrado (404). Verifique se a URL do webhook está configurada corretamente."
          );
        } else {
          toast.warning(
            errorData.error 
              ? `Não foi possível consultar dados no Levontech: ${errorData.error}` 
              : `Não foi possível consultar dados no Levontech (${response.status}). Preencha os campos manualmente.`
          );
        }
      }
    } catch (error: any) {
      console.error("Erro ao disparar webhook Levontech:", error);
      
      if (error.name === 'AbortError') {
        toast.error("Tempo de espera esgotado ao consultar o Levontech. Tente novamente.");
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        toast.error("Erro de conexão ao consultar o Levontech. Verifique sua internet e tente novamente.");
      } else {
        toast.warning("Erro ao consultar dados no Levontech. Preencha os campos manualmente.");
      }
    } finally {
      setConsultingLevontech(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Básicas</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="demanda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: 000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="protocolo"
              render={({ field }) => {
                const demandaValue = form.watch("demanda");
                const isDemandaFilled = demandaValue && demandaValue.trim() !== "";
                
                return (
                  <FormItem>
                    <FormLabel>Número do Protocolo *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Ex: CERT-2024-001"
                          {...field}
                          disabled={!isDemandaFilled}
                          onChange={(e) => {
                            field.onChange(e);
                            handleProtocolChange(e);
                          }}
                        />
                        {consultingLevontech && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                  {!isEditing && (
                    <div className="space-y-1">
                      {levontechLoading ? (
                        <p className="text-xs text-gray-500">
                          Carregando configuração Levontech...
                        </p>
                      ) : levontechConfig?.sistema_levontech ? (
                        <>
                          {consultingLevontech ? (
                            <p className="text-xs text-blue-600 flex items-center gap-1">
                              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 inline-block"></span>
                              Consultando dados no sistema Levontech...
                            </p>
                          ) : levontechData ? (
                            <p className="text-xs text-green-600">
                              ✓ Dados consultados com sucesso no Levontech
                            </p>
                          ) : form.watch("protocolo") && form.watch("protocolo").length >= 3 ? (
                            <p className="text-xs text-amber-600">
                              ⓘ Nenhum dado retornado do Levontech. Preencha os campos manualmente.
                            </p>
                          ) : (
                            <p className="text-xs text-blue-600">
                              Sistema Levontech ativo - dados serão consultados automaticamente ao preencher o protocolo
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Sistema Levontech não configurado
                        </p>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
                );
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptionsUnicos.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prazoExecucao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de Execução</FormLabel>
                  <FormControl>
                    <DatePicker
                      selected={field.value || null}
                      onChange={field.onChange}
                      placeholderText="Selecione a data"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          </div>

          {/* Dados do Solicitante */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dados do Solicitante</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="solicitante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome completo do solicitante"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpfCnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000.000.000-00"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleCPFCNPJChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(11) 99999-9999"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handlePhoneChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="email@exemplo.com"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleEmailChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

            <FormField
              control={form.control}
              name="apresentante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apresentante</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome do apresentante (se diferente do solicitante)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        {/* Serviços */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Serviços Solicitados *</h3>

          <div className="space-y-3">
            {servicosLoading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingAnimation size="md" variant="dots" />
              </div>
            ) : (
              <Select onValueChange={adicionarServico}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço para adicionar" />
                </SelectTrigger>
                <SelectContent>
                  {servicosDisponiveis.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      Nenhum serviço disponível. Configure os serviços na página
                      de Configurações.
                    </div>
                  ) : (
                    servicosDisponiveis
                      .filter(
                        (servico) => !servicosSelecionados.includes(servico)
                      )
                      .map((servico) => (
                        <SelectItem key={servico} value={servico}>
                          {servico}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            )}

            {servicosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {servicosSelecionados.map((servico) => (
                  <Badge
                    key={servico}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {servico}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removerServico(servico)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Avisos de prazos */}
          {avisosPrazos.length > 0 && (
            <div className="space-y-2 mt-2">
              {avisosPrazos.map((aviso, index) => (
                <div
                  key={`${aviso.servico}-${index}`}
                  className={`p-3 rounded-md text-sm ${
                    aviso.tipo === "warning"
                      ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
                      : aviso.tipo === "info"
                      ? "bg-blue-50 border border-blue-200 text-blue-800"
                      : "bg-green-50 border border-green-200 text-green-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-medium">
                      {aviso.tipo === "warning" ? "⚠️" : aviso.tipo === "info" ? "ℹ️" : "✅"}
                    </span>
                    <span>{aviso.mensagem}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {form.formState.errors.servicos && (
            <p className="text-sm text-red-500">
              {form.formState.errors.servicos.message}
            </p>
          )}
        </div>

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações adicionais sobre o protocolo..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {isEditing ? "Atualizar Protocolo" : "Cadastrar Protocolo"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProtocoloForm;
