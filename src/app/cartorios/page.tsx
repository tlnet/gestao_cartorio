"use client";

import React, { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  FileText,
  Settings,
  Eye,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

const GestaoCartorios = () => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showCartorioDialog, setShowCartorioDialog] = useState(false);
  const [editingCartorio, setEditingCartorio] = useState<any>(null);
  const [selectedCartorio, setSelectedCartorio] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Dados mockados
  const [cartorios, setCartorios] = useState([
    {
      id: '1',
      nome: 'Cartório do 1º Ofício de Notas',
      cnpj: '12.345.678/0001-90',
      endereco: 'Rua das Flores, 123 - Centro - São Paulo/SP',
      telefone: '(11) 3333-4444',
      email: 'contato@cartorio1oficio.com.br',
      ativo: true,
      criadoEm: '2024-01-01',
      totalUsuarios: 5,
      totalProtocolos: 1247,
      configuracoes: {
        diasAlertaVencimento: 3,
        notificacaoWhatsApp: true,
        webhookN8N: 'https://webhook.n8n.io/cartorio-123'
      }
    },
    {
      id: '2',
      nome: 'Cartório do 2º Ofício de Registro Civil',
      cnpj: '98.765.432/0001-10',
      endereco: 'Av. Principal, 456 - Centro - São Paulo/SP',
      telefone: '(11) 4444-5555',
      email: 'contato@cartorio2oficio.com.br',
      ativo: true,
      criadoEm: '2024-01-05',
      totalUsuarios: 3,
      totalProtocolos: 892,
      configuracoes: {
        diasAlertaVencimento: 5,
        notificacaoWhatsApp: false,
        webhookN8N: 'https://webhook.n8n.io/cartorio-456'
      }
    },
    {
      id: '3',
      nome: 'Cartório de Registro de Imóveis',
      cnpj: '11.222.333/0001-44',
      endereco: 'Rua dos Imóveis, 789 - Vila Nova - São Paulo/SP',
      telefone: '(11) 5555-6666',
      email: 'contato@cartorioimoveis.com.br',
      ativo: false,
      criadoEm: '2023-12-15',
      totalUsuarios: 2,
      totalProtocolos: 234,
      configuracoes: {
        diasAlertaVencimento: 7,
        notificacaoWhatsApp: true,
        webhookN8N: ''
      }
    }
  ]);

  const statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' }
  ];

  const cartoriosFiltrados = cartorios.filter(cartorio => {
    const matchBusca = cartorio.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      cartorio.cnpj.includes(busca) ||
                      cartorio.email.toLowerCase().includes(busca.toLowerCase());
    
    const matchStatus = filtroStatus === 'todos' || 
                       (filtroStatus === 'ativo' && cartorio.ativo) ||
                       (filtroStatus === 'inativo' && !cartorio.ativo);
    
    return matchBusca && matchStatus;
  });

  const handleSubmitCartorio = (data: any) => {
    if (editingCartorio) {
      // Atualizar cartório existente
      setCartorios(prev => prev.map(c => 
        c.id === editingCartorio.id 
          ? { ...c, ...data }
          : c
      ));
      toast.success('Cartório atualizado com sucesso!');
      setEditingCartorio(null);
    } else {
      // Criar novo cartório
      const novoCartorio = {
        ...data,
        id: Date.now().toString(),
        criadoEm: new Date().toISOString().split('T')[0],
        totalUsuarios: 0,
        totalProtocolos: 0,
        configuracoes: {
          diasAlertaVencimento: 3,
          notificacaoWhatsApp: false,
          webhookN8N: ''
        }
      };
      setCartorios(prev => [novoCartorio, ...prev]);
      toast.success('Cartório cadastrado com sucesso!');
    }
    setShowCartorioDialog(false);
  };

  const handleEditCartorio = (cartorio: any) => {
    setEditingCartorio(cartorio);
    setShowCartorioDialog(true);
  };

  const handleViewDetails = (cartorio: any) => {
    setSelectedCartorio(cartorio);
    setShowDetailsDialog(true);
  };

  const handleToggleStatus = (cartorioId: string) => {
    setCartorios(prev => prev.map(c => 
      c.id === cartorioId 
        ? { ...c, ativo: !c.ativo }
        : c
    ));
    toast.success('Status do cartório alterado com sucesso!');
  };

  const handleDeleteCartorio = (cartorioId: string) => {
    setCartorios(prev => prev.filter(c => c.id !== cartorioId));
    toast.success('Cartório removido com sucesso!');
  };

  return (
    <MainLayout 
      title="Gestão de Cartórios" 
      subtitle="Administração de todos os cartórios do sistema"
      userType="admin"
    >
      <div className="space-y-6">
        {/* Header com filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome, CNPJ ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro Status */}
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

          {/* Botão Novo Cartório */}
          <Dialog open={showCartorioDialog} onOpenChange={setShowCartorioDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCartorio(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cartório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCartorio ? 'Editar Cartório' : 'Cadastrar Novo Cartório'}
                </DialogTitle>
                <DialogDescription>
                  {editingCartorio 
                    ? 'Atualize as informações do cartório'
                    : 'Preencha as informações do novo cartório'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome do Cartório</Label>
                  <Input 
                    id="nome" 
                    placeholder="Ex: Cartório do 1º Ofício de Notas"
                    defaultValue={editingCartorio?.nome}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input 
                      id="cnpj" 
                      placeholder="00.000.000/0000-00"
                      defaultValue={editingCartorio?.cnpj}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input 
                      id="telefone" 
                      placeholder="(11) 3333-4444"
                      defaultValue={editingCartorio?.telefone}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="contato@cartorio.com.br"
                    defaultValue={editingCartorio?.email}
                  />
                </div>

                <div>
                  <Label htmlFor="endereco">Endereço Completo</Label>
                  <Textarea 
                    id="endereco" 
                    placeholder="Rua, número, bairro, cidade, estado"
                    defaultValue={editingCartorio?.endereco}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="ativo" 
                    defaultChecked={editingCartorio?.ativo !== false}
                  />
                  <Label htmlFor="ativo">Cartório ativo</Label>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCartorioDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => handleSubmitCartorio({
                      nome: 'Novo Cartório',
                      cnpj: '00.000.000/0000-00',
                      telefone: '(11) 0000-0000',
                      email: 'novo@cartorio.com.br',
                      endereco: 'Endereço do cartório',
                      ativo: true
                    })}
                  >
                    {editingCartorio ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cartórios</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cartorios.length}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cartórios Ativos</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cartorios.filter(c => c.ativo).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Em funcionamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cartorios.reduce((acc, c) => acc + c.totalUsuarios, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os cartórios
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Protocolos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cartorios.reduce((acc, c) => acc + c.totalProtocolos, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os cartórios
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Cartórios */}
        <Card>
          <CardHeader>
            <CardTitle>Cartórios ({cartoriosFiltrados.length})</CardTitle>
            <CardDescription>
              Lista de todos os cartórios cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cartório</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Protocolos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartoriosFiltrados.map((cartorio) => (
                  <TableRow key={cartorio.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cartorio.nome}</p>
                        <p className="text-sm text-gray-500">CNPJ: {cartorio.cnpj}</p>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span className="truncate max-w-xs">{cartorio.endereco}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {cartorio.telefone}
                        </div>
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1" />
                          {cartorio.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{cartorio.totalUsuarios}</div>
                        <div className="text-xs text-gray-500">usuários</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{cartorio.totalProtocolos.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">protocolos</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cartorio.ativo ? "default" : "secondary"}>
                        {cartorio.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewDetails(cartorio)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditCartorio(cartorio)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleStatus(cartorio.id)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteCartorio(cartorio.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Cartório</DialogTitle>
              <DialogDescription>
                Informações completas e configurações do cartório
              </DialogDescription>
            </DialogHeader>
            
            {selectedCartorio && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Nome</Label>
                        <p className="text-sm">{selectedCartorio.nome}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">CNPJ</Label>
                        <p className="text-sm">{selectedCartorio.cnpj}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                        <p className="text-sm">{selectedCartorio.telefone}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">E-mail</Label>
                        <p className="text-sm">{selectedCartorio.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Endereço</Label>
                        <p className="text-sm">{selectedCartorio.endereco}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Configurações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Dias para Alerta</Label>
                        <p className="text-sm">{selectedCartorio.configuracoes.diasAlertaVencimento} dias</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">WhatsApp</Label>
                        <Badge variant={selectedCartorio.configuracoes.notificacaoWhatsApp ? "default" : "secondary"}>
                          {selectedCartorio.configuracoes.notificacaoWhatsApp ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Webhook N8N</Label>
                        <p className="text-sm truncate">
                          {selectedCartorio.configuracoes.webhookN8N || 'Não configurado'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Criado em</Label>
                        <p className="text-sm">
                          {new Date(selectedCartorio.criadoEm).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                        <div className="text-2xl font-bold">{selectedCartorio.totalUsuarios}</div>
                        <div className="text-sm text-gray-500">Usuários</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <FileText className="h-8 w-8 mx-auto text-green-600 mb-2" />
                        <div className="text-2xl font-bold">{selectedCartorio.totalProtocolos.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">Protocolos</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Building2 className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                        <Badge variant={selectedCartorio.ativo ? "default" : "secondary"} className="text-lg px-3 py-1">
                          {selectedCartorio.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-2">Status</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default GestaoCartorios;