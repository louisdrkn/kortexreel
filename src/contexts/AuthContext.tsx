import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  /** True uniquement pendant l’hydratation initiale (boot) */
  isLoading: boolean;
  /** Force une relecture silencieuse de la session (anti state-drift) */
  ensureSession: () => Promise<Session | null>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Important: évite que l’app considère "pas connecté" avant le 1er getSession()
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    setIsLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Synchronous-only updates here
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      // Ne jamais terminer le loading sur le tout premier event tant que getSession() n’a pas répondu
      if (bootstrappedRef.current) {
        setIsLoading(false);
      }
    });

    // Bootstrap: lecture explicite de la session persistée
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      bootstrappedRef.current = true;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ensureSession = useCallback(async (): Promise<Session | null> => {
    if (session) return session;

    const { data: { session: freshSession } } = await supabase.auth.getSession();
    setSession(freshSession);
    setUser(freshSession?.user ?? null);
    return freshSession ?? null;
  }, [session]);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        ensureSession,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

