"use client";

import React, { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Brain,
  FileText,
  Package,
  PenTool,
  Upload,
  Download,
  Eye,
  Clock,
  CheckCircle
} from 'lucide-react';

const AnaliseIA = () => {
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  // Dados mockados de relatórios processados
  const relatorios = [
    {
      id: '1',
      tipo: 'resumo_matricula',
      nomeArquivo: 'matricula_123456.pdf',
      processadoEm: '2024-01-15T10:30:00',
      status: 'concluido',
      usuario: 'João Silva'
    },
    {
      id: '2',
      tipo: 'analise_malote',
      nomeArquivo: 'malote_janeiro_2024.zip',
      processadoEm: '2024-01-15T09:15:00',
      status: 'concluido',
      usuario: 'Maria Santos'
    },
    {
      id: '3',
      tipo: 'minuta_documento',
      nomeArquivo: 'contrato_compra_venda.docx',
      processadoEm: '2024-01-15T08:45:00',
      status: 'processando',
      usuario: 'Ana Costa'
    }
  ];

  const tiposAnalise = [
    {
      id: 'resumo_matricula',
      titulo: 'Resumir Matrícula',
      descricao: 'Extrai informações principais de matrículas imobiliárias',
      icon: FileText,
      color: 'bg-blue-500'
    },
    {
      id: 'analise_malote',
      titulo: 'Analisar Malote',
      descricao: 'Processa e organiza documentos em lote',
      icon: Package,
      color: 'bg-green-500'
    },
    {
      id: 'minuta_documento',
      titulo: 'Gerar Minuta de Documento',
      descricao: 'Cria minutas baseadas em modelos e dados fornecidos',
      icon: PenTool,
      color: 'bg-purple-500'
    }
  ];

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'resumo_matricula': return 'Resumo de Matrícula';
      case 'analise_malote': return 'Análise de Malote';
      case 'minuta_documento': return 'Minuta de Documento';
      default: return tipo;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'bg-green-100 text-green-800';
      case 'processando': return 'bg-yellow-100 text-yellow-800';
      case 'erro': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido': return <CheckCircle className="h-4 w-4" />;
      case 'processando': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  const handleFileUpload = (tipoAnalise: string, file: File) => {
    setUploadingFile(tipoAnalise);
    
    // Simular upload e processamento
    setTimeout(() => {
      setUploadingFile(null);
      console.log(`Arquivo ${file.name} enviado para análise: ${tipoAnalise}`);
    }, 2000);
  };

  return (
    <MainLayout 
      title="Análise Inteligente de Documentos" 
      subtitle="Processamento automatizado com inteligência artificial"
    >
      <div className="space-y-6">
        {/* Cards de Tipos de Análise */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiposAnalise.map((tipo) => {
            const Icon = tipo.icon;
            const isUploading = uploadingFile === tipo.id;
            
            return (
              <Card key={tipo.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${tipo.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tipo.titulo}</CardTitle>
                    </div>
                  </div>
                  <CardDescription>{tipo.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full" 
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Enviar Documento
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{tipo.titulo}</DialogTitle>
                        <DialogDescription>
                          {tipo.descricao}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="file">Selecionar Arquivo</Label>
                          <Input
                            id="file"
                            type="file"
                            accept=".pdf,.doc,.docx,.zip"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(tipo.id, file);
                              }
                            }}
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Formatos aceitos: PDF, DOC, DOCX, ZIP
                          </p>
                        </div>
                        <Button className="w-full">
                          <Brain className="mr-2 h-4 w-4" />
                          Iniciar Análise
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Histórico de Análises */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Análises</CardTitle>
            <CardDescription>
              Relatórios processados pela inteligência artificial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Análise</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Processado em</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorios.map((relatorio) => (
                  <TableRow key={relatorio.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {getTipoLabel(relatorio.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {relatorio.nomeArquivo}
                    </TableCell>
                    <TableCell>
                      {new Date(relatorio.processadoEm).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>{relatorio.usuario}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(relatorio.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(relatorio.status)}
                            <span>
                              {relatorio.status === 'concluido' ? 'Concluído' : 
                               relatorio.status === 'processando' ? 'Processando' : 
                               'Erro'}
                            </span>
                          </div>
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" disabled={relatorio.status !== 'concluido'}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={relatorio.status !== 'concluido'}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Estatísticas de Uso */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Análises Hoje</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">
                +3 desde ontem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.5min</div>
              <p className="text-xs text-muted-foreground">
                Por documento processado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">98.5%</div>
              <p className="text-xs text-muted-foreground">
                Análises bem-sucedidas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default AnaliseIA;