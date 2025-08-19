"use client";

import React, { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  User,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';

const GestaoUsuarios = () => {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Dados mockados
  const [usuarios, setUsuarios] = useState([
    {
      id: '1',
      nome: 'João Silva',
      email: 'joao.silva@cartorio.com.br',
      telefone: '(11) 99999-9999',
      tipo: 'admin',
      cartorioId: '1',
      cartorioNome: 'Cartório do 1º Ofício',
      ativo: true,
      criadoEm: '2024-01-10',
      ultimoAcesso: '2024-01-16T09:30:00'
    },
    {
      id: '2',
      nome: 'Maria Santos',
      email: 'maria.santos@cartorio.com.br',
      telefone: '(11) 88888-8888',
      tipo: 'supervisor',
      cartorioId: '1',
      cartorioNome: 'Cartório do 1º Ofício',
      ativo: true,
      criadoEm: '2024-01-12',
      ultimoAcesso: '2024-01-16T14:15:00'
    },
    {
      id: '3',
      nome: 'Ana Costa',
      email: 'ana.costa@cartorio.com.br',
      telefone: '(11) 77777-7777',
      tipo: 'atendente',
      cartorioId: '1',
      cartorioNome: 'Cartório do 1º Ofício',
      ativo: true,
      criadoEm: '2024-01-15',
      ultimoAcesso: '2024-01-16T11:45:00'
    },
    {
      id: '4',
      nome: 'Carlos Lima',
      email: 'carlos.lima@cartorio2.com.br',
      telefone: '(11) 66666-6666',
      tipo: 'supervisor',
      cartorioId: '2',
      cartorioNome: 'Cartório do 2º Ofício',
      ativo: false,
      criadoEm: '2024-01-08',
      ultimoAcesso: '2024-01-14T16:20:00'
    },
    {
      id: '5',
      nome: 'Pedro Oliveira',
      email: 'pedro.oliveira@cartorio.com.br',
      telefone: '(11) 55555-5555',
      tipo: 'atendente',
      cartorioId: '1',
      cartorioNome: 'Cartório do 1º Ofício',
      ativo: true,
      criadoEm: '2024-01-14',
      ultimoAcesso: '2024-01-16T08:30:00'
    }
  ]);

  const tipoOptions = [
    { value: 'todos', label: 'Todos os Tipos' },
    { value: 'admin', label: 'Administrador' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'atendente', label: 'Atendente' }
  ];

  const statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' }
  ];

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'supervisor': return <Shield className="h-4 w-4" />;
      case 'atendente': return <User className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'atendente': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'atendente': return 'Atendente';
      default: return tipo;
    }
  };

  const usuariosFiltrados = usuarios.filter(usuario => {
    const matchBusca = usuario.nome.toLowerCase().includes(busca.toLowerCase()) ||
                      usuario.email.toLowerCase().includes(busca.toLowerCase());
    
    const matchTipo = filtroTipo === 'todos' || usuario.tipo === filtroTipo;
    const matchStatus = filtroStatus === 'todos' || 
                       (filtroStatus === 'ativo' && usuario.ativo) ||
                       (filtroStatus === 'inativo' && !usuario.ativo);
    
    return matchBusca && matchTipo && matchStatus;
  });

  const handleSubmitUser = (data: any) => {
    if (editingUser) {
      // Atualizar usuário existente
      setUsuarios(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...data }
          : u
      ));
      toast.success('Usuário atualizado com sucesso!');
      setEditingUser(null);
    } else {
      // Criar novo usuário
      const novoUsuario = {
        ...data,
        id: Date.now().toString(),
        criadoEm: new Date().toISOString().split('T')[0],
        ultimoAcesso: null
      };
      setUsuarios(prev => [novoUsuario, ...prev]);
      toast.success('Usuário cadastrado com sucesso!');
    }
    setShowUserDialog(false);
  };

  const handleEditUser = (usuario: any) => {
    setEditingUser(usuario);
    setShowUserDialog(true);
  };

  const handleToggleStatus = (userId: string) => {
    setUsuarios(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, ativo: !u.ativo }
        : u
    ));
    toast.success('Status do usuário alterado com sucesso!');
  };

  const handleDeleteUser = (userId: string) => {
    setUsuarios(prev => prev.filter(u => u.id !== userId));
    toast.success('Usuário removido com sucesso!');
  };

  return (
    <MainLayout 
      title="Gestão de Usuários" 
      subtitle="Controle de acesso e permissões dos usuários do sistema"
    >
      <div className="space-y-6">
        {/* Header com filtros */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtros */}
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48">
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

          {/* Botão Novo Usuário */}
          <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingUser(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? 'Atualize as informações do usuário'
                    : 'Preencha as informações do novo usuário'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input 
                      id="nome" 
                      placeholder="Nome completo do usuário"
                      defaultValue={editingUser?.nome}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="email@exemplo.com"
                      defaultValue={editingUser?.email}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input 
                      id="telefone" 
                      placeholder="(11) 99999-9999"
                      defaultValue={editingUser?.telefone}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tipo">Tipo de Usuário</Label>
                    <Select defaultValue={editingUser?.tipo || 'atendente'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="atendente">Atendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="cartorio">Cartório</Label>
                  <Select defaultValue={editingUser?.cartorioId || '1'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Cartório do 1º Ofício</SelectItem>
                      <SelectItem value="2">Cartório do 2º Ofício</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="ativo" 
                    defaultChecked={editingUser?.ativo !== false}
                  />
                  <Label htmlFor="ativo">Usuário ativo</Label>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowUserDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => handleSubmitUser({
                      nome: 'Novo Usuário',
                      email: 'novo@email.com',
                      telefone: '(11) 99999-9999',
                      tipo: 'atendente',
                      cartorioId: '1',
                      cartorioNome: 'Cartório do 1º Ofício',
                      ativo: true
                    })}
                  >
                    {editingUser ? 'Atualizar' : 'Cadastrar'}
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
              <CardTitle className="text-sm font-medium">Total Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usuarios.length}</div>
              <p className="text-xs text-muted-foreground">
                Cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usuarios.filter(u => u.ativo).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Com acesso liberado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Supervisores</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usuarios.filter(u => u.tipo === 'supervisor').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Nível supervisor
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendentes</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usuarios.filter(u => u.tipo === 'atendente').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Nível atendente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários ({usuariosFiltrados.length})</CardTitle>
            <CardDescription>
              Lista de todos os usuários cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cartório</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosFiltrados.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{usuario.nome}</p>
                        <p className="text-sm text-gray-500">{usuario.email}</p>
                        <p className="text-sm text-gray-500">{usuario.telefone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTipoColor(usuario.tipo)}>
                        <div className="flex items-center gap-1">
                          {getTipoIcon(usuario.tipo)}
                          {getTipoLabel(usuario.tipo)}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>{usuario.cartorioNome}</TableCell>
                    <TableCell>
                      {usuario.ultimoAcesso ? 
                        new Date(usuario.ultimoAcesso).toLocaleString('pt-BR') : 
                        'Nunca acessou'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={usuario.ativo ? "default" : "secondary"}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditUser(usuario)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleStatus(usuario.id)}
                        >
                          {usuario.ativo ? 
                            <UserX className="h-4 w-4" /> : 
                            <UserCheck className="h-4 w-4" />
                          }
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteUser(usuario.id)}
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
      </div>
    </MainLayout>
  );
};

export default GestaoUsuarios;