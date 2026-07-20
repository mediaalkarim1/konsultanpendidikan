import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, Loader2, User, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const Route = createFileRoute("/admin/log-aktivitas")({
  component: LogAktivitasPage,
});

type ActivityLog = {
  id: string;
  admin_email: string;
  action: string;
  details: any;
  ip_address: string;
  created_at: string;
};

function LogAktivitasPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  async function fetchLogs() {
    setLoading(true);
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Get total count
    const { count } = await supabase.from("activity_logs").select("*", { count: "exact", head: true });
    setTotal(count || 0);

    // Get paginated data
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);
    
    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  }

  const totalPages = Math.ceil(total / itemsPerPage);

  const getActionColor = (action: string) => {
    if (action.includes("DELETE")) return "text-red-500 bg-red-500/10";
    if (action.includes("UPDATE") || action.includes("EDIT")) return "text-amber-500 bg-amber-500/10";
    if (action.includes("LOGIN") || action.includes("LOGOUT")) return "text-blue-500 bg-blue-500/10";
    return "text-brand bg-brand/10";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand">Log Aktivitas</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau seluruh aktivitas yang dilakukan oleh admin.</p>
        </div>
        <Activity className="h-8 w-8 text-brand/20" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground">Waktu</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Admin (Email)</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Aktivitas</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-brand" />
                    Memuat data...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Tidak ada aktivitas ditemukan.</td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(row.created_at), "dd MMM yyyy HH:mm:ss", { locale: id })}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {row.admin_email}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${getActionColor(row.action)}`}>
                        {row.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <pre className="text-xs bg-muted/30 p-2 rounded max-w-xs overflow-x-auto whitespace-pre-wrap text-muted-foreground">
                        {row.details ? JSON.stringify(row.details, null, 2) : "-"}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Menampilkan {logs.length > 0 ? (page - 1) * itemsPerPage + 1 : 0} - {Math.min(page * itemsPerPage, total)} dari {total} data
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
    </div>
  );
}
