"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useAuth } from "@/contexts/auth-context";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Building2,
  Save,
  Edit,
  X,
  Camera,
  Upload,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import ImageCrop from "@/components/ui/image-crop";
import { formatPhone, isValidPhone } from "@/lib/formatters";

const profileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  telefone: z
    .string()
    .min(1, "Telefone é obrigatório")
    .refine((value) => isValidPhone(value), {
      message:
        "Por favor, insira um telefone válido no formato (11) 99999-9999",
    }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const PerfilPage = () => {
  const { user, userRoles } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordStage, setChangePasswordStage] = useState<
    "confirm" | "update"
  >("confirm");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordBusy, setChangePasswordBusy] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(
    null
  );

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      telefone: "",
    },
  });

  // Buscar dados do usuário
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from("users")
            .select("*, cartorio:cartorios(nome)")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Erro ao buscar perfil:", error);
            toast.error("Erro ao carregar perfil");
            return;
          }

          let profile = data as any;
          if (profile?.cartorio_id && !profile?.cartorio?.nome) {
            const { data: cartorio } = await supabase
              .from("cartorios")
              .select("nome")
              .eq("id", profile.cartorio_id)
              .single();
            if (cartorio?.nome) profile = { ...profile, cartorio: { nome: cartorio.nome } };
          }
          setUserProfile(profile);
          setProfileImage(profile.avatar_url);
          form.reset({
            name: profile.name || "",
            telefone: profile.telefone || "",
          });
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
          toast.error("Erro ao carregar perfil");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user, form]);

  const getUserInitials = (name: string) => {
    if (!name) return "U";
    const names = name.trim().split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "atendente":
        return "Atendente";
      case "financeiro":
        return "Financeiro";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "atendente":
        return "bg-green-100 text-green-800";
      case "financeiro":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSaveProfile = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from("users")
        .update({
          name: data.name,
          telefone: data.telefone,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      // Atualizar o perfil local
      setUserProfile((prev: any) => ({
        ...prev,
        name: data.name,
        telefone: data.telefone,
      }));

      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const resetChangePasswordModal = () => {
    setChangePasswordStage("confirm");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePasswordError(null);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  const openChangePasswordModal = () => {
    resetChangePasswordModal();
    setChangePasswordOpen(true);
  };

  const closeChangePasswordModal = () => {
    setChangePasswordOpen(false);
    resetChangePasswordModal();
  };

  const handleVerifyCurrentPassword = async () => {
    if (!user?.email) {
      setChangePasswordError("E-mail do usuário não disponível.");
      return;
    }

    setChangePasswordError(null);

    if (!currentPassword) {
      setChangePasswordError("Informe sua senha atual.");
      return;
    }

    try {
      setChangePasswordBusy(true);

      // Reautentica para validar a senha atual
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (error) {
        throw error;
      }

      setChangePasswordStage("update");
      toast.success("Senha atual confirmada.");
    } catch (error: any) {
      console.error("Erro ao confirmar senha atual:", error);
      setChangePasswordError(
        error?.message || "Senha atual inválida. Tente novamente."
      );
    } finally {
      setChangePasswordBusy(false);
    }
  };

  const handleUpdatePassword = async () => {
    setChangePasswordError(null);

    if (!newPassword || newPassword.length < 8) {
      setChangePasswordError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("As senhas não conferem.");
      return;
    }

    try {
      setChangePasswordBusy(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      toast.success("Senha alterada com sucesso!");
      closeChangePasswordModal();
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      setChangePasswordError(
        error?.message || "Erro ao alterar senha. Tente novamente."
      );
      toast.error(error?.message || "Erro ao alterar senha.");
    } finally {
      setChangePasswordBusy(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset({
      name: userProfile?.name || "",
      telefone: userProfile?.telefone || "",
    });
  };

  // Handler de formatação de telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    form.setValue("telefone", formatted);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    // Validar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    // Armazenar o arquivo e abrir o modal de crop
    setSelectedImageFile(file);
    setShowCropModal(true);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    if (!user) return;

    try {
      setUploadingImage(true);

      // Criar nome único para o arquivo
      const fileExt = "jpg"; // Sempre usar JPG para melhor compressão
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedImageBlob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública da imagem
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Atualizar o avatar_url no banco de dados
      const { error: updateError } = await supabase
        .from("users")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      // Atualizar o estado local
      setProfileImage(publicUrl);
      setUserProfile((prev: any) => ({
        ...prev,
        avatar_url: publicUrl,
      }));

      toast.success("Foto de perfil atualizada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao fazer upload da imagem:", error);
      toast.error("Erro ao fazer upload da imagem: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout
          title="Meu Perfil"
          subtitle="Gerencie suas informações pessoais"
        >
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-32 bg-gray-200 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <MainLayout
        title="Meu Perfil"
        subtitle="Gerencie suas informações pessoais"
      >
        <div className="space-y-6">
          {/* Card Principal do Perfil */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações Pessoais
                  </CardTitle>
                  <CardDescription>
                    Visualize e edite suas informações de perfil
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleCancelEdit}>
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        onClick={form.handleSubmit(handleSaveProfile)}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar e Informações Básicas */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative group">
                  <label htmlFor="profile-image" className="cursor-pointer">
                    <Avatar
                      className={`h-24 w-24 ${
                        isEditing ? "cursor-pointer" : ""
                      }`}
                    >
                      <AvatarImage src={profileImage || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl font-semibold">
                        {getUserInitials(
                          userProfile?.name || user?.email || "U"
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                        {uploadingImage ? (
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <Camera className="h-6 w-6 text-white" />
                        )}
                      </div>
                    )}
                  </label>

                  {/* Input de arquivo oculto */}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="profile-image"
                    disabled={!isEditing}
                  />
                </div>

                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        {...form.register("telefone")}
                        onChange={handlePhoneChange}
                        disabled={!isEditing}
                        className="mt-1"
                        placeholder="(11) 99999-9999"
                      />
                      {form.formState.errors.telefone && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.telefone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      O e-mail não pode ser alterado
                    </p>

                    <div className="mt-3 flex items-center">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 h-auto text-sm"
                        onClick={openChangePasswordModal}
                      >
                        Alterar senha
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Informações do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Informações do Sistema
              </CardTitle>
              <CardDescription>
                Dados relacionados à sua conta e permissões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Permissões
                      </Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(userRoles?.length ? userRoles : [userProfile?.role || "atendente"]).map((r: string) => (
                          <Badge key={r} className={getRoleColor(r)} variant="secondary">
                            {getRoleLabel(r)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Membro desde
                      </Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {userProfile?.created_at
                          ? new Date(userProfile.created_at).toLocaleDateString(
                              "pt-BR"
                            )
                          : "Não informado"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-gray-500" />
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Cartório
                      </Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {userProfile?.cartorio?.nome || (userProfile as any)?.cartorios?.nome || "Não atribuído"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 rounded-full bg-green-500"></div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">
                        Status da Conta
                      </Label>
                      <p className="text-sm text-gray-900 mt-1">
                        {userProfile?.ativo ? "Ativa" : "Inativa"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Popup de alteração de senha */}
        <Dialog
          open={changePasswordOpen}
          onOpenChange={(open) => {
            setChangePasswordOpen(open);
            if (!open) resetChangePasswordModal();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {changePasswordStage === "confirm"
                  ? "Confirmar senha atual"
                  : "Alterar senha"}
              </DialogTitle>
              <DialogDescription>
                {changePasswordStage === "confirm"
                  ? "Confirme sua senha atual para continuar."
                  : "Agora informe a nova senha e confirme."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {changePasswordStage === "confirm" ? (
                <>
                  <div>
                    <Label htmlFor="current-password">Senha atual</Label>
                    <div className="relative mt-1">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) =>
                          setCurrentPassword(e.target.value)
                        }
                        disabled={changePasswordBusy}
                        placeholder="Digite sua senha atual"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        aria-label={
                          showCurrentPassword
                            ? "Ocultar senha"
                            : "Mostrar senha"
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() =>
                          setShowCurrentPassword((v) => !v)
                        }
                        disabled={changePasswordBusy}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {changePasswordError && (
                    <p className="text-sm text-red-600">
                      {changePasswordError}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href="/esqueci-senha"
                      className="text-sm text-blue-600 hover:underline"
                      onClick={() => setChangePasswordOpen(false)}
                    >
                      Esqueci minha senha
                    </Link>

                    <Button
                      type="button"
                      onClick={handleVerifyCurrentPassword}
                      disabled={changePasswordBusy}
                    >
                      {changePasswordBusy ? "Confirmando..." : "Confirmar"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-password">Nova senha</Label>
                      <div className="relative mt-1">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          disabled={changePasswordBusy}
                          placeholder="Digite a nova senha"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          aria-label={
                            showNewPassword ? "Ocultar senha" : "Mostrar senha"
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowNewPassword((v) => !v)}
                          disabled={changePasswordBusy}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="confirm-new-password">
                        Confirmar nova senha
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="confirm-new-password"
                          type={showConfirmNewPassword ? "text" : "password"}
                          value={confirmNewPassword}
                          onChange={(e) =>
                            setConfirmNewPassword(e.target.value)
                          }
                          disabled={changePasswordBusy}
                          placeholder="Confirme a nova senha"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          aria-label={
                            showConfirmNewPassword
                              ? "Ocultar senha"
                              : "Mostrar senha"
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() =>
                            setShowConfirmNewPassword((v) => !v)
                          }
                          disabled={changePasswordBusy}
                        >
                          {showConfirmNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {changePasswordError && (
                    <p className="text-sm text-red-600">
                      {changePasswordError}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setChangePasswordStage("confirm");
                        setChangePasswordError(null);
                      }}
                      disabled={changePasswordBusy}
                    >
                      Voltar
                    </Button>

                    <Button
                      type="button"
                      onClick={handleUpdatePassword}
                      disabled={changePasswordBusy}
                    >
                      {changePasswordBusy ? "Salvando..." : "Salvar nova senha"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Crop de Imagem */}
        {selectedImageFile && (
          <ImageCrop
            isOpen={showCropModal}
            onClose={() => {
              setShowCropModal(false);
              setSelectedImageFile(null);
            }}
            onCropComplete={handleCropComplete}
            imageSrc={URL.createObjectURL(selectedImageFile)}
          />
        )}
      </MainLayout>
    </ProtectedRoute>
  );
};

export default PerfilPage;
