"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useContasPagar } from "@/hooks/use-contas-pagar";
import { useAuth } from "@/contexts/auth-context";
import { ContaForm } from "@/components/contas/conta-form";
import { ContasTable } from "@/components/contas/contas-table";
import { ResumoFinanceiroCard } from "@/components/contas/resumo-financeiro";
import { FiltrosContasComponent } from "@/components/contas/filtros-contas";
import { ContasAlertas } from "@/components/contas/contas-alertas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { ContaPagar, FiltrosContas } from "@/types";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ContasPage() {
  const { user } = useAuth();
  const [cartorioId, setCartorioId] = useState<string | undefined>();
  const [dialogNovaContaOpen, setDialogNovaContaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("todas");
  const [filtrosAtuais, setFiltrosAtuais] = useState<FiltrosContas>({});

  const {
    contas,
    resumo,
    loading,
    error,
    fetchContas,
    criarConta,
    atualizarConta,
    marcarComoPaga,
    deletarConta,
    buscarContasAVencer,
    buscarContasVencidas,
  } = useContasPagar(cartorioId);

  // Buscar cartório do usuário
  useEffect(() => {
    const fetchUserCartorio = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("cartorio_id")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setCartorioId(data?.cartorio_id);
      } catch (error) {
        console.error("Erro ao buscar cartório do usuário:", error);
      }
    };

    fetchUserCartorio();
  }, [user]);

  const handleNovaContaSubmit = async (data: Partial<ContaPagar>) => {
    try {
      await criarConta(data as any);
      setDialogNovaContaOpen(false);
    } catch (error) {
      console.error("Erro ao criar conta:", error);
      // Mostrar erro mais detalhado
      if (error instanceof Error) {
        console.error("Detalhes do erro na criação:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      } else {
        console.error("Erro não é uma instância de Error:", error);
      }
    }
  };

  const handleFiltrosChange = (filtros: FiltrosContas) => {
    setFiltrosAtuais(filtros);
    fetchContas(filtros);
  };

  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);

    let filtros: FiltrosContas = {};

    switch (tab) {
      case "a_pagar":
        filtros = { status: ["A_PAGAR"] };
        break;
      case "vencidas":
        filtros = { status: ["VENCIDA"] };
        break;
      case "pagas":
        filtros = { status: ["PAGA"] };
        break;
      case "todas":
      default:
        filtros = {};
        break;
    }

    setFiltrosAtuais(filtros);
    await fetchContas(filtros);
  };

  const exportarParaCSV = () => {
    try {
      const headers = [
        "Descrição",
        "Categoria",
        "Fornecedor",
        "Valor",
        "Data Vencimento",
        "Data Pagamento",
        "Status",
        "Forma Pagamento",
        "Observações",
      ];

      const rows = contas.map((conta) => [
        conta.descricao,
        conta.categoria,
        conta.fornecedor || "",
        conta.valor.toString().replace(".", ","),
        new Date(conta.dataVencimento).toLocaleDateString("pt-BR"),
        conta.dataPagamento
          ? new Date(conta.dataPagamento).toLocaleDateString("pt-BR")
          : "",
        conta.status,
        conta.formaPagamento || "",
        conta.observacoes || "",
      ]);

      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.join(";")),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `contas_pagar_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  // Filtrar contas pela aba ativa
  const contasFiltradas = contas.filter((conta) => {
    switch (activeTab) {
      case "a_pagar":
        return conta.status === "A_PAGAR";
      case "vencidas":
        return conta.status === "VENCIDA";
      case "pagas":
        return conta.status === "PAGA";
      default:
        return true;
    }
  });

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Contas a Pagar</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os pagamentos e contas do seu cartório
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportarParaCSV}
              disabled={loading || contas.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => setDialogNovaContaOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>

        {/* Alerta de Erro */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Alertas de Contas */}
        <ContasAlertas cartorioId={cartorioId} />

        {/* Resumo Financeiro */}
        <ResumoFinanceiroCard resumo={resumo} loading={loading} />

        {/* Conteúdo Principal */}
        <Card>
          <CardHeader>
            <CardTitle>Contas</CardTitle>
            <CardDescription>
              Visualize e gerencie todas as suas contas a pagar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                <TabsTrigger value="todas">Todas ({contas.length})</TabsTrigger>
                <TabsTrigger value="a_pagar">
                  A Pagar ({contas.filter((c) => c.status === "A_PAGAR").length}
                  )
                </TabsTrigger>
                <TabsTrigger value="vencidas">
                  Vencidas (
                  {contas.filter((c) => c.status === "VENCIDA").length})
                </TabsTrigger>
                <TabsTrigger value="pagas">
                  Pagas ({contas.filter((c) => c.status === "PAGA").length})
                </TabsTrigger>
              </TabsList>

              {/* Filtros */}
              <FiltrosContasComponent
                onFiltrosChange={handleFiltrosChange}
                loading={loading}
                cartorioId={cartorioId}
              />

              {/* Tabela de Contas */}
              <TabsContent value={activeTab} className="space-y-4">
                <ContasTable
                  contas={contasFiltradas}
                  loading={loading}
                  onEdit={atualizarConta}
                  onDelete={deletarConta}
                  onMarcarComoPaga={marcarComoPaga}
                  cartorioId={cartorioId}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialog Nova Conta */}
        <Dialog
          open={dialogNovaContaOpen}
          onOpenChange={setDialogNovaContaOpen}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Conta a Pagar</DialogTitle>
              <DialogDescription>
                Adicione uma nova conta ou pagamento para gerenciar.
              </DialogDescription>
            </DialogHeader>
            <ContaForm
              onSubmit={handleNovaContaSubmit}
              onCancel={() => setDialogNovaContaOpen(false)}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// Importar o supabase
import { supabase } from "@/lib/supabase";
