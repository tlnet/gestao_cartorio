"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineTitle,
  TimelineIcon,
  TimelineDescription,
  TimelineContent,
} from '@/components/ui/timeline';
import {
  FileText,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Edit,
  Download,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProtocoloDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  protocolo: {
    id: string;
    demanda: string;
    protocolo: string;
    dataAbertura: string;
    servicos: string[];
    solicitante: string;
    cpfCnpj: string;
    telefone: string;
    apresentante?: string;
    email?: string;
    status: string;
    prazoExecucao: string;
    observacao?: string;
  };
}

const ProtocoloDetails: React.FC<ProtocoloDetailsProps> = ({
  isOpen,
  onClose,
  protocolo
}) => {
  // Dados mockados do histórico
  const historico = [
    {
      id: '1',
      dataHora: '2024-01-15T14:30:00',
      statusAnterior: '',
      novoStatus: 'Aguardando Análise',
      usuarioResponsavel: 'João Silva',
      observacao: 'Protocolo criado no sistema'
    },
    {
      id: '2',
      dataHora: '2024-01-15T16:45:00',
      statusAnterior: 'Aguardando Análise',
      novoStatus: 'Em Andamento',
      usuarioResponsavel: 'Maria Santos',
      observacao: 'Iniciada análise da documentação'
    },
    {
      id: '3',
      dataHora: '2024-01-16T09:15:00',
      statusAnterior: 'Em Andamento',
      novoStatus: 'Pendente',
      usuarioResponsavel: 'Maria Santos',
      observacao: 'Aguardando documentação complementar do cliente'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-green-100 text-green-800';
      case 'Em Andamento': return 'bg-blue-100 text-blue-800';
      case 'Aguardando Análise': return 'bg-yellow-100 text-yellow-800';
      case 'Pendente': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Concluído': return '✅';
      case 'Em Andamento': return '🔄';
      case 'Aguardando Análise': return '⏳';
      case 'Pendente': return '⚠️';
      default: return '📋';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Protocolo #{protocolo.protocolo}</span>
            <Badge className={getStatusColor(protocolo.status)}>
              {protocolo.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Detalhes completos do protocolo e histórico de alterações
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações Principais */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informações do Protocolo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Demanda</label>
                  <p className="text-sm">{protocolo.demanda}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Serviços</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {protocolo.servicos.map((servico, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {servico}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data Abertura</label>
                    <p className="text-sm flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(protocolo.dataAbertura), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Prazo Execução</label>
                    <p className="text-sm flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(protocolo.prazoExecucao), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {protocolo.observacao && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Observações</label>
                    <p className="text-sm bg-gray-50 p-2 rounded">{protocolo.observacao}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Solicitante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-sm">{protocolo.solicitante}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">CPF/CNPJ</label>
                  <p className="text-sm">{protocolo.cpfCnpj}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Telefone</label>
                  <p className="text-sm flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {protocolo.telefone}
                  </p>
                </div>

                {protocolo.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">E-mail</label>
                    <p className="text-sm flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {protocolo.email}
                    </p>
                  </div>
                )}

                {protocolo.apresentante && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Apresentante</label>
                    <p className="text-sm">{protocolo.apresentante}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Histórico */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Histórico de Alterações
                </CardTitle>
                <CardDescription>
                  Linha do tempo com todas as mudanças de status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historico.map((item, index) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                          {getStatusIcon(item.novoStatus)}
                        </div>
                        {index < historico.length - 1 && (
                          <div className="w-px h-12 bg-gray-200 mt-2" />
                        )}
                      </div>
                      
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">
                            {item.statusAnterior ? 
                              `${item.statusAnterior} → ${item.novoStatus}` : 
                              item.novoStatus
                            }
                          </h4>
                          <span className="text-xs text-gray-500">
                            {format(new Date(item.dataHora), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 mt-1">
                          Por: {item.usuarioResponsavel}
                        </p>
                        
                        {item.observacao && (
                          <p className="text-xs text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                            {item.observacao}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-between pt-6 border-t">
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Enviar WhatsApp
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProtocoloDetails;