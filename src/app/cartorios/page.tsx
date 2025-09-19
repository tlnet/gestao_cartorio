"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useCartorios } from "@/hooks/use-supabase";
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
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
  Mail,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const cartorioSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),
  endereco: z.string().min(1, "Endereço é obrigatório"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido"),
  ativo: z.boolean().default(true),
  dias_alerta_vencimento: z.number().min(1).max(30).default(3),
  notificacao_whatsapp: z.boolean().default(false),
  webhook_n8n: z.string().optional(),
});

type CartorioFormData = z.infer<typeof cartorioSchema>;

const GestaoCartorios = () => {
  const { cartorios, loading, createCartorio, updateCartorio, deleteCartorio } =
    useCartorios();
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [showCartorioDialog, setShowCartorioDialog] = useState(false);
  const [editingCartorio, setEditingCartorio] = useState<any>(null);
  const [selectedCartorio, setSelectedCartorio] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CartorioFormData>({
    resolver: zodResolver(cartorioSchema),
    defaultValues: {
      ativo: true,
      dias_alerta_vencimento: 3,
      notificacao_whatsapp: false,
    },
  });

  const statusOptions = [
    { value: "todos", label: "Todos os Status" },
    { value: "ativo", label: "Ativo" },
    { value: "inativo", label: "Inativo" },
  ];

  const cartoriosFiltrados = cartorios.filter((cartorio) => {
    const matchBusca =
      cartorio.nome.toLowerCase().includes(busca.toLowerCase()) ||
      cartorio.cnpj.includes(busca) ||
      cartorio.email.toLowerCase().includes(busca.toLowerCase());

    const matchStatus =
      filtroStatus === "todos" ||
      (filtroStatus === "ativo" && cartorio.ativo) ||
      (filtroStatus === "inativo" && !cartorio.ativo);

    return matchBusca && matchStatus;
  });

  const handleSubmitCartorio = async (data: CartorioFormData) => {
    try {
      setSubmitting(true);

      if (editingCartorio) {
        await updateCartorio(editingCartorio.id, data);
        setEditingCartorio(null);
      } else {
        await createCartorio(data);
      }

      setShowCartorioDialog(false);
      form.reset();
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCartorio = (cartorio: any) => {
    setEditingCartorio(cartorio);
    form.reset({
      nome: cartorio.nome,
      cnpj: cartorio.cnpj,
      endereco: cartorio.endereco,
      telefone: cartorio.telefone,
      email: cartorio.email,
      ativo: cartorio.ativo,
      dias_alerta_vencimento: cartorio.dias_alerta_vencimento,
      notificacao_whatsapp: cartorio.notificacao_whatsapp,
      webhook_n8n: cartorio.webhook_n8n || "",
    });
    setShowCartorioDialog(true);
  };

  const handleViewDetails = (cartorio: any) => {
    setSelectedCartorio(cartorio);
    setShowDetailsDialog(true);
  };

  const handleToggleStatus = async (cartorio: any) => {
    await updateCartorio(cartorio.id, { ativo: !cartorio.ativo });
  };

  const handleDeleteCartorio = async (cartorioId: string) => {
    if (confirm("Tem certeza que deseja remover este cartório?")) {
      await deleteCartorio(cartorioId);
    }
  };

  const handleNewCartorio = () => {
    setEditingCartorio(null);
    form.reset({
      ativo: true,
      dias_alerta_vencimento: 3,
      notificacao_whatsapp: false,
    });
    setShowCartorioDialog(true);
  };

  if (loading) {
    return (
      <MainLayout
        title="Gestão de Cartórios"
        subtitle="Administração de todos os cartórios do sistema"
        userType="admin"
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
          <Button onClick={handleNewCartorio}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cartório
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Cartórios
              </CardTitle>
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
              <CardTitle className="text-sm font-medium">
                Cartórios Ativos
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cartorios.filter((c) => c.ativo).length}
              </div>
              <p className="text-xs text-muted-foreground">Em funcionamento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Média Alertas
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cartorios.length > 0
                  ? Math.round(
                      cartorios.reduce(
                        (acc, c) => acc + c.dias_alerta_vencimento,
                        0
                      ) / cartorios.length
                    )
                  : 0}{" "}
                dias
              </div>
              <p className="text-xs text-muted-foreground">Dias para alerta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                WhatsApp Ativo
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cartorios.filter((c) => c.notificacao_whatsapp).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Com notificação ativa
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
            {cartoriosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum cartório encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  {cartorios.length === 0
                    ? "Ainda não há cartórios cadastrados no sistema."
                    : "Nenhum cartório corresponde aos filtros aplicados."}
                </p>
                {cartorios.length === 0 && (
                  <Button onClick={handleNewCartorio}>
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar Primeiro Cartório
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cartório</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Configurações</TableHead>
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
                          <p className="text-sm text-gray-500">
                            CNPJ: {cartorio.cnpj}
                          </p>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate max-w-xs">
                              {cartorio.endereco}
                            </span>
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
                        <div className="space-y-1 text-sm">
                          <div>
                            Alerta: {cartorio.dias_alerta_vencimento} dias
                          </div>
                          <div className="flex items-center gap-2">
                            <span>WhatsApp:</span>
                            <Badge
                              variant={
                                cartorio.notificacao_whatsapp
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {cartorio.notificacao_whatsapp
                                ? "Ativo"
                                : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cartorio.ativo ? "default" : "secondary"}
                        >
                          {cartorio.ativo ? "Ativo" : "Inativo"}
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
                            onClick={() => handleToggleStatus(cartorio)}
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
            )}
          </CardContent>
        </Card>

        {/* Modal de Formulário */}

        <Dialog open={showCartorioDialog} onOpenChange={setShowCartorioDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCartorio
                  ? "Editar Cartório"
                  : "Cadastrar Novo Cartório"}
              </DialogTitle>
              <DialogDescription>
                {editingCartorio
                  ? "Atualize as informações do cartório"
                  : "Preencha as informações do novo cartório"}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit(handleSubmitCartorio)}
              className="space-y-4"
            >
              <div>
                <Label htmlFor="nome">Nome do Cartório</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Cartório do 1º Ofício de Notas"
                  {...form.register("nome")}
                />
                {form.formState.errors.nome && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.nome.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    {...form.register("cnpj")}
                  />
                  {form.formState.errors.cnpj && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.cnpj.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(11) 3333-4444"
                    {...form.register("telefone")}
                  />
                  {form.formState.errors.telefone && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.telefone.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@cartorio.com.br"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Textarea
                  id="endereco"
                  placeholder="Rua, número, bairro, cidade, estado"
                  {...form.register("endereco")}
                />
                {form.formState.errors.endereco && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.endereco.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dias_alerta_vencimento">
                    Dias para Alerta
                  </Label>
                  <Input
                    id="dias_alerta_vencimento"
                    type="number"
                    min="1"
                    max="30"
                    {...form.register("dias_alerta_vencimento", {
                      valueAsNumber: true,
                    })}
                  />
                  {form.formState.errors.dias_alerta_vencimento && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.dias_alerta_vencimento.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="webhook_n8n">Webhook N8N</Label>
                  <Input
                    id="webhook_n8n"
                    placeholder="https://webhook.n8n.io/..."
                    {...form.register("webhook_n8n")}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativo"
                    checked={form.watch("ativo")}
                    onCheckedChange={(checked) =>
                      form.setValue("ativo", checked)
                    }
                  />
                  <Label htmlFor="ativo">Cartório ativo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="notificacao_whatsapp"
                    checked={form.watch("notificacao_whatsapp")}
                    onCheckedChange={(checked) =>
                      form.setValue("notificacao_whatsapp", checked)
                    }
                  />
                  <Label htmlFor="notificacao_whatsapp">
                    Notificações WhatsApp
                  </Label>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCartorioDialog(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingCartorio ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

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
                      <CardTitle className="text-lg">
                        Informações Básicas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Nome
                        </Label>
                        <p className="text-sm">{selectedCartorio.nome}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          CNPJ
                        </Label>
                        <p className="text-sm">{selectedCartorio.cnpj}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Telefone
                        </Label>
                        <p className="text-sm">{selectedCartorio.telefone}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          E-mail
                        </Label>
                        <p className="text-sm">{selectedCartorio.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Endereço
                        </Label>
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
                        <Label className="text-sm font-medium text-gray-500">
                          Dias para Alerta
                        </Label>
                        <p className="text-sm">
                          {selectedCartorio.dias_alerta_vencimento} dias
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          WhatsApp
                        </Label>
                        <Badge
                          variant={
                            selectedCartorio.notificacao_whatsapp
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedCartorio.notificacao_whatsapp
                            ? "Ativo"
                            : "Inativo"}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Webhook N8N
                        </Label>
                        <p className="text-sm truncate">
                          {selectedCartorio.webhook_n8n || "Não configurado"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">
                          Criado em
                        </Label>
                        <p className="text-sm">
                          {new Date(
                            selectedCartorio.created_at
                          ).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Building2 className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                        <Badge
                          variant={
                            selectedCartorio.ativo ? "default" : "secondary"
                          }
                          className="text-lg px-3 py-1"
                        >
                          {selectedCartorio.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        <div className="text-sm text-gray-500 mt-2">Status</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Settings className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                        <div className="text-2xl font-bold">
                          {selectedCartorio.dias_alerta_vencimento}
                        </div>
                        <div className="text-sm text-gray-500">
                          Dias de Alerta
                        </div>
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
