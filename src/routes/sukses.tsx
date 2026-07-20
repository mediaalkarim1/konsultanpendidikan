import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Home } from "lucide-react";

export const Route = createFileRoute("/sukses")({
  component: SuksesPage,
});

function SuksesPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 font-sans">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-[0_10px_40px_-12px_rgba(15,45,82,0.15)] sm:p-10">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent-green/15 text-accent-green">
          <CheckCircle2 className="h-10 w-10" strokeWidth={2.2} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground sm:text-[26px]">
          Konsultasi Berhasil Dikirim
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Terima kasih. Data konsultasi Anda telah kami terima. Tim Konsultan Sekolah Alam
          Al-Karim akan segera menghubungi Anda melalui WhatsApp.
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95"
        >
          <Home className="h-4 w-4" />
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
