import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getMultiPromptsAction, saveMultiPromptsAction } from "@/actions/admin-actions";

export const Route = createFileRoute("/admin/prompt")({
  component: PromptAIPage,
});

export function PromptAIPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [prompts, setPrompts] = useState({
    id: "",
    system_prompt: "",
    analysis_prompt: "",
    summary_prompt: "",
    recommendation_prompt: "",
  });

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await getMultiPromptsAction();
      if (data) {
        setPrompts({
          id: data.id || "",
          system_prompt: data.system_prompt || "",
          analysis_prompt: data.analysis_prompt || "",
          summary_prompt: data.summary_prompt || "",
          recommendation_prompt: data.recommendation_prompt || "",
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat prompt AI");
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
      await saveMultiPromptsAction({
        data: {
          prompts,
          email: userEmail || "admin"
        }
      });
      toast.success("Seluruh Prompt AI berhasil disimpan");
    } catch (e: any) {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-brand flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Kelola Prompt AI Multiguna
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Atur instruksi dasar untuk System, Analisis, Resume, dan Rekomendasi Pendidikan yang digunakan oleh AI Engine.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 flex gap-3 text-sm text-blue-700 dark:text-blue-300">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Variabel Dinamis yang Tersedia:</p>
            <p className="text-xs mt-1">
              Gunakan <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded font-mono">{"{{nama_orang_tua}}"}</code>, <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded font-mono">{"{{jenjang}}"}</code>, dan <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded font-mono">{"{{jawaban_lengkap}}"}</code> di dalam template prompt.
            </p>
          </div>
        </div>

        {/* 1. System Prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">1. System Prompt (Peran Utama AI)</label>
          <textarea
            value={prompts.system_prompt}
            onChange={(e) => setPrompts({ ...prompts, system_prompt: e.target.value })}
            className="min-h-[100px] w-full rounded-lg border border-input bg-background p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-brand"
            placeholder="Anda adalah Pakar Analis Potensi & Konsultan Pendidikan Anak..."
            required
          />
        </div>

        {/* 2. Analysis Prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">2. Prompt Analisis Kondisi & Gaya Belajar</label>
          <textarea
            value={prompts.analysis_prompt}
            onChange={(e) => setPrompts({ ...prompts, analysis_prompt: e.target.value })}
            className="min-h-[120px] w-full rounded-lg border border-input bg-background p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-brand"
            placeholder="Lakukan analisis terhadap jawaban berikut..."
            required
          />
        </div>

        {/* 3. Summary Prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">3. Prompt Resume Ringkasan</label>
          <textarea
            value={prompts.summary_prompt}
            onChange={(e) => setPrompts({ ...prompts, summary_prompt: e.target.value })}
            className="min-h-[80px] w-full rounded-lg border border-input bg-background p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-brand"
            placeholder="Susun resume singkat..."
            required
          />
        </div>

        {/* 4. Recommendation Prompt */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">4. Prompt Rekomendasi Pendidikan & Parenting</label>
          <textarea
            value={prompts.recommendation_prompt}
            onChange={(e) => setPrompts({ ...prompts, recommendation_prompt: e.target.value })}
            className="min-h-[100px] w-full rounded-lg border border-input bg-background p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-brand"
            placeholder="Berikan rekomendasi pendidikan meliputi metode belajar..."
            required
          />
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Seluruh Prompt AI
          </button>
        </div>
      </form>
    </div>
  );
}
