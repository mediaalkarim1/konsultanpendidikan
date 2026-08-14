import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Home, MessageSquare, Loader2 } from "lucide-react";
import { getPublicConsultationStatusAction } from "@/actions/process-consultation";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/sukses")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SuksesPage,
});

const LEVEL_LABELS: Record<string, string> = { tksd: "TK & SD", smp: "SMP", sma: "SMA" };

type PublicConsultationInfo = {
  id: string;
  parent_name: string;
  child_name: string;
  level: string;
  whatsapp_number?: string;
  created_at: string;
};

function SuksesPage() {
  const { id: consultId } = Route.useSearch();
  const [loading, setLoading] = useState(!!consultId);
  const [consult, setConsult] = useState<PublicConsultationInfo | null>(null);

  useEffect(() => {
    if (!consultId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getPublicConsultationStatusAction({ data: { consultationId: consultId } });
        if (!cancelled && res.success && res.consultation) {
          setConsult(res.consultation as PublicConsultationInfo);
        }
      } catch (err) {
        console.warn("Failed to load consultation status:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consultId]);

  const handleContactWhatsApp = () => {
    const parentName = consult?.parent_name || "Orang Tua";
    const childName = consult?.child_name || "Ananda";
    const levelLabel = consult ? (LEVEL_LABELS[consult.level] || consult.level) : "EduKonsul";
    const text = `Assalamu'alaikum Tim Konsultan Sekolah Alam Al-Karim,\n\nSaya ${parentName} (Orang tua dari ${childName}). Saya telah menyelesaikan kuesioner EduKonsul jenjang ${levelLabel}.\n\nSaya ingin menanyakan tindak lanjut proses konsultasi ini. Terima kasih.`;
    window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-6">
        
        {/* MAIN CONFIRMATION CARD */}
        <div className="rounded-3xl border border-emerald-200/80 bg-card p-6 sm:p-10 text-center shadow-lg shadow-emerald-500/5 space-y-6">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-inner">
            <CheckCircle2 className="h-12 w-12" strokeWidth={2.2} />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl tracking-tight flex items-center justify-center gap-2">
              Konsultasi Berhasil Dikirim
            </h1>
            <p className="text-base sm:text-lg text-emerald-700 dark:text-emerald-400 font-semibold max-w-lg mx-auto leading-relaxed">
              Terima kasih, data konsultasi Anda sudah kami terima. Tim konsultan akan meninjau data yang Anda berikan dan segera menghubungi Anda untuk langkah selanjutnya.
            </p>
          </div>

          {/* LOADING STATE */}
          {loading && (
            <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <span>Memuat rincian konfirmasi...</span>
            </div>
          )}

          {/* METADATA IDENTITAS SINGKAT */}
          {!loading && consult && (
            <div className="rounded-2xl bg-muted/50 border border-border p-5 text-left space-y-3 max-w-lg mx-auto">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-2 flex items-center justify-between">
                <span>Rincian Konfirmasi</span>
                <span className="rounded-full bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 font-bold">
                  {LEVEL_LABELS[consult.level] || consult.level}
                </span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Nama Orang Tua</span>
                  <span className="font-bold text-foreground">{consult.parent_name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Nama Anak</span>
                  <span className="font-bold text-foreground">{consult.child_name || "Ananda"}</span>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleContactWhatsApp}
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 px-6 text-sm font-bold text-white shadow-md transition"
            >
              <MessageSquare className="h-4 w-4" />
              Hubungi Konsultan via WhatsApp
            </button>

            <Link
              to="/"
              className="w-full sm:w-auto inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-muted transition"
            >
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
