import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Eye, Trash2, Printer, Download, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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
};

const STATUS_OPTIONS = [
  { value: "new", label: "Belum Diproses", color: "bg-amber-100 text-amber-700" },
  { value: "analyzed", label: "Sudah Dianalisis", color: "bg-indigo-100 text-indigo-700" },
  { value: "contacted", label: "Sudah Dihubungi", color: "bg-emerald-100 text-emerald-700" },
];

const LEVEL_LABELS: Record<string, string> = { tksd: "TK & SD", smp: "SMP", sma: "SMA" };

function KonsultasiPage() {
  const [data, setData] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: cols, error } = await supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && cols) {
      setData(cols);
    }
    setLoading(false);
  }

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        item.parent_name.toLowerCase().includes(search.toLowerCase()) ||
        item.whatsapp_number.includes(search);
      const matchStatus = statusFilter ? item.status === statusFilter : true;
      const matchLevel = levelFilter ? item.level === levelFilter : true;
      return matchSearch && matchStatus && matchLevel;
    });
  }, [data, search, statusFilter, levelFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    setPage(1); // Reset page on filter change
  }, [search, statusFilter, levelFilter]);

  async function handleStatusChange(id: string, newStatus: string) {
    const { error } = await supabase.from("consultations").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error("Gagal mengubah status");
    } else {
      toast.success("Status berhasil diubah");
      setData((prev) => prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Yakin ingin menghapus data ini?")) return;
    const { error } = await supabase.from("consultations").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus data");
    } else {
      toast.success("Data dihapus");
      setData((prev) => prev.filter((item) => item.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Konsultasi</h1>
          <p className="text-sm text-muted-foreground">Kelola semua permintaan konsultasi yang masuk.</p>
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
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand sm:w-48"
        >
          <option value="">Semua Status</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
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
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data ditemukan.</td>
                </tr>
              ) : (
                paginatedData.map((row) => {
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
                          className={`rounded-full px-2.5 py-1 text-xs font-medium outline-none border-none cursor-pointer ${statusInfo.color}`}
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
                            title="Detail"
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
              Menampilkan {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, filteredData.length)} dari {filteredData.length}
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
        <DetailModal id={selectedId} onClose={() => { setDetailOpen(false); setSelectedId(null); }} />
      )}
    </div>
  );
}

function DetailModal({ id: consultId, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: consultation, error: err1 } = await supabase.from("consultations").select("*").eq("id", consultId).single();
      const { data: answers, error: err2 } = await supabase
        .from("consultation_answers")
        .select("*, questions(question_text)")
        .eq("consultation_id", consultId);
      
      // Also fetch option texts if there are selected_option_ids
      const allOptionIds = answers?.flatMap(a => a.selected_option_ids || []) || [];
      let optionsMap: Record<string, string> = {};
      if (allOptionIds.length > 0) {
         const { data: opts } = await supabase.from("question_options").select("id, option_text").in("id", allOptionIds);
         if (opts) {
           optionsMap = opts.reduce((acc, o) => ({ ...acc, [o.id]: o.option_text }), {});
         }
      }

      // Fetch notification logs
      const { data: notifLogs } = await supabase.from("notification_logs" as any).select("*").eq("consultation_id", consultId).order("created_at", { ascending: false });

      if (consultation && answers) {
        setData({ ...consultation, answers: answers.map(a => ({
          q: a.questions?.question_text,
          a: a.answer_text || (a.selected_option_ids || []).map((oid: string) => optionsMap[oid]).join(", ")
        })), logs: notifLogs || [] });
      }
      setLoading(false);
    }
    load();
  }, [consultId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!data) return;
    const text = `Data Konsultasi\nNama: ${data.parent_name}\nWA: ${data.whatsapp_number}\nJenjang: ${LEVEL_LABELS[data.level]}\n\nJawaban:\n${data.answers.map((a: any, i: number) => `${i+1}. ${a.q}\nJawab: ${a.a}`).join("\n\n")}\n\nAnalisis AI:\n${data.ai_result || "Belum ada"}`;
    navigator.clipboard.writeText(text);
    toast.success("Berhasil disalin ke clipboard");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:p-0">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl print:max-h-none print:shadow-none print:w-full">
        <div className="mb-6 flex items-start justify-between print:hidden">
          <h2 className="text-xl font-bold">Detail Konsultasi</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {loading ? (
          <div className="py-10 text-center">Memuat detail...</div>
        ) : !data ? (
          <div className="py-10 text-center">Data tidak ditemukan.</div>
        ) : (
          <div className="space-y-6 print:space-y-4">
            <div className="hidden print:block mb-6 border-b pb-4">
              <h1 className="text-2xl font-bold">Hasil Tes Potensi Anak - EduKonsul</h1>
              <p className="text-gray-500">{format(new Date(data.created_at), "dd MMMM yyyy HH:mm", { locale: id })}</p>
            </div>

            <div className="grid gap-4 rounded-xl border p-4 bg-muted/20 print:border-gray-300 print:bg-transparent">
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-gray-600">Nama Orang Tua</p>
                <p className="font-semibold">{data.parent_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-gray-600">Nomor WhatsApp</p>
                <p className="font-semibold">{data.whatsapp_number}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground print:text-gray-600">Jenjang</p>
                <p className="font-semibold">{LEVEL_LABELS[data.level]}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-bold border-b pb-2 print:border-gray-300">Jawaban Form</h3>
              <div className="space-y-5">
                {data.answers.map((ans: any, idx: number) => (
                  <div key={idx}>
                    <p className="font-medium leading-tight">{idx + 1}. {ans.q}</p>
                    <p className="mt-1 text-muted-foreground print:text-gray-800">{ans.a || "-"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-dashed border-brand/30 bg-brand/5 p-4 print:border-gray-300 print:bg-transparent">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-brand print:text-black">Hasil Analisis AI</h4>
                <div className="text-xs space-x-2">
                  <span className={`px-2 py-1 rounded-full ${data.ai_status === 'success' ? 'bg-green-100 text-green-700' : data.ai_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    Status: {data.ai_status}
                  </span>
                  {data.ai_created_at && <span className="text-muted-foreground">{format(new Date(data.ai_created_at), "HH:mm")}</span>}
                </div>
              </div>
              <div className="mt-3 text-sm text-foreground print:text-gray-800 whitespace-pre-wrap">
                {data.ai_result ? data.ai_result : <span className="text-muted-foreground italic">(Belum dianalisis / AI dimatikan)</span>}
              </div>
              {data.ai_prompt_used && (
                <div className="mt-4 pt-4 border-t border-brand/20 print:hidden">
                  <p className="text-xs font-semibold text-muted-foreground">Prompt yang digunakan:</p>
                  <pre className="mt-2 text-xs bg-black/5 p-2 rounded whitespace-pre-wrap text-muted-foreground">
                    {data.ai_prompt_used.system}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-8 print:hidden">
              <h3 className="mb-4 text-lg font-bold border-b pb-2">Riwayat Notifikasi WhatsApp</h3>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="rounded border p-3">
                  <span className="text-muted-foreground block text-xs">Notifikasi Admin:</span>
                  <span className={`font-semibold ${data.notification_admin_status === 'success' ? 'text-green-600' : 'text-amber-600'}`}>
                    {data.notification_admin_status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                <div className="rounded border p-3">
                  <span className="text-muted-foreground block text-xs">Notifikasi Peserta:</span>
                  <span className={`font-semibold ${data.notification_parent_status === 'success' ? 'text-green-600' : 'text-amber-600'}`}>
                    {data.notification_parent_status?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {data.logs?.length > 0 ? data.logs.map((log: any) => (
                  <div key={log.id} className="text-xs border rounded p-3 bg-muted/20">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="uppercase">{log.type}</strong>
                      <span className={log.status === 'success' ? 'text-green-600' : 'text-red-600'}>{log.status}</span>
                    </div>
                    <p className="text-muted-foreground">To: {log.target_number} | {format(new Date(log.created_at), "dd MMM HH:mm:ss")}</p>
                    {log.error_message && <p className="text-red-500 mt-1">Error: {log.error_message}</p>}
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground italic">Belum ada riwayat notifikasi.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 print:hidden border-t pt-4">
              <button onClick={handleCopy} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                <FileText className="h-4 w-4" /> Salin Teks
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
                <Printer className="h-4 w-4" /> Cetak
              </button>
              <button onClick={handlePrint} className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90">
                <Download className="h-4 w-4" /> Simpan PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
