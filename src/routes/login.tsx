import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "mediaalkarim" && login(password)) {
      toast.success("Login berhasil");
      navigate({ to: "/admin" });
    } else {
      toast.error("Username atau password salah");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[0_10px_40px_-12px_rgba(15,45,82,0.15)] sm:p-10">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand text-brand-foreground font-bold shadow-sm">
            E
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Login Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan kredensial untuk mengakses dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              required
            />
          </div>
          <button
            type="submit"
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95"
          >
            <LogIn className="h-4 w-4" />
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
