"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PenTool,
  Upload,
  FileText,
  Users,
  UserCheck,
  Building,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useN8NConfig } from "@/hooks/use-n8n-config";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { getWebhookUrl as getDefaultWebhookUrl } from "@/lib/webhooks-config";

// ============ TIPOS TYPESCRIPT ============

// Tipos para os cards
type CardStatus = "pending" | "complete";

interface CardStatusState {
  compradores: CardStatus;
  vendedores: CardStatus;
  certidoes: CardStatus;
  documentosImovel: CardStatus;
}

// Modais disponíveis
type ModalType = "compradores" | "vendedores" | "certidoes" | "documentosImovel" | null;

// Dados do Cônjuge
interface DadosConjuge {
  rg: File | null; // RG é arquivo
  cpf: File | null; // CPF é arquivo
  email: string;
  qualificacaoProfissional: string;
  certidaoCasamento: File | null;
}

// Dados de Pessoa (Comprador ou Vendedor)
interface DadosPessoa {
  rg: File | null; // RG é arquivo
  cpf: File | null; // CPF é arquivo
  comprovanteEndereco: File | null;
  email: string;
  qualificacaoProfissional: string;
  casado: boolean;
  conjuge: DadosConjuge | null;
}

// Dados dos Compradores
interface DadosCompradores {
  comprador: DadosPessoa;
}

// Dados de um Vendedor (com ID único)
interface DadosVendedor extends DadosPessoa {
  id: string; // ID único para cada vendedor
}

// Dados dos Vendedores (array de vendedores)
interface DadosVendedores {
  vendedores: DadosVendedor[];
  multiplosVendedores: boolean;
}

// Dados das Certidões Fiscais do Cônjuge
interface DadosCertidoesConjuge {
  cndt: File | null;
  cndFederal: File | null;
}

// Dados das Certidões Fiscais
interface DadosCertidoes {
  cndt: File | null;
  cndFederal: File | null;
  casado: boolean;
  conjuge: DadosCertidoesConjuge | null;
}

// Dados dos Documentos do Imóvel
interface DadosDocumentosImovel {
  matricula: File | null;
  guiaITBI: File | null;
  certidaoOnus: File | null;
  certidaoNegativaImovel: File | null;
}

// Estado global do formulário de minuta
interface MinutaFormData {
  compradores: DadosCompradores | null;
  vendedores: DadosVendedores | null;
  certidoes: DadosCertidoes | null;
  documentosImovel: DadosDocumentosImovel | null;
}

// ============ FIM DOS TIPOS ============

interface MinutaDocumentoFormProps {
  onProcessComplete: (result: any) => void;
  processarMinutaDocumento: (...args: any[]) => Promise<any>;
}

const MinutaDocumentoForm: React.FC<MinutaDocumentoFormProps> = ({
  onProcessComplete,
  processarMinutaDocumento,
}) => {
  const { user } = useAuth();
  const { getWebhookUrl } = useN8NConfig();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showMinutaSelectionDialog, setShowMinutaSelectionDialog] = useState(false);
  const [showMainDialog, setShowMainDialog] = useState(false);
  const [selectedMinutaType, setSelectedMinutaType] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  // Estados de status dos cards
  const [cardStatus, setCardStatus] = useState<CardStatusState>({
    compradores: "pending",
    vendedores: "pending",
    certidoes: "pending",
    documentosImovel: "pending",
  });

  // Estado global dos dados do formulário
  const [formData, setFormData] = useState<MinutaFormData>({
    compradores: null,
    vendedores: null,
    certidoes: null,
    documentosImovel: null,
  });

  // Estado temporário para o formulário de compradores
  const [tempCompradorData, setTempCompradorData] = useState<DadosPessoa>({
    rg: null,
    cpf: null,
    comprovanteEndereco: null,
    email: "",
    qualificacaoProfissional: "",
    casado: false,
    conjuge: null,
  });

  const [tempConjugeData, setTempConjugeData] = useState<DadosConjuge>({
    rg: null,
    cpf: null,
    email: "",
    qualificacaoProfissional: "",
    certidaoCasamento: null,
  });

  // Estados para vendedores (com múltiplos vendedores)
  const [tempVendedoresData, setTempVendedoresData] = useState<DadosVendedor[]>([
    {
      id: crypto.randomUUID(),
      rg: null,
      cpf: null,
      comprovanteEndereco: null,
      email: "",
      qualificacaoProfissional: "",
      casado: false,
      conjuge: null,
    }
  ]);
  const [multiplosVendedores, setMultiplosVendedores] = useState(false);

  // Estados para certidões
  const [tempCertidoesData, setTempCertidoesData] = useState<DadosCertidoes>({
    cndt: null,
    cndFederal: null,
    casado: false,
    conjuge: null,
  });

  const [tempCertidoesConjugeData, setTempCertidoesConjugeData] = useState<DadosCertidoesConjuge>({
    cndt: null,
    cndFederal: null,
  });

  // Estados para documentos do imóvel
  const [tempDocumentosImovelData, setTempDocumentosImovelData] = useState<DadosDocumentosImovel>({
    matricula: null,
    guiaITBI: null,
    certidaoOnus: null,
    certidaoNegativaImovel: null,
  });

  // ============ FUNÇÕES PARA MODAL DE COMPRADORES ============
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateFileType = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(file.type) || allowedExtensions.includes(extension);
  };

  const validateCompradorForm = (): boolean => {
    const { rg, cpf, email, qualificacaoProfissional, comprovanteEndereco, casado, conjuge } = tempCompradorData;

    if (!rg) {
      toast.error("RG do comprador é obrigatório");
      return false;
    }
    if (!cpf) {
      toast.error("CPF do comprador é obrigatório");
      return false;
    }
    if (!email.trim()) {
      toast.error("E-mail do comprador é obrigatório");
      return false;
    }
    if (!validateEmail(email)) {
      toast.error("E-mail do comprador inválido");
      return false;
    }
    if (!qualificacaoProfissional.trim()) {
      toast.error("Qualificação profissional do comprador é obrigatória");
      return false;
    }
    if (!comprovanteEndereco) {
      toast.error("Comprovante de endereço é obrigatório");
      return false;
    }

    if (casado) {
      // Usar tempConjugeData diretamente quando casado, pois é a fonte de verdade
      if (!tempConjugeData.rg) {
        toast.error("RG do cônjuge é obrigatório");
        return false;
      }
      if (!tempConjugeData.cpf) {
        toast.error("CPF do cônjuge é obrigatório");
        return false;
      }
      if (!tempConjugeData.email.trim()) {
        toast.error("E-mail do cônjuge é obrigatório");
        return false;
      }
      if (!validateEmail(tempConjugeData.email)) {
        toast.error("E-mail do cônjuge inválido");
        return false;
      }
      if (!tempConjugeData.qualificacaoProfissional.trim()) {
        toast.error("Qualificação profissional do cônjuge é obrigatória");
        return false;
      }
      if (!tempConjugeData.certidaoCasamento) {
        toast.error("Certidão de casamento é obrigatória");
        return false;
      }
    }

    return true;
  };

  const handleSaveCompradores = () => {
    if (!validateCompradorForm()) {
      return;
    }

    const compradorData: DadosCompradores = {
      comprador: {
        ...tempCompradorData,
        conjuge: tempCompradorData.casado ? tempConjugeData : null,
      },
    };

    setFormData((prev) => ({
      ...prev,
      compradores: compradorData,
    }));

    setCardStatus((prev) => ({
      ...prev,
      compradores: "complete",
    }));

    toast.success("Dados dos compradores salvos com sucesso!");
    handleCloseModal();
  };

  const handleCancelCompradores = () => {
    // Recarregar dados se já existirem, senão limpar
    if (formData.compradores) {
      loadCompradoresData();
    } else {
      resetCompradoresForm();
    }
    handleCloseModal();
  };

  const loadCompradoresData = () => {
    if (formData.compradores) {
      setTempCompradorData(formData.compradores.comprador);
      if (formData.compradores.comprador.conjuge) {
        setTempConjugeData(formData.compradores.comprador.conjuge);
      }
    }
  };

  const resetCompradoresForm = () => {
    setTempCompradorData({
      rg: null,
      cpf: null,
      comprovanteEndereco: null,
      email: "",
      qualificacaoProfissional: "",
      casado: false,
      conjuge: null,
    });
    setTempConjugeData({
      rg: null,
      cpf: null,
      email: "",
      qualificacaoProfissional: "",
      certidaoCasamento: null,
    });
  };

  const handleFileUploadComprador = (file: File | null, field: 'rg' | 'cpf' | 'comprovanteEndereco') => {
    if (!file) return;
    
    if (!validateFileType(file)) {
      toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }
    
    setTempCompradorData(prev => ({ ...prev, [field]: file }));
    toast.success("Arquivo adicionado");
  };

  const handleFileUploadRgCpfComprador = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    // Validar todos os arquivos
    for (const file of fileArray) {
      if (!validateFileType(file)) {
        toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo: 10MB");
        return;
      }
    }
    
    // Se apenas 1 arquivo foi selecionado, usar o mesmo arquivo para RG e CPF
    // Se 2 arquivos foram selecionados, primeiro é RG e segundo é CPF
    const rgFile = fileArray[0] || null;
    const cpfFile = fileArray[1] || fileArray[0] || null; // Se não houver segundo arquivo, usa o primeiro
    
    setTempCompradorData(prev => ({
      ...prev,
      rg: rgFile,
      cpf: cpfFile,
    }));
  };

  const handleFileUploadRgCpfConjuge = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    // Validar todos os arquivos
    for (const file of fileArray) {
      if (!validateFileType(file)) {
        toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo: 10MB");
        return;
      }
    }
    
    // Se apenas 1 arquivo foi selecionado, usar o mesmo arquivo para RG e CPF
    // Se 2 arquivos foram selecionados, primeiro é RG e segundo é CPF
    const rgFile = fileArray[0] || null;
    const cpfFile = fileArray[1] || fileArray[0] || null; // Se não houver segundo arquivo, usa o primeiro
    
    const updatedConjuge = { ...tempConjugeData, rg: rgFile, cpf: cpfFile };
    setTempConjugeData(updatedConjuge);
    
    // Sincronizar com tempCompradorData.conjuge
    if (tempCompradorData.casado) {
      setTempCompradorData(prev => ({
        ...prev,
        conjuge: updatedConjuge
      }));
    }
  };

  const handleFileUploadConjuge = (file: File | null, field: 'certidaoCasamento') => {
    if (!file) return;
    
    if (!validateFileType(file)) {
      toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }
    
    const updatedConjuge = { ...tempConjugeData, [field]: file };
    setTempConjugeData(updatedConjuge);
    
    // Sincronizar com tempCompradorData.conjuge
    if (tempCompradorData.casado) {
      setTempCompradorData(prev => ({
        ...prev,
        conjuge: updatedConjuge
      }));
    }
    
    toast.success("Arquivo adicionado");
  };

  // Carregar dados quando abrir modal de compradores
  React.useEffect(() => {
    if (activeModal === "compradores" && formData.compradores) {
      loadCompradoresData();
    }
  }, [activeModal]);

  // ============ FIM DAS FUNÇÕES DE COMPRADORES ============

  // ============ FUNÇÕES PARA VENDEDORES ============

  const validateVendedorData = (vendedor: DadosVendedor): boolean => {
    if (!vendedor.rg) {
      toast.error("RG do vendedor é obrigatório");
      return false;
    }
    if (!vendedor.cpf) {
      toast.error("CPF do vendedor é obrigatório");
      return false;
    }
    if (!vendedor.email.trim() || !validateEmail(vendedor.email)) {
      toast.error("E-mail válido do vendedor é obrigatório");
      return false;
    }
    if (!vendedor.qualificacaoProfissional.trim()) {
      toast.error("Qualificação profissional do vendedor é obrigatória");
      return false;
    }
    if (!vendedor.comprovanteEndereco) {
      toast.error("Comprovante de endereço do vendedor é obrigatório");
      return false;
    }
    
    if (vendedor.casado && vendedor.conjuge) {
      if (!vendedor.conjuge.rg || !vendedor.conjuge.cpf) {
        toast.error("RG e CPF do cônjuge são obrigatórios");
        return false;
      }
      if (!vendedor.conjuge.email.trim() || !validateEmail(vendedor.conjuge.email)) {
        toast.error("E-mail válido do cônjuge é obrigatório");
        return false;
      }
      if (!vendedor.conjuge.qualificacaoProfissional.trim()) {
        toast.error("Qualificação profissional do cônjuge é obrigatória");
        return false;
      }
      if (!vendedor.conjuge.certidaoCasamento) {
        toast.error("Certidão de casamento é obrigatória");
        return false;
      }
    }
    
    return true;
  };

  const handleSaveVendedores = () => {
    // Validar todos os vendedores
    for (let i = 0; i < tempVendedoresData.length; i++) {
      if (!validateVendedorData(tempVendedoresData[i])) {
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      vendedores: {
        vendedores: tempVendedoresData,
        multiplosVendedores,
      },
    }));

    setCardStatus(prev => ({ ...prev, vendedores: "complete" }));
    toast.success("Dados dos vendedores salvos com sucesso!");
    handleCloseModal();
  };

  const handleAddVendedor = () => {
    if (tempVendedoresData.length >= 5) {
      toast.error("Máximo de 5 vendedores permitido");
      return;
    }
    setTempVendedoresData(prev => [...prev, {
      id: crypto.randomUUID(),
      rg: null,
      cpf: null,
      comprovanteEndereco: null,
      email: "",
      qualificacaoProfissional: "",
      casado: false,
      conjuge: null,
    }]);
  };

  const handleRemoveVendedor = (id: string) => {
    if (tempVendedoresData.length === 1) {
      toast.error("Deve haver pelo menos um vendedor");
      return;
    }
    setTempVendedoresData(prev => prev.filter(v => v.id !== id));
  };

  React.useEffect(() => {
    if (activeModal === "vendedores" && formData.vendedores) {
      setTempVendedoresData(formData.vendedores.vendedores);
      setMultiplosVendedores(formData.vendedores.multiplosVendedores);
    }
  }, [activeModal]);

  // ============ FIM DAS FUNÇÕES DE VENDEDORES ============

  // ============ FUNÇÕES PARA CERTIDÕES FISCAIS ============

  const validateCertidoesForm = (): boolean => {
    if (!tempCertidoesData.cndt) {
      toast.error("CNDT é obrigatória");
      return false;
    }
    if (!tempCertidoesData.cndFederal) {
      toast.error("CND Federal é obrigatória");
      return false;
    }

    if (tempCertidoesData.casado) {
      if (!tempCertidoesConjugeData.cndt) {
        toast.error("CNDT do cônjuge é obrigatória");
        return false;
      }
      if (!tempCertidoesConjugeData.cndFederal) {
        toast.error("CND Federal do cônjuge é obrigatória");
        return false;
      }
    }

    return true;
  };

  const handleSaveCertidoes = () => {
    if (!validateCertidoesForm()) return;

    const certidoesData: DadosCertidoes = {
      ...tempCertidoesData,
      conjuge: tempCertidoesData.casado ? tempCertidoesConjugeData : null,
    };

    setFormData(prev => ({ ...prev, certidoes: certidoesData }));
    setCardStatus(prev => ({ ...prev, certidoes: "complete" }));
    toast.success("Certidões salvas com sucesso!");
    handleCloseModal();
  };

  const handleFileUploadCertidao = (file: File | null, field: 'cndt' | 'cndFederal') => {
    if (!file) return;
    if (!validateFileType(file)) {
      toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }
    setTempCertidoesData(prev => ({ ...prev, [field]: file }));
    toast.success("Certidão adicionada");
  };

  React.useEffect(() => {
    if (activeModal === "certidoes" && formData.certidoes) {
      setTempCertidoesData(formData.certidoes);
      if (formData.certidoes.conjuge) {
        setTempCertidoesConjugeData(formData.certidoes.conjuge);
      } else {
        setTempCertidoesConjugeData({ cndt: null, cndFederal: null });
      }
    }
  }, [activeModal]);

  // ============ FIM DAS FUNÇÕES DE CERTIDÕES ============

  // ============ FUNÇÕES PARA DOCUMENTOS DO IMÓVEL ============

  const validateDocumentosImovelForm = (): boolean => {
    if (!tempDocumentosImovelData.matricula) {
      toast.error("Matrícula do Imóvel é obrigatória");
      return false;
    }
    if (!tempDocumentosImovelData.guiaITBI) {
      toast.error("Guia ITBI é obrigatória");
      return false;
    }
    if (!tempDocumentosImovelData.certidaoOnus) {
      toast.error("Certidão de Ônus é obrigatória");
      return false;
    }
    return true;
  };

  const handleSaveDocumentosImovel = () => {
    if (!validateDocumentosImovelForm()) return;

    setFormData(prev => ({ ...prev, documentosImovel: tempDocumentosImovelData }));
    setCardStatus(prev => ({ ...prev, documentosImovel: "complete" }));
    toast.success("Documentos do imóvel salvos com sucesso!");
    handleCloseModal();
  };

  const handleFileUploadDocumentoImovel = (
    file: File | null,
    field: "matricula" | "guiaITBI" | "certidaoOnus" | "certidaoNegativaImovel"
  ) => {
    if (!file) return;
    if (!validateFileType(file)) {
      toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 10MB");
      return;
    }
    setTempDocumentosImovelData(prev => ({ ...prev, [field]: file }));
    toast.success("Documento adicionado");
  };

  React.useEffect(() => {
    if (activeModal === "documentosImovel" && formData.documentosImovel) {
      setTempDocumentosImovelData(formData.documentosImovel);
    }
  }, [activeModal]);

  // ============ FIM DAS FUNÇÕES DE DOCUMENTOS DO IMÓVEL ============

  // Tipos de minuta disponíveis
  const minutaTypes = [
    {
      id: "compra_venda",
      title: "Compra e Venda",
      description: "Minuta de escritura de compra e venda de imóveis",
      icon: FileText,
      color: "bg-purple-500",
    },
    // Futuras minutas podem ser adicionadas aqui
  ];

  const handleMinutaTypeSelect = (minutaId: string) => {
    setSelectedMinutaType(minutaId);
    setShowMinutaSelectionDialog(false);
    setShowMainDialog(true);
  };

  // Cards de documentos
  const documentCards = [
    {
      id: "compradores" as const,
      title: "Documentos dos Compradores",
      icon: UserCheck,
      color: "bg-green-500",
      description: "RG, CPF, Comprovante Endereço, E-mail e Qualificação Profissional",
    },
    {
      id: "vendedores" as const,
      title: "Documentos dos Vendedores",
      icon: Users,
      color: "bg-blue-500",
      description: "RG, CPF, Comprovante Endereço, E-mail e Qualificação Profissional",
    },
    {
      id: "certidoes" as const,
      title: "Certidões Fiscais",
      icon: FileCheck,
      color: "bg-purple-500",
      description: "CNDT e CND Federal",
    },
    {
      id: "documentosImovel" as const,
      title: "Documentos do Imóvel",
      icon: Building,
      color: "bg-orange-500",
      description:
        "Matrícula Atualizada, Guia ITBI, Certidão de Ônus e Certidão Negativa de Imóvel",
    },
  ];

  const getStatusBadge = (status: CardStatus) => {
    if (status === "complete") {
    return (
        <Badge className="bg-green-500 hover:bg-green-600 text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-yellow-500 text-yellow-700">
        <AlertCircle className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const getCompletedCount = () => {
    return Object.values(cardStatus).filter((status) => status === "complete").length;
  };

  const allCardsComplete = () => {
    return Object.values(cardStatus).every((status) => status === "complete");
  };

  const handleCardClick = (cardId: ModalType) => {
    setActiveModal(cardId);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const processarMinuta = async () => {
    if (!allCardsComplete()) {
      const pendingCards = Object.entries(cardStatus)
        .filter(([_, status]) => status === "pending")
        .map(([key]) => {
          const card = documentCards.find((c) => c.id === key);
          return card?.title || key;
        });
      
      toast.error(
        `Complete todos os cards antes de gerar a minuta. Pendentes: ${pendingCards.join(", ")}`,
        { duration: 5000 }
      );
      return;
    }

    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }

    setIsProcessing(true);

    try {
      toast.loading("Processando documentos para gerar minuta...", {
        id: "process-minuta",
      });

      // Buscar cartório do usuário
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("cartorio_id")
        .eq("id", user.id)
        .single();

      if (userError || !userData?.cartorio_id) {
        toast.error("Erro ao buscar dados do cartório", { id: "process-minuta" });
        return;
      }

      // Coletar todos os arquivos
      const todosArquivos: File[] = [];
      
      // Arquivos dos compradores
      if (formData.compradores) {
        const { comprador } = formData.compradores;
        if (comprador.rg) todosArquivos.push(comprador.rg);
        if (comprador.cpf) todosArquivos.push(comprador.cpf);
        if (comprador.comprovanteEndereco) todosArquivos.push(comprador.comprovanteEndereco);
        
        if (comprador.casado && comprador.conjuge) {
          if (comprador.conjuge.rg) todosArquivos.push(comprador.conjuge.rg);
          if (comprador.conjuge.cpf) todosArquivos.push(comprador.conjuge.cpf);
          if (comprador.conjuge.certidaoCasamento) todosArquivos.push(comprador.conjuge.certidaoCasamento);
        }
      }

      // Arquivos dos vendedores
      if (formData.vendedores) {
        formData.vendedores.vendedores.forEach((vendedor) => {
          if (vendedor.rg) todosArquivos.push(vendedor.rg);
          if (vendedor.cpf) todosArquivos.push(vendedor.cpf);
          if (vendedor.comprovanteEndereco) todosArquivos.push(vendedor.comprovanteEndereco);
          
          if (vendedor.casado && vendedor.conjuge) {
            if (vendedor.conjuge.rg) todosArquivos.push(vendedor.conjuge.rg);
            if (vendedor.conjuge.cpf) todosArquivos.push(vendedor.conjuge.cpf);
            if (vendedor.conjuge.certidaoCasamento) todosArquivos.push(vendedor.conjuge.certidaoCasamento);
          }
        });
      }

      // Certidões
      if (formData.certidoes) {
        if (formData.certidoes.cndt) todosArquivos.push(formData.certidoes.cndt);
        if (formData.certidoes.cndFederal) todosArquivos.push(formData.certidoes.cndFederal);
        
        // Certidões do cônjuge (se casado)
        if (formData.certidoes.casado && formData.certidoes.conjuge) {
          if (formData.certidoes.conjuge.cndt) todosArquivos.push(formData.certidoes.conjuge.cndt);
          if (formData.certidoes.conjuge.cndFederal) todosArquivos.push(formData.certidoes.conjuge.cndFederal);
        }
      }

      // Documentos do imóvel
      if (formData.documentosImovel) {
        if (formData.documentosImovel.matricula) todosArquivos.push(formData.documentosImovel.matricula);
        if (formData.documentosImovel.guiaITBI) todosArquivos.push(formData.documentosImovel.guiaITBI);
        if (formData.documentosImovel.certidaoOnus) todosArquivos.push(formData.documentosImovel.certidaoOnus);
        if (formData.documentosImovel.certidaoNegativaImovel)
          todosArquivos.push(formData.documentosImovel.certidaoNegativaImovel);
      }

      console.log("Total de arquivos coletados:", todosArquivos.length);

      // Webhook URL - usar padrão interno se não estiver configurado
      const webhookUrl = getWebhookUrl("minuta_documento") || getDefaultWebhookUrl("minuta_documento");
      
      console.log("Webhook URL para minuta:", webhookUrl);

      // Disparar processamento em background para não deixar a UI presa em "Processando..."
      // (o status vai mudar na tabela relatorios_ia via endpoint do N8N).
      const dadosFormularioParaEnvio = formData;
      void processarMinutaDocumento(
        todosArquivos,
        user.id,
        userData.cartorio_id,
        dadosFormularioParaEnvio,
        webhookUrl
      )
        .then((relatorio) => {
          console.log("Minuta processada (callback) com sucesso:", relatorio);
          onProcessComplete(relatorio);
        })
        .catch((error) => {
          console.error("Erro ao processar minuta em background:", error);
          toast.error(
            error instanceof Error ? error.message : "Erro ao processar minuta",
            { id: "process-minuta" }
          );
        });

      toast.success("Documentos enviados para análise!", { id: "process-minuta" });

      // Limpar formulário principal
      setFormData({
        compradores: null,
        vendedores: null,
        certidoes: null,
        documentosImovel: null,
      });

      setCardStatus({
        compradores: "pending",
        vendedores: "pending",
        certidoes: "pending",
        documentosImovel: "pending",
      });

      // Limpar todos os estados temporários dos modais
      setTempCompradorData({
        rg: null,
        cpf: null,
        comprovanteEndereco: null,
        email: "",
        qualificacaoProfissional: "",
        casado: false,
        conjuge: null,
      });
      setTempConjugeData({
        rg: null,
        cpf: null,
        email: "",
        qualificacaoProfissional: "",
        certidaoCasamento: null,
      });
      setTempVendedoresData([
        {
          id: crypto.randomUUID(),
          rg: null,
          cpf: null,
          comprovanteEndereco: null,
          email: "",
          qualificacaoProfissional: "",
          casado: false,
          conjuge: null,
        },
      ]);
      setMultiplosVendedores(false);
      setTempCertidoesData({
        cndt: null,
        cndFederal: null,
        casado: false,
        conjuge: null,
      });
      setTempCertidoesConjugeData({
        cndt: null,
        cndFederal: null,
      });
      setTempDocumentosImovelData({
        matricula: null,
        guiaITBI: null,
        certidaoOnus: null,
        certidaoNegativaImovel: null,
      });

      setShowMainDialog(false);
      setSelectedMinutaType(null);
      
    } catch (error) {
      console.error("Erro ao processar minuta:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Tratamento de erros específicos (mantido do código anterior)
      if (errorMessage.includes("Webhook para") || errorMessage.includes("não configurado")) {
        toast.error(
          <div className="space-y-3 p-2">
            <div className="font-bold text-red-800 text-lg">
              ⚠️ Webhook não configurado
            </div>
            <div className="text-red-700">{errorMessage}</div>
          </div>,
          {
            id: "process-minuta",
            duration: 10000,
            style: {
              border: "2px solid #dc2626",
              backgroundColor: "#fef2f2",
            },
          }
        );
      } else {
        toast.error(
          <div className="space-y-2 p-2">
            <div className="font-bold text-red-800">Erro ao processar documentos</div>
            <div className="text-red-700 text-sm">{errorMessage}</div>
          </div>,
          {
            id: "process-minuta",
            duration: 8000,
          }
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-500">
            <PenTool className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Gerar Minuta de Documento</CardTitle>
          </div>
        </div>
        <CardDescription>
          Cria automaticamente minutas de escritura de compra e venda
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Dialog de Seleção de Minuta */}
        <Dialog open={showMinutaSelectionDialog} onOpenChange={setShowMinutaSelectionDialog}>
          <DialogTrigger asChild>
            <Button className="w-full" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Selecionar
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Selecionar Tipo de Minuta</DialogTitle>
              <DialogDescription>
                Escolha o tipo de minuta de documento que deseja gerar
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {minutaTypes.map((minuta) => {
                  const Icon = minuta.icon;
                  return (
                    <Card
                      key={minuta.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2 hover:border-primary"
                      onClick={() => handleMinutaTypeSelect(minuta.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${minuta.color}`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {minuta.title}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          {minuta.description}
                        </p>
                        <Button
                          variant="ghost"
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMinutaTypeSelect(minuta.id);
                          }}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Enviar Documentos
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Principal de Upload (abre após seleção da minuta) */}
        <Dialog open={showMainDialog} onOpenChange={(open) => {
          setShowMainDialog(open);
          if (!open) {
            setSelectedMinutaType(null);
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerar Minuta de Documento</DialogTitle>
              <DialogDescription>
                Preencha os dados e envie os documentos necessários para cada categoria
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Cards de Categorias */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Card
                      key={card.id}
                      className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border-2 hover:border-primary"
                      onClick={() => handleCardClick(card.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${card.color}`}>
                              <Icon className="h-5 w-5 text-white" />
                        </div>
                      <div>
                              <CardTitle className="text-base">
                                {card.title}
                              </CardTitle>
                      </div>
                                </div>
                          {getStatusBadge(cardStatus[card.id])}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600">
                          {card.description}
                        </p>
                                <Button
                                  variant="ghost"
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(card.id);
                          }}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {cardStatus[card.id] === "complete" ? "Editar" : "Preencher"}
                                </Button>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>

              {/* Indicador de Progresso */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Progresso do Preenchimento</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {getCompletedCount()}/4 categorias completas
                      </p>
                    </div>
                    <Button
                      onClick={processarMinuta}
                      disabled={!allCardsComplete() || isProcessing}
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <PenTool className="mr-2 h-4 w-4" />
                          Gerar Minuta
                        </>
                      )}
                    </Button>
                  </div>
                  {!allCardsComplete() && (
                    <p className="text-xs text-gray-500 mt-3">
                      Complete todas as categorias para habilitar a geração da minuta
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Instruções */}
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <h4 className="font-medium mb-3">
                    📋 Instruções:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Clique em cada card para preencher os dados e enviar documentos</li>
                    <li>• Todos os campos e documentos são obrigatórios</li>
                    <li>• Formatos aceitos: PDF, JPG, PNG (máximo 10MB por arquivo)</li>
                    <li>• Você pode editar os dados clicando novamente no card</li>
                    <li>• O botão "Gerar Minuta" só será habilitado quando tudo estiver completo</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Compradores */}
        <Dialog open={activeModal === "compradores"} onOpenChange={(open) => !open && handleCancelCompradores()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documentos dos Compradores</DialogTitle>
              <DialogDescription>
                Preencha todos os campos obrigatórios e anexe os documentos necessários
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Dados do Comprador */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Dados do Comprador</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comprador-rg-cpf">RG e CPF *</Label>
                    <Input
                      id="comprador-rg-cpf"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => handleFileUploadRgCpfComprador(e.target.files)}
                    />
                    {(tempCompradorData.rg || tempCompradorData.cpf) && (
                      <div className="mt-2">
                        {tempCompradorData.rg && tempCompradorData.cpf && tempCompradorData.rg.name === tempCompradorData.cpf.name ? (
                          // Mesmo arquivo para RG e CPF - mostrar apenas um card
                          <div className="p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm text-green-800 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              Arquivo selecionado: {tempCompradorData.rg.name}
                            </p>
                          </div>
                        ) : (
                          // Arquivos diferentes - mostrar ambos
                          <div className="space-y-2">
                            {tempCompradorData.rg && (
                              <div className="p-2 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm text-green-800 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  RG: {tempCompradorData.rg.name}
                                </p>
                              </div>
                            )}
                            {tempCompradorData.cpf && (
                              <div className="p-2 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm text-green-800 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  CPF: {tempCompradorData.cpf.name}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">Selecione os arquivos de RG e CPF</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comprador-comprovante">Comprovante de Endereço *</Label>
                    <Input
                      id="comprador-comprovante"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUploadComprador(e.target.files?.[0] || null, 'comprovanteEndereco')}
                    />
                    {tempCompradorData.comprovanteEndereco && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Arquivo selecionado: {tempCompradorData.comprovanteEndereco.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comprador-email">E-mail *</Label>
                    <Input
                      id="comprador-email"
                      type="email"
                      value={tempCompradorData.email}
                      onChange={(e) => setTempCompradorData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comprador-qualificacao">Qualificação Profissional *</Label>
                    <Input
                      id="comprador-qualificacao"
                      value={tempCompradorData.qualificacaoProfissional}
                      onChange={(e) => setTempCompradorData(prev => ({ ...prev, qualificacaoProfissional: e.target.value }))}
                      placeholder="Ex: Engenheiro, Comerciante"
                    />
                  </div>
                </div>

                {/* Checkbox Casado */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="comprador-casado"
                    checked={tempCompradorData.casado}
                    onCheckedChange={(checked) => {
                      setTempCompradorData(prev => ({ 
                        ...prev, 
                        casado: checked as boolean,
                        conjuge: checked ? tempConjugeData : null
                      }));
                    }}
                  />
                  <Label htmlFor="comprador-casado" className="cursor-pointer">
                    Casado(a)?
                  </Label>
                </div>
              </div>

              {/* Dados do Cônjuge (condicional) */}
              {tempCompradorData.casado && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Dados do Cônjuge</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="conjuge-rg-cpf">RG e CPF do Cônjuge *</Label>
                      <Input
                        id="conjuge-rg-cpf"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => handleFileUploadRgCpfConjuge(e.target.files)}
                      />
                      {(tempConjugeData.rg || tempConjugeData.cpf) && (
                        <div className="mt-2">
                          {tempConjugeData.rg && tempConjugeData.cpf && tempConjugeData.rg.name === tempConjugeData.cpf.name ? (
                            // Mesmo arquivo para RG e CPF - mostrar apenas um card
                            <div className="p-2 bg-green-50 border border-green-200 rounded">
                              <p className="text-sm text-green-800 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                Arquivo selecionado: {tempConjugeData.rg.name}
                              </p>
                            </div>
                          ) : (
                            // Arquivos diferentes - mostrar ambos
                            <div className="space-y-2">
                              {tempConjugeData.rg && (
                                <div className="p-2 bg-green-50 border border-green-200 rounded">
                                  <p className="text-sm text-green-800 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    RG: {tempConjugeData.rg.name}
                                  </p>
                                </div>
                              )}
                              {tempConjugeData.cpf && (
                                <div className="p-2 bg-green-50 border border-green-200 rounded">
                                  <p className="text-sm text-green-800 flex items-center gap-1">
                                    <CheckCircle2 className="h-4 w-4" />
                                    CPF: {tempConjugeData.cpf.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Selecione os arquivos de RG e CPF</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conjuge-certidao">Certidão de Casamento *</Label>
                      <Input
                        id="conjuge-certidao"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUploadConjuge(e.target.files?.[0] || null, 'certidaoCasamento')}
                      />
                      {tempConjugeData.certidaoCasamento && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Arquivo selecionado: {tempConjugeData.certidaoCasamento.name}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conjuge-qualificacao">Qualificação Profissional do Cônjuge *</Label>
                      <Input
                        id="conjuge-qualificacao"
                        value={tempConjugeData.qualificacaoProfissional}
                        onChange={(e) => {
                          const updatedConjuge = { ...tempConjugeData, qualificacaoProfissional: e.target.value };
                          setTempConjugeData(updatedConjuge);
                          if (tempCompradorData.casado) {
                            setTempCompradorData(prev => ({ ...prev, conjuge: updatedConjuge }));
                          }
                        }}
                        placeholder="Ex: Engenheiro, Comerciante"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conjuge-email">E-mail do Cônjuge *</Label>
                      <Input
                        id="conjuge-email"
                        type="email"
                        value={tempConjugeData.email}
                        onChange={(e) => {
                          const updatedConjuge = { ...tempConjugeData, email: e.target.value };
                          setTempConjugeData(updatedConjuge);
                          if (tempCompradorData.casado) {
                            setTempCompradorData(prev => ({ ...prev, conjuge: updatedConjuge }));
                          }
                        }}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={handleCancelCompradores}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveCompradores}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "vendedores"} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documentos dos Vendedores</DialogTitle>
              <DialogDescription>
                Preencha os dados de todos os vendedores (mesmos campos dos compradores)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Checkbox para múltiplos vendedores */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="multiplos-vendedores"
                  checked={multiplosVendedores}
                  onCheckedChange={(checked) => {
                    setMultiplosVendedores(checked as boolean);
                    // Se desmarcar, remover vendedores adicionais, deixando apenas o primeiro
                    if (!checked) {
                      setTempVendedoresData(prev => [prev[0]]);
                    }
                  }}
                />
                <Label htmlFor="multiplos-vendedores" className="cursor-pointer">
                  Mais de um vendedor
                </Label>
              </div>

              {/* Lista de vendedores */}
              {tempVendedoresData.map((vendedor, index) => (
                <Card key={vendedor.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      {tempVendedoresData.length > 1 ? `Vendedor ${index + 1}` : "Vendedor"}
                    </h3>
                    {tempVendedoresData.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVendedor(vendedor.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>RG e CPF *</Label>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            
                            const fileArray = Array.from(files);
                            
                            // Validar todos os arquivos
                            for (const file of fileArray) {
                              if (!validateFileType(file)) {
                                toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
                                return;
                              }
                              if (file.size > 10 * 1024 * 1024) {
                                toast.error("Arquivo muito grande. Máximo: 10MB");
                                return;
                              }
                            }
                            
                            // Se apenas 1 arquivo foi selecionado, usar o mesmo arquivo para RG e CPF
                            // Se 2 arquivos foram selecionados, primeiro é RG e segundo é CPF
                            const rgFile = fileArray[0] || null;
                            const cpfFile = fileArray[1] || fileArray[0] || null; // Se não houver segundo arquivo, usa o primeiro
                            
                            setTempVendedoresData(prev => prev.map((v, i) =>
                              i === index ? {
                                ...v,
                                rg: rgFile,
                                cpf: cpfFile,
                              } : v
                            ));
                          }}
                        />
                        {(vendedor.rg || vendedor.cpf) && (
                          <div className="mt-2">
                            {vendedor.rg && vendedor.cpf && vendedor.rg.name === vendedor.cpf.name ? (
                              // Mesmo arquivo para RG e CPF - mostrar apenas um card
                              <div className="p-2 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm text-green-800 flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Arquivo selecionado: {vendedor.rg.name}
                                </p>
                              </div>
                            ) : (
                              // Arquivos diferentes - mostrar ambos
                              <div className="space-y-2">
                                {vendedor.rg && (
                                  <div className="p-2 bg-green-50 border border-green-200 rounded">
                                    <p className="text-sm text-green-800 flex items-center gap-1">
                                      <CheckCircle2 className="h-4 w-4" />
                                      RG: {vendedor.rg.name}
                                    </p>
                                  </div>
                                )}
                                {vendedor.cpf && (
                                  <div className="p-2 bg-green-50 border border-green-200 rounded">
                                    <p className="text-sm text-green-800 flex items-center gap-1">
                                      <CheckCircle2 className="h-4 w-4" />
                                      CPF: {vendedor.cpf.name}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500">Selecione os arquivos de RG e CPF</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Comprovante de Endereço *</Label>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && validateFileType(file)) {
                              setTempVendedoresData(prev => prev.map((v, i) =>
                                i === index ? { ...v, comprovanteEndereco: file } : v
                              ));
                            }
                          }}
                        />
                        {vendedor.comprovanteEndereco && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm text-green-800 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              Arquivo selecionado: {vendedor.comprovanteEndereco.name}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>E-mail *</Label>
                        <Input
                          type="email"
                          value={vendedor.email}
                          onChange={(e) => setTempVendedoresData(prev => prev.map((v, i) =>
                            i === index ? { ...v, email: e.target.value } : v
                          ))}
                          placeholder="email@exemplo.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Qualificação Profissional *</Label>
                        <Input
                          value={vendedor.qualificacaoProfissional}
                          onChange={(e) => setTempVendedoresData(prev => prev.map((v, i) =>
                            i === index ? { ...v, qualificacaoProfissional: e.target.value } : v
                          ))}
                          placeholder="Ex: Engenheiro, Comerciante"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={vendedor.casado}
                        onCheckedChange={(checked) => {
                          setTempVendedoresData(prev => prev.map((v, i) =>
                            i === index ? { 
                              ...v, 
                              casado: checked as boolean,
                              conjuge: checked ? {
                                rg: null, cpf: null, email: "", 
                                qualificacaoProfissional: "", certidaoCasamento: null
                              } : null
                            } : v
                          ));
                        }}
                      />
                      <Label className="cursor-pointer">Casado(a)?</Label>
                    </div>

                    {/* Dados do cônjuge (simplificados para economizar espaço) */}
                    {vendedor.casado && vendedor.conjuge && (
                      <div className="border-t pt-4 space-y-3">
                        <p className="text-sm font-medium">Dados do Cônjuge</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">RG e CPF do Cônjuge *</Label>
                            <Input 
                              type="file" 
                              accept=".pdf,.jpg,.jpeg,.png" 
                              multiple
                              className="text-xs h-9" 
                              onChange={(e) => {
                                const files = e.target.files;
                                if (!files || files.length === 0) return;
                                
                                const fileArray = Array.from(files);
                                
                                // Validar todos os arquivos
                                for (const file of fileArray) {
                                  if (!validateFileType(file)) {
                                    toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
                                    return;
                                  }
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast.error("Arquivo muito grande. Máximo: 10MB");
                                    return;
                                  }
                                }
                                
                                // Se apenas 1 arquivo foi selecionado, usar o mesmo arquivo para RG e CPF
                                // Se 2 arquivos foram selecionados, primeiro é RG e segundo é CPF
                                const rgFile = fileArray[0] || null;
                                const cpfFile = fileArray[1] || fileArray[0] || null;
                                
                                setTempVendedoresData(prev => prev.map((v, i) =>
                                  i === index && v.conjuge ? { 
                                    ...v, 
                                    conjuge: { 
                                      ...v.conjuge, 
                                      rg: rgFile, 
                                      cpf: cpfFile 
                                    } 
                                  } : v
                                ));
                              }} 
                            />
                            {(vendedor.conjuge?.rg || vendedor.conjuge?.cpf) && (
                              <div className="mt-1">
                                {vendedor.conjuge.rg && vendedor.conjuge.cpf && vendedor.conjuge.rg.name === vendedor.conjuge.cpf.name ? (
                                  // Mesmo arquivo para RG e CPF - mostrar apenas um card
                                  <div className="p-1.5 bg-green-50 border border-green-200 rounded text-xs">
                                    <p className="text-green-800 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Arquivo selecionado: {vendedor.conjuge.rg.name}
                                    </p>
                                  </div>
                                ) : (
                                  // Arquivos diferentes - mostrar ambos
                                  <div className="space-y-1">
                                    {vendedor.conjuge.rg && (
                                      <div className="p-1.5 bg-green-50 border border-green-200 rounded text-xs">
                                        <p className="text-green-800 flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3" />
                                          RG: {vendedor.conjuge.rg.name}
                                        </p>
                                      </div>
                                    )}
                                    {vendedor.conjuge.cpf && (
                                      <div className="p-1.5 bg-green-50 border border-green-200 rounded text-xs">
                                        <p className="text-green-800 flex items-center gap-1">
                                          <CheckCircle2 className="h-3 w-3" />
                                          CPF: {vendedor.conjuge.cpf.name}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-500">Selecione os arquivos de RG e CPF</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">E-mail Cônjuge *</Label>
                            <Input type="email" className="text-xs h-9" value={vendedor.conjuge.email} onChange={(e) => {
                              setTempVendedoresData(prev => prev.map((v, i) =>
                                i === index && v.conjuge ? { ...v, conjuge: { ...v.conjuge, email: e.target.value } } : v
                              ));
                            }} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Qualificação Cônjuge *</Label>
                            <Input className="text-xs h-9" value={vendedor.conjuge.qualificacaoProfissional} onChange={(e) => {
                              setTempVendedoresData(prev => prev.map((v, i) =>
                                i === index && v.conjuge ? { ...v, conjuge: { ...v.conjuge, qualificacaoProfissional: e.target.value } } : v
                              ));
                            }} />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <Label className="text-xs">Certidão Casamento *</Label>
                            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-xs h-9" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setTempVendedoresData(prev => prev.map((v, i) =>
                                i === index && v.conjuge ? { ...v, conjuge: { ...v.conjuge, certidaoCasamento: file } } : v
                              ));
                            }} />
                            {vendedor.conjuge?.certidaoCasamento && (
                              <div className="mt-1 p-1.5 bg-green-50 border border-green-200 rounded text-xs">
                                <p className="text-green-800 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Arquivo selecionado: {vendedor.conjuge.certidaoCasamento.name}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
              </Card>
              ))}

              {/* Botão adicionar vendedor */}
              {multiplosVendedores && tempVendedoresData.length < 5 && (
                <Button
                  variant="outline"
                  onClick={handleAddVendedor}
                  className="w-full"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Adicionar Outro Vendedor
                </Button>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveVendedores}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "certidoes"} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Certidões Fiscais</DialogTitle>
              <DialogDescription>
                Envie as duas certidões fiscais obrigatórias
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cndt">CNDT - Certidão Negativa de Débitos Trabalhistas *</Label>
                  <Input
                    id="cndt"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUploadCertidao(e.target.files?.[0] || null, 'cndt')}
                  />
                  {tempCertidoesData.cndt && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Arquivo selecionado: {tempCertidoesData.cndt.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnd-federal">CND Federal - Certidão Negativa de Débitos Federais *</Label>
                  <Input
                    id="cnd-federal"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUploadCertidao(e.target.files?.[0] || null, 'cndFederal')}
                  />
                  {tempCertidoesData.cndFederal && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Arquivo selecionado: {tempCertidoesData.cndFederal.name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Checkbox Casado */}
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="certidoes-casado"
                    checked={tempCertidoesData.casado}
                    onCheckedChange={(checked) => {
                      setTempCertidoesData(prev => ({ 
                        ...prev, 
                        casado: checked as boolean,
                        conjuge: checked ? tempCertidoesConjugeData : null
                      }));
                    }}
                  />
                  <Label htmlFor="certidoes-casado" className="cursor-pointer">
                    Casado(a)?
                  </Label>
                </div>
              </div>

              {/* Dados do Cônjuge (condicional) */}
              {tempCertidoesData.casado && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Certidões Fiscais do Cônjuge</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="conjuge-cndt">CNDT do Cônjuge - Certidão Negativa de Débitos Trabalhistas *</Label>
                      <Input
                        id="conjuge-cndt"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file && validateFileType(file) && file.size <= 10 * 1024 * 1024) {
                            setTempCertidoesConjugeData(prev => ({ ...prev, cndt: file }));
                            toast.success("Arquivo adicionado");
                          } else if (file) {
                            if (!validateFileType(file)) {
                              toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
                            } else {
                              toast.error("Arquivo muito grande. Máximo: 10MB");
                            }
                          }
                        }}
                      />
                      {tempCertidoesConjugeData.cndt && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Arquivo selecionado: {tempCertidoesConjugeData.cndt.name}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="conjuge-cnd-federal">CND Federal do Cônjuge - Certidão Negativa de Débitos Federais *</Label>
                      <Input
                        id="conjuge-cnd-federal"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file && validateFileType(file) && file.size <= 10 * 1024 * 1024) {
                            setTempCertidoesConjugeData(prev => ({ ...prev, cndFederal: file }));
                            toast.success("Arquivo adicionado");
                          } else if (file) {
                            if (!validateFileType(file)) {
                              toast.error("Apenas arquivos PDF, JPG e PNG são permitidos");
                            } else {
                              toast.error("Arquivo muito grande. Máximo: 10MB");
                            }
                          }
                        }}
                      />
                      {tempCertidoesConjugeData.cndFederal && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-800 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Arquivo selecionado: {tempCertidoesConjugeData.cndFederal.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveCertidoes}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={activeModal === "documentosImovel"} onOpenChange={(open) => !open && handleCloseModal()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Documentos do Imóvel</DialogTitle>
              <DialogDescription>
                Envie os documentos do imóvel (Matrícula, ITBI, Ônus e Certidão Negativa de Imóvel)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="matricula">Matrícula do Imóvel Atualizada *</Label>
                  <Input
                    id="matricula"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUploadDocumentoImovel(e.target.files?.[0] || null, 'matricula')}
                  />
                  {tempDocumentosImovelData.matricula && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Arquivo selecionado: {tempDocumentosImovelData.matricula.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guia-itbi">Guia ITBI *</Label>
                  <Input
                    id="guia-itbi"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUploadDocumentoImovel(e.target.files?.[0] || null, 'guiaITBI')}
                  />
                  {tempDocumentosImovelData.guiaITBI && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Arquivo selecionado: {tempDocumentosImovelData.guiaITBI.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certidao-onus">Certidão de Ônus *</Label>
                  <Input
                    id="certidao-onus"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUploadDocumentoImovel(e.target.files?.[0] || null, 'certidaoOnus')}
                  />
                  {tempDocumentosImovelData.certidaoOnus && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Arquivo selecionado: {tempDocumentosImovelData.certidaoOnus.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certidao-negativa-imovel">Certidão Negativa de Imóvel</Label>
                  <Input
                    id="certidao-negativa-imovel"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      handleFileUploadDocumentoImovel(
                        e.target.files?.[0] || null,
                        "certidaoNegativaImovel"
                      )
                    }
                  />
                  {tempDocumentosImovelData.certidaoNegativaImovel && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Arquivo selecionado: {tempDocumentosImovelData.certidaoNegativaImovel.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="outline" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveDocumentosImovel}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MinutaDocumentoForm;
