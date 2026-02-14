"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  Session,
  AuthError,
  AuthChangeEvent,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  TipoUsuario, 
  PermissoesUsuario, 
  Usuario,
  getPermissoes,
  getPermissoesForRoles,
  getTipoPrincipal,
  normalizarRoles,
} from "@/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  error: AuthError | null;
  userProfile: Usuario | null;
  /** Tipo principal para exibição (quando há múltiplos roles) */
  userType: TipoUsuario | null;
  /** Lista de permissões/roles do usuário (múltiplas permissões) */
  userRoles: TipoUsuario[];
  permissions: PermissoesUsuario | null;
  /** Recarrega perfil (útil após registro/update por email para evitar fallback atendente) */
  refetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [userProfile, setUserProfile] = useState<Usuario | null>(null);
  const [userType, setUserType] = useState<TipoUsuario | null>(null);
  const [userRoles, setUserRoles] = useState<TipoUsuario[]>([]);
  const [permissions, setPermissions] = useState<PermissoesUsuario | null>(null);
  const router = useRouter();

  const fetchUserProfile = React.useCallback(async (userId: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn("Erro ao buscar perfil do usuário:", profileError);
        setUserType("atendente");
        setUserRoles(["atendente"]);
        setPermissions(getPermissoes("atendente"));
        setUserProfile(null);
        return;
      }

      if (profile) {
        const roles = normalizarRoles(profile.role, profile.roles);
        setUserProfile({ ...profile, tipo: getTipoPrincipal(roles), roles } as Usuario);
        setUserType(getTipoPrincipal(roles));
        setUserRoles(roles);
        setPermissions(getPermissoesForRoles(roles));
      }
    } catch (err) {
      console.error("Erro ao processar perfil:", err);
      setUserType("atendente");
      setUserRoles(["atendente"]);
      setPermissions(getPermissoes("atendente"));
      setUserProfile(null);
    }
  }, []);

  const refetchUserProfile = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchUserProfile(session.user.id);
  }, [fetchUserProfile]);

  useEffect(() => {
    // Verificar se estamos no cliente
    if (typeof window === "undefined") {
      return;
    }

    // Verificar se o Supabase está configurado
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder") || supabaseKey.includes("placeholder")) {
      console.warn("⚠️ Supabase não configurado. Configure as variáveis de ambiente.");
      setLoading(false);
      return;
    }

    // Verificar se supabase está disponível
    if (!supabase || !supabase.auth) {
      console.warn("⚠️ Supabase client não está disponível.");
      setLoading(false);
      return;
    }

    // Verificar sessão inicial (com timeout para evitar loading infinito em F5 com cache)
    const LOADING_TIMEOUT_MS = 10000;
    let loadingCleared = false;
    const clearLoadingOnce = () => {
      if (!loadingCleared) {
        loadingCleared = true;
        setLoading(false);
      }
    };

    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error) throw error;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
      } catch (error: any) {
        console.error("Erro ao verificar sessão:", error);
        setError(error);
        if (!error?.message?.includes("placeholder")) {
          try {
            toast.error("Erro ao verificar sessão: " + (error?.message || "Erro desconhecido"));
          } catch (toastError) {
            console.error("Erro ao exibir toast:", toastError);
          }
        }
      } finally {
        clearLoadingOnce();
      }
    };

    const timeoutId = window.setTimeout(() => {
      clearLoadingOnce();
    }, LOADING_TIMEOUT_MS);

    getInitialSession().finally(() => {
      window.clearTimeout(timeoutId);
    });

    // Escutar mudanças de autenticação
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {

          setSession(session);
          setUser(session?.user ?? null);

          if (event === "SIGNED_IN" && session?.user) {
            setError(null);
            await fetchUserProfile(session.user.id);
            setLoading(false);
          }

          if (event === "SIGNED_OUT") {
            setError(null);
            setUserProfile(null);
            setUserType(null);
            setPermissions(null);
            setLoading(false);
            try {
              toast.info("Logout realizado com sucesso!");
              if (router) {
                router.push("/login");
              }
            } catch (routerError) {
              console.error("Erro ao redirecionar após logout:", routerError);
            }
          }

          if (event === "USER_UPDATED") {
            try {
              const { error } = await supabase.auth.getSession();
              if (error) {
                setError(error);
                toast.error("Erro ao atualizar sessão: " + error.message);
              } else if (session?.user) {
                await fetchUserProfile(session.user.id);
              }
            } catch (sessionError) {
              console.error("Erro ao atualizar sessão:", sessionError);
            }
            setLoading(false);
          }

          if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") {
            setLoading(false);
          }
        }
      );

      return () => {
        window.clearTimeout(timeoutId);
        if (subscription) {
          try {
            subscription.unsubscribe();
          } catch (unsubscribeError) {
            console.error("Erro ao fazer unsubscribe:", unsubscribeError);
          }
        }
      };
    } catch (error: any) {
      console.error("Erro ao configurar listener de autenticação:", error);
      setLoading(false);
      return () => {}; // Retornar função vazia se houver erro
    }
  }, [router, fetchUserProfile]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpar dados locais
      setUserProfile(null);
      setUserType(null);
      setUserRoles([]);
      setPermissions(null);
    } catch (error: any) {
      setError(error);
      toast.error("Erro ao fazer logout: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    error,
    userProfile,
    userType,
    userRoles,
    permissions,
    refetchUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
