"use client";

import React, { useMemo, useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import { RequirePermission } from "@/components/auth/require-permission";
import { useCartorios, useUsuarios } from "@/hooks/use-supabase";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { formatCNPJ, formatEmail, formatPhone } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

// ─── tipos ───────────────────────────────────────────────────────────────────

type CartorioForm = {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  ativo: boolean;
};

type AdminForm = {
  name: string;
  email: string;
  telefone: string;
  senha: string;
  confirmaSenha: string;
};

const DEFAULT_CARTORIO: CartorioForm = {
  nome: "",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  ativo: true,
};

const DEFAULT_ADMIN: AdminForm = {
  name: "",
  email: "",
  telefone: "",
  senha: "",
  confirmaSenha: "",
};

type NovoUsuarioForm = {
  name: string;
  email: string;
  telefone: string;
  role: string;
  senha: string;
  confirmaSenha: string;
};

type EditUsuarioForm = {
  name: string;
  email: string;
  telefone: string;
  roles: string[];
  ativo: boolean;
};

const DEFAULT_NOVO_USUARIO: NovoUsuarioForm = {
  name: "",
  email: "",
  telefone: "",
  role: "atendente",
  senha: "",
  confirmaSenha: "",
};

const DEFAULT_EDIT_USUARIO: EditUsuarioForm = {
  name: "",
  email: "",
  telefone: "",
  roles: ["atendente"],
  ativo: true,
};

// ─── componente ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { cartorios, loading: loadingCartorios, updateCartorio, refetch: refetchCartorios } = useCartorios();
  const { usuarios, loading: loadingUsuarios, updateUsuario, refetch: refetchUsuarios } = useUsuarios();
  const { session } = useAuth();

  // pesquisa
  const [search, setSearch] = useState("");

  // modal de criação (2 etapas)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [cartorioForm, setCartorioForm] = useState<CartorioForm>(DEFAULT_CARTORIO);
  const [adminForm, setAdminForm] = useState<AdminForm>(DEFAULT_ADMIN);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirma, setShowConfirma] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // modal de edição de cartório
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CartorioForm>(DEFAULT_CARTORIO);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // modal de sucesso
  const [successOpen, setSuccessOpen] = useState(false);
  const [successData, setSuccessData] = useState<{ cartorioNome: string; adminNome: string; adminEmail: string } | null>(null);

  // modal criar super admin
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [superAdminForm, setSuperAdminForm] = useState({ name: "", email: "", telefone: "", senha: "", confirmaSenha: "" });
  const [superAdminSenhaVis, setSuperAdminSenhaVis] = useState(false);
  const [superAdminConfVis, setSuperAdminConfVis] = useState(false);
  const [superAdminSubmitting, setSuperAdminSubmitting] = useState(false);

  // modal criar usuário para cartório existente
  const [novoUsuarioOpen, setNovoUsuarioOpen] = useState(false);
  const [novoUsuarioCartorio, setNovoUsuarioCartorio] = useState<{ id: string; nome: string } | null>(null);
  const [novoUsuarioForm, setNovoUsuarioForm] = useState<NovoUsuarioForm>(DEFAULT_NOVO_USUARIO);
  const [novoUsuarioSenhaVis, setNovoUsuarioSenhaVis] = useState(false);
  const [novoUsuarioConfVis, setNovoUsuarioConfVis] = useState(false);
  const [novoUsuarioSubmitting, setNovoUsuarioSubmitting] = useState(false);

  // modal editar usuário
  const [editUsuarioOpen, setEditUsuarioOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<any | null>(null);
  const [editUsuarioForm, setEditUsuarioForm] =
    useState<EditUsuarioForm>(DEFAULT_EDIT_USUARIO);
  const [editUsuarioSubmitting, setEditUsuarioSubmitting] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // dialog de dupla confirmação para delete
  type ConfirmTarget =
    | { tipo: "usuario"; id: string; nome: string; email: string }
    | { tipo: "cartorio"; id: string; nome: string; qtdUsuarios: number };

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);
  const [confirmDeleting, setConfirmDeleting] = useState(false);

  // expandir usuários por cartório
  const [expandedCartorios, setExpandedCartorios] = useState<Record<string, boolean>>({});

  // ─── derivações ──────────────────────────────────────────────────────────

  const cartoriosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cartorios;
    return cartorios.filter((c) =>
      [c.nome, c.cnpj, c.email, c.telefone].some((v) =>
        String(v || "").toLowerCase().includes(term)
      )
    );
  }, [cartorios, search]);

  const totalCartorios = cartorios.length;
  const totalCartoriosAtivos = cartorios.filter((c) => c.ativo).length;
  const totalUsuarios = usuarios.length;
  const totalSuperAdmin = usuarios.filter((u) =>
    ((u as any).roles || [u.role]).includes("admin_geral")
  ).length;

  const listaSuperAdmins = useMemo(
    () => usuarios.filter((u) => ((u as any).roles || [u.role]).includes("admin_geral")),
    [usuarios]
  );

  const superAdminSenhaErro = (() => {
    if (superAdminForm.senha && superAdminForm.senha.length < 8) return "Mínimo 8 caracteres.";
    if (superAdminForm.confirmaSenha && superAdminForm.senha !== superAdminForm.confirmaSenha)
      return "Senhas não coincidem.";
    return null;
  })();

  const superAdminValid =
    superAdminForm.name.trim().length > 0 &&
    superAdminForm.email.trim().length > 0 &&
    superAdminForm.telefone.trim().length > 0 &&
    superAdminForm.senha.length >= 8 &&
    superAdminForm.senha === superAdminForm.confirmaSenha;

  // ─── helpers de badge ────────────────────────────────────────────────────

  const getRoles = (u: any): string[] => {
    if (Array.isArray(u.roles) && u.roles.length > 0) return u.roles;
    return u.role ? [u.role] : [];
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin_geral": return "Super Adm";
      case "admin":       return "Administrador";
      case "financeiro":  return "Financeiro";
      case "atendente":   return "Atendente";
      default:            return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin_geral": return "bg-red-100 text-red-800";
      case "admin":       return "bg-purple-100 text-purple-800";
      case "financeiro":  return "bg-amber-100 text-amber-800";
      case "atendente":   return "bg-green-100 text-green-800";
      default:            return "bg-gray-100 text-gray-800";
    }
  };

  // ─── helpers de tabela ───────────────────────────────────────────────────

  const usuariosDoCartorio = (id: string) =>
    usuarios.filter((u) => (u as any).cartorio_id === id);

  const toggleExpanded = (id: string) =>
    setExpandedCartorios((prev) => ({ ...prev, [id]: !prev[id] }));

  // ─── abrir modal criação ─────────────────────────────────────────────────

  const openCreateDialog = () => {
    setCartorioForm(DEFAULT_CARTORIO);
    setAdminForm(DEFAULT_ADMIN);
    setStep(1);
    setSearch("");
    setDialogOpen(true);
  };

  // ─── validação etapa 1 ───────────────────────────────────────────────────

  const step1Valid =
    cartorioForm.nome.trim().length > 0 &&
    cartorioForm.email.trim().length > 0;

  // ─── validação etapa 2 ───────────────────────────────────────────────────

  const senhaErro = (() => {
    if (adminForm.senha && adminForm.senha.length < 8) return "Mínimo 8 caracteres.";
    if (adminForm.confirmaSenha && adminForm.senha !== adminForm.confirmaSenha) return "Senhas não coincidem.";
    return null;
  })();

  const step2Valid =
    adminForm.name.trim().length > 0 &&
    adminForm.email.trim().length > 0 &&
    adminForm.telefone.trim().length > 0 &&
    adminForm.senha.length >= 8 &&
    adminForm.senha === adminForm.confirmaSenha;

  // ─── salvar (etapa 2 → API) ───────────────────────────────────────────────

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const res = await fetch("/api/admin/criar-cartorio-com-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          cartorio: cartorioForm,
          adminUser: {
            name: adminForm.name,
            email: adminForm.email,
            telefone: adminForm.telefone,
            senha: adminForm.senha,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar cartório.");
        return;
      }

      setSuccessData({
        cartorioNome: data.cartorio.nome,
        adminNome: data.usuario.name,
        adminEmail: data.usuario.email,
      });

      setDialogOpen(false);

      // Aguarda os dados recarregarem antes de exibir o modal de sucesso
      await Promise.all([
        refetchCartorios?.(),
        refetchUsuarios?.(),
      ]);

      setSuccessOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── editar cartório ─────────────────────────────────────────────────────

  const openEditDialog = (cartorio: any) => {
    setEditingId(cartorio.id);
    setEditForm({
      nome: cartorio.nome || "",
      cnpj: cartorio.cnpj || "",
      telefone: cartorio.telefone || "",
      email: cartorio.email || "",
      endereco: cartorio.endereco || "",
      ativo: !!cartorio.ativo,
    });
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditSubmitting(true);
    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const res = await fetch("/api/admin/editar-cartorio", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id: editingId, updates: editForm }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao atualizar cartório.");
        return;
      }

      toast.success("Cartório atualizado com sucesso!");
      setEditDialogOpen(false);
      await refetchCartorios?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado ao salvar.");
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─── criar usuário para cartório existente ───────────────────────────────

  const openNovoUsuario = (cartorio: { id: string; nome: string }) => {
    setNovoUsuarioCartorio(cartorio);
    setNovoUsuarioForm(DEFAULT_NOVO_USUARIO);
    setNovoUsuarioSenhaVis(false);
    setNovoUsuarioConfVis(false);
    setNovoUsuarioOpen(true);
  };

  const novoUsuarioSenhaErro = (() => {
    if (novoUsuarioForm.senha && novoUsuarioForm.senha.length < 8) return "Mínimo 8 caracteres.";
    if (novoUsuarioForm.confirmaSenha && novoUsuarioForm.senha !== novoUsuarioForm.confirmaSenha)
      return "Senhas não coincidem.";
    return null;
  })();

  const novoUsuarioValid =
    novoUsuarioForm.name.trim().length > 0 &&
    novoUsuarioForm.email.trim().length > 0 &&
    novoUsuarioForm.telefone.trim().length > 0 &&
    novoUsuarioForm.role.length > 0 &&
    novoUsuarioForm.senha.length >= 8 &&
    novoUsuarioForm.senha === novoUsuarioForm.confirmaSenha;

  const handleCriarUsuario = async () => {
    if (!novoUsuarioCartorio) return;
    setNovoUsuarioSubmitting(true);
    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const res = await fetch("/api/admin/criar-usuario-cartorio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          cartorio_id: novoUsuarioCartorio.id,
          name: novoUsuarioForm.name,
          email: novoUsuarioForm.email,
          telefone: novoUsuarioForm.telefone,
          role: novoUsuarioForm.role,
          senha: novoUsuarioForm.senha,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erro ao criar usuário.");
        return;
      }

      toast.success(`Usuário "${novoUsuarioForm.name}" criado com sucesso!`);
      setNovoUsuarioOpen(false);
      setSearch("");
      await refetchUsuarios?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado.");
    } finally {
      setNovoUsuarioSubmitting(false);
    }
  };

  // ─── criar super admin ───────────────────────────────────────────────────

  const handleCriarSuperAdmin = async () => {
    setSuperAdminSubmitting(true);
    try {
      const accessToken = session?.access_token;
      if (!accessToken) { toast.error("Sessão expirada."); return; }

      const res = await fetch("/api/admin/criar-super-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: superAdminForm.name,
          email: superAdminForm.email,
          telefone: superAdminForm.telefone,
          senha: superAdminForm.senha,
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao criar Super Administrador."); return; }

      toast.success(`Super Administrador "${superAdminForm.name}" criado com sucesso!`);
      setSuperAdminOpen(false);
      setSuperAdminForm({ name: "", email: "", telefone: "", senha: "", confirmaSenha: "" });
      setSearch("");
      await refetchUsuarios?.();
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado.");
    } finally {
      setSuperAdminSubmitting(false);
    }
  };

  // ─── confirmação e delete ─────────────────────────────────────────────────

  const openConfirmDelete = (target: ConfirmTarget) => {
    setConfirmTarget(target);
    setConfirmStep(1);
    setConfirmDeleting(false);
  };

  const closeConfirm = () => {
    if (confirmDeleting) return;
    setConfirmTarget(null);
    setConfirmStep(1);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;

    if (confirmStep === 1) {
      setConfirmStep(2);
      return;
    }

    // Etapa 2 → executa o delete de fato
    setConfirmDeleting(true);
    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      if (confirmTarget.tipo === "usuario") {
        const res = await fetch(
          `/api/admin/deletar-usuario?id=${confirmTarget.id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || "Erro ao excluir usuário."); return; }
        toast.success(`Usuário "${confirmTarget.nome}" excluído.`);
        setSearch("");
        await refetchUsuarios?.();
      } else {
        const res = await fetch(
          `/api/admin/deletar-cartorio?id=${confirmTarget.id}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || "Erro ao excluir cartório."); return; }
        toast.success(`Cartório "${confirmTarget.nome}" e seus usuários foram excluídos.`);
        setSearch("");
        await Promise.all([refetchCartorios?.(), refetchUsuarios?.()]);
      }

      setConfirmTarget(null);
      setConfirmStep(1);
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado.");
    } finally {
      setConfirmDeleting(false);
    }
  };

  // ─── toggle ativo usuário ─────────────────────────────────────────────────

  const toggleUsuarioAtivo = async (usuario: any, ativo: boolean) => {
    await updateUsuario(usuario.id, { ativo });
  };

  const openEditUsuarioDialog = (usuario: any) => {
    const roles = Array.isArray((usuario as any).roles) && (usuario as any).roles.length
      ? (usuario as any).roles
      : usuario.role
      ? [usuario.role]
      : ["atendente"];

    setEditingUsuario(usuario);
    setEditUsuarioForm({
      name: usuario.name || "",
      email: usuario.email || "",
      telefone: (usuario as any).telefone || "",
      roles,
      ativo: !!usuario.ativo,
    });
    setEditUsuarioOpen(true);
  };

  const saveEditUsuario = async () => {
    if (!editingUsuario?.id) return;
    setEditUsuarioSubmitting(true);
    try {
      const nextRoles = editUsuarioForm.roles?.length
        ? editUsuarioForm.roles
        : ["atendente"];

      const updates: any = {
        name: editUsuarioForm.name,
        email: editUsuarioForm.email,
        telefone: editUsuarioForm.telefone,
        ativo: editUsuarioForm.ativo,
      };

      // Não permitir alterar permissões de Super Administrador por aqui
      if (!nextRoles.includes("admin_geral")) {
        updates.role = nextRoles[0];
        updates.roles = nextRoles;
      }

      await updateUsuario(editingUsuario.id, updates);
      setEditUsuarioOpen(false);
      setEditingUsuario(null);
      await refetchUsuarios?.();
    } finally {
      setEditUsuarioSubmitting(false);
    }
  };

  const sendResetPasswordEmail = async () => {
    if (!editUsuarioForm.email?.trim()) {
      toast.error("E-mail do usuário não informado.");
      return;
    }

    setSendingResetEmail(true);
    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const redirectTo = siteUrl ? `${siteUrl}/login?type=recovery` : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        editUsuarioForm.email.trim(),
        redirectTo ? { redirectTo } : undefined
      );

      if (error) {
        toast.error("Erro ao enviar e-mail de redefinição: " + error.message);
        return;
      }

      toast.success(
        "E-mail de redefinição enviado (se o endereço estiver válido no Auth)."
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro inesperado ao enviar e-mail.");
    } finally {
      setSendingResetEmail(false);
    }
  };

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <RequirePermission requiredRole="admin_geral">
      <MainLayout
        title="Administração Geral"
        subtitle="Visão completa dos cartórios e gerenciamento global do sistema"
      >
        <div className="space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cartórios cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-3xl font-bold">{totalCartorios}</span>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cartórios ativos</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-3xl font-bold">{totalCartoriosAtivos}</span>
                <Badge variant="secondary">
                  {totalCartorios ? Math.round((totalCartoriosAtivos / totalCartorios) * 100) : 0}%
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Usuários totais</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-3xl font-bold">{totalUsuarios}</span>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Super administradores</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-3xl font-bold">{totalSuperAdmin}</span>
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>

          {/* Tabela Super Administradores */}
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-red-600" />
                <CardTitle>Super Administradores</CardTitle>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSuperAdminForm({ name: "", email: "", telefone: "", senha: "", confirmaSenha: "" });
                  setSuperAdminSenhaVis(false);
                  setSuperAdminConfVis(false);
                  setSuperAdminOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Super Adm
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaSuperAdmins.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-muted-foreground">{(u as any).telefone || "-"}</TableCell>
                      <TableCell>
                        <Badge className={u.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditUsuarioDialog(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            openConfirmDelete({
                              tipo: "usuario",
                              id: u.id,
                              nome: u.name,
                              email: u.email,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {loadingUsuarios && listaSuperAdmins.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
              )}
              {!loadingUsuarios && listaSuperAdmins.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum Super Administrador cadastrado.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tabela Cartórios */}
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Cartórios</CardTitle>
              <div className="flex w-full gap-2 md:w-auto">
                <Input
                  placeholder="Buscar por nome, CNPJ, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="md:w-80"
                />
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo cartório
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartoriosFiltrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.cnpj || "-"}</TableCell>
                      <TableCell>{c.email || "-"}</TableCell>
                      <TableCell>{usuariosDoCartorio(c.id).length}</TableCell>
                      <TableCell>
                        <Badge className={c.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              openConfirmDelete({
                                tipo: "cartorio",
                                id: c.id,
                                nome: c.nome,
                                qtdUsuarios: usuariosDoCartorio(c.id).length,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {loadingCartorios && cartoriosFiltrados.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
              )}
              {!loadingCartorios && cartoriosFiltrados.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum cartório encontrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Tabela Usuários por Cartório */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários por Cartório</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cartório</TableHead>
                    <TableHead>Qtd. Usuários</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cartoriosFiltrados.map((c) => {
                      const lista = usuariosDoCartorio(c.id);
                      const expanded = !!expandedCartorios[c.id];
                      return (
                        <React.Fragment key={`u-${c.id}`}>
                          <TableRow>
                            <TableCell className="font-medium">
                              <button
                                type="button"
                                onClick={() => toggleExpanded(c.id)}
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                {c.nome}
                              </button>
                            </TableCell>
                            <TableCell>{lista.length}</TableCell>
                            <TableCell>
                              <Badge className={c.ativo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                {c.ativo ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {expanded && (
                            <TableRow>
                              <TableCell colSpan={3} className="bg-muted/20">
                                <div className="space-y-3 p-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-muted-foreground">Usuários vinculados</p>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openNovoUsuario({ id: c.id, nome: c.nome })}
                                    >
                                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                      Novo usuário
                                    </Button>
                                  </div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Perfil</TableHead>
                                        <TableHead>Ativo</TableHead>
                                        <TableHead></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {lista.map((u) => (
                                        <TableRow key={u.id}>
                                          <TableCell className="font-medium">{u.name}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                                          <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                              {getRoles(u).map((r) => (
                                                <Badge key={`${u.id}-${r}`} className={getRoleColor(r)}>
                                                  {getRoleLabel(r)}
                                                </Badge>
                                              ))}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Switch
                                              checked={!!u.ativo}
                                              onCheckedChange={(v) => toggleUsuarioAtivo(u, v)}
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openEditUsuarioDialog(u)}
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-destructive hover:text-destructive"
                                              onClick={() =>
                                                openConfirmDelete({
                                                  tipo: "usuario",
                                                  id: u.id,
                                                  nome: u.name,
                                                  email: u.email,
                                                })
                                              }
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                  {!loadingUsuarios && lista.length === 0 && (
                                    <p className="py-2 text-center text-sm text-muted-foreground">
                                      Nenhum usuário vinculado a este cartório.
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* ── Modal criação em 2 etapas ── */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!submitting) setDialogOpen(open); }}>
          <DialogContent className="sm:max-w-lg">
            {/* indicador de etapa */}
            <div className="mb-1 flex items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${step === 1 ? "bg-primary text-primary-foreground" : "bg-green-500 text-white"}`}>
                {step === 1 ? "1" : <CheckCircle className="h-4 w-4" />}
              </span>
              <span className="h-px flex-1 bg-border" />
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                2
              </span>
            </div>

            <DialogHeader>
              <DialogTitle>
                {step === 1 ? "Novo cartório — Dados do cartório" : "Novo cartório — Administrador"}
              </DialogTitle>
              <DialogDescription>
                {step === 1
                  ? "Preencha as informações cadastrais do cartório."
                  : "Crie o primeiro usuário administrador que terá acesso ao painel deste cartório."}
              </DialogDescription>
            </DialogHeader>

            {/* ── ETAPA 1 ── */}
            {step === 1 && (
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label>Nome <span className="text-destructive">*</span></Label>
                  <Input
                    value={cartorioForm.nome}
                    onChange={(e) => setCartorioForm((p) => ({ ...p, nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ</Label>
                  <Input
                    value={cartorioForm.cnpj}
                    inputMode="numeric"
                    maxLength={18}
                    onChange={(e) => setCartorioForm((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input
                    value={cartorioForm.email}
                    type="email"
                    onChange={(e) => setCartorioForm((p) => ({ ...p, email: formatEmail(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    value={cartorioForm.telefone}
                    inputMode="numeric"
                    maxLength={15}
                    onChange={(e) => setCartorioForm((p) => ({ ...p, telefone: formatPhone(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Endereço</Label>
                  <Input
                    value={cartorioForm.endereco}
                    onChange={(e) => setCartorioForm((p) => ({ ...p, endereco: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Cartório ativo</Label>
                  <Switch
                    checked={cartorioForm.ativo}
                    onCheckedChange={(v) => setCartorioForm((p) => ({ ...p, ativo: v }))}
                  />
                </div>
              </div>
            )}

            {/* ── ETAPA 2 ── */}
            {step === 2 && (
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label>Nome completo <span className="text-destructive">*</span></Label>
                  <Input
                    value={adminForm.name}
                    onChange={(e) => setAdminForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-destructive">*</span></Label>
                  <Input
                    value={adminForm.email}
                    type="email"
                    onChange={(e) => setAdminForm((p) => ({ ...p, email: formatEmail(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone <span className="text-destructive">*</span></Label>
                  <Input
                    value={adminForm.telefone}
                    inputMode="numeric"
                    maxLength={15}
                    onChange={(e) => setAdminForm((p) => ({ ...p, telefone: formatPhone(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showSenha ? "text" : "password"}
                      value={adminForm.senha}
                      onChange={(e) => setAdminForm((p) => ({ ...p, senha: e.target.value }))}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowSenha((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Confirmar senha <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showConfirma ? "text" : "password"}
                      value={adminForm.confirmaSenha}
                      onChange={(e) => setAdminForm((p) => ({ ...p, confirmaSenha: e.target.value }))}
                      className={`pr-10 ${senhaErro && adminForm.confirmaSenha ? "border-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirma((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showConfirma ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {senhaErro && adminForm.confirmaSenha && (
                    <p className="text-xs text-destructive">{senhaErro}</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              {step === 1 ? (
                <>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button disabled={!step1Valid} onClick={() => setStep(2)}>
                    Próximo: Administrador →
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                    ← Voltar
                  </Button>
                  <Button disabled={!step2Valid || submitting} onClick={handleCreate}>
                    {submitting ? "Criando..." : "Criar cartório e administrador"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal edição de cartório ── */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!editSubmitting) setEditDialogOpen(open); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar cartório</DialogTitle>
              <DialogDescription>Atualize as informações cadastrais do cartório.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={editForm.nome} onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input value={editForm.cnpj} inputMode="numeric" maxLength={18}
                  onChange={(e) => setEditForm((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={editForm.email} type="email"
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={editForm.telefone} inputMode="numeric" maxLength={15}
                  onChange={(e) => setEditForm((p) => ({ ...p, telefone: formatPhone(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço</Label>
                <Input value={editForm.endereco} onChange={(e) => setEditForm((p) => ({ ...p, endereco: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Cartório ativo</Label>
                <Switch checked={editForm.ativo} onCheckedChange={(v) => setEditForm((p) => ({ ...p, ativo: v }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
              <Button disabled={editSubmitting || !editForm.nome || !editForm.email} onClick={saveEdit}>
                {editSubmitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal criar Super Administrador ── */}
        <Dialog open={superAdminOpen} onOpenChange={(open) => { if (!superAdminSubmitting) setSuperAdminOpen(open); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="mb-1 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-red-600" />
                <DialogTitle>Novo Super Administrador</DialogTitle>
              </div>
              <DialogDescription>
                O Super Administrador terá acesso exclusivo ao painel de administração geral e não estará vinculado a nenhum cartório.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  value={superAdminForm.name}
                  onChange={(e) => setSuperAdminForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={superAdminForm.email}
                  onChange={(e) => setSuperAdminForm((p) => ({ ...p, email: formatEmail(e.target.value) }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input
                  value={superAdminForm.telefone}
                  inputMode="numeric"
                  maxLength={15}
                  onChange={(e) => setSuperAdminForm((p) => ({ ...p, telefone: formatPhone(e.target.value) }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={superAdminSenhaVis ? "text" : "password"}
                    value={superAdminForm.senha}
                    onChange={(e) => setSuperAdminForm((p) => ({ ...p, senha: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setSuperAdminSenhaVis((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {superAdminSenhaVis ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Confirmar senha <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={superAdminConfVis ? "text" : "password"}
                    value={superAdminForm.confirmaSenha}
                    onChange={(e) => setSuperAdminForm((p) => ({ ...p, confirmaSenha: e.target.value }))}
                    className={`pr-10 ${superAdminSenhaErro && superAdminForm.confirmaSenha ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setSuperAdminConfVis((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {superAdminConfVis ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {superAdminSenhaErro && superAdminForm.confirmaSenha && (
                  <p className="text-xs text-destructive">{superAdminSenhaErro}</p>
                )}
              </div>

              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                <strong>Atenção:</strong> Este usuário terá acesso total ao painel administrativo. Crie apenas para pessoas de total confiança.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSuperAdminOpen(false)} disabled={superAdminSubmitting}>
                Cancelar
              </Button>
              <Button disabled={!superAdminValid || superAdminSubmitting} onClick={handleCriarSuperAdmin}>
                {superAdminSubmitting ? "Criando..." : "Criar Super Administrador"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal dupla confirmação de delete ── */}
        <Dialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) closeConfirm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mb-2 flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${confirmStep === 2 ? "bg-red-100" : "bg-amber-100"}`}>
                  <AlertTriangle className={`h-5 w-5 ${confirmStep === 2 ? "text-red-600" : "text-amber-600"}`} />
                </div>
                <div>
                  <DialogTitle className="text-base">
                    {confirmStep === 1 ? "Confirmar exclusão" : "Tem certeza absoluta?"}
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>

            {confirmTarget && confirmStep === 1 && (
              <div className="space-y-3">
                {confirmTarget.tipo === "usuario" ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Você está prestes a excluir o usuário:
                    </p>
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                      <p><span className="font-medium">Nome:</span> {confirmTarget.nome}</p>
                      <p><span className="font-medium">Email:</span> {confirmTarget.email}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      O acesso ao sistema será removido imediatamente.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Você está prestes a excluir o cartório:
                    </p>
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                      <p><span className="font-medium">Cartório:</span> {confirmTarget.nome}</p>
                      <p><span className="font-medium">Usuários vinculados:</span> {confirmTarget.qtdUsuarios}</p>
                    </div>
                    {confirmTarget.qtdUsuarios > 0 && (
                      <p className="text-sm font-medium text-amber-600">
                        ⚠ Todos os {confirmTarget.qtdUsuarios} usuário(s) vinculado(s) também serão excluídos.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {confirmTarget && confirmStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Esta ação é <strong>irreversível</strong>.{" "}
                  {confirmTarget.tipo === "cartorio" && confirmTarget.qtdUsuarios > 0
                    ? `O cartório e seus ${confirmTarget.qtdUsuarios} usuário(s) serão excluídos permanentemente.`
                    : "O registro será excluído permanentemente do sistema."}
                </p>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <strong>"{confirmTarget.nome}"</strong> será removido e não poderá ser recuperado.
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={closeConfirm} disabled={confirmDeleting}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={confirmDeleting}
                onClick={handleConfirmDelete}
              >
                {confirmDeleting
                  ? "Excluindo..."
                  : confirmStep === 1
                  ? "Continuar →"
                  : "Sim, excluir definitivamente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal criar usuário para cartório existente ── */}
        <Dialog open={novoUsuarioOpen} onOpenChange={(open) => { if (!novoUsuarioSubmitting) setNovoUsuarioOpen(open); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo usuário</DialogTitle>
              <DialogDescription>
                Criando usuário para o cartório <strong>{novoUsuarioCartorio?.nome}</strong>.
                O usuário já poderá fazer login após a criação.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  value={novoUsuarioForm.name}
                  onChange={(e) => setNovoUsuarioForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={novoUsuarioForm.email}
                  onChange={(e) => setNovoUsuarioForm((p) => ({ ...p, email: formatEmail(e.target.value) }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input
                  value={novoUsuarioForm.telefone}
                  inputMode="numeric"
                  maxLength={15}
                  onChange={(e) => setNovoUsuarioForm((p) => ({ ...p, telefone: formatPhone(e.target.value) }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Perfil <span className="text-destructive">*</span></Label>
                <Select
                  value={novoUsuarioForm.role}
                  onValueChange={(v) => setNovoUsuarioForm((p) => ({ ...p, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="atendente">Atendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Senha <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={novoUsuarioSenhaVis ? "text" : "password"}
                    value={novoUsuarioForm.senha}
                    onChange={(e) => setNovoUsuarioForm((p) => ({ ...p, senha: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setNovoUsuarioSenhaVis((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {novoUsuarioSenhaVis ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Confirmar senha <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={novoUsuarioConfVis ? "text" : "password"}
                    value={novoUsuarioForm.confirmaSenha}
                    onChange={(e) => setNovoUsuarioForm((p) => ({ ...p, confirmaSenha: e.target.value }))}
                    className={`pr-10 ${novoUsuarioSenhaErro && novoUsuarioForm.confirmaSenha ? "border-destructive" : ""}`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setNovoUsuarioConfVis((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {novoUsuarioConfVis ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {novoUsuarioSenhaErro && novoUsuarioForm.confirmaSenha && (
                  <p className="text-xs text-destructive">{novoUsuarioSenhaErro}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNovoUsuarioOpen(false)} disabled={novoUsuarioSubmitting}>
                Cancelar
              </Button>
              <Button disabled={!novoUsuarioValid || novoUsuarioSubmitting} onClick={handleCriarUsuario}>
                {novoUsuarioSubmitting ? "Criando..." : "Criar usuário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal editar usuário ── */}
        <Dialog
          open={editUsuarioOpen}
          onOpenChange={(open) => {
            if (!editUsuarioSubmitting) setEditUsuarioOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
              <DialogDescription>
                Atualize as informações do usuário selecionado.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome completo <span className="text-destructive">*</span></Label>
                <Input
                  value={editUsuarioForm.name}
                  onChange={(e) =>
                    setEditUsuarioForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={editUsuarioForm.email}
                  onChange={(e) =>
                    setEditUsuarioForm((p) => ({ ...p, email: formatEmail(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  value={editUsuarioForm.telefone}
                  inputMode="numeric"
                  maxLength={15}
                  onChange={(e) =>
                    setEditUsuarioForm((p) => ({
                      ...p,
                      telefone: formatPhone(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Permissões</Label>
                {Array.isArray(editUsuarioForm.roles) &&
                editUsuarioForm.roles.includes("admin_geral") ? (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                    Este usuário é <strong>Super Administrador</strong>. As permissões não podem ser alteradas aqui.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {(["admin", "atendente", "financeiro"] as const).map((r) => (
                      <div key={r} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-role-${r}`}
                          checked={editUsuarioForm.roles.includes(r)}
                          onCheckedChange={(checked) => {
                            setEditUsuarioForm((prev) => {
                              const current = prev.roles || [];
                              if (checked) {
                                return { ...prev, roles: Array.from(new Set([...current, r])) };
                              }
                              const next = current.filter((x) => x !== r);
                              return { ...prev, roles: next.length ? next : ["atendente"] };
                            });
                          }}
                        />
                        <label
                          htmlFor={`edit-role-${r}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {getRoleLabel(r)}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Usuário ativo</Label>
                <Switch
                  checked={!!editUsuarioForm.ativo}
                  onCheckedChange={(v) =>
                    setEditUsuarioForm((p) => ({ ...p, ativo: v }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditUsuarioOpen(false)}
                disabled={editUsuarioSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={sendResetPasswordEmail}
                disabled={sendingResetEmail || editUsuarioSubmitting}
              >
                {sendingResetEmail ? "Enviando..." : "Enviar redefinição de senha"}
              </Button>
              <Button
                disabled={
                  editUsuarioSubmitting ||
                  !editUsuarioForm.name.trim() ||
                  !editUsuarioForm.email.trim()
                }
                onClick={saveEditUsuario}
              >
                {editUsuarioSubmitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Modal de sucesso ── */}
        <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <DialogTitle>Cartório criado com sucesso!</DialogTitle>
              </div>
              <DialogDescription>
                O cartório e o primeiro administrador foram criados e já estão ativos no sistema.
              </DialogDescription>
            </DialogHeader>

            {successData && (
              <div className="rounded-lg bg-gray-50 p-4 space-y-1 text-sm text-gray-700">
                <p><strong>Cartório:</strong> {successData.cartorioNome}</p>
                <p><strong>Administrador:</strong> {successData.adminNome}</p>
                <p><strong>Email de acesso:</strong> {successData.adminEmail}</p>
                <p className="mt-2 text-green-700 font-medium">
                  ✓ O administrador já pode fazer login com o email e senha cadastrados.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button className="w-full" onClick={() => setSuccessOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </MainLayout>
    </RequirePermission>
  );
}
