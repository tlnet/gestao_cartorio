"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  User,
  Session,
  AuthError,
  AuthChangeEvent,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { debugLoading } from "@/lib/debug-loading";
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
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  // Ref para verificar se já temos perfil carregado para um determinado userId,
  // evitando limpar o perfil existente em re-fetches disparados por SIGNED_IN ao voltar de outra aba.
  const loadedUserIdRef = useRef<string | null>(null);

  const fetchUserProfile = React.useCallback(async (userId: string, forceOverwrite = false) => {
    const hasExistingProfile = loadedUserIdRef.current === userId;
    try {
      debugLoading("auth", "fetchUserProfile:start", { userId, forceOverwrite, hasExistingProfile });
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.warn("Erro ao buscar perfil do usuário:", profileError);
        debugLoading("auth", "fetchUserProfile:error", {
          userId,
          code: (profileError as any)?.code,
          message: (profileError as any)?.message,
          keptExistingProfile: hasExistingProfile && !forceOverwrite,
        });
        // Se já temos perfil carregado para este usuário, mantém os dados existentes
        // para não causar cartorioId = undefined em páginas já abertas.
        if (!hasExistingProfile || forceOverwrite) {
          setUserType("atendente");
          setUserRoles(["atendente"]);
          setPermissions(getPermissoes("atendente"));
          setUserProfile(null);
        }
        return;
      }

      if (profile) {
        const roles = normalizarRoles(profile.role, profile.roles);
        loadedUserIdRef.current = userId;
        setUserProfile({ ...profile, tipo: getTipoPrincipal(roles), roles } as Usuario);
        setUserType(getTipoPrincipal(roles));
        setUserRoles(roles);
        setPermissions(getPermissoesForRoles(roles));
        debugLoading("auth", "fetchUserProfile:success", {
          userId,
          cartorio_id: (profile as any)?.cartorio_id ?? null,
          roles,
        });
      }
    } catch (err) {
      console.error("Erro ao processar perfil:", err);
      debugLoading("auth", "fetchUserProfile:exception", {
        userId,
        keptExistingProfile: hasExistingProfile && !forceOverwrite,
        error: err instanceof Error ? err.message : String(err),
      });
      if (!hasExistingProfile || forceOverwrite) {
        setUserType("atendente");
        setUserRoles(["atendente"]);
        setPermissions(getPermissoes("atendente"));
        setUserProfile(null);
      }
    }
  }, []);

  const refetchUserProfile = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await fetchUserProfile(session.user.id, true);
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

    // Timeout de segurança: garante que authLoading nunca trava para sempre.
    // Reduzido para 5s — o único caminho de init (INITIAL_SESSION) é mais rápido
    // que o padrão anterior de dois caminhos concorrentes (getInitialSession + INITIAL_SESSION).
    const LOADING_TIMEOUT_MS = 5000;
    let loadingCleared = false;
    const clearLoadingOnce = () => {
      if (!loadingCleared) {
        loadingCleared = true;
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(clearLoadingOnce, LOADING_TIMEOUT_MS);
    debugLoading("auth", "authListener:setup", { LOADING_TIMEOUT_MS });

    // Escutar mudanças de autenticação.
    // Não há mais getInitialSession() separado — o evento INITIAL_SESSION do SDK
    // dispara automaticamente após o cliente de auth inicializar (incluindo qualquer
    // refresh de token necessário), eliminando a concorrência de mutex que causava
    // lentidão e loading infinito no F5.
    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          debugLoading("auth", "authStateChange:event", {
            event,
            hasSession: Boolean(session),
            userId: session?.user?.id ?? null,
            loadedUserId: loadedUserIdRef.current,
          });
          setSession(session);
          setUser(session?.user ?? null);

          if (event === "INITIAL_SESSION") {
            // Único caminho de inicialização — sem concorrência com getSession() externo.
            // O SDK já processou (e eventualmente fez refresh) o token antes de disparar este evento.
            try {
              if (session?.user) {
                await fetchUserProfile(session.user.id);
              }
            } catch (err: any) {
              if (err?.name !== "AbortError") {
                console.error("Erro ao carregar perfil no INITIAL_SESSION:", err);
              }
            } finally {
              clearLoadingOnce();
            }
            return;
          }

          if (event === "SIGNED_IN" && session?.user) {
            setError(null);
            // Se já temos perfil carregado para o mesmo usuário (ex: volta de outra aba),
            // evita o re-fetch que pode limpar cartorioId nas páginas abertas.
            if (loadedUserIdRef.current !== session.user.id) {
              debugLoading("auth", "SIGNED_IN:fetchUserProfile", { userId: session.user.id });
              await fetchUserProfile(session.user.id);
            } else {
              debugLoading("auth", "SIGNED_IN:skipFetchUserProfile", { userId: session.user.id });
            }
            setLoading(false);
            return;
          }

          if (event === "SIGNED_OUT") {
            setError(null);
            loadedUserIdRef.current = null;
            setUserProfile(null);
            setUserType(null);
            setPermissions(null);
            setLoading(false);
            debugLoading("auth", "SIGNED_OUT:cleared", {});
            try {
              toast.info("Logout realizado com sucesso!");
              routerRef.current.push("/login");
            } catch (routerError) {
              console.error("Erro ao redirecionar após logout:", routerError);
            }
            return;
          }

          if (event === "USER_UPDATED") {
            try {
              if (session?.user) {
                await fetchUserProfile(session.user.id);
              }
            } catch (sessionError) {
              console.error("Erro ao atualizar sessão:", sessionError);
            }
            setLoading(false);
            return;
          }

          // TOKEN_REFRESHED e outros eventos — apenas sincroniza sessão
          setLoading(false);
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
  }, [fetchUserProfile]);

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
