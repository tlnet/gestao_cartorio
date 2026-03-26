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

// ── Profile cache ──────────────────────────────────────────────────────────────
// Persiste o perfil do usuário no localStorage para que o estado de auth seja
// restaurado instantaneamente no F5, sem aguardar a query ao banco de dados.
// A sessão Supabase (tokens JWT) já é persistida pelo próprio SDK; aqui
// persistimos apenas os dados extras do perfil (cartorio_id, roles, etc.).

const PROFILE_CACHE_KEY = "cartorio_profile_v1";

interface ProfileCache {
  userId: string;
  profile: Usuario;
  userType: TipoUsuario;
  userRoles: TipoUsuario[];
  permissions: PermissoesUsuario;
}

function readCachedProfile(): ProfileCache | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as ProfileCache;
  } catch {
    return null;
  }
}

function saveCachedProfile(data: ProfileCache): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignora erros de quota ou modo privado
  }
}

function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

// ── Context ────────────────────────────────────────────────────────────────────

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
  // loading começa como true; é reduzido para false após restaurar do cache (no useEffect)
  // ou após o INITIAL_SESSION/SIGNED_IN resolver. Isso garante consistência entre SSR e cliente.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [userProfile, setUserProfile] = useState<Usuario | null>(null);
  const [userType, setUserType] = useState<TipoUsuario | null>(null);
  const [userRoles, setUserRoles] = useState<TipoUsuario[]>([]);
  const [permissions, setPermissions] = useState<PermissoesUsuario | null>(null);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  // loadedUserIdRef persiste via localStorage — sobrevive ao F5.
  // Inicializado com o userId do cache para que SIGNED_IN após INITIAL_SESSION
  // sem sessão não faça re-fetch desnecessário do banco.
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
        const resolvedUserType = getTipoPrincipal(roles);
        const resolvedPermissions = getPermissoesForRoles(roles);
        const resolvedProfile = { ...profile, tipo: resolvedUserType, roles } as Usuario;

        loadedUserIdRef.current = userId;
        setUserProfile(resolvedProfile);
        setUserType(resolvedUserType);
        setUserRoles(roles);
        setPermissions(resolvedPermissions);

        // Persiste no cache para que o próximo F5/reload não precise ir ao banco
        saveCachedProfile({
          userId,
          profile: resolvedProfile,
          userType: resolvedUserType,
          userRoles: roles,
          permissions: resolvedPermissions,
        });

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
    if (typeof window === "undefined") {
      return;
    }

    // ── Passo 1: restaurar do cache imediatamente (síncrono) ──────────────────
    // Isso acontece no primeiro efeito, antes de qualquer evento de auth.
    // O usuário logado não vê skeleton — o conteúdo aparece instantaneamente.
    const cachedProfile = readCachedProfile();
    if (cachedProfile) {
      loadedUserIdRef.current = cachedProfile.userId;
      setUserProfile(cachedProfile.profile);
      setUserType(cachedProfile.userType);
      setUserRoles(cachedProfile.userRoles);
      setPermissions(cachedProfile.permissions);
      setLoading(false);
      debugLoading("auth", "cacheRestored", {
        userId: cachedProfile.userId,
        cartorio_id: (cachedProfile.profile as any)?.cartorio_id ?? null,
      });
    }

    // ── Passo 2: verificar configuração do Supabase ───────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder") || supabaseKey.includes("placeholder")) {
      console.warn("⚠️ Supabase não configurado. Configure as variáveis de ambiente.");
      setLoading(false);
      return;
    }

    if (!supabase || !supabase.auth) {
      console.warn("⚠️ Supabase client não está disponível.");
      setLoading(false);
      return;
    }

    // ── Passo 3: timeout de segurança ─────────────────────────────────────────
    // Cobre o caso em que o usuário NÃO está logado (INITIAL_SESSION sem sessão
    // e SIGNED_IN nunca dispara). Com cache, o loading já foi resolvido no passo 1;
    // sem cache, este é o mecanismo de fallback (5s).
    const LOADING_TIMEOUT_MS = 5000;
    let loadingCleared = false;
    const clearLoadingOnce = () => {
      if (!loadingCleared) {
        loadingCleared = true;
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(clearLoadingOnce, LOADING_TIMEOUT_MS);
    debugLoading("auth", "authListener:setup", {
      LOADING_TIMEOUT_MS,
      hasCachedProfile: Boolean(cachedProfile),
    });

    // ── Passo 4: listener de mudanças de auth ─────────────────────────────────
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
            if (session?.user) {
              // Sessão válida: verifica se temos cache para o mesmo usuário.
              // Se sim, não precisa ir ao banco — perfil já está em memória.
              if (loadedUserIdRef.current === session.user.id) {
                debugLoading("auth", "INITIAL_SESSION:cacheHit:skipFetch", {
                  userId: session.user.id,
                });
                clearLoadingOnce();
              } else {
                // Usuário diferente ou primeiro acesso — busca no banco
                debugLoading("auth", "INITIAL_SESSION:fetchProfile", {
                  userId: session.user.id,
                });
                try {
                  await fetchUserProfile(session.user.id);
                } catch (err: any) {
                  if (err?.name !== "AbortError") {
                    console.error("Erro ao carregar perfil no INITIAL_SESSION:", err);
                  }
                }
                clearLoadingOnce();
              }
            } else {
              // session = null: o SDK ainda está fazendo refresh do token armazenado.
              // NÃO chamamos clearLoadingOnce() aqui — aguardamos o SIGNED_IN que dispara
              // logo após o refresh terminar.
              // O timeout de 5s é o fallback para o caso "realmente não logado".
              debugLoading("auth", "INITIAL_SESSION:noSession:waitForSignedIn", {});
            }
            return;
          }

          if (event === "SIGNED_IN" && session?.user) {
            setError(null);
            // Se já temos perfil para o mesmo usuário (ex: SIGNED_IN após INITIAL_SESSION
            // sem sessão, ou volta de outra aba), evita re-fetch desnecessário.
            if (loadedUserIdRef.current !== session.user.id) {
              debugLoading("auth", "SIGNED_IN:fetchUserProfile", { userId: session.user.id });
              await fetchUserProfile(session.user.id);
            } else {
              debugLoading("auth", "SIGNED_IN:skipFetchUserProfile", { userId: session.user.id });
            }
            clearLoadingOnce();
            return;
          }

          if (event === "SIGNED_OUT") {
            setError(null);
            loadedUserIdRef.current = null;
            clearCachedProfile();
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
      return () => {};
    }
  }, [fetchUserProfile]);

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Limpar dados locais e cache persistido
      clearCachedProfile();
      loadedUserIdRef.current = null;
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
