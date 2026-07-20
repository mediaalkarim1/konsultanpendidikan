import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    new: 0,
    analyzed: 0,
    contacted: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("consultations")
        .select("status, created_at");

      if (error || !data) {
        console.error(error);
        setLoading(false);
        return;
      }

      let total = 0;
      let countToday = 0;
      let countNew = 0;
      let countAnalyzed = 0;
      let countContacted = 0;
      
      const dailyMap: Record<string, number> = {};

      data.forEach((row) => {
        total++;
        if (row.status === "new") countNew++;
        if (row.status === "analyzed") countAnalyzed++;
        if (row.status === "contacted") countContacted++;
        
        const dateObj = new Date(row.created_at);
        if (dateObj >= today) countToday++;
        
        // Format for chart (e.g. "DD MMM")
        const dateStr = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
      });

      setStats({
        total,
        today: countToday,
        new: countNew,
        analyzed: countAnalyzed,
        contacted: countContacted,
      });

      // Convert dailyMap to array and take last 7 entries
      const chartEntries = Object.entries(dailyMap).map(([date, count]) => ({
        date,
        count,
      }));
      setChartData(chartEntries.slice(-7));
      setLoading(false);
    }
    fetchStats();
  }, []);

  const statCards = [
    { title: "Total Konsultasi", value: stats.total, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Konsultasi Hari Ini", value: stats.today, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Belum Diproses", value: stats.new, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Sudah Dianalisis", value: stats.analyzed, icon: FileText, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Sudah Dihubungi", value: stats.contacted, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  if (loading) {
    return <div className="flex h-full items-center justify-center">Memuat data...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan statistik konsultasi pendidikan masuk.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{s.title}</p>
              <div className={`grid h-8 w-8 place-items-center rounded-md ${s.bg} ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold">Grafik Konsultasi (7 Hari Terakhir)</h2>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                />
                <Bar dataKey="count" fill="var(--brand)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Belum ada data konsultasi.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
