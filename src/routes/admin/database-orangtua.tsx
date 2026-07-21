import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  Download, 
  Loader2, 
  MessageSquare, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  PhoneCall, 
  School, 
  CheckCircle2 
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getParentsDatabaseAction } from "@/actions/admin-actions";

export const Route = createFileRoute("/admin/database-orangtua")({
  component: DatabaseOrangTuaPage,
});

const LEVEL_LABELS: Record<string, string> = {
  tksd: "TK & SD",
  smp: "SMP",
  sma: "SMA",
};

export function DatabaseOrangTuaPage() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchParents();
  }, [page, debouncedSearch, levelFilter, dateFilter]);

  async function fetchParents() {
    setLoading(true);
    try {
      // Primary: Server function with auto fallback between 'parents' and 'consultations' tables
      const res = await getParentsDatabaseAction({
        data: {
          page,
          limit: itemsPerPage,
          search: debouncedSearch,
          level: levelFilter,
          date: dateFilter
        }
      });

      if (res && res.success && res.data) {
        setData(res.data);
        setTotal(res.count || 0);
        setLoading(false);
        return;
      }

      // Secondary Fallback: Client Supabase Query
      let query = supabase.from("consultations").select("id, parent_name, child_name, level, whatsapp_number, created_at, status", { count: "exact" });

      if (debouncedSearch) {
        query = query.or(`parent_name.ilike.%${debouncedSearch}%,child_name.ilike.%${debouncedSearch}%,whatsapp_number.ilike.%${debouncedSearch}%`);
      }
      if (levelFilter) query = query.eq("level", levelFilter as any);
      if (dateFilter) {
        const startDate = `${dateFilter}T00:00:00.000Z`;
        const endDate = `${dateFilter}T23:59:59.999Z`;
        query = query.gte("created_at", startDate).lte("created_at", endDate);
      }

      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: rows, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!error && rows) {
        setData(rows);
        setTotal(count || 0);
      } else {
        toast.error("Gagal mengambil Database Orang Tua: " + (error?.message || "Error server"));
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Gagal memuat data orang tua: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / itemsPerPage);

  const handleExportExcel = async () => {
    try {
      let query = supabase.from("consultations").select("parent_name, child_name, level, whatsapp_number, created_at");

      if (debouncedSearch) {
        query = query.or(`parent_name.ilike.%${debouncedSearch}%,child_name.ilike.%${debouncedSearch}%,whatsapp_number.ilike.%${debouncedSearch}%`);
      }
      if (levelFilter) query = query.eq("level", levelFilter as any);

      const { data: exportData, error } = await query.order("created_at", { ascending: false });

      if (error || !exportData || exportData.length === 0) {
        toast.error("Tidak ada data untuk diekspor");
        return;
      }

      const headers = ["No", "Tanggal Konsultasi", "Nama Orang Tua", "Nama Anak", "Jenjang Pendidikan", "Nomor WhatsApp (HP)"];
      const rows = exportData.map((item, idx) => [
        idx + 1,
        format(new Date(item.created_at), "dd MMMM yyyy HH:mm", { locale: id }),
        `"${(item.parent_name || "").replace(/"/g, '""')}"`,
        `"${(item.child_name || "-").replace(/"/g, '""')}"`,
        LEVEL_LABELS[item.level] || item.level,
        `"'${item.whatsapp_number || ""}"`
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Database_Orang_Tua_${format(new Date(), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Database Orang Tua berhasil diunduh ke Excel (.csv)");
    } catch (e: any) {
      toast.error("Gagal mengekspor data: " + e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand flex items-center gap-2">
            <Users className="h-6 w-6 text-brand" /> Database Orang Tua
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direktori kontak orang tua, nama anak, jenjang pendidikan, serta akses cepat ke WhatsApp.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <Download className="h-4 w-4" />
          Export Excel Orang Tua
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari nama orang tua, anak, atau No. HP..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium outline-none"
        >
          <option value="">Semua Jenjang</option>
          <option value="tksd">TK & SD</option>
          <option value="smp">SMP</option>
          <option value="sma">SMA</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium outline-none"
        />

        {(search || levelFilter || dateFilter) && (
          <button
            onClick={() => { setSearch(""); setLevelFilter(""); setDateFilter(""); setPage(1); }}
            className="rounded-lg border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-muted-foreground">No</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Tanggal</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Nama Orang Tua</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Nama Anak</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">Jenjang</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground">No. HP (WhatsApp)</th>
                <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-brand" />
                    Memuat Database Orang Tua...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Tidak ada data orang tua ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const cleanWa = (row.whatsapp_number || "").replace(/[^0-9]/g, "");
                  const waUrl = `https://wa.me/${cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa}`;

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {(page - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {format(new Date(row.created_at), "dd MMM yyyy, HH:mm", { locale: id })}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">
                        {row.parent_name}
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
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:underline"
                        >
                          <Send className="h-3.5 w-3.5" />
                          {row.whatsapp_number}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 transition"
                        >
                          <PhoneCall className="h-3.5 w-3.5" />
                          Hubungi WA
                        </a>
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
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
            <span className="text-muted-foreground">
              Menampilkan {data.length} dari {total} Orang Tua
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="rounded border p-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="font-semibold">Halaman {page} dari {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded border p-1.5 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
