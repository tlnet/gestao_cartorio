"use client";

import React, { useState } from 'react';
import MainLayout from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Building2,
  Users,
  Webhook,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

const Configuracoes = () => {
  const [activeTab, setActiveTab] = useState('cartorio');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showServicoDialog, setShowServicoDialog] = useState(false);

  // Dados mockados
  const [configCartorio, setConfigCartorio] = useState({
    nome: 'Cartório do 1º Ofício de Notas',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Flores, 123 - Centro - São Paulo/SP',
    telefone: '(11) 3333-4444',
    email: 'contato@cartorio1oficio.com.br',
    diasAlertaVencimento: 3,
    notificacaoWhatsApp: true,
    webhookN8N: 'https://webhook.n8n.io/cartorio-123'
  });

  const [statusPersonalizados, setStatusPersonalizados] = useState([
    { id: '1', nome: 'Aguardando Análise', cor: '#f59e0b', ordem: 1 },
    { id: '2', nome: 'Em Andamento', cor: '#3b82f6', ordem: 2 },
    { id: '3', nome: 'Pendente Documentação', cor: '#ef4444', ordem: 3 },
    { id: '4', nome: 'Aguardando Assinatura', cor: '#8b5cf6', ordem: 4 },
    { id: '5', nome: 'Concluído', cor: '#10b981', ordem: 5 }
  ]);

  const [servicos, setServicos] = useState([
    { id: '1', nome: 'Certidão de Nascimento', prazoExecucao: 2, ativo: true },
    { id: '2', nome: 'Certidão de Casamento', prazoExecucao: 2, ativo: true },
    { id: '3', nome: 'Certidão de Óbito', prazoExecucao: 1, ativo: true },
    { id: '4', nome: 'Escritura de Compra e Venda', prazoExecucao: 15, ativo: true },
    { id: '5', nome: 'Procuração', prazoExecucao: 3, ativo: true },
    { id: '6', nome: 'Reconhecimento de Firma', prazoExecucao: 1, ativo: true },
    { id: '7', nome: 'Autenticação de Documentos', prazoExecucao: 1, ativo: true },
    { id: '8', nome: 'Registro de Imóveis', prazoExecucao: 30, ativo: true },
    { id: '9', nome: 'Testamento', prazoExecucao: 10, ativo: true },
    { id: '10', nome: 'Inventário', prazoExecucao: 60, ativo: false }
  ]);

  const tabs = [
    { id: 'cartorio', label: 'Dados do Cartório', icon: Building2 },
    { id: 'status', label: 'Status Personalizados', icon: Settings },
    { id: 'servicos', label: 'Serviços', icon: Users },
    { id: 'integracoes', label: 'Integrações', icon: Webhook }
  ];

  const handleSaveCartorio = () => {
    toast.success('Configurações do cartório salvas com sucesso!');
  };

  const handleAddStatus = (novoStatus: any) => {
    const id = Date.now().toString();
    setStatusPersonalizados(prev => [...prev, { ...novoStatus, id }]);
    setShowStatusDialog(false);
    toast.success('Status adicionado com sucesso!');
  };

  const handleAddServico = (novoServico: any) => {
    const id = Date.now().toString();
    setServicos(prev => [...prev, { ...novoServico, id }]);
    setShowServicoDialog(false);
    toast.success('Serviço adicionado com sucesso!');
  };

  const handleImportServicos = () => {
    toast.success('Arquivo importado com sucesso! 5 novos serviços adicionados.');
  };

  const handleExportServicos = () => {
    toast.success('Arquivo exportado com sucesso!');
  };

  return (
    <MainLayout 
      title="Configurações" 
      subtitle="Gerencie as configurações do cartório e do sistema"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Dados do Cartório */}
        {activeTab === 'cartorio' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações do Cartório
              </CardTitle>
              <CardDescription>
                Configure os dados básicos e preferências do cartório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nome">Nome do Cartório</Label>
                    <Input
                      id="nome"
                      value={configCartorio.nome}
                      onChange={(e) => setConfigCartorio(prev => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={configCartorio.cnpj}
                      onChange={(e) => setConfigCartorio(prev => ({ ...prev, cnpj: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={configCartorio.telefone}
                      onChange={(e) => setConfigCartorio(prev => ({ ...prev, telefone: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={configCartorio.email}
                      onChange={(e) => setConfigCartorio(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="endereco">Endereço</Label>
                    <Textarea
                      id="endereco"
                      value={configCartorio.endereco}
                      onChange={(e)=> setConfigCartorio(prev => ({ ...prev, endereco: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Preferências de Notificação</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="diasAlerta">Dias para Alerta de Vencimento</Label>
                    <Input
                      id="diasAlerta"
                      type="number"
                      min="1"
                      max="30"
                      value={configCartorio.diasAlertaVencimento}
                      onChange={(e) => setConfigCartorio(prev => ({ 
                        ...prev, 
                        diasAlertaVencimento: parseInt(e.target.value) 
                      }))}
                      className="w-32"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Sistema enviará alertas quando faltarem X dias para o vencimento
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="whatsapp"
                      checked={configCartorio.notificacaoWhatsApp}
                      onCheckedChange={(checked) => setConfigCartorio(prev => ({ 
                        ...prev, 
                        notificacaoWhatsApp: checked 
                      }))}
                    />
                    <Label htmlFor="whatsapp">Habilitar notificações via WhatsApp</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCartorio}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Personalizados */}
        {activeTab === 'status' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Status Personalizados
                </div>
                <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Status</DialogTitle>
                      <DialogDescription>
                        Configure um novo status personalizado para os protocolos
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nomeStatus">Nome do Status</Label>
                        <Input id="nomeStatus" placeholder="Ex: Aguardando Revisão" />
                      </div>
                      <div>
                        <Label htmlFor="corStatus">Cor</Label>
                        <Input id="corStatus" type="color" defaultValue="#3b82f6" />
                      </div>
                      <div>
                        <Label htmlFor="ordemStatus">Ordem</Label>
                        <Input id="ordemStatus" type="number" defaultValue={statusPersonalizados.length + 1} />
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => handleAddStatus({
                          nome: 'Novo Status',
                          cor: '#3b82f6',
                          ordem: statusPersonalizados.length + 1
                        })}
                      >
                        Adicionar Status
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Gerencie os status personalizados para os protocolos do seu cartório
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statusPersonalizados
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((status) => (
                    <TableRow key={status.id}>
                      <TableCell>{status.ordem}</TableCell>
                      <TableCell className="font-medium">{status.nome}</TableCell>
                      <TableCell>{status.cor}</TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: status.cor, color: 'white' }}>
                          {status.nome}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Serviços */}
        {activeTab === 'servicos' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestão de Serviços
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleImportServicos}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar CSV
                  </Button>
                  <Button variant="outline" onClick={handleExportServicos}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                  </Button>
                  <Dialog open={showServicoDialog} onOpenChange={setShowServicoDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Serviço</DialogTitle>
                        <DialogDescription>
                          Configure um novo serviço oferecido pelo cartório
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="nomeServico">Nome do Serviço</Label>
                          <Input id="nomeServico" placeholder="Ex: Certidão de Nascimento" />
                        </div>
                        <div>
                          <Label htmlFor="prazoServico">Prazo de Execução (dias)</Label>
                          <Input id="prazoServico" type="number" min="1" defaultValue="3" />
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => handleAddServico({
                            nome: 'Novo Serviço',
                            prazoExecucao: 3,
                            ativo: true
                          })}
                        >
                          Adicionar Serviço
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardTitle>
              <CardDescription>
                Configure os serviços oferecidos e seus prazos de execução
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Prazo (dias)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicos.map((servico) => (
                    <TableRow key={servico.id}>
                      <TableCell className="font-medium">{servico.nome}</TableCell>
                      <TableCell>{servico.prazoExecucao}</TableCell>
                      <TableCell>
                        <Badge variant={servico.ativo ? "default" : "secondary"}>
                          {servico.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Integrações */}
        {activeTab === 'integracoes' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Integrações e Webhooks
              </CardTitle>
              <CardDescription>
                Configure as integrações com sistemas externos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">N8N Webhook</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhookN8N">URL do Webhook N8N</Label>
                    <Input
                      id="webhookN8N"
                      value={configCartorio.webhookN8N}
                      onChange={(e) => setConfigCartorio(prev => ({ ...prev, webhookN8N: e.target.value }))}
                      placeholder="https://webhook.n8n.io/seu-webhook"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      URL para envio de notificações automáticas via N8N
                    </p>
                  </div>
                  
                  <Button variant="outline">
                    Testar Conexão
                  </Button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">API do Sistema</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Endpoint da API:</strong> https://api.iacartorios.com.br/v1/
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Chave da API:</strong> ****-****-****-1234
                  </p>
                  <Button variant="outline" size="sm">
                    Regenerar Chave
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveCartorio}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Integrações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default Configuracoes;