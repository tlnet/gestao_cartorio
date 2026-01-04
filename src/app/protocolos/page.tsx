"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/layout/main-layout";
import ProtocoloForm from "@/components/protocolos/protocolo-form";
import ProtocoloDetails from "@/components/protocolos/protocolo-details";
import StatusSelector from "@/components/protocolos/status-selector";
import { useProtocolos, useCartorios } from "@/hooks/use-supabase";
import { useStatusPersonalizados } from "@/hooks/use-status-personalizados";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LoadingAnimation } from "@/components/ui/loading-spinner";
import { StaggeredCards, FadeInUp } from "@/components/ui/page-transition";
import {
  parseLocalDate,
  formatDateForDisplay,
  formatDateForDatabase,
} from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Clock,
  FileText,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from "lucide-react";

const ProtocolosContent = () => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const {
    protocolos,
    loading,
    createProtocolo,
    updateProtocolo,
    deleteProtocolo,
    refetch: refetchProtocolos,
  } = useProtocolos();
  const { cartorios } = useCartorios();
  const { statusPersonalizados } = useStatusPersonalizados();
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProtocolo, setSelectedProtocolo] = useState<any>(null);
  const [editingProtocolo, setEditingProtocolo] = useState<any>(null);
  const [localProtocolos, setLocalProtocolos] = useState<any[]>([]);
  const [showConcluidos, setShowConcluidos] = useState(false);
  const [showServicosModal, setShowServicosModal] = useState(false);
  const [servicosModalData, setServicosModalData] = useState<{
    protocolo: string;
    servicos: string[];
  } | null>(null);

  // Sincronizar estado local com estado global
  React.useEffect(() => {
    setLocalProtocolos(protocolos);
  }, [protocolos]);

  // Ler parâmetro de busca da URL
  useEffect(() => {
    const searchQuery = searchParams.get("search");
    if (searchQuery) {
      setBusca(searchQuery);
    }
  }, [searchParams]);

  // Criar opções de status combinando padrão e personalizados
  const statusOptions = [
    { value: "todos", label: "Todos os Status" },
    { value: "aguardando", label: "Aguardando Análise" },
    { value: "andamento", label: "Em Andamento" },
    { value: "concluido", label: "Concluído" },
    { value: "pendente", label: "Pendente" },
    // Adicionar apenas status personalizados que não sejam duplicatas dos padrão
    ...statusPersonalizados
      .filter((status) => {
        const statusPadrao = [
          "Aguardando Análise",
          "Em Andamento",
          "Concluído",
          "Pendente",
        ];
        return !statusPadrao.includes(status.nome);
      })
      .map((status) => ({
        value: status.id,
        label: status.nome,
      })),
  ];

  const getStatusColor = (status: string) => {
    // Verificar se é um status personalizado
    const statusPersonalizado = statusPersonalizados.find(
      (s) => s.nome === status
    );
    if (statusPersonalizado) {
      // Usar a cor personalizada
      const corBase = statusPersonalizado.cor;
      return `bg-${corBase}-100 text-${corBase}-800`;
    }

    // Status padrão
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

  const isPrazoVencendo = (prazo: string) => {
    if (!prazo) return false;
    const hoje = new Date();
    const dataPrazo = new Date(prazo);
    const diffTime = dataPrazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  };

  // Função para destacar termos de busca
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    return text.replace(
      regex,
      '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
    );
  };

  // Função para verificar se um protocolo está concluído
  const isProtocoloConcluido = (protocolo: any) => {
    return protocolo.status === "Concluído";
  };

  // Função para filtrar protocolos por busca
  const filtrarPorBusca = (protocolo: any) => {
    if (busca === "") return true;

    const searchTerm = busca.toLowerCase();

    // Busca no nome do solicitante
    const matchSolicitante =
      protocolo.solicitante?.toLowerCase().includes(searchTerm) || false;

    // Busca no número do protocolo
    const matchProtocolo =
      protocolo.protocolo?.toLowerCase().includes(searchTerm) || false;

    // Busca no CPF/CNPJ (com e sem formatação)
    const cpfCnpjClean = protocolo.cpf_cnpj?.replace(/\D/g, "") || "";
    const buscaClean = searchTerm.replace(/\D/g, "");
    const matchCpfCnpj =
      cpfCnpjClean.includes(buscaClean) ||
      protocolo.cpf_cnpj?.toLowerCase().includes(searchTerm) ||
      false;

    // Busca nos serviços (array de strings)
    const matchServicos =
      protocolo.servicos?.some((servico: string) =>
        servico.toLowerCase().includes(searchTerm)
      ) || false;

    // Busca na demanda
    const matchDemanda =
      protocolo.demanda?.toLowerCase().includes(searchTerm) || false;

    // Busca no apresentante
    const matchApresentante =
      protocolo.apresentante?.toLowerCase().includes(searchTerm) || false;

    // Busca no email
    const matchEmail =
      protocolo.email?.toLowerCase().includes(searchTerm) || false;

    return (
      matchSolicitante ||
      matchProtocolo ||
      matchCpfCnpj ||
      matchServicos ||
      matchDemanda ||
      matchApresentante ||
      matchEmail
    );
  };

  // Função para filtrar protocolos por status
  const filtrarPorStatus = (protocolo: any) => {
    if (filtroStatus === "todos") return true;

    // Status padrão
    const statusPadrao = {
      aguardando: "Aguardando Análise",
      andamento: "Em Andamento",
      concluido: "Concluído",
      pendente: "Pendente",
    };

    // Verificar se é um status padrão
    if (statusPadrao[filtroStatus as keyof typeof statusPadrao]) {
      return (
        protocolo.status ===
        statusPadrao[filtroStatus as keyof typeof statusPadrao]
      );
    }

    // Verificar se é um status personalizado
    const statusPersonalizado = statusPersonalizados.find(
      (s) => s.id === filtroStatus
    );
    if (statusPersonalizado) {
      return protocolo.status === statusPersonalizado.nome;
    }

    return false;
  };

  // Separar protocolos em concluídos e em aberto
  const protocolosConcluidos = localProtocolos.filter(
    (protocolo) => isProtocoloConcluido(protocolo) && filtrarPorBusca(protocolo)
  );

  // Protocolos em aberto são todos os que NÃO estão concluídos
  const protocolosEmAberto = localProtocolos.filter(
    (protocolo) =>
      !isProtocoloConcluido(protocolo) &&
      filtrarPorBusca(protocolo) &&
      filtrarPorStatus(protocolo)
  );

  // Estatísticas
  const totalProtocolos = localProtocolos.length;
  const totalConcluidos = protocolosConcluidos.length;
  const totalEmAberto = protocolosEmAberto.length;

  const handleSubmitProtocolo = async (data: any) => {
    try {
      console.log("=== INÍCIO HANDLE SUBMIT PROTOCOLO ===");
      console.log(
        "Dados recebidos do formulário:",
        JSON.stringify(data, null, 2)
      );
      console.log("Usuário atual:", user);

      if (!user?.id) {
        console.error("Usuário não autenticado");
        toast.error("Usuário não autenticado");
        return;
      }

      console.log("Buscando cartório do usuário...");
      // Buscar cartório do usuário
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      console.log("Resposta da busca do usuário:", { userData, userError });

      if (userError || !userData?.cartorio_id) {
        console.error("Erro ao buscar cartório do usuário:", userError);
        toast.error("Usuário não possui cartório associado");
        return;
      }

      console.log("Cartório encontrado:", userData.cartorio_id);

      // Mapear campos do formulário para o banco de dados
      const protocoloData = {
        protocolo: data.protocolo,
        demanda: data.demanda,
        solicitante: data.solicitante,
        cpf_cnpj: data.cpfCnpj, // Mapear cpfCnpj para cpf_cnpj
        telefone: data.telefone,
        email: data.email || null,
        apresentante: data.apresentante || null,
        servicos: Array.isArray(data.servicos)
          ? data.servicos
          : [data.servicos],
        status: data.status,
        observacao: data.observacao || null,
        prazo_execucao: data.prazoExecucao
          ? formatDateForDatabase(data.prazoExecucao)
          : null,
        cartorio_id: userData.cartorio_id,
        criado_por: user.id,
      };

      console.log(
        "Dados mapeados para o banco:",
        JSON.stringify(protocoloData, null, 2)
      );

      if (editingProtocolo) {
        console.log("Editando protocolo existente:", editingProtocolo.id);
        await updateProtocolo(editingProtocolo.id, protocoloData);
        setEditingProtocolo(null);
      } else {
        console.log("Criando novo protocolo...");
        await createProtocolo(protocoloData);
      }

      console.log("Protocolo processado com sucesso!");
      setShowForm(false);
    } catch (error) {
      console.error("Erro no handleSubmitProtocolo:", error);
      // Erro já tratado no hook
    }
  };

  const handleViewDetails = (protocolo: any) => {
    setSelectedProtocolo(protocolo);
    setShowDetails(true);
  };

  const handleEditProtocolo = (protocolo: any) => {
    // Converter prazo_execucao de string para Date se existir
    const prazoExecucao = protocolo.prazo_execucao
      ? parseLocalDate(protocolo.prazo_execucao)
      : undefined;

    const protocoloComData = {
      ...protocolo,
      cpfCnpj: protocolo.cpf_cnpj, // Mapear cpf_cnpj para cpfCnpj
      prazoExecucao,
    };
    setEditingProtocolo(protocoloComData);
    setShowForm(true);
  };

  const handleNewProtocolo = () => {
    setEditingProtocolo(null);
    setShowForm(true);
  };

  const handleStatusChange = (protocoloId: string, newStatus: string) => {
    // Atualizar estado local imediatamente para feedback visual
    setLocalProtocolos((prev) =>
      prev.map((protocolo) =>
        protocolo.id === protocoloId
          ? { ...protocolo, status: newStatus }
          : protocolo
      )
    );
  };

  if (loading) {
    return (
      <MainLayout
        title="Gestão de Protocolos"
        subtitle="Controle completo dos processos do cartório"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="Gestão de Protocolos"
      subtitle="Controle completo dos processos do cartório"
    >
      <div className="space-y-6">
        {/* Header com ações */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, protocolo, CPF/CNPJ, serviço..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por Status */}
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botão Novo Protocolo */}
          <Button onClick={handleNewProtocolo}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Protocolo
          </Button>
        </div>

        {/* Mensagem de busca ativa */}
        {busca && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  Buscando por: "{busca}"
                </span>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-800"
                >
                  {totalEmAberto + totalConcluidos} resultado
                  {totalEmAberto + totalConcluidos !== 1 ? "s" : ""}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBusca("")}
                className="text-blue-600 hover:text-blue-800"
              >
                Limpar busca
              </Button>
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <FadeInUp delay={100}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Protocolos
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProtocolos}</div>
                <p className="text-xs text-muted-foreground">
                  Cadastrados no sistema
                </p>
              </CardContent>
            </Card>
          </FadeInUp>

          <FadeInUp delay={200}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {totalEmAberto}
                </div>
                <p className="text-xs text-muted-foreground">
                  Aguardando processamento
                </p>
              </CardContent>
            </Card>
          </FadeInUp>

          <FadeInUp delay={300}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Concluídos
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {totalConcluidos}
                </div>
                <p className="text-xs text-muted-foreground">
                  Processos finalizados
                </p>
              </CardContent>
            </Card>
          </FadeInUp>

          <FadeInUp delay={400}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Vencendo Prazo
                </CardTitle>
                <Clock className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {
                    localProtocolos.filter(
                      (p) =>
                        p.prazo_execucao &&
                        isPrazoVencendo(p.prazo_execucao) &&
                        p.status !== "Concluído"
                    ).length
                  }
                </div>
                <p className="text-xs text-muted-foreground">Requer atenção</p>
              </CardContent>
            </Card>
          </FadeInUp>
        </div>

        {/* Seção de Protocolos em Aberto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Protocolos em Aberto ({totalEmAberto})
            </CardTitle>
            <CardDescription>
              Protocolos que ainda estão sendo processados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalEmAberto === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum protocolo em aberto
                </h3>
                <p className="text-gray-500">
                  Todos os protocolos foram concluídos ou não há protocolos
                  cadastrados.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Demanda</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data Abertura</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {protocolosEmAberto.map((protocolo) => (
                    <TableRow key={protocolo.id}>
                      <TableCell className="font-medium">
                        {protocolo.protocolo}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{protocolo.solicitante}</p>
                          <p className="text-sm text-gray-500">
                            {protocolo.cpf_cnpj}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{protocolo.demanda}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {Array.isArray(protocolo.servicos) && protocolo.servicos.length > 0 ? (
                            <>
                              {protocolo.servicos.slice(0, 2).map((servico: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {servico}
                                </Badge>
                              ))}
                              {protocolo.servicos.length > 2 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5"
                                  onClick={() => {
                                    setServicosModalData({
                                      protocolo: protocolo.protocolo,
                                      servicos: protocolo.servicos,
                                    });
                                    setShowServicosModal(true);
                                  }}
                                >
                                  <span className="text-xs text-gray-500">
                                    +{protocolo.servicos.length - 2}
                                  </span>
                                </Button>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDateForDisplay(protocolo.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>
                            {formatDateForDisplay(protocolo.prazo_execucao)}
                          </span>
                          {protocolo.prazo_execucao &&
                            isPrazoVencendo(protocolo.prazo_execucao) && (
                              <Clock className="h-4 w-4 text-red-500" />
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusSelector
                          protocoloId={protocolo.id}
                          currentStatus={protocolo.status}
                          onStatusChange={(newStatus) => {
                            handleStatusChange(protocolo.id, newStatus);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(protocolo)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProtocolo(protocolo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Seção de Protocolos Concluídos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle>Protocolos Concluídos ({totalConcluidos})</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConcluidos(!showConcluidos)}
                className="flex items-center gap-2"
              >
                {showConcluidos ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Mostrar
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Protocolos que foram finalizados com sucesso
            </CardDescription>
          </CardHeader>
          {showConcluidos && (
            <CardContent>
              {totalConcluidos === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum protocolo concluído
                  </h3>
                  <p className="text-gray-500">
                    Os protocolos concluídos aparecerão aqui quando forem
                    finalizados.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Demanda</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Data Abertura</TableHead>
                      <TableHead>Data Conclusão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {protocolosConcluidos.map((protocolo) => (
                      <TableRow key={protocolo.id} className="bg-green-50/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {protocolo.protocolo}
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {protocolo.solicitante}
                            </p>
                            <p className="text-sm text-gray-500">
                              {protocolo.cpf_cnpj}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{protocolo.demanda}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {Array.isArray(protocolo.servicos) && protocolo.servicos.length > 0 ? (
                              <>
                                {protocolo.servicos.slice(0, 2).map((servico: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {servico}
                                  </Badge>
                                ))}
                                {protocolo.servicos.length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1.5"
                                    onClick={() => {
                                      setServicosModalData({
                                        protocolo: protocolo.protocolo,
                                        servicos: protocolo.servicos,
                                      });
                                      setShowServicosModal(true);
                                    }}
                                  >
                                    <MoreHorizontal className="h-3 w-3 text-gray-500" />
                                    <span className="text-xs text-gray-500 ml-0.5">
                                      +{protocolo.servicos.length - 2}
                                    </span>
                                  </Button>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDateForDisplay(protocolo.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 font-medium">
                              {protocolo.data_conclusao
                                ? formatDateForDisplay(protocolo.data_conclusao)
                                : formatDateForDisplay(protocolo.updated_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusSelector
                              protocoloId={protocolo.id}
                              currentStatus={protocolo.status}
                              onStatusChange={(newStatus) => {
                                handleStatusChange(protocolo.id, newStatus);
                              }}
                            />
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Concluído
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(protocolo)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProtocolo(protocolo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          )}
        </Card>

        {/* Modal de Formulário */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProtocolo
                  ? "Editar Protocolo"
                  : "Cadastrar Novo Protocolo"}
              </DialogTitle>
              <DialogDescription>
                {editingProtocolo
                  ? "Atualize as informações do protocolo"
                  : "Preencha as informações do novo protocolo"}
              </DialogDescription>
            </DialogHeader>
            <ProtocoloForm
              onSubmit={handleSubmitProtocolo}
              onCancel={() => setShowForm(false)}
              initialData={editingProtocolo}
              isEditing={!!editingProtocolo}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de Detalhes */}
        {selectedProtocolo && (
          <ProtocoloDetails
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            onEdit={handleEditProtocolo}
            protocolo={{
              ...selectedProtocolo,
              dataAbertura: selectedProtocolo.created_at,
              prazoExecucao:
                selectedProtocolo.prazo_execucao || new Date().toISOString(),
            }}
          />
        )}

        {/* Modal de Serviços */}
        <Dialog open={showServicosModal} onOpenChange={setShowServicosModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Serviços do Protocolo</DialogTitle>
              <DialogDescription>
                {servicosModalData && `Protocolo: ${servicosModalData.protocolo}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {servicosModalData && servicosModalData.servicos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {servicosModalData.servicos.map((servico: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {servico}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum serviço encontrado</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

const Protocolos = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingAnimation size="lg" variant="dots" />
        </div>
      }
    >
      <ProtocolosContent />
    </Suspense>
  );
};

export default Protocolos;
