import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Eye, Trash2, Printer, Download, ChevronLeft, ChevronRight, FileText, Loader2, RefreshCw, Edit3, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import html2pdf from "html2pdf.js";
import { useAuth } from "@/lib/auth-context";
import { updateConsultationStatus, deleteConsultation, reGenerateAnalysisAction, updateAnalysisAction } from "@/actions/admin-actions";

export const Route = createFileRoute("/admin/konsultasi")({
  component: KonsultasiPage,
});

type Consultation = {
  id: string;
  created_at: string;
  parent_name: string;
  whatsapp_number: string;
  level: string;
  status: string;
  error_message?: string;
};

const STATUS_OPTIONS = [
  { value: "Menunggu Analisis", label: "Menunggu Analisis", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "Sedang Dianalisis", label: "Sedang Dianalisis", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "Selesai Dianalisis", label: "Selesai Dianalisis", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "Sudah Dihubungi", label: "Sudah Dihubungi", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { value: "Closed", label: "Closed", color: "bg-zinc-100 text-zinc-800 border-zinc-300" },
  { value: "Gagal Analisis", label: "Gagal Analisis", color: "bg-red-100 text-red-800 border-red-300" },
];

const LEVEL_LABELS: Record<string, string> = { tksd: "TK & SD", smp: "SMP", sma: "SMA" };

function KonsultasiPage() {
  const { userEmail } = useAuth();
  const [data, setData] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 10;

  // Dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel('consultations-changes-konsultasi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [debouncedSearch, statusFilter, levelFilter, page]);

  async function fetchData() {
    setLoading(true);
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase.from("consultations").select("*", { count: "exact" });

    if (debouncedSearch) {
      query = query.or(`parent_name.ilike.%${debouncedSearch}%,whatsapp_number.ilike.%${debouncedSearch}%`);
    }
    if (statusFilter) query = query.eq("status", statusFilter);
    if (levelFilter) query = query.eq("level", levelFilter as "tksd" | "smp" | "sma");

    const { data: cols, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && cols) {
      setData(cols);
      setTotal(count || 0);
    } else {
      toast.error("Gagal mengambil data");
    }
    setLoading(false);
  }

  const totalPages = Math.ceil(total / itemsPerPage);

  async function handleStatusChange(id: string, newStatus: string) {
    setData((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    
    try {
      const res = await updateConsultationStatus({ data: { id, status: newStatus, email: userEmail || "admin" } });
      if (res.success) toast.success("Status berhasil diubah");
    } catch (e: any) {
      toast.error("Gagal mengubah status: " + e.message);
      fetchData();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus konsultasi ini? Semua jawaban & analisis terkait juga akan terhapus.")) return;
    
    try {
      const res = await deleteConsultation({ data: { id, email: userEmail || "admin" } });
      if (res.success) {
        toast.success("Data berhasil dihapus");
        if (data.length === 1 && page > 1) setPage(page - 1);
        else fetchData();
      }
    } catch (e: any) {
      toast.error("Gagal menghapus data: " + e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand">Data Konsultasi</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola semua permintaan konsultasi yang masuk (Real-time).</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama atau WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand sm:w-48"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand sm:w-48"
        >
          <option value="">Semua Jenjang</option>
          <option value="tksd">TK & SD</option>
          <option value="smp">SMP</option>
          <option value="sma">SMA</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Tanggal</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Nama Orang Tua</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">WhatsApp</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Jenjang</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand" />
                    Memuat...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data ditemukan.</td>
                </tr>
              ) : (
                data.map((row) => {
                  const statusInfo = STATUS_OPTIONS.find((s) => s.value === row.status) || STATUS_OPTIONS[0];
                  return (
                    <tr key={row.id} className="transition-colors hover:bg-muted/50">
                      <td className="whitespace-nowrap px-4 py-3">
                        {format(new Date(row.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                      </td>
                      <td className="px-4 py-3 font-medium">{row.parent_name}</td>
                      <td className="px-4 py-3">{row.whatsapp_number}</td>
                      <td className="px-4 py-3">{LEVEL_LABELS[row.level] || row.level}</td>
                      <td className="px-4 py-3">
                        <select
                          value={row.status}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold outline-none border cursor-pointer ${statusInfo.color}`}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedId(row.id); setDetailOpen(true); }}
                            className="rounded p-1.5 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600"
                            title="Detail & Hasil AI"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Hapus"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Menampilkan {data.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} - {Math.min(page * itemsPerPage, total)} dari {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-border p-1 hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border border-border p-1 hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {detailOpen && selectedId && (
        <DetailModal id={selectedId} onClose={() => { setDetailOpen(false); setSelectedId(null); }} onRefreshList={fetchData} />
      )}
    </div>
  );
}

function DetailModal({ id: consultId, onClose, onRefreshList }: { id: string; onClose: () => void; onRefreshList: () => void }) {
  const { userEmail } = useAuth();
  const [data, setData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState(false);
  const [savingAnalysis, setSavingAnalysis] = useState(false);

  // Edit fields
  const [editForm, setEditForm] = useState({
    summary: "",
    analysis: "",
    strengths: "",
    weaknesses: "",
    potential: "",
    risk: "",
    education_recommendation: ""
  });

  useEffect(() => {
    loadDetail();
  }, [consultId]);

  async function loadDetail() {
    setLoading(true);
    try {
      const { data: consultation } = await supabase.from("consultations").select("*").eq("id", consultId).single();
      const { data: answers } = await supabase
        .from("consultation_answers")
        .select("*, questions(question_text)")
        .eq("consultation_id", consultId);
      
      const allOptionIds = answers?.flatMap(a => a.selected_option_ids || []) || [];
      let optionsMap: Record<string, string> = {};
      if (allOptionIds.length > 0) {
        const { data: opts } = await supabase.from("question_options").select("id, option_text").in("id", allOptionIds);
        if (opts) {
          optionsMap = opts.reduce((acc, o) => ({ ...acc, [o.id]: o.option_text }), {});
        }
      }

      // Fetch consultation_analysis
      const { data: analysisData } = await (supabase as any)
        .from("consultation_analysis")
        .select("*")
        .eq("consultation_id", consultId)
        .single();

      // Fetch notification logs
      const { data: notifLogs } = await supabase.from("notification_logs" as any).select("*").eq("consultation_id", consultId).order("created_at", { ascending: false });

      if (consultation && answers) {
        setData({
          ...consultation,
          answers: answers.map(a => ({
            q: a.questions?.question_text,
            a: a.answer_text || (a.selected_option_ids || []).map((oid: string) => optionsMap[oid]).join(", ")
          })),
          logs: notifLogs || []
        });

        if (analysisData) {
          setAnalysis(analysisData);
          setEditForm({
            summary: analysisData.summary || "",
            analysis: analysisData.analysis || "",
            strengths: analysisData.strengths || "",
            weaknesses: analysisData.weaknesses || "",
            potential: analysisData.potential || "",
            risk: analysisData.risk || "",
            education_recommendation: analysisData.education_recommendation || ""
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleReGenerate = async () => {
    if (!confirm("Generate ulang analisis AI? Hasil lama akan diperbarui.")) return;
    setRegenerating(true);
    try {
      const res = await reGenerateAnalysisAction({ data: { consultationId: consultId, email: userEmail || "admin" } });
      if (res.success) {
        toast.success(`Analisis AI berhasil diperbarui via ${res.provider || "AI Provider"}`);
        await loadDetail();
        onRefreshList();
      } else {
        toast.error("Gagal generate ulang: " + (res.error || "Error AI Engine"));
        await loadDetail();
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveAnalysisEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAnalysis(true);
    try {
      const res = await updateAnalysisAction({
        data: {
          consultationId: consultId,
          analysisData: editForm,
          email: userEmail || "admin"
        }
      });
      if (res.success) {
        toast.success("Hasil analisis AI berhasil diedit");
        setEditingAnalysis(false);
        await loadDetail();
      }
    } catch (e: any) {
      toast.error("Gagal menyimpan hasil editan: " + e.message);
    } finally {
      setSavingAnalysis(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  const handleDownloadPDF = () => {
    const element = document.getElementById("pdf-content");
    if (!element) return;
    const opt = {
      margin: 0.5,
      filename: `Konsultasi_${data?.parent_name.replace(/\s+/g, "_")}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
    toast.success("PDF sedang diunduh...");
  };

  const handleCopy = () => {
    if (!data) return;
    const text = `=== LAPORAN EVALUASI & REKOMENDASI EDUKONSUL ===
Nama Orang Tua: ${data.parent_name}
Nomor WhatsApp: ${data.whatsapp_number}
Jenjang: ${LEVEL_LABELS[data.level]}

1. RESUME KONDISI ANAK:
${analysis?.summary || "-"}

2. ANALISIS MENDALAM:
${analysis?.analysis || data.ai_result || "-"}

3. KEKUATAN UTAMA:
${analysis?.strengths || "-"}

4. AREA PENGEMBANGAN (KELEMAHAN):
${analysis?.weaknesses || "-"}

5. POTENSI ANAK:
${analysis?.potential || "-"}

6. RISIKO:
${analysis?.risk || "-"}

7. REKOMENDASI PENDIDIKAN:
${analysis?.education_recommendation || "-"}
`;
    navigator.clipboard.writeText(text);
    toast.success("Seluruh laporan analisis berhasil disalin.");
  };

  const handleSendWaManual = () => {
    if (!data) return;
    const cleanNumber = data.whatsapp_number.replace(/[^0-9]/g, "");
    const formattedNum = cleanNumber.startsWith("0") ? "62" + cleanNumber.slice(1) : cleanNumber;
    const text = `Assalamu'alaikum Ibu/Bapak ${data.parent_name},\n\nHasil analisis tes potensi EduKonsul untuk jenjang ${LEVEL_LABELS[data.level]} telah selesai.\n\nBerikut ringkasan singkatnya:\n${analysis?.summary || "Silakan hubungi kami untuk info lebih lanjut."}\n\nTerima kasih.`;
    window.open(`https://wa.me/${formattedNum}?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl print:max-h-none print:shadow-none print:w-full">
        <div className="mb-6 flex items-start justify-between border-b pb-3 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-brand">Detail & Hasil Analisis Konsultasi</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Lihat, edit, cetak, atau generate ulang analisis AI.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-bold">✕</button>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-brand" /></div>
        ) : !data ? (
          <div className="py-12 text-center text-muted-foreground">Data tidak ditemukan.</div>
        ) : (
          <div id="pdf-content" className="space-y-6 print:space-y-4 bg-card">
            {/* Header PDF Only */}
            <div className="hidden print:block mb-6 border-b pb-4">
              <h1 className="text-2xl font-bold text-emerald-800">EduKonsul — Laporan Evaluasi & Rekomendasi Pendidikan</h1>
              <p className="text-gray-500 text-sm">Tanggal: {format(new Date(data.created_at), "dd MMMM yyyy HH:mm", { locale: id })}</p>
            </div>

            {/* Warning Banner if Failed */}
            {data.status === "Gagal Analisis" && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start gap-3 text-sm print:hidden">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Analisis AI Gagal Diproses</p>
                  <p className="text-xs mt-1">{data.error_message || "Silakan cek API Key atau klik 'Generate Ulang' di bawah."}</p>
                </div>
              </div>
            )}

            {/* Info Peserta */}
            <div className="grid gap-4 rounded-xl border p-4 bg-muted/20 md:grid-cols-3 print:border-gray-300 print:bg-transparent">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nama Orang Tua</p>
                <p className="font-semibold text-sm">{data.parent_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Nomor WhatsApp</p>
                <p className="font-semibold text-sm">{data.whatsapp_number}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Jenjang & Status</p>
                <span className="font-semibold text-sm text-brand">{LEVEL_LABELS[data.level]} — {data.status}</span>
              </div>
            </div>

            {/* Jawaban Formulir */}
            <div className="rounded-xl border p-4 space-y-3 print:border-gray-300">
              <h3 className="text-base font-bold border-b pb-2">Jawaban Formulir Tes</h3>
              <div className="space-y-3 text-sm max-h-48 overflow-y-auto pr-2 print:max-h-none">
                {data.answers.map((ans: any, idx: number) => (
                  <div key={idx} className="border-b border-muted/30 pb-2">
                    <p className="font-medium text-xs text-muted-foreground">{idx + 1}. {ans.q}</p>
                    <p className="mt-0.5 font-semibold text-foreground">{ans.a || "-"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* HASIL ANALISIS AI (7 KOMPONEN) */}
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-5 space-y-4 print:border-gray-300 print:bg-transparent">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand/20 pb-3 print:border-gray-300">
                <h3 className="text-lg font-bold text-brand print:text-black flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Hasil Analisis & Rekomendasi AI
                </h3>
                
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={handleReGenerate}
                    disabled={regenerating}
                    className="flex items-center gap-1.5 rounded-md bg-brand/10 text-brand px-3 py-1.5 text-xs font-medium hover:bg-brand/20 disabled:opacity-50"
                  >
                    {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Generate Ulang
                  </button>

                  <button
                    onClick={() => setEditingAnalysis(!editingAnalysis)}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    {editingAnalysis ? "Batal Edit" : "Edit Hasil AI"}
                  </button>
                </div>
              </div>

              {editingAnalysis ? (
                /* Form Edit Hasil AI */
                <form onSubmit={handleSaveAnalysisEdit} className="space-y-4 print:hidden">
                  <div>
                    <label className="block text-xs font-semibold mb-1">1. Resume Konsultasi</label>
                    <textarea value={editForm.summary} onChange={e => setEditForm({...editForm, summary: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">2. Analisis Kondisi Anak</label>
                    <textarea value={editForm.analysis} onChange={e => setEditForm({...editForm, analysis: e.target.value})} className="w-full rounded border p-2 text-sm" rows={4} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">3. Kekuatan Anak</label>
                    <textarea value={editForm.strengths} onChange={e => setEditForm({...editForm, strengths: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">4. Area yang Perlu Dikembangkan (Kelemahan)</label>
                    <textarea value={editForm.weaknesses} onChange={e => setEditForm({...editForm, weaknesses: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">5. Potensi Anak</label>
                    <textarea value={editForm.potential} onChange={e => setEditForm({...editForm, potential: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">6. Risiko yang Mungkin Terjadi</label>
                    <textarea value={editForm.risk} onChange={e => setEditForm({...editForm, risk: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">7. Rekomendasi Pendidikan & Parenting</label>
                    <textarea value={editForm.education_recommendation} onChange={e => setEditForm({...editForm, education_recommendation: e.target.value})} className="w-full rounded border p-2 text-sm" rows={4} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="submit" disabled={savingAnalysis} className="rounded-md bg-brand text-brand-foreground px-4 py-2 text-sm font-medium flex items-center gap-2">
                      {savingAnalysis ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Editan Analysis"}
                    </button>
                  </div>
                </form>
              ) : (
                /* View Mode 7 Komponen */
                <div className="space-y-4 text-sm">
                  {/* 1. Resume */}
                  <div className="rounded-lg bg-card p-3 border">
                    <h4 className="font-semibold text-xs text-brand uppercase tracking-wider mb-1">1. Resume Konsultasi</h4>
                    <p className="whitespace-pre-wrap">{analysis?.summary || "Belum ada resume."}</p>
                  </div>

                  {/* 2. Analisis */}
                  <div className="rounded-lg bg-card p-3 border">
                    <h4 className="font-semibold text-xs text-brand uppercase tracking-wider mb-1">2. Analisis Kondisi & Gaya Belajar</h4>
                    <p className="whitespace-pre-wrap">{analysis?.analysis || data.ai_result || "Belum ada analisis."}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 3. Kekuatan */}
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 border border-emerald-200">
                      <h4 className="font-semibold text-xs text-emerald-700 uppercase tracking-wider mb-1">3. Kekuatan Utama Anak</h4>
                      <p className="whitespace-pre-wrap text-emerald-900 dark:text-emerald-300">{analysis?.strengths || "-"}</p>
                    </div>

                    {/* 4. Kelemahan / Pengembangan */}
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200">
                      <h4 className="font-semibold text-xs text-amber-700 uppercase tracking-wider mb-1">4. Area yang Perlu Dikembangkan</h4>
                      <p className="whitespace-pre-wrap text-amber-900 dark:text-amber-300">{analysis?.weaknesses || "-"}</p>
                    </div>

                    {/* 5. Potensi */}
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 border border-blue-200">
                      <h4 className="font-semibold text-xs text-blue-700 uppercase tracking-wider mb-1">5. Potensi Bakat Masa Depan</h4>
                      <p className="whitespace-pre-wrap text-blue-900 dark:text-blue-300">{analysis?.potential || "-"}</p>
                    </div>

                    {/* 6. Risiko */}
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 border border-red-200">
                      <h4 className="font-semibold text-xs text-red-700 uppercase tracking-wider mb-1">6. Risiko / Tantangan</h4>
                      <p className="whitespace-pre-wrap text-red-900 dark:text-red-300">{analysis?.risk || "-"}</p>
                    </div>
                  </div>

                  {/* 7. Rekomendasi Pendidikan */}
                  <div className="rounded-lg bg-card p-3 border border-brand/40">
                    <h4 className="font-semibold text-xs text-brand uppercase tracking-wider mb-1">7. Rekomendasi Pendidikan & Parenting</h4>
                    <p className="whitespace-pre-wrap">{analysis?.education_recommendation || "-"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Riwayat Notifikasi WhatsApp */}
            <div className="mt-6 print:hidden" data-html2canvas-ignore="true">
              <h3 className="mb-3 text-sm font-bold border-b pb-1">Riwayat Notifikasi WhatsApp</h3>
              <div className="space-y-2">
                {data.logs?.length > 0 ? data.logs.map((log: any) => (
                  <div key={log.id} className="text-xs border rounded-lg p-2.5 bg-muted/20 flex items-center justify-between">
                    <div>
                      <span className="font-semibold uppercase text-brand mr-2">[{log.type}]</span>
                      <span>To: {log.target_number} ({format(new Date(log.created_at), "dd MMM HH:mm")})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.status}
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground italic">Belum ada riwayat notifikasi.</p>
                )}
              </div>
            </div>
            
            {/* Actions Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden border-t pt-4" data-html2canvas-ignore="true">
              <button onClick={handleSendWaManual} className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-3.5 py-2 text-sm font-medium hover:bg-emerald-100">
                <Send className="h-4 w-4" /> Kirim WA Manual
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted">
                  <FileText className="h-4 w-4" /> Salin Laporan
                </button>
                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted">
                  <Printer className="h-4 w-4" /> Cetak
                </button>
                <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90">
                  <Download className="h-4 w-4" /> Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
