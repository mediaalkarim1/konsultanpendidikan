import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginFallback, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/admin", replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const cleanUsername = username.trim();
    const loginEmail = cleanUsername === "mediaalkarim" ? "admin@mediaalkarim.com" : cleanUsername;
    const isDefaultAdmin = (cleanUsername === "mediaalkarim" || loginEmail === "admin@mediaalkarim.com") && password === "mediaalkarim";

    try {
      // 1. Try signing in with Supabase Auth
      let { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      // 2. If user doesn't exist yet in Supabase Auth, attempt automatic sign up for default admin credentials
      if (error && isDefaultAdmin) {
        const signUpRes = await supabase.auth.signUp({
          email: "admin@mediaalkarim.com",
          password: "mediaalkarim",
        });

        if (!signUpRes.error && signUpRes.data.session) {
          error = null;
        } else {
          const retrySignIn = await supabase.auth.signInWithPassword({
            email: "admin@mediaalkarim.com",
            password: "mediaalkarim",
          });
          if (!retrySignIn.error) error = null;
        }
      }

      if (error) {
        // Fallback for simple admin login if Supabase Auth is unseeded/disabled
        if (isDefaultAdmin) {
          loginFallback();
          toast.success("Berhasil login (Mode Admin)");
          navigate({ to: "/admin", replace: true });
          return;
        }
        toast.error("Gagal login: " + error.message);
      } else {
        loginFallback();
        toast.success("Berhasil login");
        navigate({ to: "/admin", replace: true });
      }
    } catch (err: any) {
      if (isDefaultAdmin) {
        loginFallback();
        toast.success("Berhasil login (Mode Admin)");
        navigate({ to: "/admin", replace: true });
        return;
      }
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl border border-border">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-brand">EduKonsul</h1>
          <p className="text-sm text-muted-foreground mt-2">Masuk ke Dashboard Admin</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Username / Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="Masukkan username atau email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Kata Sandi</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
