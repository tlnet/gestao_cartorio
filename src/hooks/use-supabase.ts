import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useCartorios() {
  const [cartorios, setCartorios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCartorios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cartorios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartorios(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar cartórios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createCartorio = async (cartorio: any) => {
    try {
      const { data, error } = await supabase
        .from('cartorios')
        .insert([cartorio])
        .select()
        .single();

      if (error) throw error;
      
      setCartorios(prev => [data, ...prev]);
      toast.success('Cartório criado com sucesso!');
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar cartório: ' + error.message);
      throw error;
    }
  };

  const updateCartorio = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('cartorios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setCartorios(prev => prev.map(c => c.id === id ? data : c));
      toast.success('Cartório atualizado com sucesso!');
      return data;
    } catch (error: any) {
      toast.error('Erro ao atualizar cartório: ' + error.message);
      throw error;
    }
  };

  const deleteCartorio = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cartorios')
        .delete()
        .eq('id', id);

      if (error) throw error;

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
      let query = supabase
        .from('protocolos')
        .select(`
          *,
          cartorio:cartorios(nome),
          criado_por_usuario:usuarios!criado_por(nome)
        `)
        .order('created_at', { ascending: false });

      if (cartorioId) {
        query = query.eq('cartorio_id', cartorioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProtocolos(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar protocolos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createProtocolo = async (protocolo: any) => {
    try {
      const { data, error } = await supabase
        .from('protocolos')
        .insert([protocolo])
        .select(`
          *,
          cartorio:cartorios(nome),
          criado_por_usuario:usuarios!criado_por(nome)
        `)
        .single();

      if (error) throw error;

      setProtocolos(prev => [data, ...prev]);
      toast.success('Protocolo criado com sucesso!');
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar protocolo: ' + error.message);
      throw error;
    }
  };

  const updateProtocolo = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('protocolos')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          cartorio:cartorios(nome),
          criado_por_usuario:usuarios!criado_por(nome)
        `)
        .single();

      if (error) throw error;

      setProtocolos(prev => prev.map(p => p.id === id ? data : p));
      toast.success('Protocolo atualizado com sucesso!');
      return data;
    } catch (error: any) {
      toast.error('Erro ao atualizar protocolo: ' + error.message);
      throw error;
    }
  };

  const deleteProtocolo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('protocolos')
        .delete()
        .eq('id', id);

      if (error) throw error;

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
      let query = supabase
        .from('usuarios')
        .select(`
          *,
          cartorio:cartorios(nome)
        `)
        .order('created_at', { ascending: false });

      if (cartorioId) {
        query = query.eq('cartorio_id', cartorioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar usuários: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createUsuario = async (usuario: any) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([usuario])
        .select(`
          *,
          cartorio:cartorios(nome)
        `)
        .single();

      if (error) throw error;

      setUsuarios(prev => [data, ...prev]);
      toast.success('Usuário criado com sucesso!');
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar usuário: ' + error.message);
      throw error;
    }
  };

  const updateUsuario = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          cartorio:cartorios(nome)
        `)
        .single();

      if (error) throw error;

      setUsuarios(prev => prev.map(u => u.id === id ? data : u));
      toast.success('Usuário atualizado com sucesso!');
      return data;
    } catch (error: any) {
      toast.error('Erro ao atualizar usuário: ' + error.message);
      throw error;
    }
  };

  const deleteUsuario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

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
      let query = supabase
        .from('relatorios_ia')
        .select(`
          *,
          usuario:usuarios(nome),
          cartorio:cartorios(nome)
        `)
        .order('created_at', { ascending: false });

      if (cartorioId) {
        query = query.eq('cartorio_id', cartorioId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRelatorios(data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar relatórios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createRelatorio = async (relatorio: any) => {
    try {
      const { data, error } = await supabase
        .from('relatorios_ia')
        .insert([relatorio])
        .select(`
          *,
          usuario:usuarios(nome),
          cartorio:cartorios(nome)
        `)
        .single();

      if (error) throw error;

      setRelatorios(prev => [data, ...prev]);
      toast.success('Relatório criado com sucesso!');
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar relatório: ' + error.message);
      throw error;
    }
  };

  const updateRelatorio = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('relatorios_ia')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          usuario:usuarios(nome),
          cartorio:cartorios(nome)
        `)
        .single();

      if (error) throw error;

      setRelatorios(prev => prev.map(r => r.id === id ? data : r));
      toast.success('Relatório atualizado com sucesso!');
      return data;
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