"use client";

import React, { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { useUsuarios, useCartorios } from '@/hooks/use-supabase';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  Crown,
  Loader2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * z from 'zod';

const usuarioSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  tipo: z.enum(['admin', 'supervisor', 'atendente']),
  cartorio_id: z.string().optional(),
  ativo: z.boolean().default(true)
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

const GestaoUsuarios = () => {
  const { usuarios, loading, createUsuario, updateUsuario, deleteUsuario } = useUsuarios();
  const { cartorios } = useCartorios();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      ativo: true,
      tipo: 'atendente'
    }
  });

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

  const handleSubmitUser = async (data: UsuarioFormData) => {
    try {
      setSubmitting(true);
      
      if (editingUser) {
        await updateUsuario(editingUser.id, data);
        setEditingUser(null);
      } else {
        await createUsuario(data);
      }
      
      setShowUserDialog(false);
      form.reset();
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (usuario: any) => {
    setEditingUser(usuario);
    form.reset({
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      tipo: usuario.tipo,
      cartorio_id: usuario.cartorio_id || '',
      ativo: usuario.ativo
    });
    setShowUserDialog(true);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    await updateUsuario(userId, { ativo: !currentStatus });
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      await deleteUsuario(userId);
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    form.reset({
      ativo: true,
      tipo: 'atendente'
    });
    setShowUserDialog(true);
  };

  if (loading) {
    return (
      <MainLayout 
        title="Gestão de Usuários" 
        subtitle="Controle de acesso e permissões dos usuários do sistema"
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
          <Button onClick={handleNewUser}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
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
                    <TableCell>
                      {usuario.cartorio?.nome || 'Não atribuído'}
                    </TableCell>
                    <TableCell>
                      {usuario.ultimo_acesso ? 
                        new Date(usuario.ultimo_acesso).toLocaleString('pt-BR') : 
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
                          onClick={() => handleToggleStatus(usuario.id, usuario.ativo)}
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

        {/* Modal de Formulário */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
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
            
            <form onSubmit={form.handleSubmit(handleSubmitUser)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input 
                    id="nome" 
                    placeholder="Nome completo do usuário"
                    {...form.register('nome')}
                  />
                  {form.formState.errors.nome && (
                    <p className="text-sm text-red-500">{form.formState.errors.nome.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="email@exemplo.com"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input 
                    id="telefone" 
                    placeholder="(11) 99999-9999"
                    {...form.register('telefone')}
                  />
                  {form.formState.errors.telefone && (
                    <p className="text-sm text-red-500">{form.formState.errors.telefone.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="tipo">Tipo de Usuário</Label>
                  <Select 
                    value={form.watch('tipo')} 
                    onValueChange={(value) => form.setValue('tipo', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="atendente">Atendente</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.tipo && (
                    <p className="text-sm text-red-500">{form.formState.errors.tipo.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="cartorio">Cartório</Label>
                <Select 
                  value={form.watch('cartorio_id') || ''} 
                  onValueChange={(value) => form.setValue('cartorio_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cartório" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum cartório</SelectItem>
                    {cartorios.map((cartorio) => (
                      <SelectItem key={cartorio.id} value={cartorio.id}>
                        {cartorio.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="ativo" 
                  checked={form.watch('ativo')}
                  onCheckedChange={(checked) => form.setValue('ativo', checked)}
                />
                <Label htmlFor="ativo">Usuário ativo</Label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowUserDialog(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingUser ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default GestaoUsuarios;