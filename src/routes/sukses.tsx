import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle2, 
  Home, 
  Download, 
  MessageSquare, 
  Compass, 
  AlertTriangle, 
  Sparkles, 
  Target, 
  Loader2, 
  FileText,
  Printer
} from "lucide-react";
import { 
  getLatestConsultationAnalysisHelper, 
  parseReportSections, 
  handleDownloadPdfForConsultation,
  type Consultation 
} from "@/lib/pdf-generator";

import { getConsultationDetailAction } from "@/actions/admin-actions";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/sukses")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SuksesPage,
});

const LEVEL_LABELS: Record<string, string> = { tksd: "TK & SD", smp: "SMP", sma: "SMA" };

function SuksesPage() {
  const { id: consultId } = Route.useSearch();
  const [loading, setLoading] = useState(!!consultId);
  const [consult, setConsult] = useState<Consultation | null>(null);
  const [parsedSections, setParsedSections] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!consultId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await getConsultationDetailAction({ data: { consultationId: consultId } });
        if (!cancelled && res.success && res.consultation) {
          setConsult(res.consultation as any);
          setParsedSections(res.parsedSections);
        } else {
          // Fallback helper fetch
          const { consult: cData, parsedSections: pData } = await getLatestConsultationAnalysisHelper(consultId);
          if (!cancelled && cData) {
            setConsult(cData as any);
            setParsedSections(pData);
          }
        }
      } catch (err) {
        console.warn("Failed to load analysis on success page:", err);
        try {
          const { consult: cData, parsedSections: pData } = await getLatestConsultationAnalysisHelper(consultId);
          if (!cancelled && cData) {
            setConsult(cData as any);
            setParsedSections(pData);
          }
        } catch (_) {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consultId]);

  const handleDownloadPDF = () => {
    if (consult && !downloadingPdf) {
      handleDownloadPdfForConsultation(
        consult,
        () => setDownloadingPdf(true),
        () => setDownloadingPdf(false)
      );
    }
  };

  const handleContactWhatsApp = () => {
    if (!consult) return;
    const cleanNumber = (consult.whatsapp_number || "").replace(/[^0-9]/g, "");
    const formattedNum = cleanNumber.startsWith("0") ? "62" + cleanNumber.slice(1) : cleanNumber;
    const text = `Assalamu'alaikum Tim Konsultan Sekolah Alam Al-Karim,\n\nSaya ${consult.parent_name} (Orang tua dari ${consult.child_name || "Ananda"}). Saya telah menyelesaikan kuesioner EduKonsul jenjang ${LEVEL_LABELS[consult.level] || consult.level}.\n\nSaya ingin berkonsultasi mengenai hasil analisis potensi ananda. Terima kasih.`;
    window.open(`https://wa.me/6281234567890?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* TOP CONFIRMATION BANNER */}
        <div className="rounded-3xl border border-emerald-200/80 bg-card p-6 sm:p-8 text-center shadow-lg shadow-emerald-500/5">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-9 w-9" strokeWidth={2.2} />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl tracking-tight">
            Konsultasi Berhasil Dikirim!
          </h1>
          <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-xl mx-auto">
            Terima kasih. Data kuesioner Anda telah berhasil diproses oleh Engine AI EduKonsul. Tim Konsultan Sekolah Alam Al-Karim siap mendampingi tumbuh kembang ananda.
          </p>

          {!consultId && (
            <Link
              to="/"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-8 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95"
            >
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          )}
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand" />
            <p className="mt-3 text-sm text-muted-foreground font-medium">Memuat Laporan Hasil Analisis AI Ananda...</p>
          </div>
        )}

        {/* HASIL ANALISIS AI SECTION */}
        {!loading && consult && parsedSections && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* REPORT HEADER COVER */}
            <div className="rounded-3xl bg-gradient-to-r from-[#075E63] to-[#0B7A75] p-6 sm:p-8 text-white shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Sekolah Alam Al-Karim</p>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">HASIL ANALISIS EDUKONSUL</h2>
                  <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-medium">
                    Laporan Pemetaan Potensi & Rekomendasi Pendampingan Anak
                  </p>
                </div>
                <div className="rounded-2xl bg-white/20 backdrop-blur-md px-4 py-2 border border-white/30 text-xs font-extrabold tracking-wider uppercase text-white shadow-inner">
                  JENJANG {LEVEL_LABELS[consult.level] || consult.level}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm font-medium">
                <div>
                  <p className="text-emerald-200 text-xs uppercase tracking-wider">Nama Orang Tua</p>
                  <p className="font-bold text-white text-base mt-0.5">{consult.parent_name}</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-xs uppercase tracking-wider">Nama Anak</p>
                  <p className="font-bold text-white text-base mt-0.5">{consult.child_name || "Ananda"}</p>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS TOP BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" />
                <span className="text-sm font-bold text-foreground">Laporan Siap Diunduh</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={downloadingPdf}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground shadow hover:opacity-95 disabled:opacity-50 transition"
                >
                  {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF Laporan
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-semibold hover:bg-muted transition"
                >
                  <Printer className="h-4 w-4" />
                  Cetak
                </button>
              </div>
            </div>

            {/* SECTION 1: RINGKASAN AWAL */}
            <div className="rounded-3xl border border-emerald-200 bg-[#E8F5F3]/70 dark:bg-emerald-950/20 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-emerald-200/80 pb-3">
                <Compass className="h-5 w-5 text-[#0B7A75]" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-[#075E63] dark:text-emerald-300">
                  1. Ringkasan Awal Evaluasi
                </h3>
              </div>
              <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
                {parsedSections.summary}
              </p>
            </div>

            {/* SECTION 2: AREA YANG PERLU DIPERHATIKAN */}
            {parsedSections.concerns && parsedSections.concerns.length > 0 && (
              <div className="rounded-3xl border border-amber-200/90 bg-amber-50/40 dark:bg-amber-950/20 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    2. Area yang Perlu Diperhatikan ({parsedSections.concerns.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {parsedSections.concerns.map((c: any, idx: number) => (
                    <div key={idx} className="relative rounded-2xl border border-amber-200/80 bg-card p-4 shadow-xs pl-5 overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center rounded-md bg-amber-600 text-white text-[11px] font-bold px-2 py-0.5">
                          ❗ {String(idx + 1).padStart(2, '0')}
                        </span>
                        <h4 className="font-bold text-sm text-foreground">{c.title}</h4>
                      </div>
                      {c.desc && <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">{c.desc}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: MINAT & POTENSI */}
            {parsedSections.potentials && parsedSections.potentials.length > 0 && (
              <div className="rounded-3xl border border-emerald-200/90 bg-emerald-50/40 dark:bg-emerald-950/20 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-emerald-200 pb-3">
                  <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
                  <h3 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                    3. Minat & Potensi Anak ({parsedSections.potentials.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {parsedSections.potentials.map((p: any, idx: number) => (
                    <div key={idx} className="relative rounded-2xl border border-emerald-200/80 bg-card p-4 shadow-xs pl-5 overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center rounded-md bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5">
                          🌟 {String(idx + 1).padStart(2, '0')}
                        </span>
                        <h4 className="font-bold text-sm text-foreground">{p.title}</h4>
                      </div>
                      {p.desc && <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">{p.desc}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: REKOMENDASI PENDAMPINGAN RUMAH */}
            {parsedSections.recommendations && parsedSections.recommendations.length > 0 && (
              <div className="rounded-3xl border border-blue-200/90 bg-blue-50/40 dark:bg-blue-950/20 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-blue-200 pb-3">
                  <Target className="h-5 w-5 text-blue-600 shrink-0" />
                  <h3 className="font-extrabold text-sm text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                    4. Rekomendasi Pendampingan Rumah ({parsedSections.recommendations.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {parsedSections.recommendations.map((r: any, idx: number) => (
                    <div key={idx} className="relative rounded-2xl border border-blue-200/80 bg-card p-4 shadow-xs pl-5 overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center justify-center rounded-md bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5">
                          🎯 {String(idx + 1).padStart(2, '0')}
                        </span>
                        <h4 className="font-bold text-sm text-foreground">{r.title}</h4>
                      </div>
                      {r.desc && <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">{r.desc}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FOOTER ACTIONS */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-md text-center space-y-4">
              <h4 className="font-bold text-base text-foreground">Ingin Berdiskusi Lebih Lanjut?</h4>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                Tim Konsultan Sekolah Alam Al-Karim siap membantu menjelaskan laporan hasil analisis ananda secara langsung melalui WhatsApp.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleContactWhatsApp}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 px-6 text-sm font-semibold text-white shadow-md transition"
                >
                  <MessageSquare className="h-4 w-4" />
                  Diskusi via WhatsApp Konsultan
                </button>

                <Link
                  to="/"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-muted transition"
                >
                  <Home className="h-4 w-4" />
                  Beranda
                </Link>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
