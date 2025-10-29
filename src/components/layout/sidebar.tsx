"use client";

import React from "react";
import Link from "next/link";
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
import { supabase } from "@/lib/supabase";
import { UserSkeleton } from "@/components/ui/user-skeleton";
import { useEffect, useState } from "react";

interface SidebarProps {
  userType?: "admin" | "supervisor" | "atendente";
}

const Sidebar: React.FC<SidebarProps> = ({ userType = "supervisor" }) => {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Buscar dados do usuário
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          setIsLoadingProfile(true);
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error) {
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

    fetchUserProfile();
  }, [user]);

  const menuItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "supervisor", "atendente"],
    },
    {
      title: "Protocolos",
      href: "/protocolos",
      icon: FileText,
      roles: ["admin", "supervisor", "atendente"],
    },
    {
      title: "Contas a Pagar",
      href: "/contas",
      icon: Receipt,
      roles: ["admin", "supervisor"],
    },
    {
      title: "Notificações",
      href: "/notificacoes",
      icon: Bell,
      roles: ["admin", "supervisor", "atendente"],
    },
    {
      title: "CNIB",
      href: "/cnib",
      icon: FileSearch,
      roles: ["admin", "supervisor", "atendente"],
    },
    {
      title: "Análise IA",
      href: "/ia",
      icon: Brain,
      roles: ["admin", "supervisor", "atendente"],
    },
    {
      title: "Relatórios",
      href: "/relatorios",
      icon: BarChart3,
      roles: ["admin", "supervisor"],
    },
    {
      title: "Usuários",
      href: "/usuarios",
      icon: Users,
      roles: ["admin", "supervisor"],
    },
    {
      title: "Cartórios",
      href: "/cartorios",
      icon: Building2,
      roles: ["admin"],
    },
    {
      title: "Configurações",
      href: "/configuracoes",
      icon: Settings,
      roles: ["admin", "supervisor"],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userType)
  );

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
      case "supervisor":
        return "Supervisor";
      case "atendente":
        return "Atendente";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "supervisor":
        return "bg-blue-100 text-blue-800";
      case "atendente":
        return "bg-green-100 text-green-800";
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
        <div className="flex items-center space-x-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">IA Cartórios</h1>
            <p className="text-sm text-gray-500">Gestão Inteligente</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          );
        })}
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

            <div className="flex justify-center">
              <Badge
                className={getRoleColor(userProfile?.role || userType)}
                variant="secondary"
              >
                {getRoleLabel(userProfile?.role || userType)}
              </Badge>
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
