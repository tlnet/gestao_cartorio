"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useNotifications } from "@/hooks/use-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Clock,
  Bot,
  FileText,
  Edit,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const NotificacoesPage = () => {
  const {
    notificacoes,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotificacao,
    getNotificacoesByTipo,
    getNotificacoesByPrioridade,
  } = useNotifications();

  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todos");
  const [busca, setBusca] = useState("");

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "prazo_vencimento":
        return <Clock className="h-4 w-4 text-orange-600" />;
      case "ia_processado":
        return <Bot className="h-4 w-4 text-purple-600" />;
      case "protocolo_criado":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "protocolo_atualizado":
        return <Edit className="h-4 w-4 text-green-600" />;
      case "sistema":
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
      case "info":
        return <Bell className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "prazo_vencimento":
        return "Prazo de Vencimento";
      case "ia_processado":
        return "Relatório de IA";
      case "protocolo_criado":
        return "Protocolo Criado";
      case "protocolo_atualizado":
        return "Protocolo Atualizado";
      case "sistema":
        return "Sistema";
      case "info":
        return "Informação";
      default:
        return "Outros";
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case "urgente":
        return "bg-red-100 text-red-800 border-red-200";
      case "alta":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "baixa":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const notificacoesFiltradas = notificacoes.filter((notificacao) => {
    const matchTipo = filtroTipo === "todos" || notificacao.tipo === filtroTipo;
    const matchPrioridade =
      filtroPrioridade === "todos" ||
      notificacao.prioridade === filtroPrioridade;
    const matchBusca =
      busca === "" ||
      notificacao.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      notificacao.mensagem.toLowerCase().includes(busca.toLowerCase());

    return matchTipo && matchPrioridade && matchBusca;
  });

  const handleNotificationClick = async (notificacao: any) => {
    if (!notificacao.lida) {
      await markAsRead(notificacao.id);
    }
  };

  const handleDeleteNotification = async (notificacaoId: string) => {
    await deleteNotificacao(notificacaoId);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout
          title="Notificações"
          subtitle="Gerencie suas notificações e alertas"
          userType="supervisor"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Skeleton className="h-4 w-4 rounded" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
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
        title="Notificações"
        subtitle="Gerencie suas notificações e alertas"
        userType="supervisor"
      >
        <div className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Notificações
                </CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notificacoes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Todas as notificações
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {unreadCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Requerem atenção
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {getNotificacoesByPrioridade("urgente").length}
                </div>
                <p className="text-xs text-muted-foreground">Prioridade alta</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os tipos</SelectItem>
                      <SelectItem value="prazo_vencimento">
                        Prazo de Vencimento
                      </SelectItem>
                      <SelectItem value="ia_processado">
                        Relatório de IA
                      </SelectItem>
                      <SelectItem value="protocolo_criado">
                        Protocolo Criado
                      </SelectItem>
                      <SelectItem value="protocolo_atualizado">
                        Protocolo Atualizado
                      </SelectItem>
                      <SelectItem value="sistema">Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select
                    value={filtroPrioridade}
                    onValueChange={setFiltroPrioridade}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">
                        Todas as prioridades
                      </SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar notificações..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {unreadCount > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar todas como lidas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Notificações */}
          <div className="space-y-4">
            {notificacoesFiltradas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhuma notificação encontrada
                  </h3>
                  <p className="text-gray-500">
                    {busca ||
                    filtroTipo !== "todos" ||
                    filtroPrioridade !== "todos"
                      ? "Tente ajustar os filtros para ver mais notificações."
                      : "Você não tem notificações no momento."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              notificacoesFiltradas.map((notificacao) => (
                <Card
                  key={notificacao.id}
                  className={cn(
                    "transition-all duration-200 hover:shadow-md cursor-pointer",
                    !notificacao.lida &&
                      "border-l-4 border-l-blue-500 bg-blue-50"
                  )}
                  onClick={() => handleNotificationClick(notificacao)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-1">
                          {getTipoIcon(notificacao.tipo)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4
                              className={cn(
                                "text-sm font-medium",
                                !notificacao.lida && "font-semibold"
                              )}
                            >
                              {notificacao.titulo}
                            </h4>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                getPrioridadeColor(notificacao.prioridade)
                              )}
                            >
                              {notificacao.prioridade}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {getTipoLabel(notificacao.tipo)}
                            </Badge>
                            {!notificacao.lida && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notificacao.mensagem}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>
                              {formatDistanceToNow(
                                new Date(
                                  notificacao.data_notificacao ||
                                    notificacao.created_at ||
                                    new Date()
                                ),
                                { addSuffix: true, locale: ptBR }
                              )}
                            </span>
                            {notificacao.data_vencimento && (
                              <span>
                                Vence:{" "}
                                {new Date(
                                  notificacao.data_vencimento
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notificacao.id);
                        }}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default NotificacoesPage;
