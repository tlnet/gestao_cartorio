"use client";

import React from 'react';
import MainLayout from '@/components/layout/main-layout';
import { useProtocolos, useCartorios, useUsuarios, useRelatoriosIA } from '@/hooks/use-supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  LineChart,
  Line
} from 'recharts';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Users,
  Building2
} from 'lucide-react';

const Dashboard = () => {
  const { protocolos, loading: loadingProtocolos } = useProtocolos();
  const { cartorios, loading: loadingCartorios } = useCartorios();
  const { usuarios, loading: loadingUsuarios } = useUsuarios();
  const { relatorios, loading: loadingRelatorios } = useRelatoriosIA();

  const loading = loadingProtocolos || loadingCartorios || loadingUsuarios || loadingRelatorios;

  // Calcular métricas em tempo real
  const hoje = new Date();
  const inicioSemana = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - hoje.getDay());
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const processosHoje = protocolos.filter(p => {
    const dataProtocolo = new Date(p.created_at);
    return dataProtocolo.toDateString() === hoje.toDateString();
  }).length;

  const processosSemana = protocolos.filter(p => {
    const dataProtocolo = new Date(p.created_at);
    return dataProtocolo >= inicioSemana;
  }).length;

  const processosMes = protocolos.filter(p => {
    const dataProtocolo = new Date(p.created_at);
    return dataProtocolo >= inicioMes;
  }).length;

  const processosVencendoPrazo = protocolos.filter(p => {
    if (!p.prazo_execucao) return false;
    const prazo = new Date(p.prazo_execucao);
    const diffTime = prazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  }).length;

  // Distribuição por status
  const statusCount = protocolos.reduce((acc, protocolo) => {
    acc[protocolo.status] = (acc[protocolo.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distribuicaoStatus = Object.entries(statusCount).map(([status, quantidade]) => ({
    status,
    quantidade,
    cor: getStatusColor(status)
  }));

  function getStatusColor(status: string) {
    switch (status) {
      case 'Aguardando Análise': return '#f59e0b';
      case 'Em Andamento': return '#3b82f6';
      case 'Concluído': return '#10b981';
      case 'Pendente': return '#ef4444';
      default: return '#6b7280';
    }
  }

  // Dados dos últimos 7 dias
  const processosUltimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const data = new Date(hoje);
    data.setDate(data.getDate() - (6 - i));
    
    const quantidade = protocolos.filter(p => {
      const dataProtocolo = new Date(p.created_at);
      return dataProtocolo.toDateString() === data.toDateString();
    }).length;

    return {
      dia: data.toLocaleDateString('pt-BR', { weekday: 'short' }),
      quantidade
    };
  });

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-green-100 text-green-800';
      case 'Em Andamento': return 'bg-blue-100 text-blue-800';
      case 'Aguardando Análise': return 'bg-yellow-100 text-yellow-800';
      case 'Pendente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <MainLayout 
        title="Dashboard" 
        subtitle="Visão geral dos processos e métricas do cartório"
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
    );
  }

  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Visão geral dos processos e métricas do cartório"
    >
      <div className="space-y-6">
        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processos Hoje</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processosHoje}</div>
              <p className="text-xs text-muted-foreground">
                Novos protocolos hoje
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processosSemana}</div>
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
              <div className="text-2xl font-bold">{processosMes}</div>
              <p className="text-xs text-muted-foreground">
                Total do mês atual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencendo Prazo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{processosVencendoPrazo}</div>
              <p className="text-xs text-muted-foreground">
                Requer atenção imediata
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cartórios</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cartorios.length}</div>
              <p className="text-xs text-muted-foreground">
                {cartorios.filter(c => c.ativo).length} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.length}</div>
              <p className="text-xs text-muted-foreground">
                {usuarios.filter(u => u.ativo).length} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Análises IA</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{relatorios.length}</div>
              <p className="text-xs text-muted-foreground">
                {relatorios.filter(r => r.status === 'concluido').length} concluídas
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={processosUltimos7Dias}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribuicaoStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, quantidade }) => `${status}: ${quantidade}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="quantidade"
                  >
                    {distribuicaoStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
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
            <div className="space-y-4">
              {protocolos.slice(0, 5).map((protocolo) => (
                <div key={protocolo.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">#{protocolo.protocolo}</p>
                        <p className="text-sm text-gray-600">{protocolo.solicitante}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{protocolo.demanda}</p>
                        <p className="text-xs text-gray-500">
                          Aberto em {new Date(protocolo.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Prazo</p>
                      <p className="text-sm font-medium">
                        {protocolo.prazo_execucao ? 
                          new Date(protocolo.prazo_execucao).toLocaleDateString('pt-BR') : 
                          'Não definido'
                        }
                      </p>
                    </div>
                    <Badge className={getStatusColorClass(protocolo.status)}>
                      {protocolo.status}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;