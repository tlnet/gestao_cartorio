"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2 } from "lucide-react";
import {
  ContaPagar,
  CATEGORIA_LABELS,
  CategoriaConta,
  StatusConta,
  STATUS_CONTA_LABELS,
} from "@/types";
import { useContasPagar } from "@/hooks/use-contas-pagar";
import { useCategoriasPersonalizadas } from "@/hooks/use-categorias-personalizadas";
import { useAuth } from "@/contexts/auth-context";
import { useState as useStateAuth, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DocumentUpload, DocumentoAnexo } from "./document-upload";

const contaFormSchema = z.object({
  descricao: z.string().min(3, "Descrição deve ter no mínimo 3 caracteres"),
  valor: z.string().min(1, "Valor é obrigatório"),
  categoria: z.string().min(1, "Categoria é obrigatória"),
  fornecedor: z.string().optional(),
  dataVencimento: z.date({
    required_error: "Data de vencimento é obrigatória",
  }),
  dataPagamento: z.date().optional().nullable(),
  status: z.string().min(1, "Status é obrigatório"),
  observacoes: z.string().optional(),
  formaPagamento: z.string().optional(),
});

type ContaFormValues = z.infer<typeof contaFormSchema>;

interface ContaFormProps {
  conta?: ContaPagar;
  onSubmit: (data: Partial<ContaPagar>) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  onDocumentosChange?: (documentos: DocumentoAnexo[]) => void;
}

// Função para formatar valor como moeda
const formatCurrency = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  const amount = parseFloat(numbers) / 100;
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Função para converter data do banco (string) para Date local (sem timezone)
const parseLocalDate = (dateString: string | Date): Date => {
  if (dateString instanceof Date) {
    return dateString;
  }
  // Parse da data no formato YYYY-MM-DD como data local
  const [year, month, day] = dateString.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Função para converter Date para string no formato do banco (YYYY-MM-DD)
const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function ContaForm({
  conta,
  onSubmit,
  onCancel,
  loading,
  onDocumentosChange,
}: ContaFormProps) {
  const { user } = useAuth();
  const [cartorioId, setCartorioId] = useStateAuth<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [valorDisplay, setValorDisplay] = useState("");
  const [documentos, setDocumentos] = useState<DocumentoAnexo[]>([]);
  const [documentosExistentes, setDocumentosExistentes] = useState<
    DocumentoAnexo[]
  >([]);
  const [documentosMarcadosParaRemocao, setDocumentosMarcadosParaRemocao] =
    useState<string[]>([]);

  // Hook para funções de documentos
  const {
    adicionarDocumentoConta,
    buscarDocumentosConta,
    removerDocumentoConta,
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
  }, [user?.id]);

  // Buscar categorias personalizadas diretamente
  const { categorias: categoriasPersonalizadas, loading: categoriasLoading } =
    useCategoriasPersonalizadas(cartorioId);

  // Combinar categorias padrão com personalizadas
  const categoriasDisponiveis =
    categoriasPersonalizadas.length > 0
      ? categoriasPersonalizadas.map((cat) => ({
          id: cat.id,
          nome: cat.nome,
          cor: cat.cor,
        }))
      : [
          { id: "ALUGUEL", nome: "Aluguel", cor: "#EF4444" },
          { id: "ENERGIA", nome: "Energia Elétrica", cor: "#F59E0B" },
          { id: "AGUA", nome: "Água", cor: "#06B6D4" },
          { id: "INTERNET", nome: "Internet", cor: "#8B5CF6" },
          { id: "SALARIOS", nome: "Salários", cor: "#10B981" },
          { id: "IMPOSTOS", nome: "Impostos", cor: "#DC2626" },
          { id: "OUTROS", nome: "Outros", cor: "#6B7280" },
        ];

  const form = useForm<ContaFormValues>({
    resolver: zodResolver(contaFormSchema),
    defaultValues: {
      descricao: "",
      valor: "",
      categoria: "",
      fornecedor: "",
      dataVencimento: new Date(),
      dataPagamento: null,
      status: "A_PAGAR",
      observacoes: "",
      formaPagamento: "",
    },
  });

  useEffect(() => {
    if (conta) {
      console.log("Carregando conta para edição:", {
        id: conta.id,
        descricao: conta.descricao,
        categoria: conta.categoria,
        formaPagamento: conta.formaPagamento,
        status: conta.status,
      });

      // Converter datas do banco para Date local
      const dataVenc =
        conta.dataVencimento instanceof Date
          ? conta.dataVencimento
          : parseLocalDate(conta.dataVencimento as string);

      const dataPag = conta.dataPagamento
        ? conta.dataPagamento instanceof Date
          ? conta.dataPagamento
          : parseLocalDate(conta.dataPagamento as string)
        : null;

      // Formatar valor para display
      const valorFormatado = conta.valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      setValorDisplay(valorFormatado);

      // Resetar form com todos os valores
      const formData = {
        descricao: conta.descricao,
        valor: conta.valor.toString(),
        categoria: conta.categoria,
        fornecedor: conta.fornecedor || "",
        dataVencimento: dataVenc,
        dataPagamento: dataPag,
        status: conta.status,
        observacoes: conta.observacoes || "",
        formaPagamento: conta.formaPagamento || "",
      };

      console.log("Dados que serão carregados no form:", formData);

      form.reset(formData);

      // Carregar documentos existentes da conta
      const carregarDocumentos = async () => {
        try {
          const docsExistentes = await buscarDocumentosConta(conta.id);
          const documentosFormatados: DocumentoAnexo[] = docsExistentes.map(
            (doc) => ({
              id: doc.id,
              nome: doc.nomeArquivo,
              url: doc.urlArquivo,
              tipo: doc.tipoArquivo,
              tamanho: doc.tamanhoArquivo,
              dataUpload: doc.dataUpload,
            })
          );

          setDocumentos(documentosFormatados);
          setDocumentosExistentes(documentosFormatados);
          console.log(
            `${documentosFormatados.length} documento(s) carregado(s) da conta`
          );
        } catch (error) {
          console.error("Erro ao carregar documentos da conta:", error);
        }
      };

      carregarDocumentos();
    } else {
      // Limpar form para nova conta
      setValorDisplay("");
      setDocumentos([]);
      setDocumentosExistentes([]);
      setDocumentosMarcadosParaRemocao([]);
      form.reset({
        descricao: "",
        valor: "",
        categoria: "",
        fornecedor: "",
        dataVencimento: new Date(),
        dataPagamento: null,
        status: "A_PAGAR",
        observacoes: "",
        formaPagamento: "",
      });
    }
  }, [conta, buscarDocumentosConta]);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCurrency(value);
    setValorDisplay(formatted);
    // Guardar o valor numérico no form
    const numericValue = formatted.replace(/\./g, "").replace(",", ".");
    form.setValue("valor", numericValue);
  };

  // Função wrapper para controlar mudanças de documentos
  const handleDocumentosChange = (novosDocumentos: DocumentoAnexo[]) => {
    console.log("🔍 DEBUG: handleDocumentosChange chamada com:", {
      documentosCount: novosDocumentos.length,
      documentos: novosDocumentos,
    });

    try {
      setDocumentos(novosDocumentos);
      console.log("✅ DEBUG: Documentos atualizados no ContaForm");
    } catch (error) {
      console.error("❌ DEBUG: Erro ao atualizar documentos:", error);
    }
  };

  // Log quando o componente é montado/desmontado
  useEffect(() => {
    console.log("🔍 DEBUG: ContaForm montado");

    return () => {
      console.log("🔍 DEBUG: ContaForm desmontado");
    };
  }, []);

  // Função para executar remoção em lote de documentos
  const executeRemocaoEmLote = async () => {
    if (documentosMarcadosParaRemocao.length === 0) return;

    console.log("🔍 DEBUG: Executando remoção em lote de documentos:", {
      documentosParaRemover: documentosMarcadosParaRemocao.length,
      contaId: conta?.id,
    });

    try {
      // Remover do banco
      for (const documentoId of documentosMarcadosParaRemocao) {
        await removerDocumentoConta(documentoId);
      }

      // Remover do storage
      for (const documento of documentosExistentes.filter((doc) =>
        documentosMarcadosParaRemocao.includes(doc.id)
      )) {
        const url = new URL(documento.url);
        const pathParts = url.pathname.split("/");
        const filePath = pathParts.slice(-3).join("/");

        await supabase.storage.from("documentos").remove([filePath]);
      }

      console.log("✅ DEBUG: Remoção em lote concluída");
      setDocumentosMarcadosParaRemocao([]);
    } catch (error) {
      console.error("❌ Erro na remoção em lote:", error);
      throw error;
    }
  };

  const handleSubmit = async (values: ContaFormValues) => {
    try {
      setIsSubmitting(true);

      const contaData: Partial<ContaPagar> = {
        descricao: values.descricao,
        valor: parseFloat(values.valor),
        categoria: values.categoria as CategoriaConta,
        fornecedor: values.fornecedor,
        dataVencimento: values.dataVencimento,
        dataPagamento: values.dataPagamento || undefined,
        status: values.status || "A_PAGAR",
        observacoes: values.observacoes,
        formaPagamento: values.formaPagamento,
      };

      // Executar remoção em lote de documentos antes de salvar
      if (documentosMarcadosParaRemocao.length > 0) {
        console.log("🔍 DEBUG: Executando remoção em lote antes de salvar");
        await executeRemocaoEmLote();
      }

      // Salvar a conta primeiro
      await onSubmit(contaData);

      // Para contas existentes, salvar apenas os documentos novos
      if (conta?.id && documentos.length > 0) {
        // Identificar documentos novos (que não estavam na lista original)
        const documentosNovos = documentos.filter(
          (doc) =>
            !documentosExistentes.some((existente) => existente.id === doc.id)
        );

        if (documentosNovos.length > 0) {
          console.log(
            "🔍 DEBUG: Salvando apenas documentos novos para conta existente:",
            {
              contaId: conta.id,
              documentosNovosCount: documentosNovos.length,
              totalDocumentos: documentos.length,
              documentosExistentesCount: documentosExistentes.length,
            }
          );

          try {
            // Salvar apenas os documentos novos no banco (sem notificações individuais)
            for (const documento of documentosNovos) {
              console.log("🔍 DEBUG: Salvando documento novo:", {
                contaId: conta.id,
                nome: documento.nome,
                url: documento.url,
                tipo: documento.tipo,
                tamanho: documento.tamanho,
              });

              const resultado = await adicionarDocumentoConta(
                conta.id,
                {
                  nomeArquivo: documento.nome,
                  urlArquivo: documento.url,
                  tipoArquivo: documento.tipo,
                  tamanhoArquivo: documento.tamanho,
                },
                true
              ); // Modo silencioso para evitar notificações duplicadas

              console.log("🔍 DEBUG: Resultado do salvamento:", resultado);
            }

            console.log(
              `✅ ${documentosNovos.length} documento(s) novo(s) salvo(s) no banco de dados`
            );
          } catch (docError) {
            console.error(
              "❌ Erro ao salvar documentos novos no banco:",
              docError
            );
            console.error("❌ Detalhes do erro:", {
              message:
                docError instanceof Error
                  ? docError.message
                  : "Erro desconhecido",
              stack: docError instanceof Error ? docError.stack : undefined,
            });
          }
        } else {
          console.log("🔍 DEBUG: Nenhum documento novo para salvar");
        }
      } else if (documentos.length > 0 && !conta) {
        console.log(
          "🔍 DEBUG: Documentos serão salvos após a criação da conta",
          { documentosCount: documentos.length, documentos: documentos }
        );
        // Para novas contas, passar os documentos para o componente pai
        onDocumentosChange?.(documentos);
        console.log("🔍 DEBUG: Documentos passados para o componente pai");
      }

      if (!conta) {
        form.reset();
        setValorDisplay("");
        setDocumentos([]); // Limpar documentos após criar nova conta
        setDocumentosMarcadosParaRemocao([]); // Limpar documentos marcados para remoção
      } else {
        // Para contas existentes, limpar documentos marcados para remoção
        setDocumentosMarcadosParaRemocao([]);
      }
    } catch (error) {
      console.error("Erro ao salvar conta:", error);
      // Mostrar erro mais detalhado
      if (error instanceof Error) {
        console.error("Detalhes do erro:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      } else {
        console.error("Erro não é uma instância de Error:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Descrição */}
          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Descrição *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Aluguel Janeiro/2025"
                    {...field}
                    disabled={isSubmitting || loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Valor com Formatação Monetária */}
          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$) *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="text"
                      placeholder="0,00"
                      value={valorDisplay}
                      onChange={handleValorChange}
                      disabled={isSubmitting || loading}
                      className="pl-12"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categoria */}
          <FormField
            control={form.control}
            name="categoria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  defaultValue={field.value || ""}
                  disabled={isSubmitting || loading}
                  key={`categoria-${conta?.id || "new"}-${field.value}`}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria">
                        {field.value
                          ? categoriasDisponiveis.find(
                              (cat) => cat.id === field.value
                            )?.nome || field.value
                          : "Selecione a categoria"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoriasDisponiveis.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: categoria.cor }}
                          />
                          <span>{categoria.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fornecedor */}
          <FormField
            control={form.control}
            name="fornecedor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fornecedor</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Imobiliária XYZ"
                    {...field}
                    disabled={isSubmitting || loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data de Vencimento */}
          <FormField
            control={form.control}
            name="dataVencimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Vencimento *</FormLabel>
                <FormControl>
                  <DatePicker
                    selected={field.value}
                    onChange={field.onChange}
                    disabled={isSubmitting || loading}
                    placeholderText="Selecione a data"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status (apenas ao editar) */}
          {conta && (
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    defaultValue={field.value || ""}
                    disabled={isSubmitting || loading}
                    key={`status-${conta?.id}-${field.value}`}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status">
                          {field.value
                            ? STATUS_CONTA_LABELS[
                                field.value as keyof typeof STATUS_CONTA_LABELS
                              ]
                            : "Selecione o status"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A_PAGAR">A Pagar</SelectItem>
                      <SelectItem value="PAGA">Paga</SelectItem>
                      <SelectItem value="VENCIDA">Vencida</SelectItem>
                      <SelectItem value="AGENDADA">Agendada</SelectItem>
                      <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Data de Pagamento (apenas ao editar) */}
          {conta && (
            <FormField
              control={form.control}
              name="dataPagamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Pagamento</FormLabel>
                  <FormControl>
                    <DatePicker
                      selected={field.value || null}
                      onChange={field.onChange}
                      disabled={isSubmitting || loading}
                      placeholderText="Selecione a data"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Forma de Pagamento */}
          <FormField
            control={form.control}
            name="formaPagamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Forma de Pagamento</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                  defaultValue={field.value || ""}
                  disabled={isSubmitting || loading}
                  key={`forma-${conta?.id || "new"}-${field.value}`}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione">
                        {field.value || "Selecione"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="TED">TED</SelectItem>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="CARTAO">Cartão</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Observações */}
          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Observações adicionais..."
                    className="resize-none"
                    {...field}
                    disabled={isSubmitting || loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Upload de Documentos */}
          <div className="md:col-span-2">
            <FormLabel>Documentos Anexados</FormLabel>
            <div className="mt-2">
              <DocumentUpload
                contaId={conta?.id}
                documentos={documentos}
                onDocumentsChange={handleDocumentosChange}
                onRemoveDocument={conta?.id ? removerDocumentoConta : undefined}
                onDocumentosMarcadosChange={setDocumentosMarcadosParaRemocao}
                disabled={isSubmitting || loading}
                maxFiles={5}
              />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting || loading}
            >
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting || loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : conta ? (
              "Atualizar Conta"
            ) : (
              "Criar Conta"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
