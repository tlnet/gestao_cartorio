"use client";

import React, { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import ProtocoloForm from '@/components/protocolos/protocolo-form';
import ProtocoloDetails from '@/components/protocolos/protocolo-details';
import { useProtocolos, useCartorios } from '@/hooks/use-supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Filter, Eye, Edit, Clock } from 'lucide-react';

const Protocolos = () => {
  const { protocolos, loading, createProtocolo, updateProtocolo, deleteProtocolo } = useProtocolos();
  const { cartorios } = useCartorios();
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProtocolo, setSelectedProtocolo] = useState<any>(null);
  const [editingProtocolo, setEditingProtocolo] = useState<any>(null);

  const statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'aguardando', label: 'Aguardando Análise' },
    { value: 'andamento', label: 'Em Andamento' },
    { value: 'concluido', label: 'Concluído' },
    { value: 'pendente', label: 'Pendente' }
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

  const isPrazoVencendo = (prazo: string) => {
    if (!prazo) return false;
    const hoje = new Date();
    const dataPrazo = new Date(prazo);
    const diffTime = dataPrazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  };

  const protocolosFiltrados = protocolos.filter(protocolo => {
    const matchBusca = protocolo.solicitante.toLowerCase().includes(busca.toLowerCase()) ||
                      protocolo.protocolo.toLowerCase().includes(busca.toLowerCase()) ||
                      protocolo.cpf_cnpj.includes(busca);
    
    const matchStatus = filtroStatus === 'todos' || 
                       (filtroStatus === 'aguardando' && protocolo.status === 'Aguardando Análise') ||
                       (filtroStatus === 'andamento' && protocolo.status === 'Em Andamento') ||
                       (filtroStatus === 'concluido' && protocolo.status === 'Concluído') ||
                       (filtroStatus === 'pendente' && protocolo.status === 'Pendente');
    
    return matchBusca && matchStatus;
  });

  const handleSubmitProtocolo = async (data: any) => {
    try {
      // Adicionar dados necessários para o banco
      const protocoloData = {
        ...data,
        cartorio_id: cartorios[0]?.id || '', // Usar primeiro cartório por enquanto
        criado_por: 'temp-user-id', // Será substituído quando tivermos auth
        prazo_execucao: data.prazoExecucao ? new Date(data.prazoExecucao).toISOString().split('T')[0] : null
      };

      if (editingProtocolo) {
        await updateProtocolo(editingProtocolo.id, protocoloData);
        setEditingProtocolo(null);
      } else {
        await createProtocolo(protocoloData);
      }
      
      setShowForm(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleViewDetails = (protocolo: any) => {
    setSelectedProtocolo(protocolo);
    setShowDetails(true);
  };

  const handleEditProtocolo = (protocolo: any) => {
    setEditingProtocolo(protocolo);
    setShowForm(true);
  };

  const handleNewProtocolo = () => {
    setEditingProtocolo(null);
    setShowForm(true);
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
                placeholder="Buscar por nome, protocolo ou CPF..."
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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Protocolos</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{protocolos.length}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {protocolos.filter(p => p.status === 'Em Andamento').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Sendo processados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {protocolos.filter(p => p.status === 'Concluído').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Finalizados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencendo Prazo</CardTitle>
              <Clock className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {protocolos.filter(p => p.prazo_execucao && isPrazoVencendo(p.prazo_execucao)).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Requer atenção
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Protocolos */}
        <Card>
          <CardHeader>
            <CardTitle>Protocolos ({protocolosFiltrados.length})</CardTitle>
            <CardDescription>
              Lista de todos os protocolos cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Data Abertura</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {protocolosFiltrados.map((protocolo) => (
                  <TableRow key={protocolo.id}>
                    <TableCell className="font-medium">
                      {protocolo.protocolo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{protocolo.solicitante}</p>
                        <p className="text-sm text-gray-500">{protocolo.cpf_cnpj}</p>
                      </div>
                    </TableCell>
                    <TableCell>{protocolo.demanda}</TableCell>
                    <TableCell>
                      {new Date(protocolo.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>
                          {protocolo.prazo_execucao ? 
                            new Date(protocolo.prazo_execucao).toLocaleDateString('pt-BR') : 
                            'Não definido'
                          }
                        </span>
                        {protocolo.prazo_execucao && isPrazoVencendo(protocolo.prazo_execucao) && (
                          <Clock className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(protocolo.status)}>
                        {protocolo.status}
                      </Badge>
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
          </CardContent>
        </Card>

        {/* Modal de Formulário */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProtocolo ? 'Editar Protocolo' : 'Cadastrar Novo Protocolo'}
              </DialogTitle>
              <DialogDescription>
                {editingProtocolo 
                  ? 'Atualize as informações do protocolo'
                  : 'Preencha as informações do novo protocolo'
                }
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
            protocolo={{
              ...selectedProtocolo,
              dataAbertura: selectedProtocolo.created_at,
              prazoExecucao: selectedProtocolo.prazo_execucao || new Date().toISOString()
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Protocolos;