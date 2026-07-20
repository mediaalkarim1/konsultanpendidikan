import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Beaker, Play, CheckCircle2, XCircle, Loader2, Database, ShieldCheck, Cpu, Sparkles, MessageSquare, HardDrive, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  testDatabaseAction,
  testSupabaseConfigAction,
  testActiveAiProviderAction,
  testGeminiApiAction,
  testOpenAiApiAction,
  testWhatsAppAction,
  testStorageAction,
  testServerFunctionsAction,
  TestResult
} from "@/actions/testing-suite";

export const Route = createFileRoute("/admin/testing")({
  component: TestingPage,
});

export function TestingPage() {
  const [waNumber, setWaNumber] = useState("");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; result?: TestResult }>>({});

  const setTestLoading = (id: string, loading: boolean) => {
    setTestResults(prev => ({
      ...prev,
      [id]: { ...prev[id], loading }
    }));
  };

  const setTestOutput = (id: string, result: TestResult) => {
    setTestResults(prev => ({
      ...prev,
      [id]: { loading: false, result }
    }));
    if (result.success) {
      toast.success(`${result.testName}: BERHASIL (${result.executionTimeMs} ms)`);
    } else {
      toast.error(`${result.testName}: GAGAL - ${result.errorMessage}`);
    }
  };

  const runDatabaseTest = async () => {
    setTestLoading("db", true);
    const res = await testDatabaseAction();
    setTestOutput("db", res);
  };

  const runSupabaseConfigTest = async () => {
    setTestLoading("config", true);
    const res = await testSupabaseConfigAction();
    setTestOutput("config", res);
  };

  const runActiveAiTest = async () => {
    setTestLoading("ai_active", true);
    const res = await testActiveAiProviderAction();
    setTestOutput("ai_active", res);
  };

  const runGeminiTest = async () => {
    setTestLoading("gemini", true);
    const res = await testGeminiApiAction({ data: { apiKey: geminiKeyInput } });
    setTestOutput("gemini", res);
  };

  const runOpenAiTest = async () => {
    setTestLoading("openai", true);
    const res = await testOpenAiApiAction({ data: { apiKey: openaiKeyInput } });
    setTestOutput("openai", res);
  };

  const runWaTest = async () => {
    if (!waNumber) return toast.error("Masukkan nomor WA target untuk pengujian.");
    setTestLoading("wa", true);
    const res = await testWhatsAppAction({ data: { targetNumber: waNumber } });
    setTestOutput("wa", res);
  };

  const runStorageTest = async () => {
    setTestLoading("storage", true);
    const res = await testStorageAction();
    setTestOutput("storage", res);
  };

  const runServerFnTest = async () => {
    setTestLoading("rpc", true);
    const res = await testServerFunctionsAction();
    setTestOutput("rpc", res);
  };

  const runAllTests = async () => {
    toast.info("Menjalankan seluruh suite pengujian sistem...");
    await runDatabaseTest();
    await runSupabaseConfigTest();
    await runActiveAiTest();
    await runStorageTest();
    await runServerFnTest();
    toast.success("Pengujian dasar selesai.");
  };

  const testModules = [
    {
      id: "db",
      title: "1. Test Database Supabase",
      desc: "Memeriksa koneksi tabel 'questions' dan menghitung baris data.",
      icon: Database,
      action: runDatabaseTest,
    },
    {
      id: "config",
      title: "2. Test Konfigurasi Supabase",
      desc: "Memeriksa ketersediaan URL dan Key Supabase di env.",
      icon: ShieldCheck,
      action: runSupabaseConfigTest,
    },
    {
      id: "ai_active",
      title: "3. Test Active AI Provider",
      desc: "Memuat provider AI default aktif dari database.",
      icon: Cpu,
      action: runActiveAiTest,
    },
    {
      id: "gemini",
      title: "4. Test Google Gemini API",
      desc: "Mengirimkan prompt tes langsung ke API Google Gemini.",
      icon: Sparkles,
      action: runGeminiTest,
      customInput: (
        <input
          type="password"
          placeholder="API Key opsional..."
          value={geminiKeyInput}
          onChange={e => setGeminiKeyInput(e.target.value)}
          className="mt-2 w-full rounded border px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand"
        />
      )
    },
    {
      id: "openai",
      title: "5. Test OpenAI / Gateway API",
      desc: "Mengirimkan prompt tes ke OpenAI / Lovable AI Gateway.",
      icon: Cpu,
      action: runOpenAiTest,
      customInput: (
        <input
          type="password"
          placeholder="API Key opsional..."
          value={openaiKeyInput}
          onChange={e => setOpenaiKeyInput(e.target.value)}
          className="mt-2 w-full rounded border px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand"
        />
      )
    },
    {
      id: "wa",
      title: "6. Test WhatsApp Provider API",
      desc: "Mengirimkan pesan percobaan ke nomor WhatsApp target.",
      icon: MessageSquare,
      action: runWaTest,
      customInput: (
        <input
          type="text"
          placeholder="Nomor WA (contoh: 081234567890)..."
          value={waNumber}
          onChange={e => setWaNumber(e.target.value)}
          className="mt-2 w-full rounded border px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-brand"
        />
      )
    },
    {
      id: "storage",
      title: "7. Test Storage Supabase",
      desc: "Memeriksa ketersediaan bucket penyimpanan berkas.",
      icon: HardDrive,
      action: runStorageTest,
    },
    {
      id: "rpc",
      title: "8. Test Server Functions RPC",
      desc: "Memeriksa waktu tanggap (roundtrip execution) server action.",
      icon: Zap,
      action: runServerFnTest,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-brand flex items-center gap-2">
            <Beaker className="h-5 w-5" /> Suite Pengujian Sistem Interaktif (8 Modul)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Uji integritas database, Supabase Auth, 9 AI Provider, WhatsApp API, Storage, dan Server Actions secara realtime.
          </p>
        </div>

        <button
          onClick={runAllTests}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90 transition"
        >
          <Play className="h-4 w-4" /> Jalankan Semua Tes Dasar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testModules.map((mod) => {
          const state = testResults[mod.id] || {};
          const isDone = !!state.result;
          const isSuccess = state.result?.success;

          return (
            <div key={mod.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <mod.icon className="h-4 w-4 text-brand" />
                    <span>{mod.title}</span>
                  </div>

                  {isDone && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {isSuccess ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {isSuccess ? "BERHASIL" : "GAGAL"} ({state.result?.executionTimeMs} ms)
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-1">{mod.desc}</p>
                {mod.customInput}
              </div>

              {/* Output Result */}
              {isDone && (
                <div className="mt-2 rounded bg-zinc-950 p-2.5 text-xs font-mono text-zinc-300 overflow-x-auto max-h-36">
                  {isSuccess ? (
                    <pre className="text-green-400">{JSON.stringify(state.result?.responsePayload, null, 2)}</pre>
                  ) : (
                    <p className="text-red-400">Error: {state.result?.errorMessage}</p>
                  )}
                </div>
              )}

              <div className="pt-2 border-t flex justify-end">
                <button
                  onClick={mod.action}
                  disabled={state.loading}
                  className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium hover:bg-brand hover:text-brand-foreground disabled:opacity-50 transition"
                >
                  {state.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Jalankan Tes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
