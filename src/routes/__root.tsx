import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster, toast } from "sonner";
import { 
  Home as HomeIcon, 
  Layers, 
  GraduationCap, 
  History, 
  User, 
  Loader2, 
  FileText 
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth-context";

const LEVEL_LABELS: Record<string, string> = { tksd: "TK & SD", smp: "SMP", sma: "SMA" };

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Konsultasi & Rekomendasi Pendidikan Untuk Anak — Sekolah Alam Al-Karim" },
      { name: "description", content: "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak — TK & SD, SMP, dan SMA." },
      { property: "og:title", content: "Konsultasi & Rekomendasi Pendidikan Untuk Anak — Sekolah Alam Al-Karim" },
      { property: "og:description", content: "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak — TK & SD, SMP, dan SMA." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://konsultanpendidikan.mediaalkarim1.workers.dev/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "EduKonsul Sekolah Alam Al-Karim" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Konsultasi & Rekomendasi Pendidikan Untuk Anak" },
      { name: "twitter:description", content: "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak." },
      { name: "twitter:image", content: "https://konsultanpendidikan.mediaalkarim1.workers.dev/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const currentPath = location.pathname;

  // History Modal States
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchPhone, setSearchPhone] = useState("");
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [searchingHistory, setSearchingHistory] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Listen to custom window event to open history modal from anywhere
  useEffect(() => {
    const handleOpenHistory = () => setHistoryOpen(true);
    window.addEventListener("open-history-modal", handleOpenHistory);
    return () => window.removeEventListener("open-history-modal", handleOpenHistory);
  }, []);

  const handleSearchHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;
    setSearchingHistory(true);
    setHistoryList([]);
    try {
      const cleanPhone = searchPhone.replace(/[^0-9]/g, "");
      const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .or(`whatsapp_number.eq.${cleanPhone},whatsapp_number.eq.0${cleanPhone.slice(2)},whatsapp_number.eq.62${cleanPhone.slice(2)}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setHistoryList(data || []);
      if (!data || data.length === 0) {
        toast.info("Tidak ada riwayat konsultasi dengan nomor ini.");
      }
    } catch (e: any) {
      toast.error("Gagal memuat riwayat: " + e.message);
    } finally {
      setSearchingHistory(false);
    }
  };

  // Safe navigation scroll
  const handleJenjangClick = () => {
    if (window.location.pathname === "/") {
      const el = document.getElementById("jenjang");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = "/#jenjang";
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Adds padding-bottom only on mobile devices to prevent footer navigation overlap */}
        <div className="pb-[76px] sm:pb-0 min-h-screen flex flex-col justify-between">
          <div className="flex-1">
            <Outlet />
          </div>
        </div>

        <Toaster position="top-center" richColors closeButton />

        {/* --- GLOBAL BOTTOM NAVIGATION MOBILE (ALL PAGES) --- */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200/80 shadow-lg px-4 py-2 flex items-center justify-between sm:hidden" data-html2canvas-ignore="true">
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${currentPath === "/" ? "text-emerald-700" : "text-slate-500"}`}
          >
            <HomeIcon className="h-5 w-5" />
            <span>Beranda</span>
          </Link>

          <button
            onClick={handleJenjangClick}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${currentPath === "/" && (typeof window !== "undefined" && window.location.hash === "#jenjang") ? "text-emerald-700" : "text-slate-500"}`}
          >
            <Layers className="h-5 w-5" />
            <span>Jenjang</span>
          </button>

          <Link
            to="/formulir/$jenjang"
            params={{ jenjang: "tksd" }}
            className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-slate-500"
          >
            <div className="p-2.5 rounded-full bg-emerald-600 text-white -mt-5 shadow-md">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="mt-0.5">Konsultasi</span>
          </Link>

          <button
            onClick={() => setHistoryOpen(true)}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${historyOpen ? "text-emerald-700" : "text-slate-500"}`}
          >
            <History className="h-5 w-5" />
            <span>Riwayat</span>
          </button>

          <Link
            to="/login"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-bold ${currentPath.startsWith("/admin") || currentPath === "/login" ? "text-emerald-700" : "text-slate-500"}`}
          >
            <User className="h-5 w-5" />
            <span>Admin</span>
          </Link>
        </div>

        {/* --- GLOBAL HISTORY CHECK MODAL --- */}
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-600 animate-pulse" /> Cek Riwayat Konsultasi
                </h3>
                <button
                  onClick={() => { setHistoryOpen(false); setHistoryList([]); setSearchPhone(""); }}
                  className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSearchHistory} className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Masukkan No WhatsApp Orang Tua (misal: 081234567890)"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={searchingHistory}
                  className="rounded-xl bg-emerald-700 text-white px-5 text-xs font-bold hover:bg-emerald-800 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {searchingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
                </button>
              </form>

              <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
                {searchingHistory ? (
                  <div className="py-10 text-center text-sm text-slate-500">Mencari riwayat konsultasi...</div>
                ) : historyList.length > 0 ? (
                  historyList.map((row) => (
                    <div key={row.id} className="rounded-xl border border-slate-100 p-4 bg-slate-50/50 space-y-2 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="inline-block rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                          Jenjang {(LEVEL_LABELS[row.level] || row.level).toUpperCase()}
                        </span>
                        <p className="text-sm font-bold text-slate-800">Anak: {row.child_name || "-"}</p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(row.created_at), "dd MMMM yyyy, HH:mm", { locale: id })}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                          Data Terkirim
                        </span>
                      </div>
                    </div>
                  ))
                ) : searchPhone && !searchingHistory ? (
                  <div className="py-10 text-center text-xs text-slate-400">Tidak ada riwayat untuk nomor ini. Pastikan format nomor telepon sesuai kuesioner.</div>
                ) : (
                  <div className="py-10 text-center text-xs text-slate-400">Silakan masukkan nomor WhatsApp untuk melihat riwayat konsultasi.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
