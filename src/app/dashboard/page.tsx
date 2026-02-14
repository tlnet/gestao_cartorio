"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import ProtocoloDetails from "@/components/protocolos/protocolo-details";
import ProtocoloForm from "@/components/protocolos/protocolo-form";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useProtocolos, useCartorios, useUsuarios } from "@/hooks/use-supabase";
import IANotifications from "@/components/notifications/ia-notifications";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Users,
  Building2,
} from "lucide-react";
import {
  parseLocalDate,
  formatDateForDisplay,
  formatDateForDatabase,
} from "@/lib/utils";

const Dashboard = () => {
  const {
    protocolos,
    loading: protocolosLoading,
    updateProtocolo,
  } = useProtocolos();
  const { cartorios, loading: cartoriosLoading } = useCartorios();
  const { usuarios, loading: usuariosLoading } = useUsuarios();

  const [metricas, setMetricas] = useState({
    processosHoje: 0,
    processosSemana: 0,
    processosMes: 0,
    processosVencendoPrazo: 0,
    totalCartorios: 0,
    totalUsuarios: 0,
    analisesIA: 0,
  });

  useEffect(() => {
    if (!protocolosLoading && !cartoriosLoading && !usuariosLoading) {
      const hoje = new Date();
      const inicioSemana = new Date(
        hoje.setDate(hoje.getDate() - hoje.getDay())
      );
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      const processosHoje = protocolos.filter((p) => {
        const dataProtocolo = new Date(p.created_at);
        return dataProtocolo.toDateString() === new Date().toDateString();
      }).length;

      const processosSemana = protocolos.filter((p) => {
        const dataProtocolo = new Date(p.created_at);
        return dataProtocolo >= inicioSemana;
      }).length;

      const processosMes = protocolos.filter((p) => {
        const dataProtocolo = new Date(p.created_at);
        return dataProtocolo >= inicioMes;
      }).length;

      const processosVencendoPrazo = protocolos.filter((p) => {
        if (!p.prazo_execucao) return false;
        // Excluir protocolos concluídos
        if (p.status === "Concluído") return false;
        const prazo = new Date(p.prazo_execucao);
        const hoje = new Date();
        const diffTime = prazo.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && diffDays >= 0;
      }).length;

      setMetricas({
        processosHoje,
        processosSemana,
        processosMes,
        processosVencendoPrazo,
        totalCartorios: cartorios.length,
        totalUsuarios: usuarios.length,
        analisesIA: 0, // Será implementado quando tivermos a funcionalidade de IA
      });
    }
  }, [
    protocolos,
    cartorios,
    usuarios,
    protocolosLoading,
    cartoriosLoading,
    usuariosLoading,
  ]);

  const [processosUltimos7Dias, setProcessosUltimos7Dias] = useState([
    { dia: "Seg", quantidade: 0 },
    { dia: "Ter", quantidade: 0 },
    { dia: "Qua", quantidade: 0 },
    { dia: "Qui", quantidade: 0 },
    { dia: "Sex", quantidade: 0 },
    { dia: "Sáb", quantidade: 0 },
    { dia: "Dom", quantidade: 0 },
  ]);

  const [distribuicaoStatus, setDistribuicaoStatus] = useState([
    { status: "Aguardando Análise", quantidade: 0, cor: "#f59e0b" },
    { status: "Em Andamento", quantidade: 0, cor: "#3b82f6" },
    { status: "Concluído", quantidade: 0, cor: "#10b981" },
    { status: "Pendente", quantidade: 0, cor: "#ef4444" },
  ]);

  useEffect(() => {
    if (!protocolosLoading) {
      // Calcular processos dos últimos 7 dias
      const ultimos7Dias = [];
      const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

      for (let i = 6; i >= 0; i--) {
        const data = new Date();
        data.setDate(data.getDate() - i);
        const diaSemana = diasSemana[data.getDay()];

        const quantidade = protocolos.filter((p) => {
          const dataProtocolo = new Date(p.created_at);
          return dataProtocolo.toDateString() === data.toDateString();
        }).length;

        ultimos7Dias.push({ dia: diaSemana, quantidade });
      }

      setProcessosUltimos7Dias(ultimos7Dias);

      // Calcular distribuição por status
      const statusCounts = protocolos.reduce((acc, protocolo) => {
        const status = protocolo.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      const distribuicao = [
        {
          status: "Aguardando Análise",
          quantidade: statusCounts["Aguardando Análise"] || 0,
          cor: "#f59e0b",
        },
        {
          status: "Em Andamento",
          quantidade: statusCounts["Em Andamento"] || 0,
          cor: "#3b82f6",
        },
        {
          status: "Concluído",
          quantidade: statusCounts["Concluído"] || 0,
          cor: "#10b981",
        },
        {
          status: "Pendente",
          quantidade: statusCounts["Pendente"] || 0,
          cor: "#ef4444",
        },
      ];

      setDistribuicaoStatus(distribuicao);
    }
  }, [protocolos, protocolosLoading]);

  const protocolosRecentes = protocolos
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5)
    .map((protocolo) => ({
      id: protocolo.id,
      protocolo: protocolo.protocolo,
      solicitante: protocolo.solicitante,
      cpfCnpj: protocolo.cpf_cnpj,
      telefone: protocolo.telefone,
      email: protocolo.email,
      demanda: protocolo.demanda,
      servicos: protocolo.servicos,
      status: protocolo.status,
      dataAbertura: protocolo.created_at,
      prazoExecucao: protocolo.prazo_execucao,
      observacao: protocolo.observacao || "Sem observações",
      apresentante: protocolo.apresentante || "",
    }));

  const [selectedProtocolo, setSelectedProtocolo] = useState<any>(null);
  const [showProtocoloForm, setShowProtocoloForm] = useState(false);
  const [editingProtocolo, setEditingProtocolo] = useState<any>(null);

  const handleProtocoloClick = (protocolo: any) => {
    setSelectedProtocolo(protocolo);
  };

  const handleCloseProtocoloDetails = () => {
    setSelectedProtocolo(null);
  };

  const handleEditProtocolo = (protocolo: any) => {
    // Converter prazo_execucao de string para Date se existir
    const prazoExecucao = protocolo.prazoExecucao
      ? parseLocalDate(protocolo.prazoExecucao)
      : undefined;

    // Mapear dados do protocolo para o formato esperado pelo formulário
    const protocoloEditavel = {
      id: protocolo.id,
      demanda: protocolo.demanda,
      protocolo: protocolo.protocolo,
      solicitante: protocolo.solicitante,
      cpfCnpj: protocolo.cpfCnpj,
      telefone: protocolo.telefone,
      email: protocolo.email,
      servicos: protocolo.servicos,
      status: protocolo.status,
      apresentante: protocolo.apresentante || "",
      observacao: protocolo.observacao || "",
      prazoExecucao,
    };
    setEditingProtocolo(protocoloEditavel);
    setShowProtocoloForm(true);
  };

  const handleCloseProtocoloForm = () => {
    setShowProtocoloForm(false);
    setEditingProtocolo(null);
  };

  const loading = protocolosLoading || cartoriosLoading || usuariosLoading;

  const getStatusColorClass = (status: string) => {
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

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout
          title="Dashboard"
          subtitle="Visão geral dos processos e métricas do cartório"
          userType="atendente"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout
        title="Dashboard"
        subtitle="Visão geral dos processos e métricas do cartório"
        userType="atendente"
      >
        <div className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Processos Hoje
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricas.processosHoje}
                </div>
                <p className="text-xs text-muted-foreground">
                  Novos protocolos hoje
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Esta Semana
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricas.processosSemana}
                </div>
                <p className="text-xs text-muted-foreground">
                  Protocolos esta semana
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricas.processosMes}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total do mês atual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Vencendo Prazo
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metricas.processosVencendoPrazo}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requer atenção imediata
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Notificações */}
          <div className="space-y-6">
            <IANotifications />
          </div>

          {/* Estatísticas Gerais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Cartórios
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricas.totalCartorios}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cadastrados no sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Usuários
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metricas.totalUsuarios}
                </div>
                <p className="text-xs text-muted-foreground">Usuários ativos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Análises IA
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.analisesIA}</div>
                <p className="text-xs text-muted-foreground">
                  Processadas este mês
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Barras - Últimos 7 dias */}
            <Card>
              <CardHeader>
                <CardTitle>Processos - Últimos 7 Dias</CardTitle>
                <CardDescription>
                  Quantidade de protocolos abertos por dia
                </CardDescription>
              </CardHeader>
              <CardContent>
                {processosUltimos7Dias.every(
                  (item) => item.quantidade === 0
                ) ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum protocolo nos últimos 7 dias
                    </h3>
                    <p className="text-gray-500">
                      Os dados aparecerão aqui conforme os protocolos forem
                      sendo cadastrados.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={processosUltimos7Dias}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quantidade" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Pizza - Distribuição por Status */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
                <CardDescription>
                  Status atual dos protocolos em andamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {distribuicaoStatus.every((item) => item.quantidade === 0) ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum protocolo para análise
                    </h3>
                    <p className="text-gray-500">
                      A distribuição por status aparecerá aqui conforme os
                      protocolos forem sendo cadastrados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={distribuicaoStatus}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ quantidade, percent }) =>
                            percent > 5 ? `${quantidade}` : ""
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="quantidade"
                        >
                          {distribuicaoStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.cor} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name, props) => [
                            `${value} protocolos`,
                            props.payload.status,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Legenda personalizada */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {distribuicaoStatus
                        .filter((item) => item.quantidade > 0)
                        .map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.cor }}
                            />
                            <span className="text-gray-700">
                              {item.status}: {item.quantidade}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Protocolos Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Protocolos Recentes</CardTitle>
              <CardDescription>
                Últimos protocolos cadastrados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {protocolosRecentes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum protocolo cadastrado
                  </h3>
                  <p className="text-gray-500">
                    Ainda não há protocolos no sistema. Os protocolos aparecerão
                    aqui conforme forem sendo cadastrados.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {protocolosRecentes.map((protocolo) => (
                    <div
                      key={protocolo.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">
                              #{protocolo.protocolo}
                            </p>
                            <p className="text-sm text-gray-600">
                              {protocolo.solicitante}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {protocolo.demanda}
                            </p>
                            <p className="text-xs text-gray-500">
                              Aberto em{" "}
                              {new Date(
                                protocolo.dataAbertura
                              ).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Prazo</p>
                          <p className="text-sm font-medium">
                            {formatDateForDisplay(protocolo.prazoExecucao)}
                          </p>
                        </div>
                        <Badge
                          className={getStatusColorClass(protocolo.status)}
                        >
                          {protocolo.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProtocoloClick(protocolo)}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal de Detalhes do Protocolo */}
          {selectedProtocolo && (
            <ProtocoloDetails
              isOpen={!!selectedProtocolo}
              protocolo={selectedProtocolo}
              onClose={handleCloseProtocoloDetails}
              onEdit={handleEditProtocolo}
              showEditButton={true}
            />
          )}

          {/* Modal de Edição do Protocolo */}
          {showProtocoloForm && (
            <Dialog
              open={showProtocoloForm}
              onOpenChange={setShowProtocoloForm}
            >
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
                  onSubmit={async (data) => {
                    try {
                      if (editingProtocolo) {
                        // Mapear dados do formulário para o formato do banco
                        const protocoloData = {
                          demanda: data.demanda,
                          protocolo: data.protocolo,
                          solicitante: data.solicitante,
                          cpf_cnpj: data.cpfCnpj,
                          telefone: data.telefone,
                          email: data.email,
                          servicos: data.servicos,
                          status: data.status,
                          apresentante: data.apresentante,
                          observacao: data.observacao,
                          prazo_execucao: data.prazoExecucao
                            ? formatDateForDatabase(data.prazoExecucao)
                            : null,
                        };

                        await updateProtocolo(
                          editingProtocolo.id,
                          protocoloData
                        );
                        handleCloseProtocoloForm();
                      }
                    } catch (error) {
                      console.error("Erro ao atualizar protocolo:", error);
                    }
                  }}
                  onCancel={handleCloseProtocoloForm}
                  initialData={editingProtocolo}
                  isEditing={!!editingProtocolo}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default Dashboard;
