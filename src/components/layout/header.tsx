"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  Search,
  User,
  LogOut,
  Settings as SettingsIcon,
  Edit,
  Save,
  X,
  Camera,
  Upload,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import NotificationBell from "@/components/notifications/notification-bell";
import { UserSkeleton } from "@/components/ui/user-skeleton";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

interface Notification {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  protocoloId?: string;
}

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const router = useRouter();
  const { user, signOut, userProfile: contextUserProfile, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Usar userProfile do contexto se disponível, senão buscar
  useEffect(() => {
    if (contextUserProfile) {
      setUserProfile(contextUserProfile);
      setIsLoadingProfile(false);
      return;
    }

    // Se não tem no contexto, buscar
    const fetchUserProfile = async () => {
      if (user) {
        try {
          setIsLoadingProfile(true);
          // Selecionar apenas campos que existem, com fallback para campos opcionais
          const { data, error } = await supabase
            .from("users")
            .select(
              "id, name, email, telefone, role, cartorio_id, ativo, created_at, updated_at, avatar_url"
            )
            .eq("id", user.id)
            .single();

          if (error) {
            // Se erro for de coluna não existir, tentar novamente sem campos opcionais
            if (error.code === "42703") {
              const { data: fallbackData, error: fallbackError } =
                await supabase
                  .from("users")
                  .select("id, name, email, telefone, role, cartorio_id, ativo, avatar_url")
                  .eq("id", user.id)
                  .single();

              if (fallbackError) {
                console.error("Erro ao buscar perfil:", fallbackError);
                return;
              }

              setUserProfile(fallbackData);
              return;
            }

            console.error("Erro ao buscar perfil:", error);
            return;
          }

          setUserProfile(data);
        } catch (error) {
          console.error("Erro ao buscar perfil:", error);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setIsLoadingProfile(false);
      }
    };

    if (!authLoading) {
      fetchUserProfile();
    }
  }, [user, contextUserProfile, authLoading]);

  // Estado das notificações
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "warning",
      title: "Protocolo vence hoje",
      message: "Protocolo #12345 vence hoje - Solicitante: Maria Silva",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
      read: false,
      actionUrl: "/protocolos",
      protocoloId: "12345",
    },
    {
      id: "2",
      type: "info",
      title: "Protocolos aguardando análise",
      message: "5 protocolos aguardando análise há mais de 2 horas",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 horas atrás
      read: false,
      actionUrl: "/protocolos",
    },
    {
      id: "3",
      type: "success",
      title: "Relatório IA processado",
      message: "Análise de malote concluída com sucesso",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 horas atrás
      read: true,
      actionUrl: "/ia",
    },
    {
      id: "4",
      type: "error",
      title: "Erro no processamento",
      message: "Falha ao processar documento #98765",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 horas atrás
      read: false,
      actionUrl: "/ia",
    },
  ]);

  const getUserInitials = (fullName: string) => {
    const names = fullName.trim().split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  const handleProfileClick = () => {
    router.push("/perfil");
  };

  const handleSettingsClick = () => {
    router.push("/configuracoes");
  };

  // Função de busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(
        `/protocolos?search=${encodeURIComponent(searchTerm.trim())}`
      );
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchIconClick = () => {
    if (searchTerm.trim()) {
      router.push(
        `/protocolos?search=${encodeURIComponent(searchTerm.trim())}`
      );
    }
  };

  // Funções de notificação
  const getUnreadCount = () => notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("Todas as notificações marcadas como lidas!");
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notificação removida!");
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <X className="h-4 w-4 text-red-600" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "info":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "warning":
        return "border-l-yellow-500 bg-yellow-50";
      case "error":
        return "border-l-red-500 bg-red-50";
      case "success":
        return "border-l-green-500 bg-green-50";
      case "info":
        return "border-l-blue-500 bg-blue-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Agora mesmo";
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days} dias atrás`;
    return timestamp.toLocaleDateString("pt-BR");
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 cursor-pointer hover:text-gray-600 transition-colors"
                onClick={handleSearchIconClick}
              />
              <Input
                placeholder="Buscar protocolos"
                className="pl-10 w-64"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </form>

            {/* Notifications */}
            <NotificationBell />

            {/* User Menu */}
            {isLoadingProfile ? (
              <UserSkeleton variant="header" size="md" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 px-3"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                        {getUserInitials(
                          userProfile?.name || user?.email || "U"
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium">
                        {userProfile?.name || user?.email || "Usuário"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.email || "email@exemplo.com"}
                      </p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">
                        {userProfile?.name || user?.email || "Usuário"}
                      </p>
                      <p className="text-xs text-gray-500 font-normal">
                        {user?.email || "email@exemplo.com"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <User className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
