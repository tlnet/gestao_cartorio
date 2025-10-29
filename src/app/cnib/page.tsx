"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import MainLayout from "@/components/layout/main-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { LoadingAnimation } from "@/components/ui/loading-spinner";
import { FadeInUp } from "@/components/ui/page-transition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Search, FileText } from "lucide-react";
import { formatCPFCNPJ, isValidCPF, isValidCNPJ } from "@/lib/formatters";
import { toast } from "sonner";

const cnibConsultaSchema = z.object({
  cpfCnpj: z
    .string()
    .min(1, "CPF/CNPJ é obrigatório")
    .refine((value) => {
      const numbers = value.replace(/\D/g, "");
      if (numbers.length === 11) {
        return isValidCPF(value);
      } else if (numbers.length === 14) {
        return isValidCNPJ(value);
      }
      return false;
    }, "CPF/CNPJ inválido"),
});

type CNIBConsultaFormData = z.infer<typeof cnibConsultaSchema>;

const CNIBPage = () => {
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultedDocument, setConsultedDocument] = useState<string | null>(
    null
  );

  const form = useForm<CNIBConsultaFormData>({
    resolver: zodResolver(cnibConsultaSchema),
    defaultValues: {
      cpfCnpj: "",
    },
  });

  const cpfCnpjValue = form.watch("cpfCnpj");

  // Aplicar máscara automaticamente
  const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatCPFCNPJ(value);
    form.setValue("cpfCnpj", formatted, { shouldValidate: false });
  };

  // Validar se documento é válido
  const isDocumentValid = () => {
    if (!cpfCnpjValue) return false;
    const numbers = cpfCnpjValue.replace(/\D/g, "");
    if (numbers.length === 11) {
      return isValidCPF(cpfCnpjValue);
    } else if (numbers.length === 14) {
      return isValidCNPJ(cpfCnpjValue);
    }
    return false;
  };

  const onSubmit = async (data: CNIBConsultaFormData) => {
    // Validação adicional antes de enviar
    const numbers = data.cpfCnpj.replace(/\D/g, "");
    if (numbers.length !== 11 && numbers.length !== 14) {
      toast.error("CPF/CNPJ inválido", {
        description: "Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido",
      });
      return;
    }

    if (numbers.length === 11 && !isValidCPF(data.cpfCnpj)) {
      toast.error("CPF inválido", {
        description: "O CPF informado não é válido",
      });
      return;
    }

    if (numbers.length === 14 && !isValidCNPJ(data.cpfCnpj)) {
      toast.error("CNPJ inválido", {
        description: "O CNPJ informado não é válido",
      });
      return;
    }

    setIsConsulting(true);
    setConsultedDocument(data.cpfCnpj);

    // Simular delay de consulta (será substituído por chamada real à API)
    setTimeout(() => {
      setIsConsulting(false);
      toast.success("Consulta realizada com sucesso", {
        description: "Resultados carregados (simulação)",
      });
    }, 2000);
  };

  const handleNovaConsulta = () => {
    form.reset();
    setConsultedDocument(null);
  };

  return (
    <ProtectedRoute>
      <MainLayout
        title="Consulta CNIB"
        subtitle="Verificação de indisponibilidade de bens"
      >
        <div className="space-y-6">
          <FadeInUp delay={100}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600" />
                  Consulta CNIB
                </CardTitle>
                <CardDescription>
                  Consulte a indisponibilidade de bens através do sistema CNIB
                  inserindo CPF ou CNPJ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF/CNPJ</FormLabel>
                          <FormControl>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input
                                {...field}
                                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                onChange={handleCpfCnpjChange}
                                className="flex-1"
                                disabled={isConsulting}
                              />
                              <Button
                                type="submit"
                                disabled={!isDocumentValid() || isConsulting}
                                className="min-w-full sm:min-w-[120px]"
                              >
                                {isConsulting ? (
                                  <>
                                    <LoadingAnimation
                                      size="sm"
                                      variant="dots"
                                      className="mr-2"
                                    />
                                    Consultando...
                                  </>
                                ) : (
                                  <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Consultar
                                  </>
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                          {cpfCnpjValue && !isDocumentValid() && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Digite um CPF (11 dígitos) ou CNPJ (14 dígitos)
                              válido
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>
          </FadeInUp>

          {consultedDocument && (
            <FadeInUp delay={200}>
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      Resultado da Consulta
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNovaConsulta}
                      className="w-full sm:w-auto"
                    >
                      Nova Consulta
                    </Button>
                  </div>
                  <CardDescription className="mt-2">
                    Documento consultado: {consultedDocument}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isConsulting ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <LoadingAnimation size="lg" variant="wave" />
                      <p className="mt-4 text-muted-foreground">
                        Consultando CNIB...
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        Área de resultados será exibida aqui após a integração
                        com a API do CNIB
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Estrutura preparada para receber dados de
                        indisponibilidade de bens
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </FadeInUp>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
};

export default CNIBPage;
