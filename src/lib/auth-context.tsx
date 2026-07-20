import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

type AuthContextType = {
  isAuthenticated: boolean;
  userEmail: string | null;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [localAuth, setLocalAuth] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check fallback local storage
    if (typeof window !== "undefined") {
      setLocalAuth(localStorage.getItem("edu_admin_session") === "true");
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    localStorage.removeItem("edu_admin_session");
    setLocalAuth(false);
    await supabase.auth.signOut();
  };

  if (!isLoaded) {
    return null;
  }

  const isAuthenticated = !!session || localAuth;
  const userEmail = session?.user?.email || (localAuth ? "admin@mediaalkarim.com" : null);

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      userEmail,
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
