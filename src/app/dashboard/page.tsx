"use client";

import React from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  // Dados mockados para demonstração
  const metricas = {
    processosHoje: 12,
    processosSemana: 89,
    processosMes: 342,
    processosVencendoPrazo: 5
  };

  const distribuicaoStatus = [
    { status: 'Aguardando Análise', quantidade: 45, cor: '#f59e0b' },
    { status: 'Em Andamento', quantidade: 32, cor: '#3b82f6' },
    { status: 'Concluído', quantidade: 78, cor: '#10b981' },
    { status: 'Pendente', quantidade: 15, cor: '#ef4444' }
  ];

  const processosUltimos7Dias = [
    { dia: 'Seg', quantidade: 12 },
    { dia: 'Ter', quantidade: 19 },
    { dia: 'Qua', quantidade: 15 },
    { dia: 'Qui', quantidade: 22 },
    { dia: 'Sex', quantidade: 18 },
    { dia: 'Sáb', quantidade: 8 },
    { dia: 'Dom', quantidade: 5 }
  ];

  const protocolosRecentes = [
    {
      id: '12345',
      solicitante: 'Maria Silva Santos',
      servico: 'Certidão de Nascimento',
      status: 'Em Andamento',
      dataAbertura: '2024-01-15',
      prazo: '2024-01-20'
    },
    {
      id: '12346',
      solicitante: 'João Carlos Oliveira',
      servico: 'Escritura de Compra e Venda',
      status: 'Aguardando Análise',
      dataAbertura: '2024-01-15',
      prazo: '2024-01-25'
    },
    {
      id: '12347',
      solicitante: 'Ana Paula Costa',
      servico: 'Procuração',
      status: 'Concluído',
      dataAbertura: '2024-01-14',
      prazo: '2024-01-19'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-green-100 text-green-800';
      case 'Em Andamento': return 'bg-blue-100 text-blue-800';
      case 'Aguardando Análise': return 'bg-yellow-100 text-yellow-800';
      case 'Pendente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
              <div className="text-2xl font-bold">{metricas.processosHoje}</div>
              <p className="text-xs text-muted-foreground">
                +2 desde ontem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.processosSemana}</div>
              <p className="text-xs text-muted-foreground">
                +12% em relação à semana passada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.processosMes}</div>
              <p className="text-xs text-muted-foreground">
                +8% em relação ao mês passado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencendo Prazo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metricas.processosVencendoPrazo}</div>
              <p className="text-xs text-muted-foreground">
                Requer atenção imediata
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
              {protocolosRecentes.map((protocolo) => (
                <div key={protocolo.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">#{protocolo.id}</p>
                        <p className="text-sm text-gray-600">{protocolo.solicitante}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{protocolo.servico}</p>
                        <p className="text-xs text-gray-500">
                          Aberto em {new Date(protocolo.dataAbertura).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Prazo</p>
                      <p className="text-sm font-medium">
                        {new Date(protocolo.prazo).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(protocolo.status)}>
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