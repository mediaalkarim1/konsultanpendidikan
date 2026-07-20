import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { testWaConnection, simulateFullConsultation } from "@/actions/testing";
import { Send, Settings, Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/testing")({
  component: TestingPage,
});

export function TestingPage() {
  const [waAdminLoading, setWaAdminLoading] = useState(false);
  const [waTargetLoading, setWaTargetLoading] = useState(false);
  const [targetNumber, setTargetNumber] = useState("");
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const handleTestWaAdmin = async () => {
    setWaAdminLoading(true);
    try {
      // In real scenario we fetch admin contact from settings first or use a hardcoded one for test if available.
      // We will let the server fn pull it or we pass a mock. Let's pass a dummy for now unless specified.
      toast.error("Silakan gunakan 'Test Kirim WA ke Peserta' untuk nomor kustom.");
    } finally {
      setWaAdminLoading(false);
    }
  };

  const handleTestWa = async () => {
    if (!targetNumber) return toast.error("Masukkan nomor WA");
    setWaTargetLoading(true);
    try {
      const res = await testWaConnection({ data: { target: targetNumber, message: "Pesan percobaan dari EduKonsul." } });
      if (res.success) toast.success("Pesan terkirim!");
      else toast.error(res.errorMessage || "Gagal mengirim");
    } catch (e) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setWaTargetLoading(false);
    }
  };

  const handleSimulation = async () => {
    setSimulationLoading(true);
    setSimulationLogs(["Menjalankan simulasi..."]);
    try {
      const res = await simulateFullConsultation();
      setSimulationLogs(res.logs || ["Selesai"]);
      if (res.success) toast.success("Simulasi berhasil");
      else toast.error("Simulasi terdapat kegagalan");
    } catch (e: any) {
      setSimulationLogs(prev => [...prev, `Error: ${e.message}`]);
    } finally {
      setSimulationLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand">Testing & Simulasi</h1>
          <p className="text-sm text-muted-foreground mt-1">Pastikan integrasi AI dan WhatsApp berjalan dengan baik.</p>
        </div>
        <Settings className="h-8 w-8 text-brand/20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Test WA */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-lg border-b pb-3 mb-4">Pengujian WhatsApp</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Test Kirim WA ke Nomor Bebas</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="081234..." 
                  value={targetNumber}
                  onChange={e => setTargetNumber(e.target.value)}
                  className="flex-1 rounded-md border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                />
                <button 
                  onClick={handleTestWa}
                  disabled={waTargetLoading}
                  className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                >
                  {waTargetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Simulasi Penuh */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold text-lg border-b pb-3 mb-4">Simulasi Konsultasi</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Simulasi ini akan membuat data dummy, mengeksekusi AI, dan mengirim notifikasi sesuai pengaturan aktif Anda.
          </p>

          <button 
            onClick={handleSimulation}
            disabled={simulationLoading}
            className="flex w-full justify-center items-center gap-2 rounded-md bg-brand px-4 py-3 font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
          >
            {simulationLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
            Simulasikan Konsultasi
          </button>
        </div>
      </div>

      {/* Log Hasil Simulasi */}
      {simulationLogs.length > 0 && (
        <div className="rounded-xl border bg-zinc-950 p-5 shadow-sm text-green-400 font-mono text-sm overflow-x-auto">
          <h3 className="text-zinc-500 mb-3 border-b border-zinc-800 pb-2">Log Sistem:</h3>
          <ul className="space-y-2">
            {simulationLogs.map((log, i) => (
              <li key={i} className="flex items-start gap-2">
                {log.startsWith("✓") ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : log.startsWith("❌") ? (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <span className="w-4"></span>
                )}
                <span>{log.replace(/^[✓❌]\s*/, '')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
