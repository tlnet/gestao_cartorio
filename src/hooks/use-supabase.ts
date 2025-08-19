import { useState, useEffect } from 'react';
import { toast } from 'sonner';

// Dados mockados para evitar chamadas de API durante o build
const mockCartorios = [
  {
    id: '1',
    nome: 'Cartório do 1º Ofício de Notas',
    cnpj: '12.345.678/0001-90',
    endereco: 'Rua das Flores, 123 - Centro - São Paulo/SP',
    telefone: '(11) 3333-4444',
    email: 'contato@cartorio1oficio.com.br',
    ativo: true,
    dias_alerta_vencimento: 3,
    notificacao_whatsapp: true,
    webhook_n8n: 'https://webhook.n8n.io/cartorio-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

const mockProtocolos = [
  {
    id: '1',
    protocolo: 'CERT-2024-001',
    demanda: 'Certidão de Nascimento',
    solicitante: 'João Silva',
    cpf_cnpj: '123.456.789-00',
    telefone: '(11) 99999-9999',
    email: 'joao@email.com',
    servicos: ['Certidão de Nascimento'],
    status: 'Em Andamento',
    cartorio_id: '1',
    criado_por: 'user-1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    prazo_execucao: '2024-01-18'
  }
];

const mockUsuarios = [
  {
    id: '1',
    nome: 'João Silva',
    email: 'joao@cartorio.com',
    telefone: '(11) 99999-9999',
    tipo: 'supervisor',
    ativo: true,
    cartorio_id: '1',
    created_at: '2024-01-01T00:00:00Z'
  }
];

const mockRelatorios = [
  {
    id: '1',
    tipo: 'resumo_matricula',
    nome_arquivo: 'matricula_123456.pdf',
    status: 'concluido',
    usuario_id: '1',
    cartorio_id: '1',
    created_at: '2024-01-15T10:00:00Z'
  }
];

export function useCartorios() {
  const [cartorios, setCartorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCartorios = async () => {
    try {
      setLoading(true);
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 500));
      setCartorios(mockCartorios);
    } catch (error: any) {
      toast.error('Erro ao carregar cartórios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createCartorio = async (cartorio: any) => {
    try {
      const newCartorio = { ...cartorio, id: Date.now().toString() };
      setCartorios(prev => [newCartorio, ...prev]);
      toast.success('Cartório criado com sucesso!');
      return newCartorio;
    } catch (error: any) {
      toast.error('Erro ao criar cartório: ' + error.message);
      throw error;
    }
  };

  const updateCartorio = async (id: string, updates: any) => {
    try {
      setCartorios(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      toast.success('Cartório atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar cartório: ' + error.message);
      throw error;
    }
  };

  const deleteCartorio = async (id: string) => {
    try {
      setCartorios(prev => prev.filter(c => c.id !== id));
      toast.success('Cartório removido com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao remover cartório: ' + error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchCartorios();
  }, []);

  return {
    cartorios,
    loading,
    createCartorio,
    updateCartorio,
    deleteCartorio,
    refetch: fetchCartorios
  };
}

export function useProtocolos(cartorioId?: string) {
  const [protocolos, setProtocolos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProtocolos = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setProtocolos(mockProtocolos);
    } catch (error: any) {
      toast.error('Erro ao carregar protocolos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createProtocolo = async (protocolo: any) => {
    try {
      const newProtocolo = { ...protocolo, id: Date.now().toString() };
      setProtocolos(prev => [newProtocolo, ...prev]);
      toast.success('Protocolo criado com sucesso!');
      return newProtocolo;
    } catch (error: any) {
      toast.error('Erro ao criar protocolo: ' + error.message);
      throw error;
    }
  };

  const updateProtocolo = async (id: string, updates: any) => {
    try {
      setProtocolos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast.success('Protocolo atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar protocolo: ' + error.message);
      throw error;
    }
  };

  const deleteProtocolo = async (id: string) => {
    try {
      setProtocolos(prev => prev.filter(p => p.id !== id));
      toast.success('Protocolo removido com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao remover protocolo: ' + error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchProtocolos();
  }, [cartorioId]);

  return {
    protocolos,
    loading,
    createProtocolo,
    updateProtocolo,
    deleteProtocolo,
    refetch: fetchProtocolos
  };
}

export function useUsuarios(cartorioId?: string) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setUsuarios(mockUsuarios);
    } catch (error: any) {
      toast.error('Erro ao carregar usuários: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createUsuario = async (usuario: any) => {
    try {
      const newUsuario = { ...usuario, id: Date.now().toString() };
      setUsuarios(prev => [newUsuario, ...prev]);
      toast.success('Usuário criado com sucesso!');
      return newUsuario;
    } catch (error: any) {
      toast.error('Erro ao criar usuário: ' + error.message);
      throw error;
    }
  };

  const updateUsuario = async (id: string, updates: any) => {
    try {
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      toast.success('Usuário atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar usuário: ' + error.message);
      throw error;
    }
  };

  const deleteUsuario = async (id: string) => {
    try {
      setUsuarios(prev => prev.filter(u => u.id !== id));
      toast.success('Usuário removido com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao remover usuário: ' + error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, [cartorioId]);

  return {
    usuarios,
    loading,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    refetch: fetchUsuarios
  };
}

export function useRelatoriosIA(cartorioId?: string) {
  const [relatorios, setRelatorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRelatorios = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setRelatorios(mockRelatorios);
    } catch (error: any) {
      toast.error('Erro ao carregar relatórios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createRelatorio = async (relatorio: any) => {
    try {
      const newRelatorio = { ...relatorio, id: Date.now().toString() };
      setRelatorios(prev => [newRelatorio, ...prev]);
      toast.success('Relatório criado com sucesso!');
      return newRelatorio;
    } catch (error: any) {
      toast.error('Erro ao criar relatório: ' + error.message);
      throw error;
    }
  };

  const updateRelatorio = async (id: string, updates: any) => {
    try {
      setRelatorios(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      toast.success('Relatório atualizado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar relatório: ' + error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchRelatorios();
  }, [cartorioId]);

  return {
    relatorios,
    loading,
    createRelatorio,
    updateRelatorio,
    refetch: fetchRelatorios
  };
}