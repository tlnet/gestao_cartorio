"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Brain,
  BarChart3,
  Settings,
  Users,
  Building2,
  LogOut,
  User,
  Bell,
  Receipt,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/lib/supabase";
import { UserSkeleton } from "@/components/ui/user-skeleton";
import { useEffect, useState } from "react";
import { useCartorioValidation } from "@/hooks/use-cartorio-validation";

interface SidebarProps {
  userType?: "admin" | "atendente" | "financeiro";
}

const Sidebar: React.FC<SidebarProps> = () => {
  const pathname = usePathname();
  const { user, loading: authLoading, signOut, userProfile: contextUserProfile, userType: contextUserType, userRoles: contextUserRoles } = useAuth();
  const { canAccess } = usePermissions();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const { isValid: isCartorioValid } = useCartorioValidation();

  const permissionsReady = !authLoading && (contextUserRoles?.length > 0 || contextUserType != null);
  const userType = contextUserType || "atendente";

  // Usar perfil do contexto ou buscar se necessário
  useEffect(() => {
    if (contextUserProfile) {
      setUserProfile(contextUserProfile);
      setIsLoadingProfile(false);
    } else if (user) {
      const fetchUserProfile = async () => {
        try {
          setIsLoadingProfile(true);
          // Selecionar apenas campos que existem, com fallback para campos opcionais
          const { data, error } = await supabase
            .from("users")
            .select(
              "id, name, email, telefone, role, cartorio_id, ativo, created_at, updated_at"
            )
            .eq("id", user.id)
            .single();

          if (error) {
            // Se erro for de coluna não existir, tentar novamente sem campos opcionais
            if (error.code === "42703") {
              const { data: fallbackData, error: fallbackError } =
                await supabase
                  .from("users")
                  .select("id, name, email, telefone, role, cartorio_id, ativo")
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
      };

      fetchUserProfile();
    } else {
      setIsLoadingProfile(false);
    }
  }, [user, contextUserProfile]);

  const menuItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Protocolos",
      href: "/protocolos",
      icon: FileText,
    },
    {
      title: "Contas a Pagar",
      href: "/contas",
      icon: Receipt,
    },
    {
      title: "Notificações",
      href: "/notificacoes",
      icon: Bell,
    },
    {
      title: "CNIB",
      href: "/cnib",
      icon: FileSearch,
    },
    {
      title: "Análise IA",
      href: "/ia",
      icon: Brain,
    },
    {
      title: "Relatórios",
      href: "/relatorios",
      icon: BarChart3,
    },
    {
      title: "Usuários",
      href: "/usuarios",
      icon: Users,
    },
    {
      title: "Configurações",
      href: "/configuracoes",
      icon: Settings,
    },
  ];

  const filteredMenuItems = permissionsReady
    ? menuItems.filter((item) => canAccess(item.href))
    : [];

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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center justify-start">
          <Image
            src="/logo_iacartorios.png"
            alt="IA Cartórios"
            width={260}
            height={72}
            priority
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      <Separator />

      {/* Navigation - só exibe itens quando permissões estiverem carregadas */}
      <nav className="flex-1 p-4 space-y-2">
        {!permissionsReady ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-full rounded-md bg-gray-100 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))
        ) : (
          filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const showWarning = item.href === "/configuracoes" && !isCartorioValid;

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start relative",
                    isActive && "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.title}
                  {showWarning && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  )}
                </Button>
              </Link>
            );
          })
        )}
      </nav>

      <Separator />

      {/* User Info & Logout */}
      {isLoadingProfile ? (
        <UserSkeleton variant="sidebar" size="lg" showRole={true} />
      ) : (
        <div className="p-4 space-y-3">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {getUserInitials(userProfile?.name || user?.email || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.name || user?.email || "Usuário"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || "email@exemplo.com"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5">
              {(contextUserRoles?.length ? contextUserRoles : [userType]).map((role) => (
                <Badge
                  key={role}
                  className={getRoleColor(role)}
                  variant="secondary"
                >
                  {getRoleLabel(role)}
                </Badge>
              ))}
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
