import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoaded: boolean;
  userEmail: string | null;
  loginFallback: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [localAuth, setLocalAuth] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("edu_admin_session") === "true";
    }
    return false;
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initial check for localStorage
    if (typeof window !== "undefined") {
      if (localStorage.getItem("edu_admin_session") === "true") {
        setLocalAuth(true);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && typeof window !== "undefined") {
        localStorage.setItem("edu_admin_session", "true");
        setLocalAuth(true);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setLocalAuth(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("edu_admin_session", "true");
        }
      }
      setIsLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loginFallback = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("edu_admin_session", "true");
    }
    setLocalAuth(true);
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("edu_admin_session");
    }
    setLocalAuth(false);
    setSession(null);
    try {
      await supabase.auth.signOut();
    } catch (_) {}
  };

  const isAuthenticated = !!session || localAuth;
  const userEmail = session?.user?.email || (localAuth ? "admin@mediaalkarim.com" : null);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isLoaded,
      userEmail,
      loginFallback,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
