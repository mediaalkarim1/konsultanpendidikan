import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Eye, 
  Trash2, 
  Printer, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Loader2, 
  RefreshCw, 
  Edit3, 
  Send, 
  AlertTriangle, 
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  Users,
  Clock,
  CheckSquare,
  MessageSquare
} from "lucide-react";
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
  child_name?: string | null;
  whatsapp_number: string;
  level: string;
  status: string;
  error_message?: string;
  ai_result?: string | null;
};

const STATUS_OPTIONS = [
  { value: "Menunggu Analisis AI", label: "Menunggu Analisis AI", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "Menunggu Analisis", label: "Menunggu Analisis", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "Sedang Dianalisis", label: "Sedang Dianalisis", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "Analisis AI Selesai", label: "Analisis AI Selesai", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "Selesai Dianalisis", label: "Selesai Dianalisis", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "Menunggu Follow Up Konsultan", label: "Menunggu Follow Up", color: "bg-teal-100 text-teal-800 border-teal-300" },
  { value: "Sudah Dihubungi", label: "Sudah Dihubungi", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  { value: "Konsultasi Selesai", label: "Konsultasi Selesai", color: "bg-zinc-100 text-zinc-800 border-zinc-300" },
  { value: "Closed", label: "Closed", color: "bg-zinc-100 text-zinc-800 border-zinc-300" },
  { value: "Gagal Analisis AI", label: "Gagal Analisis AI", color: "bg-red-100 text-red-800 border-red-300" },
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
  const [dateFilter, setDateFilter] = useState("");

  // Statistics Summary
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    pendingAi: 0,
    pendingFollowUp: 0,
    completed: 0
  });

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
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData();
    fetchStats();
    
    const channel = supabase.channel('consultations-changes-konsultasi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultations' }, () => {
        fetchData();
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [debouncedSearch, statusFilter, levelFilter, dateFilter, page]);

  async function fetchStats() {
    try {
      const { data: allCons } = await supabase.from("consultations").select("id, created_at, status");
      if (!allCons) return;

      const todayStr = new Date().toISOString().split("T")[0];
      let todayCount = 0;
      let pendingAiCount = 0;
      let pendingFollowUpCount = 0;
      let completedCount = 0;

      allCons.forEach((item) => {
        const itemDate = new Date(item.created_at).toISOString().split("T")[0];
        if (itemDate === todayStr) todayCount++;

        const s = item.status || "";
        if (s.includes("Menunggu Analisis") || s.includes("Sedang Dianalisis")) {
          pendingAiCount++;
        } else if (s.includes("Analisis AI Selesai") || s.includes("Selesai Dianalisis") || s.includes("Follow Up")) {
          pendingFollowUpCount++;
        } else if (s.includes("Sudah Dihubungi") || s.includes("Selesai") || s.includes("Closed")) {
          completedCount++;
        }
      });

      setStats({
        total: allCons.length,
        today: todayCount,
        pendingAi: pendingAiCount,
        pendingFollowUp: pendingFollowUpCount,
        completed: completedCount
      });
    } catch (e) {
      console.warn("Stats fetch error:", e);
    }
  }

  async function fetchData() {
    setLoading(true);
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase.from("consultations").select("*", { count: "exact" });

    if (debouncedSearch) {
      query = query.or(`parent_name.ilike.%${debouncedSearch}%,child_name.ilike.%${debouncedSearch}%,whatsapp_number.ilike.%${debouncedSearch}%`);
    }
    if (statusFilter) query = query.eq("status", statusFilter);
    if (levelFilter) query = query.eq("level", levelFilter as "tksd" | "smp" | "sma");
    if (dateFilter) {
      const startDate = `${dateFilter}T00:00:00.000Z`;
      const endDate = `${dateFilter}T23:59:59.999Z`;
      query = query.gte("created_at", startDate).lte("created_at", endDate);
    }

    const { data: cols, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error && cols) {
      setData(cols);
      setTotal(count || 0);
    } else {
      toast.error("Gagal mengambil data konsultasi");
    }
    setLoading(false);
  }

  const totalPages = Math.ceil(total / itemsPerPage);

  async function handleStatusChange(id: string, newStatus: string) {
    setData((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    
    try {
      const res = await updateConsultationStatus({ data: { id, status: newStatus, email: userEmail || "admin" } });
      if (res.success) {
        toast.success("Status berhasil diperbarui");
        fetchStats();
      }
    } catch (e: any) {
      toast.error("Gagal mengubah status: " + e.message);
      fetchData();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Apakah Anda yakin ingin menghapus data konsultasi ini? Seluruh jawaban & analisis terkait akan dihapus.")) return;
    
    try {
      const res = await deleteConsultation({ data: { id, email: userEmail || "admin" } });
      if (res.success) {
        toast.success("Data berhasil dihapus");
        if (data.length === 1 && page > 1) setPage(page - 1);
        else fetchData();
        fetchStats();
      }
    } catch (e: any) {
      toast.error("Gagal menghapus data: " + e.message);
    }
  }

  async function handleExportExcel() {
    try {
      let query = supabase.from("consultations").select("*");

      if (debouncedSearch) {
        query = query.or(`parent_name.ilike.%${debouncedSearch}%,child_name.ilike.%${debouncedSearch}%,whatsapp_number.ilike.%${debouncedSearch}%`);
      }
      if (statusFilter) query = query.eq("status", statusFilter);
      if (levelFilter) query = query.eq("level", levelFilter as "tksd" | "smp" | "sma");
      if (dateFilter) {
        const startDate = `${dateFilter}T00:00:00.000Z`;
        const endDate = `${dateFilter}T23:59:59.999Z`;
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      }

      const { data: exportData, error } = await query.order("created_at", { ascending: false });

      if (error || !exportData || exportData.length === 0) {
        toast.error("Tidak ada data untuk diekspor");
        return;
      }

      const headers = ["No", "Tanggal", "Nama Orang Tua", "Nomor WhatsApp", "Nama Anak", "Jenjang Pendidikan", "Status Konsultasi"];

      const rows = exportData.map((item, index) => {
        const dateStr = format(new Date(item.created_at), "dd MMMM yyyy HH:mm", { locale: id });
        const parentName = (item.parent_name || "").replace(/"/g, '""');
        const childName = (item.child_name || "-").replace(/"/g, '""');
        const waNum = `'${item.whatsapp_number || ""}`;
        const levelLabel = LEVEL_LABELS[item.level] || item.level;
        const statusLabel = item.status || "-";

        return [
          index + 1,
          `"${dateStr}"`,
          `"${parentName}"`,
          `"${waNum}"`,
          `"${childName}"`,
          `"${levelLabel}"`,
          `"${statusLabel}"`
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const fileDate = format(new Date(), "yyyy-MM-dd");
      link.setAttribute("href", url);
      link.setAttribute("download", `Data_Konsultasi_EduKonsul_${fileDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Berhasil mendownload ${exportData.length} data konsultasi (Excel/CSV)`);
    } catch (e: any) {
      toast.error("Gagal mendownload Excel: " + e.message);
    }
  }

  async function handleDownloadAiSingle(item: Consultation) {
    try {
      const { data: analysisData } = await (supabase as any)
        .from("consultation_analysis")
        .select("*")
        .eq("consultation_id", item.id)
        .maybeSingle();

      const summaryText = `=== HASIL ANALISIS AI EDUKONSUL ===
ID Konsultasi: #${item.id.substring(0, 8)}
Nama Orang Tua: ${item.parent_name}
Nama Anak: ${item.child_name || "-"}
Nomor WhatsApp: ${item.whatsapp_number}
Jenjang: ${LEVEL_LABELS[item.level] || item.level}
Tanggal Submit: ${format(new Date(item.created_at), "dd MMMM yyyy HH:mm", { locale: id })}
Status Konsultasi: ${item.status}

1. RESUME KONDISI ANAK:
${analysisData?.summary || "-"}

2. ANALISIS KARAKTER & KONDISI:
${analysisData?.analysis || item.ai_result || "-"}

3. KEKUATAN UTAMA:
${analysisData?.strengths || "-"}

4. AREA PENGEMBANGAN (KELEMAHAN):
${analysisData?.weaknesses || "-"}

5. POTENSI BAKAT:
${analysisData?.potential || "-"}

6. RISIKO / TANTANGAN:
${analysisData?.risk || "-"}

7. REKOMENDASI PENDIDIKAN & PARENTING:
${analysisData?.education_recommendation || "-"}
`;

      const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Hasil_AI_${(item.parent_name || "Konsultasi").replace(/\s+/g, "_")}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Hasil AI berhasil diunduh");
    } catch (e: any) {
      toast.error("Gagal mengunduh hasil AI");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand flex items-center gap-2">
            <Users className="h-6 w-6" /> Data Konsultasi Pendidikan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola data konsultasi, hasil analisis AI, dan follow up orang tua.</p>
        </div>

        <button
          onClick={handleExportExcel}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Download Excel
        </button>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand/10 p-2.5 text-brand">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Konsultasi</p>
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5 text-blue-700">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Hari Ini</p>
              <p className="text-xl font-bold text-foreground">{stats.today}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Menunggu AI</p>
              <p className="text-xl font-bold text-amber-800">{stats.pendingAi}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-100 p-2.5 text-teal-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Menunggu Follow Up</p>
              <p className="text-xl font-bold text-teal-800">{stats.pendingFollowUp}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Selesai</p>
              <p className="text-xl font-bold text-emerald-800">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-4">
        {/* Search */}
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari Orang Tua, Anak, WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>

        {/* Level Filter */}
        <select
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="">Semua Jenjang</option>
          <option value="tksd">TK & SD</option>
          <option value="smp">SMP</option>
          <option value="sma">SMA</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date Filter */}
        <div className="relative">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
          />
          {dateFilter && (
            <button
              onClick={() => { setDateFilter(""); setPage(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">ID Konsultasi</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Tanggal</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Nama Orang Tua</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Nomor WhatsApp</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Nama Anak</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Jenjang</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status Konsultasi</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand" />
                    Memuat data konsultasi...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data konsultasi ditemukan.</td>
                </tr>
              ) : (
                data.map((row) => {
                  const statusInfo = STATUS_OPTIONS.find((s) => s.value === row.status) || STATUS_OPTIONS[0];
                  const cleanWa = row.whatsapp_number.replace(/[^0-9]/g, "");
                  const waUrl = `https://wa.me/${cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa}`;

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-muted-foreground">
                        #{row.id.substring(0, 8)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {format(new Date(row.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.parent_name}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:underline"
                        >
                          <Send className="h-3 w-3" />
                          {row.whatsapp_number}
                        </a>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {row.child_name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-brand/10 text-brand font-semibold px-2.5 py-0.5 text-xs">
                          {LEVEL_LABELS[row.level] || row.level}
                        </span>
                      </td>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setSelectedId(row.id); setDetailOpen(true); }}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-blue-100"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Lihat Detail
                          </button>

                          <button
                            onClick={() => handleDownloadAiSingle(row)}
                            className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Download Hasil AI (.txt)"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(row.id)}
                            className="rounded-md border border-red-200 p-1.5 text-red-600 hover:bg-red-50"
                            title="Hapus Data"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
            <span className="text-xs text-muted-foreground">
              Menampilkan {data.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} - {Math.min(page * itemsPerPage, total)} dari {total} data
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded border border-border p-1 hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold">Halaman {page} dari {totalPages}</span>
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
            q: a.questions?.question_text || "Pertanyaan",
            a: a.answer_text || (a.selected_option_ids || []).map((oid: string) => optionsMap[oid] || oid).join(", ")
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
        toast.success("Hasil analisis AI berhasil diperbarui");
        setEditingAnalysis(false);
        await loadDetail();
      }
    } catch (e: any) {
      toast.error("Gagal menyimpan editan: " + e.message);
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
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in' as const, format: 'letter', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
    toast.success("PDF sedang diunduh...");
  };

  const handleCopy = () => {
    if (!data) return;
    const text = `=== LAPORAN EVALUASI & REKOMENDASI EDUKONSUL ===
Nama Orang Tua: ${data.parent_name}
Nama Anak: ${data.child_name || "-"}
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

6. TANTANGAN / RISIKO:
${analysis?.risk || "-"}

7. REKOMENDASI PENDIDIKAN & PARENTING:
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
            <h2 className="text-xl font-bold text-brand flex items-center gap-2">
              <FileText className="h-5 w-5" /> Detail Lengkap Konsultasi Pendidikan
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">ID: #{data?.id?.substring(0, 8)} • Dibuat: {data?.created_at ? format(new Date(data.created_at), "dd MMMM yyyy HH:mm", { locale: id }) : "-"}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground font-bold text-lg">✕</button>
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
            {data.status?.includes("Gagal") && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-start gap-3 text-sm print:hidden">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Analisis AI Gagal Diproses</p>
                  <p className="text-xs mt-1">{data.error_message || "Silakan cek API Key atau klik 'Generate Ulang' di bawah."}</p>
                </div>
              </div>
            )}

            {/* 1. DATA ORANG TUA & DATA ANAK */}
            <div className="grid gap-4 rounded-xl border p-4 bg-muted/20 md:grid-cols-2 print:border-gray-300 print:bg-transparent">
              <div className="space-y-2 border-r pr-4 border-border/50">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand">DATA ORANG TUA</h3>
                <div>
                  <p className="text-xs text-muted-foreground">Nama Orang Tua</p>
                  <p className="font-semibold text-sm">{data.parent_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nomor WhatsApp</p>
                  <a
                    href={`https://wa.me/${data.whatsapp_number.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sm text-emerald-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    {data.whatsapp_number}
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand">DATA ANAK</h3>
                <div>
                  <p className="text-xs text-muted-foreground">Nama Anak</p>
                  <p className="font-semibold text-sm text-brand">{data.child_name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Jenjang Pendidikan</p>
                  <span className="font-semibold text-sm text-foreground">{LEVEL_LABELS[data.level] || data.level}</span>
                </div>
              </div>
            </div>

            {/* 2. JAWABAN FORMULIR LENGKAP */}
            <div className="rounded-xl border p-4 space-y-3 print:border-gray-300">
              <h3 className="text-sm font-bold border-b pb-2 text-brand uppercase tracking-wider">Jawaban Formulir Kuesioner</h3>
              <div className="space-y-3 text-sm max-h-60 overflow-y-auto pr-2 print:max-h-none">
                {data.answers && data.answers.length > 0 ? (
                  data.answers.map((ans: any, idx: number) => (
                    <div key={idx} className="border-b border-muted/30 pb-2">
                      <p className="font-medium text-xs text-muted-foreground">{idx + 1}. {ans.q}</p>
                      <p className="mt-0.5 font-semibold text-foreground">{ans.a || "-"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic">Belum ada jawaban tersimpan.</p>
                )}
              </div>
            </div>

            {/* 3. HASIL ANALISIS AI (7 KOMPONEN) */}
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
                    Generate Ulang AI
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
                    <label className="block text-xs font-semibold mb-1">1. Ringkasan Kondisi Anak</label>
                    <textarea value={editForm.summary} onChange={e => setEditForm({...editForm, summary: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">2. Analisis Karakter & Gaya Belajar</label>
                    <textarea value={editForm.analysis} onChange={e => setEditForm({...editForm, analysis: e.target.value})} className="w-full rounded border p-2 text-sm" rows={4} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">3. Kekuatan Utama Anak</label>
                    <textarea value={editForm.strengths} onChange={e => setEditForm({...editForm, strengths: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">4. Area yang Perlu Dikembangkan (Kelemahan)</label>
                    <textarea value={editForm.weaknesses} onChange={e => setEditForm({...editForm, weaknesses: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">5. Potensi Bakat Anak</label>
                    <textarea value={editForm.potential} onChange={e => setEditForm({...editForm, potential: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">6. Risiko / Tantangan</label>
                    <textarea value={editForm.risk} onChange={e => setEditForm({...editForm, risk: e.target.value})} className="w-full rounded border p-2 text-sm" rows={2} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">7. Rekomendasi Pendidikan & Saran Konsultan</label>
                    <textarea value={editForm.education_recommendation} onChange={e => setEditForm({...editForm, education_recommendation: e.target.value})} className="w-full rounded border p-2 text-sm" rows={4} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="submit" disabled={savingAnalysis} className="rounded-md bg-brand text-brand-foreground px-4 py-2 text-sm font-medium flex items-center gap-2">
                      {savingAnalysis ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan AI"}
                    </button>
                  </div>
                </form>
              ) : (
                /* View Mode 7 Komponen */
                <div className="space-y-4 text-sm">
                  {/* 1. Ringkasan */}
                  <div className="rounded-lg bg-card p-3 border">
                    <h4 className="font-semibold text-xs text-brand uppercase tracking-wider mb-1">1. Ringkasan Kondisi Anak</h4>
                    <p className="whitespace-pre-wrap">{analysis?.summary || "Belum ada ringkasan."}</p>
                  </div>

                  {/* 2. Analisis Karakter & Gaya Belajar */}
                  <div className="rounded-lg bg-card p-3 border">
                    <h4 className="font-semibold text-xs text-brand uppercase tracking-wider mb-1">2. Analisis Karakter & Gaya Belajar</h4>
                    <p className="whitespace-pre-wrap">{analysis?.analysis || data.ai_result || "Belum ada analisis."}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* 3. Kekuatan */}
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 border border-emerald-200">
                      <h4 className="font-semibold text-xs text-emerald-700 uppercase tracking-wider mb-1">3. Kekuatan Utama Anak</h4>
                      <p className="whitespace-pre-wrap text-emerald-900 dark:text-emerald-300">{analysis?.strengths || "-"}</p>
                    </div>

                    {/* 4. Kelemahan */}
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

                  {/* 7. Rekomendasi & Saran Konsultan */}
                  <div className="rounded-lg bg-card p-3 border border-brand/40">
                    <h4 className="font-semibold text-xs text-brand uppercase tracking-wider mb-1">7. Rekomendasi & Saran Konsultan</h4>
                    <p className="whitespace-pre-wrap">{analysis?.education_recommendation || "-"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Riwayat Notifikasi WhatsApp */}
            <div className="mt-6 print:hidden" data-html2canvas-ignore="true">
              <h3 className="mb-3 text-sm font-bold border-b pb-1 text-brand">Riwayat Notifikasi WhatsApp</h3>
              <div className="space-y-2">
                {data.logs && data.logs.length > 0 ? data.logs.map((log: any) => (
                  <div key={log.id} className="text-xs border rounded-lg p-2.5 bg-muted/20 flex items-center justify-between">
                    <div>
                      <span className="font-semibold uppercase text-brand mr-2">[{log.type}]</span>
                      <span>To: {log.target_number} ({format(new Date(log.created_at), "dd MMM HH:mm", { locale: id })})</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {log.status}
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground italic">Belum ada riwayat notifikasi WhatsApp.</p>
                )}
              </div>
            </div>
            
            {/* Actions Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden border-t pt-4" data-html2canvas-ignore="true">
              <button onClick={handleSendWaManual} className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-3.5 py-2 text-sm font-medium hover:bg-emerald-100">
                <Send className="h-4 w-4" /> Hubungi via WhatsApp
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted">
                  <FileText className="h-4 w-4" /> Salin Ringkasan
                </button>
                <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted">
                  <Printer className="h-4 w-4" /> Cetak PDF
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
