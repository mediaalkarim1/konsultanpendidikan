import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Home, MessageSquare, Loader2, ShieldCheck } from "lucide-react";
import { getPublicConsultationStatusAction } from "@/actions/process-consultation";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/sukses")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Konsultasi Berhasil Dikirim — EduKonsul" },
      { name: "description", content: "Data konsultasi Anda sudah kami terima. Tim konsultan akan segera menghubungi Anda." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Konsultasi Berhasil Dikirim — EduKonsul" },
      { property: "og:description", content: "Data konsultasi Anda sudah kami terima. Tim konsultan akan segera menghubungi Anda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuksesPage,
});

const LEVEL_LABELS: Record<string, string> = { tksd: "TK & SD", smp: "SMP", sma: "SMA" };

type Confirmation = {
  parent_name: string;
  child_name: string;
  level: string;
  created_at?: string;
};

function SuksesPage() {
  const { id: consultId } = Route.useSearch();
  const [loading, setLoading] = useState(!!consultId);
  const [info, setInfo] = useState<Confirmation | null>(null);

  useEffect(() => {
    if (!consultId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await getPublicConsultationStatusAction({ data: { consultationId: consultId } });
        if (!cancelled && res.success && res.consultation) {
          setInfo(res.consultation as Confirmation);
        }
      } catch (err) {
        console.warn("Gagal memuat konfirmasi konsultasi:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consultId]);

  const handleContactWhatsApp = () => {
    const namaOrtu = info?.parent_name || "Orang Tua";
    const namaAnak = info?.child_name || "Ananda";
    const jenjang = info ? LEVEL_LABELS[info.level] || info.level : "";
    const text = `Assalamu'alaikum Tim Konsultan Sekolah Alam Al-Karim,\n\nSaya ${namaOrtu} (Orang tua dari ${namaAnak}). Saya telah menyelesaikan kuesioner EduKonsul${jenjang ? ` jenjang ${jenjang}` : ""}.\n\nSaya ingin menindaklanjuti proses konsultasi ini. Terima kasih.`;
    window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background font-sans py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-3xl border border-emerald-200/80 bg-card p-6 sm:p-8 text-center shadow-lg shadow-emerald-500/5">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-9 w-9" strokeWidth={2.2} />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Konsultasi Berhasil Dikirim
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Terima kasih, data konsultasi Anda sudah kami terima. Tim konsultan akan meninjau data
            yang Anda berikan dan segera menghubungi Anda untuk langkah selanjutnya.
          </p>

          {loading && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat data konfirmasi...
            </div>
          )}

          {!loading && info && (
            <div className="mt-6 divide-y divide-border rounded-2xl border border-border bg-muted/30 text-left">
              <div className="px-4 py-3 bg-muted/50 font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Data Konsultasi:
              </div>
              <Row label="Nama Orang Tua" value={info.parent_name} />
              <Row label="Nama Anak" value={info.child_name || "Ananda"} />
              <Row label="Jenjang" value={LEVEL_LABELS[info.level] || info.level.toUpperCase()} />
              <Row label="Status" value="✓ Data berhasil diterima" isStatus />
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleContactWhatsApp}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
            >
              <MessageSquare className="h-4 w-4" />
              Hubungi Konsultan via WhatsApp
            </button>

            <Link
              to="/"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground sm:text-sm shadow-xs">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p>
            Data konsultasi dan informasi anak Anda kami jaga kerahasiaannya. Hasil evaluasi hanya dapat diakses oleh tim konsultan untuk peninjauan langsung.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, isStatus }: { label: string; value: string; isStatus?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${isStatus ? "text-emerald-600 dark:text-emerald-400 flex items-center gap-1" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
