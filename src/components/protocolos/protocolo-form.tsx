"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const protocoloSchema = z.object({
  demanda: z.string().min(1, 'Demanda é obrigatória'),
  protocolo: z.string().min(1, 'Número do protocolo é obrigatório'),
  solicitante: z.string().min(1, 'Nome do solicitante é obrigatório'),
  cpfCnpj: z.string().min(1, 'CPF/CNPJ é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  servicos: z.array(z.string()).min(1, 'Pelo menos um serviço deve ser selecionado'),
  status: z.string().min(1, 'Status é obrigatório'),
  apresentante: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  observacao: z.string().optional(),
  prazoExecucao: z.date().optional(),
});

type ProtocoloFormData = z.infer<typeof protocoloSchema>;

interface ProtocoloFormProps {
  onSubmit: (data: ProtocoloFormData) => void;
  onCancel: () => void;
  initialData?: Partial<ProtocoloFormData>;
  isEditing?: boolean;
}

const ProtocoloForm: React.FC<ProtocoloFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false
}) => {
  const [servicosSelecionados, setServicosSelecionados] = React.useState<string[]>(
    initialData?.servicos || []
  );

  // Dados mockados - em produção viriam de APIs
  const statusOptions = [
    'Aguardando Análise',
    'Em Andamento',
    'Pendente',
    'Concluído',
    'Cancelado'
  ];

  const servicosDisponiveis = [
    'Certidão de Nascimento',
    'Certidão de Casamento',
    'Certidão de Óbito',
    'Escritura de Compra e Venda',
    'Procuração',
    'Reconhecimento de Firma',
    'Autenticação de Documentos',
    'Registro de Imóveis',
    'Testamento',
    'Inventário'
  ];

  const form = useForm<ProtocoloFormData>({
    resolver: zodResolver(protocoloSchema),
    defaultValues: {
      demanda: initialData?.demanda || '',
      protocolo: initialData?.protocolo || '',
      solicitante: initialData?.solicitante || '',
      cpfCnpj: initialData?.cpfCnpj || '',
      telefone: initialData?.telefone || '',
      servicos: initialData?.servicos || [],
      status: initialData?.status || 'Aguardando Análise',
      apresentante: initialData?.apresentante || '',
      email: initialData?.email || '',
      observacao: initialData?.observacao || '',
      prazoExecucao: initialData?.prazoExecucao,
    },
  });

  const adicionarServico = (servico: string) => {
    if (!servicosSelecionados.includes(servico)) {
      const novosServicos = [...servicosSelecionados, servico];
      setServicosSelecionados(novosServicos);
      form.setValue('servicos', novosServicos);
    }
  };

  const removerServico = (servico: string) => {
    const novosServicos = servicosSelecionados.filter(s => s !== servico);
    setServicosSelecionados(novosServicos);
    form.setValue('servicos', novosServicos);
  };

  const handleSubmit = (data: ProtocoloFormData) => {
    onSubmit({
      ...data,
      servicos: servicosSelecionados
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campos Obrigatórios */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informações Básicas</h3>
            
            <FormField
              control={form.control}
              name="demanda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Demanda *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Certidão de Nascimento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="protocolo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Protocolo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: CERT-2024-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prazoExecucao"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prazo de Execução</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Dados do Solicitante */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dados do Solicitante</h3>
            
            <FormField
              control={form.control}
              name="solicitante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo do solicitante" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpfCnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ *</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone *</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apresentante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apresentante</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do apresentante (se diferente do solicitante)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Serviços */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Serviços Solicitados *</h3>
          
          <div className="space-y-3">
            <Select onValueChange={adicionarServico}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um serviço para adicionar" />
              </SelectTrigger>
              <SelectContent>
                {servicosDisponiveis
                  .filter(servico => !servicosSelecionados.includes(servico))
                  .map((servico) => (
                    <SelectItem key={servico} value={servico}>
                      {servico}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {servicosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {servicosSelecionados.map((servico) => (
                  <Badge key={servico} variant="secondary" className="flex items-center gap-1">
                    {servico}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removerServico(servico)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {form.formState.errors.servicos && (
            <p className="text-sm text-red-500">{form.formState.errors.servicos.message}</p>
          )}
        </div>

        {/* Observações */}
        <FormField
          control={form.control}
          name="observacao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações adicionais sobre o protocolo..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {isEditing ? 'Atualizar Protocolo' : 'Cadastrar Protocolo'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProtocoloForm;