"use client";

import React, { useState } from "react";
import MainLayout from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useN8NConfig } from "@/hooks/use-n8n-config";
import { useServicos } from "@/hooks/use-servicos";
import { useStatusPersonalizados } from "@/hooks/use-status-personalizados";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

const Configuracoes = () => {
  const [activeTab, setActiveTab] = useState("cartorio");
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showServicoDialog, setShowServicoDialog] = useState(false);
  const [showEditStatusDialog, setShowEditStatusDialog] = useState(false);
  const [showEditServicoDialog, setShowEditServicoDialog] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: "status" | "servico";
    name: string;
  } | null>(null);

  // Hooks para dados reais
  const {
    config: n8nConfig,
    loading: n8nLoading,
    saveConfig,
    testWebhook,
    disableConfig,
  } = useN8NConfig();
  const {
    servicos,
    loading: servicosLoading,
    createServico,
    updateServico,
    deleteServico,
  } = useServicos();
  const {
    statusPersonalizados,
    loading: statusLoading,
    createStatusPersonalizado,
    updateStatusPersonalizado,
    deleteStatusPersonalizado,
  } = useStatusPersonalizados();

  const [webhookUrl, setWebhookUrl] = useState("");
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Dados mockados
  const [configCartorio, setConfigCartorio] = useState({
    nome: "Cartório do 1º Ofício de Notas",
    cnpj: "12.345.678/0001-90",
    endereco: "Rua das Flores, 123 - Centro - São Paulo/SP",
    telefone: "(11) 3333-4444",
    email: "contato@cartorio1oficio.com.br",
    diasAlertaVencimento: 3,
    notificacaoWhatsApp: true,
    webhookN8N: "https://webhook.n8n.io/cartorio-123",
  });

  // Estados para formulários
  const [editingServico, setEditingServico] = useState<any>(null);
  const [editingStatus, setEditingStatus] = useState<any>(null);

  // Estados para formulários de criação/edição
  const [statusForm, setStatusForm] = useState({
    nome: "",
    cor: "#3b82f6",
    ordem: 1,
  });

  const [servicoForm, setServicoForm] = useState({
    nome: "",
    descricao: "",
    preco: "",
    prazo_execucao: 3,
    ativo: true,
  });

  const tabs = [
    { id: "cartorio", label: "Dados do Cartório", icon: Building2 },
    { id: "status", label: "Status Personalizados", icon: Settings },
    { id: "servicos", label: "Serviços", icon: Users },
    { id: "integracoes", label: "Integrações", icon: Webhook },
  ];

  const handleSaveCartorio = () => {
    toast.success("Configurações do cartório salvas com sucesso!");
  };

  const handleAddStatus = async () => {
    try {
      if (!statusForm.nome.trim()) {
        toast.error("Nome do status é obrigatório");
        return;
      }

      await createStatusPersonalizado({
        nome: statusForm.nome,
        cor: statusForm.cor,
        ordem: statusForm.ordem,
      });

      setStatusForm({
        nome: "",
        cor: "#3b82f6",
        ordem: statusPersonalizados.length + 1,
      });
      setShowStatusDialog(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleEditStatus = async () => {
    try {
      if (!statusForm.nome.trim()) {
        toast.error("Nome do status é obrigatório");
        return;
      }

      if (!editingStatus) return;

      await updateStatusPersonalizado(editingStatus.id, {
        nome: statusForm.nome,
        cor: statusForm.cor,
        ordem: statusForm.ordem,
      });

      setEditingStatus(null);
      setStatusForm({ nome: "", cor: "#3b82f6", ordem: 1 });
      setShowEditStatusDialog(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleAddServico = async () => {
    try {
      if (!servicoForm.nome.trim()) {
        toast.error("Nome do serviço é obrigatório");
        return;
      }

      const preco = servicoForm.preco
        ? parseFloat(servicoForm.preco)
        : undefined;

      await createServico({
        nome: servicoForm.nome,
        descricao: servicoForm.descricao || undefined,
        preco: preco,
        prazo_execucao: servicoForm.prazo_execucao,
        ativo: servicoForm.ativo,
      });

      setServicoForm({
        nome: "",
        descricao: "",
        preco: "",
        prazo_execucao: 3,
        ativo: true,
      });
      setShowServicoDialog(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleEditServico = async () => {
    try {
      if (!servicoForm.nome.trim()) {
        toast.error("Nome do serviço é obrigatório");
        return;
      }

      if (!editingServico) return;

      const preco = servicoForm.preco
        ? parseFloat(servicoForm.preco)
        : undefined;

      await updateServico(editingServico.id, {
        nome: servicoForm.nome,
        descricao: servicoForm.descricao || undefined,
        preco: preco,
        prazo_execucao: servicoForm.prazo_execucao,
        ativo: servicoForm.ativo,
      });

      setEditingServico(null);
      setServicoForm({
        nome: "",
        descricao: "",
        preco: "",
        prazo_execucao: 3,
        ativo: true,
      });
      setShowEditServicoDialog(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleDeleteServico = (servico: any) => {
    setItemToDelete({ id: servico.id, type: "servico", name: servico.nome });
    setShowDeleteConfirmation(true);
  };

  const handleDeleteStatus = (status: any) => {
    setItemToDelete({ id: status.id, type: "status", name: status.nome });
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === "servico") {
        await deleteServico(itemToDelete.id);
      } else {
        await deleteStatusPersonalizado(itemToDelete.id);
      }
    } catch (error) {
      // Erro já tratado no hook
    } finally {
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
    }
  };

  const openEditStatusDialog = (status: any) => {
    setEditingStatus(status);
    setStatusForm({
      nome: status.nome,
      cor: status.cor,
      ordem: status.ordem,
    });
    setShowEditStatusDialog(true);
  };

  const openEditServicoDialog = (servico: any) => {
    setEditingServico(servico);
    setServicoForm({
      nome: servico.nome,
      descricao: servico.descricao || "",
      preco: servico.preco ? servico.preco.toString() : "",
      prazo_execucao: servico.prazo_execucao || 3,
      ativo: servico.ativo,
    });
    setShowEditServicoDialog(true);
  };

  const handleImportServicos = () => {
    toast.success(
      "Arquivo importado com sucesso! 5 novos serviços adicionados."
    );
  };

  const handleExportServicos = () => {
    toast.success("Arquivo exportado com sucesso!");
  };

  // Funções para N8N
  const handleSaveN8NConfig = async () => {
    if (!webhookUrl.trim()) {
      toast.error("URL do webhook é obrigatória");
      return;
    }

    try {
      await saveConfig(webhookUrl);
      setWebhookUrl("");
    } catch (error) {
      console.error("Erro ao salvar configuração N8N:", error);
    }
  };

  const handleTestN8NWebhook = async () => {
    const url = webhookUrl || n8nConfig?.webhook_url;
    if (!url) {
      toast.error("URL do webhook não configurada");
      return;
    }

    setTestingWebhook(true);
    try {
      await testWebhook(url);
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleDisableN8NConfig = async () => {
    try {
      await disableConfig();
    } catch (error) {
      console.error("Erro ao desabilitar configuração N8N:", error);
    }
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
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
        {activeTab === "cartorio" && (
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
                      onChange={(e) =>
                        setConfigCartorio((prev) => ({
                          ...prev,
                          nome: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      value={configCartorio.cnpj}
                      onChange={(e) =>
                        setConfigCartorio((prev) => ({
                          ...prev,
                          cnpj: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={configCartorio.telefone}
                      onChange={(e) =>
                        setConfigCartorio((prev) => ({
                          ...prev,
                          telefone: e.target.value,
                        }))
                      }
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
                      onChange={(e) =>
                        setConfigCartorio((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="endereco">Endereço</Label>
                    <Textarea
                      id="endereco"
                      value={configCartorio.endereco}
                      onChange={(e) =>
                        setConfigCartorio((prev) => ({
                          ...prev,
                          endereco: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">
                  Preferências de Notificação
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="diasAlerta">
                      Dias para Alerta de Vencimento
                    </Label>
                    <Input
                      id="diasAlerta"
                      type="number"
                      min="1"
                      max="30"
                      value={configCartorio.diasAlertaVencimento}
                      onChange={(e) =>
                        setConfigCartorio((prev) => ({
                          ...prev,
                          diasAlertaVencimento: parseInt(e.target.value),
                        }))
                      }
                      className="w-32"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Sistema enviará alertas quando faltarem X dias para o
                      vencimento
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="whatsapp"
                      checked={configCartorio.notificacaoWhatsApp}
                      onCheckedChange={(checked) =>
                        setConfigCartorio((prev) => ({
                          ...prev,
                          notificacaoWhatsApp: checked,
                        }))
                      }
                    />
                    <Label htmlFor="whatsapp">
                      Habilitar notificações via WhatsApp
                    </Label>
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
        {activeTab === "status" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Status Personalizados
                </div>
                <Dialog
                  open={showStatusDialog}
                  onOpenChange={setShowStatusDialog}
                >
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
                        Configure um novo status personalizado para os
                        protocolos
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nomeStatus">Nome do Status</Label>
                        <Input
                          id="nomeStatus"
                          placeholder="Ex: Aguardando Revisão"
                          value={statusForm.nome}
                          onChange={(e) =>
                            setStatusForm((prev) => ({
                              ...prev,
                              nome: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="corStatus">Cor</Label>
                        <Input
                          id="corStatus"
                          type="color"
                          value={statusForm.cor}
                          onChange={(e) =>
                            setStatusForm((prev) => ({
                              ...prev,
                              cor: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="ordemStatus">Ordem</Label>
                        <Input
                          id="ordemStatus"
                          type="number"
                          min="1"
                          value={statusForm.ordem}
                          onChange={(e) =>
                            setStatusForm((prev) => ({
                              ...prev,
                              ordem: parseInt(e.target.value) || 1,
                            }))
                          }
                        />
                      </div>
                      <Button className="w-full" onClick={handleAddStatus}>
                        Adicionar Status
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Gerencie os status personalizados para os protocolos do seu
                cartório
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
                  {statusLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-8" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-16" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : statusPersonalizados.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Settings className="h-8 w-8 text-gray-400" />
                          <p>Nenhum status personalizado encontrado</p>
                          <p className="text-sm">
                            Adicione o primeiro status para começar
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    statusPersonalizados
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((status) => (
                        <TableRow key={status.id}>
                          <TableCell>{status.ordem}</TableCell>
                          <TableCell className="font-medium">
                            {status.nome}
                          </TableCell>
                          <TableCell>{status.cor}</TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: status.cor,
                                color: "white",
                              }}
                            >
                              {status.nome}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditStatusDialog(status)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteStatus(status)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Serviços */}
        {activeTab === "servicos" && (
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
                  <Dialog
                    open={showServicoDialog}
                    onOpenChange={setShowServicoDialog}
                  >
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
                          <Input
                            id="nomeServico"
                            placeholder="Ex: Certidão de Nascimento"
                            value={servicoForm.nome}
                            onChange={(e) =>
                              setServicoForm((prev) => ({
                                ...prev,
                                nome: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="descricaoServico">Descrição</Label>
                          <Textarea
                            id="descricaoServico"
                            placeholder="Descrição do serviço"
                            value={servicoForm.descricao}
                            onChange={(e) =>
                              setServicoForm((prev) => ({
                                ...prev,
                                descricao: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="precoServico">Preço (R$)</Label>
                          <Input
                            id="precoServico"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={servicoForm.preco}
                            onChange={(e) =>
                              setServicoForm((prev) => ({
                                ...prev,
                                preco: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="prazoServico">
                            Prazo de Execução (dias)
                          </Label>
                          <Input
                            id="prazoServico"
                            type="number"
                            min="1"
                            value={servicoForm.prazo_execucao}
                            onChange={(e) =>
                              setServicoForm((prev) => ({
                                ...prev,
                                prazo_execucao: parseInt(e.target.value) || 3,
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="ativoServico"
                            checked={servicoForm.ativo}
                            onCheckedChange={(checked) =>
                              setServicoForm((prev) => ({
                                ...prev,
                                ativo: checked,
                              }))
                            }
                          />
                          <Label htmlFor="ativoServico">Serviço ativo</Label>
                        </div>
                        <Button className="w-full" onClick={handleAddServico}>
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Prazo (dias)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicosLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-48" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-16" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : servicos.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-gray-400" />
                          <p>Nenhum serviço encontrado</p>
                          <p className="text-sm">
                            Adicione o primeiro serviço para começar
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    servicos.map((servico) => (
                      <TableRow key={servico.id}>
                        <TableCell className="font-medium">
                          {servico.nome}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {servico.descricao || "-"}
                        </TableCell>
                        <TableCell>
                          {servico.preco
                            ? `R$ ${servico.preco.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {servico.prazo_execucao
                            ? `${servico.prazo_execucao} dias`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={servico.ativo ? "default" : "secondary"}
                          >
                            {servico.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditServicoDialog(servico)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteServico(servico)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Integrações */}
        {activeTab === "integracoes" && (
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
                <h3 className="text-lg font-medium mb-4">
                  N8N Webhook - Análise de IA
                </h3>

                {n8nLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status da Configuração */}
                    {n8nConfig ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium text-green-800">
                            Webhook N8N Configurado
                          </span>
                        </div>
                        <p className="text-sm text-green-700 mb-2">
                          <strong>URL:</strong> {n8nConfig.webhook_url}
                        </p>
                        <p className="text-sm text-green-700 mb-3">
                          <strong>Configurado em:</strong>{" "}
                          {new Date(n8nConfig.created_at).toLocaleString(
                            "pt-BR"
                          )}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTestN8NWebhook}
                            disabled={testingWebhook}
                          >
                            {testingWebhook ? (
                              <>
                                <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                                Testando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Testar Conexão
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisableN8NConfig}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Desabilitar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                          <span className="font-medium text-yellow-800">
                            Webhook N8N Não Configurado
                          </span>
                        </div>
                        <p className="text-sm text-yellow-700 mb-4">
                          Configure a URL do webhook N8N para habilitar as
                          funcionalidades de análise de IA.
                        </p>
                      </div>
                    )}

                    {/* Formulário de Configuração */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="webhookN8N">URL do Webhook N8N</Label>
                        <Input
                          id="webhookN8N"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://webhook.n8n.io/seu-webhook"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          URL para envio de documentos para análise de IA via
                          N8N
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveN8NConfig}
                          disabled={!webhookUrl.trim()}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {n8nConfig
                            ? "Atualizar Configuração"
                            : "Salvar Configuração"}
                        </Button>

                        {webhookUrl && (
                          <Button
                            variant="outline"
                            onClick={handleTestN8NWebhook}
                            disabled={testingWebhook}
                          >
                            {testingWebhook ? (
                              <>
                                <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                                Testando...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Testar Conexão
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">
                  Informações do Sistema
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">
                      <strong>Endpoint de Callback:</strong>{" "}
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/api/ia/webhook`
                        : "Carregando..."}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Use esta URL no seu workflow N8N para receber os
                      resultados das análises
                    </p>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600">
                      <strong>Status da Integração:</strong>
                      <Badge
                        variant={n8nConfig ? "default" : "secondary"}
                        className="ml-2"
                      >
                        {n8nConfig ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog de Edição de Status */}
        <Dialog
          open={showEditStatusDialog}
          onOpenChange={setShowEditStatusDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Status</DialogTitle>
              <DialogDescription>
                Edite as informações do status personalizado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editNomeStatus">Nome do Status</Label>
                <Input
                  id="editNomeStatus"
                  placeholder="Ex: Aguardando Revisão"
                  value={statusForm.nome}
                  onChange={(e) =>
                    setStatusForm((prev) => ({ ...prev, nome: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editCorStatus">Cor</Label>
                <Input
                  id="editCorStatus"
                  type="color"
                  value={statusForm.cor}
                  onChange={(e) =>
                    setStatusForm((prev) => ({ ...prev, cor: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editOrdemStatus">Ordem</Label>
                <Input
                  id="editOrdemStatus"
                  type="number"
                  min="1"
                  value={statusForm.ordem}
                  onChange={(e) =>
                    setStatusForm((prev) => ({
                      ...prev,
                      ordem: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <Button className="w-full" onClick={handleEditStatus}>
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição de Serviço */}
        <Dialog
          open={showEditServicoDialog}
          onOpenChange={setShowEditServicoDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Serviço</DialogTitle>
              <DialogDescription>
                Edite as informações do serviço
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editNomeServico">Nome do Serviço</Label>
                <Input
                  id="editNomeServico"
                  placeholder="Ex: Certidão de Nascimento"
                  value={servicoForm.nome}
                  onChange={(e) =>
                    setServicoForm((prev) => ({
                      ...prev,
                      nome: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editDescricaoServico">Descrição</Label>
                <Textarea
                  id="editDescricaoServico"
                  placeholder="Descrição do serviço"
                  value={servicoForm.descricao}
                  onChange={(e) =>
                    setServicoForm((prev) => ({
                      ...prev,
                      descricao: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPrecoServico">Preço (R$)</Label>
                <Input
                  id="editPrecoServico"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={servicoForm.preco}
                  onChange={(e) =>
                    setServicoForm((prev) => ({
                      ...prev,
                      preco: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPrazoServico">
                  Prazo de Execução (dias)
                </Label>
                <Input
                  id="editPrazoServico"
                  type="number"
                  min="1"
                  value={servicoForm.prazo_execucao}
                  onChange={(e) =>
                    setServicoForm((prev) => ({
                      ...prev,
                      prazo_execucao: parseInt(e.target.value) || 3,
                    }))
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editAtivoServico"
                  checked={servicoForm.ativo}
                  onCheckedChange={(checked) =>
                    setServicoForm((prev) => ({ ...prev, ativo: checked }))
                  }
                />
                <Label htmlFor="editAtivoServico">Serviço ativo</Label>
              </div>
              <Button className="w-full" onClick={handleEditServico}>
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Confirmação de Exclusão */}
        <ConfirmationDialog
          open={showDeleteConfirmation}
          onOpenChange={setShowDeleteConfirmation}
          onConfirm={confirmDelete}
          title={`Excluir ${
            itemToDelete?.type === "status" ? "Status" : "Serviço"
          }`}
          description={`Tem certeza que deseja excluir "${itemToDelete?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="destructive"
        />
      </div>
    </MainLayout>
  );
};

export default Configuracoes;
