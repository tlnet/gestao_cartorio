"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Webhook, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Download,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface WebhookSimulatorProps {
  onProcessComplete: (result: any) => void;
}

const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({ onProcessComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('https://webhook.n8n.io/cartorio-ia');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisType, setAnalysisType] = useState('');

  const simulateWebhookCall = async (type: string, file: File) => {
    setIsProcessing(true);
    
    // Simular chamada para N8N
    try {
      toast.loading('Enviando documento para análise...', { id: 'webhook-call' });
      
      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simular resposta do webhook
      const mockResponse = {
        id: Date.now().toString(),
        tipo: type,
        nomeArquivo: file.name,
        status: 'concluido',
        processadoEm: new Date().toISOString(),
        relatorioPDF: `https://storage.example.com/relatorios/${Date.now()}.pdf`,
        relatorioDoc: `https://storage.example.com/relatorios/${Date.now()}.doc`,
        relatorioDocx: `https://storage.example.com/relatorios/${Date.now()}.docx`,
        resumo: generateMockSummary(type),
        usuario: 'Sistema IA'
      };

      toast.success('Análise concluída com sucesso!', { id: 'webhook-call' });
      onProcessComplete(mockResponse);
      
    } catch (error) {
      toast.error('Erro ao processar documento', { id: 'webhook-call' });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMockSummary = (type: string) => {
    switch (type) {
      case 'resumo_matricula':
        return {
          proprietario: 'João Silva Santos',
          imovel: 'Apartamento 101, Edifício Residencial',
          area: '85,50 m²',
          registro: '12.345',
          situacao: 'Regular',
          observacoes: 'Imóvel livre de ônus e gravames'
        };
      case 'analise_malote':
        return {
          totalDocumentos: 15,
          documentosValidos: 13,
          documentosComProblemas: 2,
          tiposEncontrados: ['Certidões', 'Procurações', 'Contratos'],
          problemas: ['Assinatura ilegível em 1 documento', 'Data vencida em 1 documento']
        };
      case 'minuta_documento':
        return {
          tipoDocumento: 'Procuração',
          outorgante: 'Maria Santos',
          outorgado: 'Carlos Silva',
          poderes: 'Amplos poderes para representação',
          observacoes: 'Documento gerado conforme modelo padrão'
        };
      default:
        return {};
    }
  };

  const testWebhookConnection = async () => {
    toast.loading('Testando conexão...', { id: 'test-webhook' });
    
    // Simular teste de conexão
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const isSuccess = Math.random() > 0.3; // 70% de chance de sucesso
    
    if (isSuccess) {
      toast.success('Conexão estabelecida com sucesso!', { id: 'test-webhook' });
    } else {
      toast.error('Falha na conexão. Verifique a URL do webhook.', { id: 'test-webhook' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Integração N8N - Simulador
        </CardTitle>
        <CardDescription>
          Simula o envio de documentos para processamento via webhook N8N
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="webhook-url">URL do Webhook N8N</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://webhook.n8n.io/seu-webhook"
            />
            <Button variant="outline" onClick={testWebhookConnection}>
              Testar
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="analysis-type">Tipo de Análise</Label>
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de análise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resumo_matricula">Resumo de Matrícula</SelectItem>
              <SelectItem value="analise_malote">Análise de Malote</SelectItem>
              <SelectItem value="minuta_documento">Minuta de Documento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="file-upload">Arquivo para Análise</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".pdf,.doc,.docx,.zip"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
        </div>

        <Button 
          className="w-full" 
          onClick={() => {
            if (selectedFile && analysisType) {
              simulateWebhookCall(analysisType, selectedFile);
            } else {
              toast.error('Selecione um arquivo e tipo de análise');
            }
          }}
          disabled={isProcessing || !selectedFile || !analysisType}
        >
          {isProcessing ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Enviar para Análise
            </>
          )}
        </Button>

        {/* Status da Integração */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Status da Integração</h4>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Webhook configurado e funcionando</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              Última verificação: {new Date().toLocaleTimeString('pt-BR')}
            </Badge>
          </div>
        </div>

        {/* Logs de Atividade */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Logs de Atividade</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>15:30 - Análise de malote concluída</span>
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>14:45 - Resumo de matrícula processado</span>
            </div>
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <XCircle className="h-3 w-3 text-red-500" />
              <span>13:20 - Erro no processamento (timeout)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookSimulator;