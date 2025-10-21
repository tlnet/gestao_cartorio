"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { StatusBadgeConta } from "./status-badge-conta";
import { CategoriaBadge } from "./categoria-badge";
import { ContaForm } from "./conta-form";
import { DocumentosBadge } from "./documentos-badge";
import { ContaPagar } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCategoriasPersonalizadas } from "@/hooks/use-categorias-personalizadas";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle,
  Eye,
  Calendar,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface ContasTableProps {
  contas: ContaPagar[];
  loading?: boolean;
  onEdit: (id: string, data: Partial<ContaPagar>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onMarcarComoPaga: (id: string) => Promise<void>;
  cartorioId?: string;
  refreshTrigger?: number; // Para forçar refresh dos documentos
}

export function ContasTable({
  contas,
  loading,
  onEdit,
  onDelete,
  onMarcarComoPaga,
  cartorioId,
  refreshTrigger,
}: ContasTableProps) {
  const [editingConta, setEditingConta] = useState<ContaPagar | null>(null);
  const [deletingConta, setDeletingConta] = useState<string | null>(null);
  const [viewingConta, setViewingConta] = useState<ContaPagar | null>(null);

  // Hook para categorias personalizadas
  const { categorias: categoriasPersonalizadas, loading: categoriasLoading } =
    useCategoriasPersonalizadas(cartorioId);

  // Função para verificar se é um UUID (categoria personalizada)
  const isUUID = (str: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Função para mapear categoria (UUID ou string) para nome
  const getCategoriaNome = (categoriaId: string) => {
    // Se é uma categoria personalizada (UUID), buscar pelo ID
    if (categoriasPersonalizadas.length > 0 && isUUID(categoriaId)) {
      const categoriaPersonalizada = categoriasPersonalizadas.find(
        (cat) => cat.id === categoriaId
      );
      if (categoriaPersonalizada) {
        return categoriaPersonalizada.nome;
      }
      // Se é UUID mas não encontrou nas categorias ativas, é uma categoria removida
      return "Categoria Removida";
    }

    // Se não encontrou nas personalizadas, verificar se é uma categoria padrão
    const categoriasPadrao: Record<string, string> = {
      ALUGUEL: "Aluguel",
      ENERGIA: "Energia Elétrica",
      AGUA: "Água",
      INTERNET: "Internet",
      TELEFONE: "Telefone",
      MATERIAL_ESCRITORIO: "Material de Escritório",
      SALARIOS: "Salários",
      IMPOSTOS: "Impostos",
      SERVICOS_TERCEIROS: "Serviços de Terceiros",
      MANUTENCAO: "Manutenção",
      SOFTWARE: "Software",
      OUTROS: "Outros",
    };

    return categoriasPadrao[categoriaId] || categoriaId;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const getDiasAteVencimento = (dataVencimento: Date) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diff = Math.ceil(
      (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff;
  };

  const handleEdit = async (data: Partial<ContaPagar>) => {
    if (!editingConta) return;
    await onEdit(editingConta.id, data);
    setEditingConta(null);
  };

  const handleDelete = async () => {
    if (!deletingConta) return;
    await onDelete(deletingConta);
    setDeletingConta(null);
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (contas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <Calendar className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhuma conta encontrada</h3>
        <p className="text-sm text-muted-foreground">
          Adicione sua primeira conta para começar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((conta) => {
                const diasAteVencimento = getDiasAteVencimento(
                  conta.dataVencimento
                );
                const isVencendoSoon =
                  diasAteVencimento <= 7 &&
                  diasAteVencimento >= 0 &&
                  conta.status === "A_PAGAR";

                return (
                  <TableRow
                    key={conta.id}
                    className={conta.status === "PAGA" ? "bg-green-50/50" : ""}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div className="flex items-center gap-2">
                          {conta.descricao}
                          {conta.status === "PAGA" && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        {isVencendoSoon && (
                          <Badge
                            variant="outline"
                            className="mt-1 text-xs bg-orange-50 text-orange-700 border-orange-200"
                          >
                            Vence em {diasAteVencimento}{" "}
                            {diasAteVencimento === 1 ? "dia" : "dias"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CategoriaBadge
                        categoriaId={conta.categoria}
                        categoriasPersonalizadas={categoriasPersonalizadas}
                        loading={categoriasLoading}
                      />
                    </TableCell>
                    <TableCell>{conta.fornecedor || "-"}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(conta.valor)}
                    </TableCell>
                    <TableCell>{formatDate(conta.dataVencimento)}</TableCell>
                    <TableCell>
                      <StatusBadgeConta status={conta.status} />
                    </TableCell>
                    <TableCell>
                      <DocumentosBadge
                        contaId={conta.id}
                        refreshTrigger={refreshTrigger}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => setViewingConta(conta)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {conta.status !== "PAGA" && (
                            <DropdownMenuItem
                              onClick={() => onMarcarComoPaga(conta.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Marcar como Paga
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setEditingConta(conta)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeletingConta(conta.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={!!editingConta} onOpenChange={() => setEditingConta(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>
              Atualize as informações da conta a pagar.
            </DialogDescription>
          </DialogHeader>
          {editingConta && (
            <ContaForm
              conta={editingConta}
              onSubmit={handleEdit}
              onCancel={() => setEditingConta(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={!!viewingConta} onOpenChange={() => setViewingConta(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Conta</DialogTitle>
          </DialogHeader>
          {viewingConta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Descrição
                  </label>
                  <p className="text-sm mt-1">{viewingConta.descricao}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadgeConta status={viewingConta.status} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Categoria
                  </label>
                  <div className="text-sm mt-1">
                    <CategoriaBadge
                      categoriaId={viewingConta.categoria}
                      categoriasPersonalizadas={categoriasPersonalizadas}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Valor
                  </label>
                  <p className="text-sm mt-1 font-semibold">
                    {formatCurrency(viewingConta.valor)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Data de Vencimento
                  </label>
                  <p className="text-sm mt-1">
                    {formatDate(viewingConta.dataVencimento)}
                  </p>
                </div>
                {viewingConta.dataPagamento && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Data de Pagamento
                    </label>
                    <p className="text-sm mt-1">
                      {formatDate(viewingConta.dataPagamento)}
                    </p>
                  </div>
                )}
                {viewingConta.fornecedor && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Fornecedor
                    </label>
                    <p className="text-sm mt-1">{viewingConta.fornecedor}</p>
                  </div>
                )}
                {viewingConta.formaPagamento && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Forma de Pagamento
                    </label>
                    <p className="text-sm mt-1">
                      {viewingConta.formaPagamento}
                    </p>
                  </div>
                )}
              </div>
              {viewingConta.observacoes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Observações
                  </label>
                  <p className="text-sm mt-1">{viewingConta.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!deletingConta}
        onOpenChange={() => setDeletingConta(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conta será permanentemente
              excluída do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
