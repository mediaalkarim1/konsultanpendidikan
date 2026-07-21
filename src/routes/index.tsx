import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, LogIn, School, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

const LEVELS = [
  {
    id: "tksd",
    Icon: School,
    name: "TK & SD",
    tag: "Usia Dini",
    description: "Selamat datang di jenjang TK & SD! Konsultasikan kebutuhan tumbuh kembang anak usia dini untuk rekomendasi pendidikan terbaik.",
  },
  {
    id: "smp",
    Icon: BookOpen,
    name: "SMP",
    tag: "Menengah Pertama",
    description: "Selamat datang di jenjang SMP! Petakan potensi, karakter, dan minat belajar remaja untuk sekolah menengah yang sesuai.",
  },
  {
    id: "sma",
    Icon: GraduationCap,
    name: "SMA",
    tag: "Menengah Atas",
    description: "Selamat datang di jenjang SMA! Temukan pemetaan jurusan, kesiapan perkuliahan, dan arah karier masa depan anak secara optimal.",
  },
] as const;

function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-foreground font-bold shadow-sm">
              E
            </div>
            <span className="text-base font-semibold tracking-tight sm:text-lg">
              EduKonsul
            </span>
          </Link>
          <Link
            to="/login"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-brand hover:text-brand active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4" />
            <span>Login Admin</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-brand-soft via-brand-soft/40 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
        />

        <section className="mx-auto max-w-3xl px-4 pt-12 pb-6 text-center sm:px-6 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/70 px-3 py-1 text-xs font-medium text-brand shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent-green" />
            Konsultasi Pendidikan Anak
          </span>
          <h1 className="mt-5 text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[40px]">
            Konsultasi & Rekomendasi Pendidikan Untuk Anak
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
            Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak.
            Pilih jenjang di bawah ini untuk memulai konsultasi.
          </p>
        </section>

        {/* Level cards */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            {LEVELS.map(({ id, Icon, name, tag, description }) => (
              <Link
                key={id}
                to="/formulir/$jenjang"
                params={{ jenjang: id }}
                className="group flex flex-col rounded-2xl border border-border/70 bg-card p-5 text-left shadow-[0_4px_16px_-4px_rgba(15,45,82,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_12px_28px_-8px_rgba(15,45,82,0.2)] sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-accent-gold/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-gold-foreground">
                    {tag}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">{name}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                <span className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-sm transition group-hover:shadow-md">
                  Mulai Konsultasi
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EduKonsul — Sekolah Alam Al-Karim.
          </p>
        </div>
      </footer>
    </div>
  );
}
