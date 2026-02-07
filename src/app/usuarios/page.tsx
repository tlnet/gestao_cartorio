"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { RequirePermission } from "@/components/auth/require-permission";
import { useAuth } from "@/contexts/auth-context";
import { useUsuarios } from "@/hooks/use-supabase";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  User,
  Crown,
  Loader2,
  CheckCircle,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  formatPhone,
  formatEmail,
  isValidPhone,
  isValidEmail,
} from "@/lib/formatters";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { StaggeredCards, FadeInUp } from "@/components/ui/page-transition";

const usuarioSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .refine((value) => isValidEmail(value), "Email inválido"),
  telefone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine((value) => isValidPhone(value), "Telefone inválido"),
  role: z.enum(["admin", "atendente"]),
  cartorio_id: z.string().optional(),
  ativo: z.boolean().default(true),
});

type UsuarioFormData = z.infer<typeof usuarioSchema>;

const GestaoUsuarios = () => {
  const { usuarios, loading, createUsuario, updateUsuario, deleteUsuario } =
    useUsuarios();
  const { userProfile } = useAuth();

  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  // Estados para sistema de convites
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteUserData, setInviteUserData] = useState<any>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [showCancelInviteDialog, setShowCancelInviteDialog] = useState(false);
  const [userToCancel, setUserToCancel] = useState<any>(null);

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      ativo: true,
      role: "atendente",
    },
  });

  const tipoOptions = [
    { value: "todos", label: "Todos os Tipos" },
    { value: "admin", label: "Administrador" },
    { value: "atendente", label: "Atendente" },
  ];

  const statusOptions = [
    { value: "todos", label: "Todos os Status" },
    { value: "ativo", label: "Ativo" },
    { value: "inativo", label: "Inativo" },
  ];

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "atendente":
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "atendente":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "admin":
        return "Administrador";
      case "atendente":
        return "Atendente";
      default:
        return tipo;
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    // Verificar se os campos existem antes de usar toLowerCase
    const nome = usuario.name || "";
    const email = usuario.email || "";

    const matchBusca =
      nome.toLowerCase().includes(busca.toLowerCase()) ||
      email.toLowerCase().includes(busca.toLowerCase());

    const matchTipo = filtroTipo === "todos" || usuario.role === filtroTipo;
    const matchStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "ativo" && usuario.ativo) ||
      (filtroStatus === "inativo" && !usuario.ativo);

    return matchBusca && matchTipo && matchStatus;
  });

  const handleSubmitUser = async (data: UsuarioFormData) => {
    try {
      setSubmitting(true);

      // Automaticamente vincular ao cartório do administrador logado
      const userData = {
        ...data,
        cartorio_id: (userProfile as any)?.cartorio_id || userProfile?.cartorioId || null,
      };

      if (editingUser) {
        // Modo edição - não gera convite
        await updateUsuario(editingUser.id, userData);
        setEditingUser(null);
        setShowUserDialog(false);
        form.reset();
      } else {
        // Modo criação - criar usuário e gerar link de registro
        try {
          // 1. Criar usuário no sistema (sem senha, inativo)
          const userDataWithStatus = {
            ...userData,
            ativo: false, // Usuário fica inativo até completar o registro
            account_status: "pending_activation", // Status pendente de ativação
          };
          
          const newUser = await createUsuario(userDataWithStatus);
          
          if (!newUser || !newUser.id) {
            toast.error("Erro ao criar usuário");
            return;
          }

          // 2. Gerar link de registro com query params
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
          const params = new URLSearchParams({
            name: encodeURIComponent(data.name),
            email: encodeURIComponent(data.email),
            telefone: encodeURIComponent(data.telefone || ""),
            role: encodeURIComponent(data.role),
            cartorio_id: encodeURIComponent(userData.cartorio_id || ""),
          });
          
          const registroUrl = `${baseUrl}/registro?${params.toString()}`;

          // 3. Armazenar dados do link e abrir modal
          setInviteUrl(registroUrl);
          setInviteUserData({
            id: newUser.id,
            name: data.name,
            email: data.email,
          });
          setShowUserDialog(false);
          setShowInviteModal(true);
          form.reset();
          toast.success("Usuário criado! Envie o link de registro.");
        } catch (error) {
          console.error("Erro ao criar usuário:", error);
          toast.error("Erro ao criar usuário");
        }
      }
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (usuario: any) => {
    setEditingUser(usuario);
    form.reset({
      name: usuario.name,
      email: usuario.email,
      telefone: usuario.telefone,
      role: usuario.role,
      cartorio_id: usuario.cartorio_id || "null",
      ativo: usuario.ativo,
    });
    setShowUserDialog(true);
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    await updateUsuario(userId, { ativo: !currentStatus });
  };

  const handleDeleteUser = (usuario: any) => {
    setUserToDelete(usuario);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      await deleteUsuario(userToDelete.id);
      setShowDeleteConfirmation(false);
      setUserToDelete(null);
    }
  };

  const handleResendInvite = async (usuario: any) => {
    try {
      setResendingInvite(usuario.id);

      // Gerar link de registro com query params
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const params = new URLSearchParams({
        name: encodeURIComponent(usuario.name || ""),
        email: encodeURIComponent(usuario.email || ""),
        telefone: encodeURIComponent(usuario.telefone || ""),
        role: encodeURIComponent(usuario.role || "atendente"),
        cartorio_id: encodeURIComponent(usuario.cartorio_id || ""),
      });
      
      const registroUrl = `${baseUrl}/registro?${params.toString()}`;

      setInviteUrl(registroUrl);
      setInviteUserData({
        id: usuario.id,
        name: usuario.name,
        email: usuario.email,
      });
      setShowInviteModal(true);
      toast.success("Link de registro gerado!");
    } catch (error) {
      console.error("Erro ao gerar link de registro:", error);
      toast.error("Erro ao gerar link de registro");
    } finally {
      setResendingInvite(null);
    }
  };

  const handleCancelInvite = (usuario: any) => {
    setUserToCancel(usuario);
    setShowCancelInviteDialog(true);
  };

  const confirmCancelInvite = async () => {
    if (!userToCancel) return;

    try {
      // Atualizar usuário para inativar e cancelar convite
      await updateUsuario(userToCancel.id, {
        ativo: false,
        invite_status: "cancelled",
        invite_token: null,
      });

      toast.success("Convite cancelado");
      setShowCancelInviteDialog(false);
      setUserToCancel(null);
    } catch (error) {
      console.error("Erro ao cancelar convite:", error);
      toast.error("Erro ao cancelar convite");
    }
  };

  const handleNewUser = () => {
    setEditingUser(null);
    form.reset({
      ativo: true,
      role: "atendente",
    });
    setShowUserDialog(true);
  };

  // Handlers de formatação
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    form.setValue("telefone", formatted);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEmail(e.target.value);
    form.setValue("email", formatted);
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
              <CardTitle className="text-sm font-medium">
                Total Usuários
              </CardTitle>
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
              <CardTitle className="text-sm font-medium">
                Usuários Ativos
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usuarios.filter((u) => u.ativo).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Com acesso liberado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usuarios.filter((u) => (u.tipo === "admin" || u.role === "admin" || u.tipo === "supervisor" || u.role === "supervisor")).length}
              </div>
              <p className="text-xs text-muted-foreground">Nível administrador</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atendentes</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {usuarios.filter((u) => (u.tipo === "atendente" || u.role === "atendente")).length}
              </div>
              <p className="text-xs text-muted-foreground">Nível atendente</p>
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
            {usuariosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum usuário encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  {usuarios.length === 0
                    ? "Ainda não há usuários cadastrados no sistema."
                    : "Nenhum usuário corresponde aos filtros aplicados."}
                </p>
                {usuarios.length === 0 && (
                  <Button onClick={handleNewUser}>
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Primeiro Usuário
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Tipo</TableHead>
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
                          <p className="font-medium">
                            {usuario.name || "Nome não informado"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {usuario.email}
                          </p>
                          <p className="text-sm text-gray-500">
                            {usuario.telefone || "Telefone não informado"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTipoColor(usuario.role)}>
                          <div className="flex items-center gap-1">
                            {getTipoIcon(usuario.role)}
                            {getTipoLabel(usuario.role)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {usuario.updated_at
                          ? new Date(usuario.updated_at).toLocaleString("pt-BR")
                          : "Nunca acessou"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant={usuario.ativo ? "default" : "secondary"}
                            className="w-fit"
                          >
                            {usuario.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                          {(usuario as any).account_status === "pending_activation" && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit">
                              Aguardando Ativação
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {(usuario as any).account_status === "pending_activation" ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvite(usuario)}
                                disabled={resendingInvite === usuario.id}
                                title="Reenviar Convite"
                              >
                                {resendingInvite === usuario.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 2v6h-6"></path>
                                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                                    <path d="M3 22v-6h6"></path>
                                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                                  </svg>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelInvite(usuario)}
                                title="Cancelar Convite"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="15" y1="9" x2="9" y2="15"></line>
                                  <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                              </Button>
                            </>
                          ) : (
                            <>
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
                                onClick={() =>
                                  handleToggleStatus(usuario.id, usuario.ativo)
                                }
                              >
                                {usuario.ativo ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(usuario)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de Formulário */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Editar Usuário" : "Cadastrar Novo Usuário"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Atualize as informações do usuário"
                  : "Preencha as informações do novo usuário"}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit(handleSubmitUser)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo do usuário"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    {...form.register("email")}
                    onChange={(e) => {
                      form.register("email").onChange(e);
                      handleEmailChange(e);
                    }}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(11) 99999-9999"
                    {...form.register("telefone")}
                    onChange={(e) => {
                      form.register("telefone").onChange(e);
                      handlePhoneChange(e);
                    }}
                  />
                  {form.formState.errors.telefone && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.telefone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role">Tipo de Usuário</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value) =>
                      form.setValue("role", value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="atendente">Atendente</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.role.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={form.watch("ativo")}
                  onCheckedChange={(checked) => form.setValue("ativo", checked)}
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
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingUser ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        {/* Dialog de Cancelar Convite */}
        <ConfirmationDialog
          open={showCancelInviteDialog}
          onOpenChange={setShowCancelInviteDialog}
          onConfirm={confirmCancelInvite}
          title="Cancelar Convite"
          description={`Tem certeza que deseja cancelar o convite de "${userToCancel?.name}"? O link de ativação será invalidado e o usuário ficará inativo.`}
          confirmText="Cancelar Convite"
          cancelText="Voltar"
          variant="destructive"
        />

        {/* Modal de Convite Gerado */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <DialogTitle>Link de Registro Gerado!</DialogTitle>
              </div>
              <DialogDescription>
                Envie este link para o novo usuário definir sua senha e ativar a conta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {inviteUserData && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Usuário:</strong> {inviteUserData.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Email:</strong> {inviteUserData.email}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="invite-url" className="text-sm font-medium">
                  Link de Registro
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="invite-url"
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      toast.success("Link copiado para área de transferência!");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription className="text-sm">
                  Este link expira em <strong>7 dias</strong>. Certifique-se de
                  enviá-lo ao usuário antes do prazo.
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  📧 <strong>Próximo passo:</strong> Envie este link por email
                  ou WhatsApp ao novo usuário.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="w-full"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmationDialog
          open={showDeleteConfirmation}
          onOpenChange={setShowDeleteConfirmation}
          onConfirm={confirmDeleteUser}
          title="Excluir Usuário"
          description={`Tem certeza que deseja excluir o usuário "${userToDelete?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="destructive"
        />
      </div>
    </MainLayout>
  );
};

function GestaoUsuariosPage() {
  return (
    <RequirePermission requiredRole="admin" redirectTo="/acesso-negado">
      <GestaoUsuarios />
    </RequirePermission>
  );
}

export default GestaoUsuariosPage;
