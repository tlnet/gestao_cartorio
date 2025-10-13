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
}: ContaFormProps) {
  const { user } = useAuth();
  const [cartorioId, setCartorioId] = useStateAuth<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [valorDisplay, setValorDisplay] = useState("");

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
          : parseLocalDate(conta.dataVencimento.toString());

      const dataPag = conta.dataPagamento
        ? conta.dataPagamento instanceof Date
          ? conta.dataPagamento
          : parseLocalDate(conta.dataPagamento.toString())
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
    } else {
      // Limpar form para nova conta
      setValorDisplay("");
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
  }, [conta]);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCurrency(value);
    setValorDisplay(formatted);
    // Guardar o valor numérico no form
    const numericValue = formatted.replace(/\./g, "").replace(",", ".");
    form.setValue("valor", numericValue);
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

      await onSubmit(contaData);

      if (!conta) {
        form.reset();
        setValorDisplay("");
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
