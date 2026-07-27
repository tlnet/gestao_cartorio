"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface ResponsavelUsuario {
  id: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export function getResponsavelNome(usuario?: ResponsavelUsuario | null) {
  if (!usuario) return "";
  return usuario.name?.trim() || usuario.email?.trim() || usuario.id;
}

export function getResponsavelIniciais(usuario?: ResponsavelUsuario | null) {
  const nome = getResponsavelNome(usuario);
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) {
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }
  return nome.slice(0, 2).toUpperCase() || "?";
}

interface ResponsavelAvatarProps {
  usuario?: ResponsavelUsuario | null;
  className?: string;
  fallbackClassName?: string;
}

const ResponsavelAvatar: React.FC<ResponsavelAvatarProps> = ({
  usuario,
  className,
  fallbackClassName,
}) => (
  <Avatar className={cn("h-8 w-8", className)}>
    <AvatarImage
      src={usuario?.avatar_url || undefined}
      alt={getResponsavelNome(usuario)}
    />
    <AvatarFallback
      className={cn("bg-blue-100 text-xs text-blue-700", fallbackClassName)}
    >
      {getResponsavelIniciais(usuario)}
    </AvatarFallback>
  </Avatar>
);

export default ResponsavelAvatar;
