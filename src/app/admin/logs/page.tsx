"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import MainLayout from "@/components/layout/main-layout";
import { RequirePermission } from "@/components/auth/require-permission";
import { useCartorios, useUsuarios } from "@/hooks/use-supabase";
import {
  FILTROS_LOGS_PADRAO,
  useSystemLogs,
  type FiltrosLogs,
} from "@/hooks/use-system-logs";
import {
  LOG_CATEGORIA_LABEL,
  type LogCategoria,
  type LogSistema,
} from "@/lib/system-log";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  RefreshCw,
  ScrollText,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS: (LogCategoria | "todas")[] = [
  "todas",
  "autenticacao",
  "protocolo",
  "usuario",
  "cartorio",
  "configuracao",
  "conta",
  "sistema",
];

const CORES_CATEGORIA: Record<string, string> = {
  autenticacao: "bg-indigo-100 text-indigo-800 border-indigo-200",
  protocolo: "bg-blue-100 text-blue-800 border-blue-200",
  usuario: "bg-purple-100 text-purple-800 border-purple-200",
  cartorio: "bg-amber-100 text-amber-800 border-amber-200",
  configuracao: "bg-teal-100 text-teal-800 border-teal-200",
  conta: "bg-emerald-100 text-emerald-800 border-emerald-200",
  sistema: "bg-slate-100 text-slate-700 border-slate-200",
};

const formatarDataHora = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export default function LogsSistemaPage() {
  const [filtros, setFiltros] = useState<FiltrosLogs>(FILTROS_LOGS_PADRAO);
  const [buscaInput, setBuscaInput] = useState("");
  const [logSelecionado, setLogSelecionado] = useState<LogSistema | null>(null);
  const [exportando, setExportando] = useState(false);

  const { logs, total, loading, error, migracaoPendente, refetch } =
    useSystemLogs(filtros);
  const { cartorios } = useCartorios();
  const { usuarios } = useUsuarios();

  const cartorioNomePorId = useMemo(() => {
    const mapa = new Map<string, string>();
    (cartorios || []).forEach((c: any) => mapa.set(c.id, c.nome));
    return mapa;
  }, [cartorios]);

  const totalPaginas = Math.max(1, Math.ceil(total / filtros.porPagina));

  // Alterar um filtro sempre volta para a primeira página — senão o usuário
  // cai numa página que não existe mais no resultado filtrado.
  const atualizarFiltro = <K extends keyof FiltrosLogs>(
    campo: K,
    valor: FiltrosLogs[K]
  ) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor, pagina: 1 }));
  };

  const limparFiltros = () => {
    setBuscaInput("");
    setFiltros(FILTROS_LOGS_PADRAO);
  };

  const aplicarBusca = (e: React.FormEvent) => {
    e.preventDefault();
    atualizarFiltro("busca", buscaInput);
  };

  const filtrosAtivos =
    filtros.categoria !== "todas" ||
    filtros.usuarioId !== "todos" ||
    filtros.cartorioId !== "todos" ||
    !!filtros.dataInicio ||
    !!filtros.dataFim ||
    !!filtros.busca;

  const nomeCartorio = (log: LogSistema) =>
    log.cartorio_nome ||
    (log.cartorio_id ? cartorioNomePorId.get(log.cartorio_id) : null) ||
    "—";

  /** Exporta o resultado do filtro atual (não só a página exibida). */
  const exportarCsv = async () => {
    try {
      setExportando(true);
      const linhas: string[][] = [
        [
          "Data/Hora",
          "Usuário",
          "E-mail",
          "Perfil",
          "Cartório",
          "Categoria",
          "Ação",
          "Descrição",
          "Entidade",
          "ID da entidade",
          "Rota",
          "IP",
        ],
      ];

      const escapar = (valor: unknown) =>
        `"${String(valor ?? "").replace(/"/g, '""')}"`;

      logs.forEach((log) => {
        linhas.push([
          formatarDataHora(log.created_at),
          log.usuario_nome || "",
          log.usuario_email || "",
          log.usuario_perfil || "",
          nomeCartorio(log),
          LOG_CATEGORIA_LABEL[log.categoria as LogCategoria] || log.categoria,
          log.acao,
          log.descricao,
          log.entidade || "",
          log.entidade_id || "",
          log.rota || "",
          log.ip || "",
        ]);
      });

      const csv = linhas.map((l) => l.map(escapar).join(";")).join("\n");
      const blob = new Blob([`﻿${csv}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `logs-sistema-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${logs.length} registro(s) exportado(s)`);
    } catch (err) {
      toast.error("Erro ao exportar os logs");
    } finally {
      setExportando(false);
    }
  };

  return (
    <RequirePermission requiredRole="admin_geral">
      <MainLayout
        title="Logs do Sistema"
        subtitle="Trilha de auditoria das movimentações dos usuários"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Administração Geral
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportarCsv}
                disabled={exportando || logs.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar página (CSV)
              </Button>
            </div>
          </div>

          {migracaoPendente && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
                <div className="text-sm text-yellow-900">
                  <p className="font-medium">Migração pendente</p>
                  <p>
                    Execute{" "}
                    <code className="rounded bg-yellow-100 px-1">
                      src/lib/add-logs-sistema.sql
                    </code>{" "}
                    no SQL Editor do Supabase para criar a tabela de logs.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={aplicarBusca} className="flex gap-2">
                <Input
                  placeholder="Buscar por descrição, usuário, e-mail, ação ou ID…"
                  value={buscaInput}
                  onChange={(e) => setBuscaInput(e.target.value)}
                />
                <Button type="submit" variant="secondary">
                  Buscar
                </Button>
              </form>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Categoria
                  </Label>
                  <Select
                    value={filtros.categoria}
                    onValueChange={(v) => atualizarFiltro("categoria", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c === "todas"
                            ? "Todas as categorias"
                            : LOG_CATEGORIA_LABEL[c as LogCategoria]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Usuário
                  </Label>
                  <Select
                    value={filtros.usuarioId}
                    onValueChange={(v) => atualizarFiltro("usuarioId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os usuários</SelectItem>
                      {(usuarios || []).map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Cartório
                  </Label>
                  <Select
                    value={filtros.cartorioId}
                    onValueChange={(v) => atualizarFiltro("cartorioId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os cartórios</SelectItem>
                      {(cartorios || []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground" htmlFor="dataInicio">
                    De
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => atualizarFiltro("dataInicio", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground" htmlFor="dataFim">
                    Até
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => atualizarFiltro("dataFim", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {loading
                    ? "Carregando registros…"
                    : `${total.toLocaleString("pt-BR")} registro(s) encontrado(s)`}
                </p>
                {filtrosAtivos && (
                  <Button variant="ghost" size="sm" onClick={limparFiltros}>
                    <X className="mr-2 h-4 w-4" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="h-4 w-4" />
                Movimentações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error && !migracaoPendente && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Cartório</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-10 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <ScrollText className="h-8 w-8 text-gray-400" />
                            <p>Nenhum registro encontrado</p>
                            <p className="text-sm">
                              {filtrosAtivos
                                ? "Ajuste os filtros para ampliar a busca."
                                : "As movimentações aparecem aqui conforme os usuários utilizam o sistema."}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatarDataHora(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {log.usuario_nome || "—"}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                {log.usuario_email || "sem sessão"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {nomeCartorio(log)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                CORES_CATEGORIA[log.categoria] ||
                                CORES_CATEGORIA.sistema
                              }
                            >
                              {LOG_CATEGORIA_LABEL[
                                log.categoria as LogCategoria
                              ] || log.categoria}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                              {log.acao}
                            </code>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <span className="line-clamp-2 text-sm">
                              {log.descricao}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLogSelecionado(log)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Por página
                  </Label>
                  <Select
                    value={String(filtros.porPagina)}
                    onValueChange={(v) =>
                      atualizarFiltro("porPagina", Number(v))
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[25, 50, 100, 200].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Página {filtros.pagina} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filtros.pagina <= 1 || loading}
                    onClick={() =>
                      setFiltros((prev) => ({
                        ...prev,
                        pagina: Math.max(1, prev.pagina - 1),
                      }))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filtros.pagina >= totalPaginas || loading}
                    onClick={() =>
                      setFiltros((prev) => ({
                        ...prev,
                        pagina: Math.min(totalPaginas, prev.pagina + 1),
                      }))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detalhes do log */}
        <Dialog
          open={!!logSelecionado}
          onOpenChange={(open) => !open && setLogSelecionado(null)}
        >
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do registro</DialogTitle>
              <DialogDescription>
                {logSelecionado && formatarDataHora(logSelecionado.created_at)}
              </DialogDescription>
            </DialogHeader>

            {logSelecionado && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Usuário</p>
                    <p className="font-medium">
                      {logSelecionado.usuario_nome || "—"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {logSelecionado.usuario_email || "sem sessão"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Perfil</p>
                    <p className="font-medium">
                      {logSelecionado.usuario_perfil || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cartório</p>
                    <p className="font-medium">{nomeCartorio(logSelecionado)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Categoria</p>
                    <p className="font-medium">
                      {LOG_CATEGORIA_LABEL[
                        logSelecionado.categoria as LogCategoria
                      ] || logSelecionado.categoria}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ação</p>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                      {logSelecionado.acao}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rota</p>
                    <p className="font-medium">{logSelecionado.rota || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entidade</p>
                    <p className="font-medium">
                      {logSelecionado.entidade || "—"}
                      {logSelecionado.entidade_id
                        ? ` · ${logSelecionado.entidade_id}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">IP</p>
                    <p className="font-medium">{logSelecionado.ip || "—"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="rounded bg-gray-50 p-2">
                    {logSelecionado.descricao}
                  </p>
                </div>

                {logSelecionado.metadata && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Dados adicionais
                    </p>
                    <pre className="max-h-64 overflow-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
                      {JSON.stringify(logSelecionado.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {logSelecionado.user_agent && (
                  <div>
                    <p className="text-xs text-muted-foreground">Navegador</p>
                    <p className="break-all text-xs text-gray-600">
                      {logSelecionado.user_agent}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </RequirePermission>
  );
}
