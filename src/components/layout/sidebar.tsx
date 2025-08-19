"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
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
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';

interface SidebarProps {
  userType?: 'admin' | 'supervisor' | 'atendente';
}

const Sidebar: React.FC<SidebarProps> = ({ userType = 'supervisor' }) => {
  const pathname = usePathname();
  const { user, signOut, loading } = useAuth();

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'supervisor', 'atendente']
    },
    {
      title: 'Protocolos',
      href: '/protocolos',
      icon: FileText,
      roles: ['admin', 'supervisor', 'atendente']
    },
    {
      title: 'Análise IA',
      href: '/ia',
      icon: Brain,
      roles: ['admin', 'supervisor', 'atendente']
    },
    {
      title: 'Relatórios',
      href: '/relatorios',
      icon: BarChart3,
      roles: ['admin', 'supervisor']
    },
    {
      title: 'Usuários',
      href: '/usuarios',
      icon: Users,
      roles: ['admin', 'supervisor']
    },
    {
      title: 'Cartórios',
      href: '/cartorios',
      icon: Building2,
      roles: ['admin']
    },
    {
      title: 'Configurações',
      href: '/configuracoes',
      icon: Settings,
      roles: ['admin', 'supervisor']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userType)
  );

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      case 'atendente': return 'Atendente';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'atendente': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSignOut = async () => {
    await signOut();
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
      <div className="p-4 space-y-3">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {getUserInitials(user.email || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            
            <div className="flex justify-center">
              <Badge className={getRoleColor(userType)} variant="secondary">
                {getRoleLabel(userType)}
              </Badge>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-3 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-3 h-4 w-4" />
              )}
              Sair
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <User className="h-4 w-4" />
              <span className="text-sm">Não autenticado</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;