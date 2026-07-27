"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, ChevronDown, Check } from "lucide-react";
import ResponsavelAvatar, {
  getResponsavelNome,
  type ResponsavelUsuario,
} from "./responsavel-avatar";

// Valor especial para filtrar protocolos que não possuem responsável definido
export const SEM_RESPONSAVEL = "__sem_responsavel__";

interface ResponsavelFilterProps {
  usuarios: ResponsavelUsuario[];
  /** Ids selecionados. Lista vazia significa "todos os responsáveis". */
  value: string[];
  onChange: (value: string[]) => void;
  usuarioAtualId?: string;
  loading?: boolean;
}

const ResponsavelFilter: React.FC<ResponsavelFilterProps> = ({
  usuarios,
  value,
  onChange,
  usuarioAtualId,
  loading = false,
}) => {
  const selecionados = React.useMemo(() => new Set(value), [value]);
  const todosSelecionado = value.length === 0;

  // Usuário logado sempre no topo da lista
  const usuariosOrdenados = React.useMemo(() => {
    const ordenados = [...usuarios].sort((a, b) =>
      getResponsavelNome(a).localeCompare(getResponsavelNome(b), "pt-BR")
    );
    const atual = ordenados.filter((u) => u.id === usuarioAtualId);
    const demais = ordenados.filter((u) => u.id !== usuarioAtualId);
    return [...atual, ...demais];
  }, [usuarios, usuarioAtualId]);

  const toggle = (id: string) => {
    const next = new Set(selecionados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const label = React.useMemo(() => {
    if (todosSelecionado) return "Todos os responsáveis";
    if (value.length === 1) {
      const [unico] = value;
      if (unico === SEM_RESPONSAVEL) return "Sem responsável";
      if (unico === usuarioAtualId) return "Meus protocolos";
      const usuario = usuarios.find((u) => u.id === unico);
      return usuario ? getResponsavelNome(usuario) : "1 responsável";
    }
    return `${value.length} responsáveis`;
  }, [todosSelecionado, value, usuarioAtualId, usuarios]);

  const usuarioSelecionadoUnico =
    value.length === 1 && value[0] !== SEM_RESPONSAVEL
      ? usuarios.find((u) => u.id === value[0])
      : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between sm:w-56"
          disabled={loading}
        >
          <span className="flex min-w-0 items-center gap-2">
            {usuarioSelecionadoUnico ? (
              <ResponsavelAvatar
                usuario={usuarioSelecionadoUnico}
                className="h-5 w-5"
                fallbackClassName="text-[10px]"
              />
            ) : (
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">
              {loading ? "Carregando..." : label}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Filtrar por responsável</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onChange([]);
          }}
          className="gap-2"
        >
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">Todos os responsáveis</span>
          {todosSelecionado && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        {usuarioAtualId && (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onChange([usuarioAtualId]);
            }}
            className="gap-2"
          >
            <Check className="h-4 w-4 opacity-0" />
            <span className="flex-1">Apenas meus protocolos</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <div className="max-h-64 overflow-y-auto">
          {usuariosOrdenados.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          )}
          {usuariosOrdenados.map((usuario) => (
            <DropdownMenuCheckboxItem
              key={usuario.id}
              checked={selecionados.has(usuario.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => toggle(usuario.id)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <ResponsavelAvatar
                  usuario={usuario}
                  className="h-6 w-6"
                  fallbackClassName="text-[10px]"
                />
                <span className="truncate">{getResponsavelNome(usuario)}</span>
                {usuario.id === usuarioAtualId && (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    você
                  </Badge>
                )}
              </div>
            </DropdownMenuCheckboxItem>
          ))}

          <DropdownMenuCheckboxItem
            checked={selecionados.has(SEM_RESPONSAVEL)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => toggle(SEM_RESPONSAVEL)}
          >
            <span className="text-muted-foreground">Sem responsável</span>
          </DropdownMenuCheckboxItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ResponsavelFilter;
