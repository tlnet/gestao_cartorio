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
import { Plus, X, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
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
import { useUsuarios } from "@/hooks/use-supabase";
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
  responsavelServicoId: z
    .union([z.literal(""), z.string().uuid()])
    .optional()
    .transform((v) => (v === undefined ? "" : v)),
  entidadeId: z
    .union([z.literal(""), z.string().uuid()])
    .optional()
    .transform((v) => (v === undefined ? "" : v)),
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
  /** Filtra a lista de responsáveis pelos usuários deste cartório */
  cartorioId?: string;
  /** Habilita o campo Entidade (RCPn) */
  usaEntidadesRcpn?: boolean;
  /** Lista de entidades ativas para seleção */
  entidades?: { id: string; nome: string }[];
}

const ProtocoloForm: React.FC<ProtocoloFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
  cartorioId,
  usaEntidadesRcpn = false,
  entidades = [],
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
  const { servicos, loading: servicosLoading, createServico, fetchServicos } = useServicos();
  const { config: levontechConfig, loading: levontechLoading } = useLevontechConfig();
  const { user } = useAuth();
  const { usuarios: usuariosCartorio, loading: usuariosLoading } =
    useUsuarios(cartorioId);

  const usuariosAtivos = React.useMemo(
    () =>
      (usuariosCartorio || []).filter(
        (u: { ativo?: boolean }) => u.ativo !== false
      ),
    [usuariosCartorio]
  );
  
  // Estado para controlar loading do webhook
  const [consultingLevontech, setConsultingLevontech] = React.useState(false);
  
  // Estado para armazenar dados recebidos do webhook (preparado para uso futuro)
  const [levontechData, setLevontechData] = React.useState<any>(null);
  
  // Ref para debounce do webhook
  const webhookTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Estados para dialogs de serviço não encontrado
  const [showServicoNaoEncontradoDialog, setShowServicoNaoEncontradoDialog] = React.useState(false);
  const [servicoNaoEncontrado, setServicoNaoEncontrado] = React.useState<string>("");
  const [showCriarServicoDialog, setShowCriarServicoDialog] = React.useState(false);
  const [servicoForm, setServicoForm] = React.useState({
    nome: "",
    descricao: "",
    preco: "",
    prazo_execucao: 3,
    dias_notificacao_antes_vencimento: 1,
    ativo: true,
  });
  
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
      responsavelServicoId: initialData?.responsavelServicoId || "",
      entidadeId: initialData?.entidadeId || "",
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

  // Função para calcular e preencher o prazo de execução baseado nos serviços
  const calcularPrazoExecucao = React.useCallback((servicosParaCalcular: string[]) => {
    const prazoAtual = form.getValues("prazoExecucao");
    
    // Se já tiver prazo preenchido manualmente, não alterar
    if (prazoAtual) {
      return;
    }
    
    // Encontrar o maior prazo entre os serviços selecionados
    let maiorPrazo = 0;
    
    servicosParaCalcular.forEach((nomeServico) => {
      const servicoInfo = servicos.find((s) => s.nome === nomeServico);
      if (servicoInfo && servicoInfo.prazo_execucao) {
        if (servicoInfo.prazo_execucao > maiorPrazo) {
          maiorPrazo = servicoInfo.prazo_execucao;
        }
      }
    });
    
    // Se encontrou um prazo, calcular a data (hoje + prazo em dias)
    if (maiorPrazo > 0) {
      const dataPrazo = new Date();
      dataPrazo.setDate(dataPrazo.getDate() + maiorPrazo);
      dataPrazo.setHours(0, 0, 0, 0);
      
      form.setValue("prazoExecucao", dataPrazo);
      console.log(`✅ Prazo de execução calculado: ${dataPrazo.toLocaleDateString("pt-BR")} (${maiorPrazo} dias a partir de hoje)`);
    }
  }, [form, servicos]);

  const adicionarServico = (servico: string) => {
    if (!servicosSelecionados.includes(servico)) {
      const novosServicos = [...servicosSelecionados, servico];
      setServicosSelecionados(novosServicos);
      form.setValue("servicos", novosServicos);
      
      // Calcular e preencher prazo de execução se não estiver preenchido
      calcularPrazoExecucao(novosServicos);
      
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
              // IMPORTANTE: Só preencher se não tiver sido preenchido por um serviço
              // O prazo será calculado automaticamente quando o serviço for adicionado
              // Se a Levontech retornar um prazo, só usar se não houver serviço ou se o serviço ainda não foi processado
              const prazoAtual = form.getValues("prazoExecucao");
              if (protocoloData.prazoExecucao && !prazoAtual) {
                try {
                  const dataPrazo = new Date(protocoloData.prazoExecucao);
                  if (!isNaN(dataPrazo.getTime())) {
                    form.setValue("prazoExecucao", dataPrazo);
                    console.log("✅ Prazo de execução preenchido pela Levontech:", dataPrazo.toLocaleDateString("pt-BR"));
                  }
                } catch (error) {
                  console.error("Erro ao converter data do prazo:", error);
                }
              }
              
              // Preencher dados do Solicitante
              if (protocoloData.solicitante) {
                const solicitante = protocoloData.solicitante;
                
                // Nome do Solicitante
                if (solicitante.nome && typeof solicitante.nome === 'string') {
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
                if (solicitante.emails && Array.isArray(solicitante.emails) && solicitante.emails.length > 0 && solicitante.emails[0] && typeof solicitante.emails[0] === 'string') {
                  form.setValue("email", solicitante.emails[0].trim());
                }
              }
              
              // Preencher Apresentante
              if (protocoloData.apresentante && typeof protocoloData.apresentante === 'string' && protocoloData.apresentante.trim() !== "") {
                form.setValue("apresentante", protocoloData.apresentante.trim());
              }
              
              // Preencher Serviço
              if (protocoloData.tipoDeServico && typeof protocoloData.tipoDeServico === 'string') {
                const servicoNome = protocoloData.tipoDeServico.trim();
                
                // Normalizar nome do serviço para comparação (case-insensitive, sem espaços extras)
                const servicoNomeNormalizado = servicoNome.toLowerCase().trim();
                
                // Verificar se o serviço existe na lista de serviços disponíveis (comparação case-insensitive)
                const servicoExiste = servicosDisponiveis.some(
                  (s) => s.toLowerCase().trim() === servicoNomeNormalizado
                );
                
                if (servicoExiste) {
                  // Se o serviço existe, encontrar o nome exato (pode ter diferenças de capitalização)
                  const servicoExato = servicosDisponiveis.find(
                    (s) => s.toLowerCase().trim() === servicoNomeNormalizado
                  );
                  
                  // Adicionar o serviço usando o nome exato da lista (não o nome normalizado)
                  if (servicoExato && !servicosSelecionados.includes(servicoExato)) {
                    const novosServicos = [...servicosSelecionados, servicoExato];
                      setServicosSelecionados(novosServicos);
                      form.setValue("servicos", novosServicos);
                    
                    // Calcular e preencher prazo de execução se não estiver preenchido
                    calcularPrazoExecucao(novosServicos);
                    
                    console.log(`✅ Serviço "${servicoExato}" adicionado ao protocolo`);
                  }
                } else {
                  // Se o serviço não existir, mostrar dialog de confirmação
                  console.log(`⚠️ Serviço "${servicoNome}" não encontrado na lista de serviços.`);
                  setServicoNaoEncontrado(servicoNome);
                  setShowServicoNaoEncontradoDialog(true);
                }
              }
              
              // Preencher Observações
              if (protocoloData.observacoes && typeof protocoloData.observacoes === 'string') {
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

  // Função para abrir o dialog de criação de serviço
  const handleConfirmarCriarServico = () => {
    setShowServicoNaoEncontradoDialog(false);
    // Preencher o formulário com o nome do serviço retornado pela Levontech
    setServicoForm({
      nome: servicoNaoEncontrado,
      descricao: "",
      preco: "",
      prazo_execucao: 3,
      dias_notificacao_antes_vencimento: 1,
      ativo: true,
    });
    setShowCriarServicoDialog(true);
  };

  // Função para criar o serviço e adicionar ao protocolo
  const handleCriarServico = async () => {
    try {
      if (!servicoForm.nome.trim()) {
        toast.error("Nome do serviço é obrigatório");
        return;
      }

      // Validação: dias de notificação deve ser menor que prazo de execução
      if (
        servicoForm.dias_notificacao_antes_vencimento &&
        servicoForm.prazo_execucao &&
        servicoForm.dias_notificacao_antes_vencimento >= servicoForm.prazo_execucao
      ) {
        toast.error("Dias para notificação deve ser menor que o prazo de execução");
        return;
      }

      // Converter preço para número
      // O input aceita apenas números e vírgula, então convertemos para número
      const preco = servicoForm.preco
        ? (() => {
            const numbers = servicoForm.preco.replace(/[^\d,]/g, '');
            if (!numbers) return undefined;
            // Se tiver vírgula, é centavos (ex: "100,50" = 100.50)
            const parts = numbers.split(',');
            if (parts.length === 2) {
              return parseFloat(`${parts[0]}.${parts[1]}`);
            }
            // Se não tiver vírgula, é valor inteiro
            return parseFloat(numbers);
          })()
        : undefined;

      // Criar o serviço
      const novoServico = await createServico({
        nome: servicoForm.nome.trim(),
        descricao: servicoForm.descricao.trim() || undefined,
        preco: preco,
        prazo_execucao: servicoForm.prazo_execucao,
        dias_notificacao_antes_vencimento: servicoForm.dias_notificacao_antes_vencimento,
        ativo: servicoForm.ativo,
      });

      console.log(`✅ Serviço "${servicoForm.nome}" criado com sucesso:`, novoServico);

      // Recarregar a lista de serviços
      if (fetchServicos) {
        await fetchServicos();
      }

      // Adicionar o serviço ao protocolo
      if (!servicosSelecionados.includes(servicoForm.nome.trim())) {
        const novosServicos = [...servicosSelecionados, servicoForm.nome.trim()];
        setServicosSelecionados(novosServicos);
        form.setValue("servicos", novosServicos);
        
        // Calcular prazo de execução usando o serviço recém-criado
        const prazoAtual = form.getValues("prazoExecucao");
        if (!prazoAtual && novoServico && novoServico.prazo_execucao) {
          const dataPrazo = new Date();
          dataPrazo.setDate(dataPrazo.getDate() + novoServico.prazo_execucao);
          dataPrazo.setHours(0, 0, 0, 0);
          form.setValue("prazoExecucao", dataPrazo);
          console.log(`✅ Prazo de execução calculado: ${dataPrazo.toLocaleDateString("pt-BR")} (${novoServico.prazo_execucao} dias a partir de hoje)`);
        } else {
          // Se não conseguiu usar o serviço recém-criado, aguardar e usar a função normal
          await new Promise(resolve => setTimeout(resolve, 200));
          calcularPrazoExecucao(novosServicos);
        }
        
        console.log(`✅ Serviço "${servicoForm.nome}" adicionado ao protocolo após criação`);
      }

      // Fechar dialog e resetar formulário
      setShowCriarServicoDialog(false);
      setServicoForm({
        nome: "",
        descricao: "",
        preco: "",
        prazo_execucao: 3,
        dias_notificacao_antes_vencimento: 1,
        ativo: true,
      });

      toast.success(`Serviço "${servicoForm.nome}" criado e adicionado ao protocolo com sucesso!`);
    } catch (error) {
      console.error("❌ Erro ao criar serviço:", error);
      // Erro já tratado no hook useServicos
    }
  };

  return (
    <>
      {/* Dialog de confirmação - Serviço não encontrado */}
      <AlertDialog open={showServicoNaoEncontradoDialog} onOpenChange={setShowServicoNaoEncontradoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Serviço não encontrado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              O serviço <strong>"{servicoNaoEncontrado}"</strong> retornado pela Levontech não foi encontrado na lista de serviços disponíveis.
              <br /><br />
              Deseja criar este serviço agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarCriarServico}>
              Criar Serviço
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de criação de serviço */}
      <Dialog open={showCriarServicoDialog} onOpenChange={setShowCriarServicoDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Serviço</DialogTitle>
            <DialogDescription>
              Configure um novo serviço oferecido pelo cartório
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nomeServico">Nome do Serviço *</Label>
              <Input
                id="nomeServico"
                placeholder="Ex: Certidão de Nascimento"
                value={servicoForm.nome}
                onChange={(e) =>
                  setServicoForm((prev) => ({
                    ...prev,
                    nome: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="descricaoServico">Descrição</Label>
              <Textarea
                id="descricaoServico"
                placeholder="Descrição do serviço"
                value={servicoForm.descricao}
                onChange={(e) =>
                  setServicoForm((prev) => ({
                    ...prev,
                    descricao: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="precoServico">Preço (R$)</Label>
              <Input
                id="precoServico"
                type="text"
                placeholder="0,00"
                value={servicoForm.preco}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d,]/g, '');
                  setServicoForm((prev) => ({
                    ...prev,
                    preco: value,
                  }));
                }}
              />
            </div>
            <div>
              <Label htmlFor="prazoServico">Prazo de Execução (dias) *</Label>
              <Input
                id="prazoServico"
                type="number"
                min="1"
                value={servicoForm.prazo_execucao}
                onChange={(e) =>
                  setServicoForm((prev) => ({
                    ...prev,
                    prazo_execucao: parseInt(e.target.value) || 3,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="diasNotificacaoServico">
                Dias para Notificação de Vencimento *
              </Label>
              <Input
                id="diasNotificacaoServico"
                type="number"
                min="1"
                max={servicoForm.prazo_execucao - 1}
                value={servicoForm.dias_notificacao_antes_vencimento}
                onChange={(e) =>
                  setServicoForm((prev) => ({
                    ...prev,
                    dias_notificacao_antes_vencimento: parseInt(e.target.value) || 1,
                  }))
                }
              />
              <p className="text-sm text-gray-500 mt-1">
                Quantos dias antes do vencimento receber notificação via WhatsApp
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativoServico"
                checked={servicoForm.ativo}
                onCheckedChange={(checked) =>
                  setServicoForm((prev) => ({
                    ...prev,
                    ativo: checked,
                  }))
                }
              />
              <Label htmlFor="ativoServico">Serviço ativo</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCriarServicoDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleCriarServico}>
                Criar e Adicionar ao Protocolo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="responsavelServicoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável pelo serviço</FormLabel>
                    <Select
                      value={field.value ? field.value : "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? "" : v)
                      }
                      disabled={usuariosLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              usuariosLoading
                                ? "Carregando usuários..."
                                : "Selecione um usuário"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {usuariosAtivos.map((u: { id: string; name?: string; email?: string }) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name || u.email || u.id}
                            {u.name && u.email
                              ? ` (${u.email})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Entidade (RCPn) */}
            {usaEntidadesRcpn && entidades.length > 0 && (
              <FormField
                control={form.control}
                name="entidadeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entidade</FormLabel>
                    <Select
                      value={field.value ? field.value : "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? "" : v)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma entidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {entidades.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
    </>
  );
};

export default ProtocoloForm;
