"use client";

import React from 'react';
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
  Cell
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
  // Dados mockados para evitar chamadas de API durante o build
  const metricas = {
    processosHoje: 8,
    processosSemana: 45,
    processosMes: 187,
    processosVencendoPrazo: 3,
    totalCartorios: 5,
    totalUsuarios: 12,
    analisesIA: 23
  };

  const processosUltimos7Dias = [
    { dia: 'Seg', quantidade: 12 },
    { dia: 'Ter', quantidade: 8 },
    { dia: 'Qua', quantidade: 15 },
    { dia: 'Qui', quantidade: 10 },
    { dia: 'Sex', quantidade: 18 },
    { dia: 'Sáb', quantidade: 5 },
    { dia: 'Dom', quantidade: 3 }
  ];

  const distribuicaoStatus = [
    { status: 'Aguardando Análise', quantidade: 25, cor: '#f59e0b' },
    { status: 'Em Andamento', quantidade: 18, cor: '#3b82f6' },
    { status: 'Concluído', quantidade: 42, cor: '#10b981' },
    { status: 'Pendente', quantidade: 8, cor: '#ef4444' }
  ];

  const protocolosRecentes = [
    {
      id: '1',
      protocolo: 'CERT-2024-001',
      solicitante: 'João Silva',
      demanda: 'Certidão de Nascimento',
      status: 'Em Andamento',
      dataAbertura: '2024-01-15',
      prazo: '2024-01-18'
    },
    {
      id: '2',
      protocolo: 'ESC-2024-002',
      solicitante: 'Maria Santos',
      demanda: 'Escritura de Compra e Venda',
      status: 'Aguardando Análise',
      dataAbertura: '2024-01-15',
      prazo: '2024-01-30'
    },
    {
      id: '3',
      protocolo: 'PROC-2024-003',
      solicitante: 'Carlos Lima',
      demanda: 'Procuração',
      status: 'Concluído',
      dataAbertura: '2024-01-14',
      prazo: '2024-01-17'
    }
  ];

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-green-100 text-green-800';
      case 'Em Andamento': return 'bg-blue-100 text-blue-800';
      case 'Aguardando Análise': return 'bg-yellow-100 text-yellow-800';
      case 'Pendente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Visão geral dos processos e métricas do cartório</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
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
              <div className="text-2xl font-bold">{metricas.processosSemana}</div>
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
              <div className="text-2xl font-bold">{metricas.processosMes}</div>
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
              <div className="text-2xl font-bold text-red-600">{metricas.processosVencendoPrazo}</div>
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
              <div className="text-2xl font-bold">{metricas.totalCartorios}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.totalUsuarios}</div>
              <p className="text-xs text-muted-foreground">
                Usuários ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Análises IA</CardTitle>
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
                        <p className="font-medium">#{protocolo.protocolo}</p>
                        <p className="text-sm text-gray-600">{protocolo.solicitante}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{protocolo.demanda}</p>
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
    </div>
  );
};

export default Dashboard;