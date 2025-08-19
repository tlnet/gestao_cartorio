"use client";

import React, { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import ProtocoloForm from '@/components/protocolos/protocolo-form';
import ProtocoloDetails from '@/components/protocolos/protocolo-details';
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
import { Plus, Search, Filter, Eye, Edit, Clock } from 'lucide-react';
import { toast } from 'sonner';

const Protocolos = () => {
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProtocolo, setSelectedProtocolo] = useState<any>(null);
  const [editingProtocolo, setEditingProtocolo] = useState<any>(null);

  // Dados mockados
  const [protocolos, setProtocolos] = useState([
    {
      id: '12345',
      demanda: 'Certidão de Nascimento',
      protocolo: 'CERT-2024-001',
      dataAbertura: '2024-01-15',
      servicos: ['Certidão de Nascimento'],
      solicitante: 'Maria Silva Santos',
      cpfCnpj: '123.456.789-00',
      telefone: '(11) 99999-9999',
      email: 'maria@email.com',
      status: 'Em Andamento',
      prazoExecucao: '2024-01-20',
      observacao: 'Primeira via da certidão'
    },
    {
      id: '12346',
      demanda: 'Escritura de Compra e Venda',
      protocolo: 'ESC-2024-002',
      dataAbertura: '2024-01-15',
      servicos: ['Escritura de Compra e Venda'],
      solicitante: 'João Carlos Oliveira',
      cpfCnpj: '987.654.321-00',
      telefone: '(11) 88888-8888',
      status: 'Aguardando Análise',
      prazoExecucao: '2024-01-25'
    },
    {
      id: '12347',
      demanda: 'Procuração',
      protocolo: 'PROC-2024-003',
      dataAbertura: '2024-01-14',
      servicos: ['Procuração'],
      solicitante: 'Ana Paula Costa',
      cpfCnpj: '456.789.123-00',
      telefone: '(11) 77777-7777',
      status: 'Concluído',
      prazoExecucao: '2024-01-19'
    },
    {
      id: '12348',
      demanda: 'Reconhecimento de Firma',
      protocolo: 'REC-2024-004',
      dataAbertura: '2024-01-16',
      servicos: ['Reconhecimento de Firma'],
      solicitante: 'Carlos Eduardo Lima',
      cpfCnpj: '789.123.456-00',
      telefone: '(11) 66666-6666',
      status: 'Pendente',
      prazoExecucao: '2024-01-18'
    }
  ]);

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
    const hoje = new Date();
    const dataPrazo = new Date(prazo);
    const diffTime = dataPrazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  };

  const protocolosFiltrados = protocolos.filter(protocolo => {
    const matchBusca = protocolo.solicitante.toLowerCase().includes(busca.toLowerCase()) ||
                      protocolo.protocolo.toLowerCase().includes(busca.toLowerCase()) ||
                      protocolo.cpfCnpj.includes(busca);
    
    const matchStatus = filtroStatus === 'todos' || 
                       (filtroStatus === 'aguardando' && protocolo.status === 'Aguardando Análise') ||
                       (filtroStatus === 'andamento' && protocolo.status === 'Em Andamento') ||
                       (filtroStatus === 'concluido' && protocolo.status === 'Concluído') ||
                       (filtroStatus === 'pendente' && protocolo.status === 'Pendente');
    
    return matchBusca && matchStatus;
  });

  const handleSubmitProtocolo = (data: any) => {
    if (editingProtocolo) {
      // Atualizar protocolo existente
      setProtocolos(prev => prev.map(p => 
        p.id === editingProtocolo.id 
          ? { ...p, ...data, id: editingProtocolo.id }
          : p
      ));
      toast.success('Protocolo atualizado com sucesso!');
      setEditingProtocolo(null);
    } else {
      // Criar novo protocolo
      const novoProtocolo = {
        ...data,
        id: Date.now().toString(),
        dataAbertura: new Date().toISOString().split('T')[0],
      };
      setProtocolos(prev => [novoProtocolo, ...prev]);
      toast.success('Protocolo cadastrado com sucesso!');
    }
    setShowForm(false);
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
                        <p className="text-sm text-gray-500">{protocolo.cpfCnpj}</p>
                      </div>
                    </TableCell>
                    <TableCell>{protocolo.demanda}</TableCell>
                    <TableCell>
                      {new Date(protocolo.dataAbertura).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>
                          {new Date(protocolo.prazoExecucao).toLocaleDateString('pt-BR')}
                        </span>
                        {isPrazoVencendo(protocolo.prazoExecucao) && (
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
            protocolo={selectedProtocolo}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Protocolos;