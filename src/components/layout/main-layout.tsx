"use client";

import React from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { PageTransition } from "@/components/ui/page-transition";

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  userType?: "admin" | "supervisor" | "atendente";
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle,
  userType = "supervisor",
}) => {
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
