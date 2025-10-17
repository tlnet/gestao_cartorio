"use client";

import React, { useState, useEffect } from "react";
import MainLayout from "@/components/layout/main-layout";
import { useContasPagar } from "@/hooks/use-contas-pagar";
import { useAuth } from "@/contexts/auth-context";
import { LoadingAnimation } from "@/components/ui/loading-spinner";
import { StaggeredCards, FadeInUp } from "@/components/ui/page-transition";
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
import {
  Plus,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ContaPagar, FiltrosContas } from "@/types";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ContasPage() {
  const { user } = useAuth();
  const [cartorioId, setCartorioId] = useState<string | undefined>();
  const [dialogNovaContaOpen, setDialogNovaContaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("todas");
  const [filtrosAtuais, setFiltrosAtuais] = useState<FiltrosContas>({});
  const [filtrosPagas, setFiltrosPagas] = useState<FiltrosContas>({});
  const [showPagas, setShowPagas] = useState(false);
  const [documentosPendentes, setDocumentosPendentes] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    adicionarDocumentoConta,
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

  // Função wrapper para atualizar conta e refresh dos documentos
  const handleAtualizarConta = async (
    id: string,
    data: Partial<ContaPagar>
  ) => {
    try {
      await atualizarConta(id, data);
      // Atualizar refreshTrigger para forçar atualização dos DocumentosBadge
      setRefreshTrigger((prev) => prev + 1);
      console.log("🔍 DEBUG: refreshTrigger atualizado após edição de conta");
    } catch (error) {
      console.error("Erro ao atualizar conta:", error);
      throw error;
    }
  };

  const handleNovaContaSubmit = async (data: Partial<ContaPagar>) => {
    try {
      console.log("🔍 DEBUG: handleNovaContaSubmit iniciado com:", {
        data,
        documentosPendentesCount: documentosPendentes.length,
        documentosPendentes: documentosPendentes,
      });

      const contaCriada = await criarConta(data as any);

      // Se há documentos pendentes e a conta foi criada, salvar os documentos
      if (contaCriada && documentosPendentes.length > 0) {
        console.log(
          "🔍 DEBUG: Salvando documentos pendentes para nova conta:",
          {
            contaId: contaCriada.id,
            documentosCount: documentosPendentes.length,
          }
        );

        try {
          for (const documento of documentosPendentes) {
            await adicionarDocumentoConta(contaCriada.id, {
              nomeArquivo: documento.nome,
              urlArquivo: documento.url,
              tipoArquivo: documento.tipo,
              tamanhoArquivo: documento.tamanho,
            });
          }

          console.log(
            `✅ ${documentosPendentes.length} documento(s) salvo(s) para nova conta`
          );
          setDocumentosPendentes([]); // Limpar documentos pendentes
        } catch (docError) {
          console.error(
            "❌ Erro ao salvar documentos da nova conta:",
            docError
          );
        }
      }

      setDialogNovaContaOpen(false);

      // Se a conta foi criada com sucesso, recarregar a lista de contas
      if (contaCriada) {
        await fetchContas(filtrosAtuais);
      }
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

  const handleDocumentosChange = (documentos: any[]) => {
    console.log("🔍 DEBUG: handleDocumentosChange chamada com:", {
      documentosCount: documentos.length,
      documentos: documentos,
    });
    setDocumentosPendentes(documentos);
  };

  const handleFiltrosChange = (filtros: FiltrosContas) => {
    setFiltrosAtuais(filtros);
    fetchContas(filtros);
  };

  const handleFiltrosPagasChange = (filtros: FiltrosContas) => {
    setFiltrosPagas(filtros);
    // Não precisa chamar fetchContas aqui pois as contas pagas são filtradas localmente
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

  // Separar contas em pagas e em aberto
  const contasPagasBrutas = contas.filter((conta) => conta.status === "PAGA");
  const contasEmAberto = contas.filter((conta) => conta.status !== "PAGA");

  // Aplicar filtros às contas pagas
  const contasPagas = contasPagasBrutas.filter((conta) => {
    // Aplicar filtros de categoria
    if (filtrosPagas.categoria && filtrosPagas.categoria.length > 0) {
      if (!filtrosPagas.categoria.includes(conta.categoria)) {
        return false;
      }
    }

    // Aplicar filtros de fornecedor
    if (filtrosPagas.fornecedor && filtrosPagas.fornecedor.trim() !== "") {
      if (
        !conta.fornecedor
          ?.toLowerCase()
          .includes(filtrosPagas.fornecedor.toLowerCase())
      ) {
        return false;
      }
    }

    // Aplicar filtros de valor
    if (filtrosPagas.valorMin !== undefined) {
      if (conta.valor < filtrosPagas.valorMin) {
        return false;
      }
    }

    if (filtrosPagas.valorMax !== undefined) {
      if (conta.valor > filtrosPagas.valorMax) {
        return false;
      }
    }

    // Aplicar filtros de data
    if (filtrosPagas.dataInicio) {
      if (new Date(conta.dataVencimento) < new Date(filtrosPagas.dataInicio)) {
        return false;
      }
    }

    if (filtrosPagas.dataFim) {
      if (new Date(conta.dataVencimento) > new Date(filtrosPagas.dataFim)) {
        return false;
      }
    }

    return true;
  });

  // Filtrar contas pela aba ativa (apenas para contas em aberto)
  const contasFiltradas = contasEmAberto.filter((conta) => {
    switch (activeTab) {
      case "a_pagar":
        return conta.status === "A_PAGAR";
      case "vencidas":
        return conta.status === "VENCIDA";
      case "todas":
      default:
        return true;
    }
  });

  if (!user) {
    return (
      <MainLayout
        title="Contas a Pagar"
        subtitle="Gestão financeira do cartório"
      >
        <div className="flex items-center justify-center h-full">
          <LoadingAnimation size="lg" variant="pulse" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Contas a Pagar" subtitle="Gestão financeira do cartório">
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

        {/* Conteúdo Principal - Contas em Aberto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Contas em Aberto ({contasEmAberto.length})
            </CardTitle>
            <CardDescription>
              Contas que ainda precisam ser pagas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tabs para Contas em Aberto */}
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                <TabsTrigger value="todas">
                  Todas ({contasEmAberto.length})
                </TabsTrigger>
                <TabsTrigger value="a_pagar">
                  A Pagar (
                  {contasEmAberto.filter((c) => c.status === "A_PAGAR").length})
                </TabsTrigger>
                <TabsTrigger value="vencidas">
                  Vencidas (
                  {contasEmAberto.filter((c) => c.status === "VENCIDA").length})
                </TabsTrigger>
              </TabsList>

              {/* Filtros */}
              <FiltrosContasComponent
                onFiltrosChange={handleFiltrosChange}
                loading={loading}
                cartorioId={cartorioId}
              />

              {/* Tabela de Contas em Aberto */}
              <TabsContent value={activeTab} className="space-y-4">
                <ContasTable
                  contas={contasFiltradas}
                  loading={loading}
                  onEdit={handleAtualizarConta}
                  onDelete={deletarConta}
                  onMarcarComoPaga={marcarComoPaga}
                  cartorioId={cartorioId}
                  refreshTrigger={refreshTrigger}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Seção de Contas Pagas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle>Contas Pagas ({contasPagas.length})</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPagas(!showPagas)}
                className="flex items-center gap-2"
              >
                {showPagas ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Mostrar
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Contas que foram pagas e finalizadas
            </CardDescription>
          </CardHeader>
          {showPagas && (
            <CardContent>
              {/* Filtros para Contas Pagas */}
              <div className="mb-4">
                <FiltrosContasComponent
                  onFiltrosChange={handleFiltrosPagasChange}
                  loading={loading}
                  cartorioId={cartorioId}
                  showStatusFilter={false}
                />
              </div>

              {contasPagas.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {contasPagasBrutas.length === 0
                      ? "Nenhuma conta paga"
                      : "Nenhuma conta paga encontrada com os filtros aplicados"}
                  </h3>
                  <p className="text-gray-500">
                    {contasPagasBrutas.length === 0
                      ? "As contas pagas aparecerão aqui quando forem marcadas como pagas."
                      : "Tente ajustar os filtros para ver mais resultados."}
                  </p>
                </div>
              ) : (
                <ContasTable
                  contas={contasPagas}
                  loading={loading}
                  onEdit={handleAtualizarConta}
                  onDelete={deletarConta}
                  onMarcarComoPaga={marcarComoPaga}
                  cartorioId={cartorioId}
                  refreshTrigger={refreshTrigger}
                />
              )}
            </CardContent>
          )}
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
              onDocumentosChange={handleDocumentosChange}
            />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// Importar o supabase
import { supabase } from "@/lib/supabase";
