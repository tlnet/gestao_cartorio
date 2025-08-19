"use client";

import React, { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  CalendarIcon,
  Download,
  Filter,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  FileText,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Relatorios = () => {
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroServico, setFiltroServico] = useState('todos');

  // Dados mockados para relatórios
  const metricas = {
    totalProtocolos: 1247,
    protocolosConcluidos: 892,
    protocolosAndamento: 245,
    tempoMedioProcessamento: 4.2,
    taxaConclusao: 71.5
  };

  const dadosTempoReal = [
    { mes: 'Jan', protocolos: 89, concluidos: 67 },
    { mes: 'Fev', protocolos: 95, concluidos: 72 },
    { mes: 'Mar', protocolos: 112, concluidos: 89 },
    { mes: 'Abr', protocolos: 98, concluidos: 76 },
    { mes: 'Mai', protocolos: 125, concluidos: 98 },
    { mes: 'Jun', protocolos: 134, concluidos: 105 }
  ];

  const distribuicaoServicos = [
    { servico: 'Certidões', quantidade: 456, cor: '#3b82f6' },
    { servico: 'Escrituras', quantidade: 234, cor: '#10b981' },
    { servico: 'Procurações', quantidade: 189, cor: '#f59e0b' },
    { servico: 'Reconhecimentos', quantidade: 167, cor: '#ef4444' },
    { servico: 'Outros', quantidade: 201, cor: '#8b5cf6' }
  ];

  const performanceUsuarios = [
    { usuario: 'Maria Santos', protocolos: 89, concluidos: 82, taxa: 92.1 },
    { usuario: 'João Silva', protocolos: 76, concluidos: 68, taxa: 89.5 },
    { usuario: 'Ana Costa', protocolos: 65, concluidos: 56, taxa: 86.2 },
    { usuario: 'Carlos Lima', protocolos: 54, concluidos: 45, taxa: 83.3 },
    { usuario: 'Pedro Oliveira', protocolos: 43, concluidos: 35, taxa: 81.4 }
  ];

  const tempoProcessamento = [
    { dia: 'Seg', tempo: 3.2 },
    { dia: 'Ter', tempo: 4.1 },
    { dia: 'Qua', tempo: 3.8 },
    { dia: 'Qui', tempo: 4.5 },
    { dia: 'Sex', tempo: 3.9 },
    { dia: 'Sáb', tempo: 2.8 },
    { dia: 'Dom', tempo: 2.1 }
  ];

  const statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'concluido', label: 'Concluído' },
    { value: 'andamento', label: 'Em Andamento' },
    { value: 'pendente', label: 'Pendente' }
  ];

  const servicoOptions = [
    { value: 'todos', label: 'Todos os Serviços' },
    { value: 'certidoes', label: 'Certidões' },
    { value: 'escrituras', label: 'Escrituras' },
    { value: 'procuracoes', label: 'Procurações' },
    { value: 'reconhecimentos', label: 'Reconhecimentos' }
  ];

  const exportarRelatorio = (tipo: string) => {
    console.log(`Exportando relatório: ${tipo}`);
    // Aqui seria implementada a lógica de exportação
  };

  return (
    <MainLayout 
      title="Relatórios e Business Intelligence" 
      subtitle="Análise detalhada da performance e métricas do cartório"
    >
      <div className="space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Análise
            </CardTitle>
            <CardDescription>
              Configure os parâmetros para gerar relatórios personalizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data Início */}
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Data Fim */}
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Filtro Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
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

              {/* Filtro Serviço */}
              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={filtroServico} onValueChange={setFiltroServico}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {servicoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button>
                <BarChart3 className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
              <Button variant="outline" onClick={() => exportarRelatorio('excel')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Button variant="outline" onClick={() => exportarRelatorio('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Protocolos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.totalProtocolos.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +12% em relação ao período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.protocolosConcluidos.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metricas.taxaConclusao}% de taxa de conclusão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.protocolosAndamento}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando processamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.tempoMedioProcessamento} dias</div>
              <p className="text-xs text-muted-foreground">
                -0.5 dias vs. período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Conclusão</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.taxaConclusao}%</div>
              <p className="text-xs text-muted-foreground">
                +3.2% vs. período anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução Temporal */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução dos Protocolos</CardTitle>
              <CardDescription>
                Comparativo entre protocolos abertos e concluídos por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dadosTempoReal}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="protocolos" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Abertos"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="concluidos" 
                    stackId="2"
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                    name="Concluídos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribuição por Serviços */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Serviços</CardTitle>
              <CardDescription>
                Volume de protocolos por tipo de serviço
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribuicaoServicos}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ servico, quantidade }) => `${servico}: ${quantidade}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="quantidade"
                  >
                    {distribuicaoServicos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tempo de Processamento */}
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Processamento</CardTitle>
              <CardDescription>
                Tempo médio de processamento por dia da semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tempoProcessamento}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="tempo" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance dos Usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Usuários</CardTitle>
              <CardDescription>
                Taxa de conclusão por usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceUsuarios} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="usuario" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="taxa" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Performance Detalhada */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Detalhada dos Usuários</CardTitle>
            <CardDescription>
              Análise completa da produtividade por usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Protocolos Atribuídos</TableHead>
                  <TableHead>Protocolos Concluídos</TableHead>
                  <TableHead>Taxa de Conclusão</TableHead>
                  <TableHead>Tempo Médio</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceUsuarios.map((usuario) => (
                  <TableRow key={usuario.usuario}>
                    <TableCell className="font-medium">{usuario.usuario}</TableCell>
                    <TableCell>{usuario.protocolos}</TableCell>
                    <TableCell>{usuario.concluidos}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{usuario.taxa}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${usuario.taxa}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>3.2 dias</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        usuario.taxa >= 90 ? 'bg-green-100 text-green-800' :
                        usuario.taxa >= 80 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {usuario.taxa >= 90 ? 'Excelente' :
                         usuario.taxa >= 80 ? 'Bom' : 'Precisa Melhorar'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Relatorios;