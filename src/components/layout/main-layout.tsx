"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./sidebar";
import Header from "./header";
import { PageTransition } from "@/components/ui/page-transition";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/contexts/auth-context";

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  userType?: "admin" | "atendente" | "financeiro";
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle,
  userType = "atendente",
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { canAccess, userRoles } = usePermissions();

  // Redirecionar se o usuário acessar uma rota sem permissão (só após o perfil ter carregado)
  useEffect(() => {
    if (authLoading) return;
    if (!userRoles?.length) return;
    if (canAccess(pathname)) return;
    if (userRoles.includes("financeiro") && !userRoles.includes("admin")) {
      router.replace("/contas");
    } else {
      router.replace("/acesso-negado");
    }
  }, [pathname, canAccess, userRoles, router, authLoading]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0">
        <Sidebar userType={userType} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />

        <main className="flex-1 overflow-y-auto p-6">
          <PageTransition delay={100}>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
