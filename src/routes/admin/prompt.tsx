import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getMultiPromptsAction, saveMultiPromptsAction } from "@/actions/admin-actions";
import { DEFAULT_UNIFIED_PROMPT } from "@/lib/ai-prompt-default";

export const Route = createFileRoute("/admin/prompt")({
  component: PromptAIPage,
});

const GEMINI_MODELS = [
  { value: "google/gemini-3.5-flash", label: "google/gemini-3.5-flash (Direkomendasikan - Cepat & Cerdas)" },
  { value: "google/gemini-3.1-flash-lite", label: "google/gemini-3.1-flash-lite (Ultra Cepat)" },
  { value: "google/gemini-2.5-flash", label: "google/gemini-2.5-flash (Stabil)" },
  { value: "google/gemini-2.5-pro", label: "google/gemini-2.5-pro (Analisis Sangat Mendalam)" },
  { value: "google/gemini-3.1-pro-preview", label: "google/gemini-3.1-pro-preview (Terbaru)" }
];

export function PromptAIPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [promptId, setPromptId] = useState("");
  const [promptTitle, setPromptTitle] = useState("Prompt Analisis, Resume & Rekomendasi Pendidikan AI Engine");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("google/gemini-3.5-flash");

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await getMultiPromptsAction();
      if (data) {
        setPromptId(data.id || "");
        setSystemPrompt(data.system_prompt || DEFAULT_UNIFIED_PROMPT);
        if (data.selected_model) setSelectedModel(data.selected_model);
      } else {
        setSystemPrompt(DEFAULT_UNIFIED_PROMPT);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat konfigurasi prompt AI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveMultiPromptsAction({
        data: {
          prompts: {
            id: promptId,
            system_prompt: systemPrompt,
            analysis_prompt: systemPrompt,
            summary_prompt: systemPrompt,
            recommendation_prompt: systemPrompt,
            selected_model: selectedModel
          },
          email: userEmail || "admin"
        }
      });
      if (res && res.success) {
        toast.success("Konfigurasi Prompt AI & Model Gemini berhasil disimpan");
        await loadPrompts();
      } else {
        toast.error("Gagal menyimpan prompt AI");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Gagal menyimpan prompt: " + (e.message || "Error database"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-brand flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" /> Konfigurasi Prompt & Model AI
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Satu prompt utama dan pilihan model Google Gemini yang digunakan AI Engine untuk menganalisis, meresume jawaban dari semua jenjang, serta memberikan rekomendasi pendidikan.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 p-4 flex gap-3 text-sm text-blue-700 dark:text-blue-300">
          <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-semibold">Variabel Dinamis yang Tersedia:</p>
            <p className="text-xs mt-1">
              Gunakan <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-medium">{"{{nama_orang_tua}}"}</code>, <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-medium">{"{{nama_anak}}"}</code>, <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-medium">{"{{jenjang}}"}</code>, dan <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-medium">{"{{jawaban_lengkap}}"}</code> di dalam instruksi prompt.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-xs font-bold text-brand">
                1
              </span>
              <span className="font-semibold text-foreground text-base">Model AI Gemini & Prompt Utama</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 px-3 py-1 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" /> Digunakan untuk Semua Jenjang
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Model AI Gemini
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition cursor-pointer"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Pilih model Google Gemini yang aktif untuk memproses analisis dan resume konsultasi.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Judul Prompt
              </label>
              <input
                type="text"
                value={promptTitle}
                onChange={(e) => setPromptTitle(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition"
                placeholder="Judul Prompt AI..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Instruksi Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-input bg-background p-4 text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition shadow-xs"
                placeholder="Tulis instruksi prompt AI di sini..."
                required
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Instruksi ini mencakup tugas analisis jawaban kuesioner, pembuatan resume, serta pemberian rekomendasi pendidikan yang relevan bagi anak.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Konfigurasi Prompt AI
          </button>
        </div>
      </form>
    </div>
  );
}
