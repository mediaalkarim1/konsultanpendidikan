import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Info, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getMultiPromptsAction, saveMultiPromptsAction } from "@/actions/admin-actions";

export const Route = createFileRoute("/admin/prompt")({
  component: PromptAIPage,
});

const PROMPT_CONFIGS = [
  {
    key: "system_prompt" as const,
    title: "System Prompt (Peran Utama AI)",
    description: "Instruksi mengenai peran utama, persona, dan aturan dasar AI Engine.",
    placeholder: "Anda adalah Pakar Analis Potensi & Konsultan Pendidikan Anak...",
    rows: 4,
  },
  {
    key: "analysis_prompt" as const,
    title: "Prompt Analisis Kondisi & Gaya Belajar",
    description: "Instruksi mendalam untuk menganalisis gaya belajar, potensi, serta tantangan anak.",
    placeholder: "Lakukan analisis terhadap jawaban kuesioner berikut...",
    rows: 6,
  },
  {
    key: "summary_prompt" as const,
    title: "Prompt Resume Ringkasan",
    description: "Instruksi untuk menyusun eksekutif summary hasil analisis secara padat dan jelas.",
    placeholder: "Susun resume singkat...",
    rows: 4,
  },
  {
    key: "recommendation_prompt" as const,
    title: "Prompt Rekomendasi Pendidikan & Parenting",
    description: "Instruksi untuk menghasilkan rekomendasi jenjang/sekolah dan strategi mendidik anak.",
    placeholder: "Berikan rekomendasi pendidikan meliputi metode belajar...",
    rows: 5,
  },
];

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
      toast.success("Konfigurasi Prompt AI berhasil disimpan");
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
            <Sparkles className="h-5 w-5 text-brand" /> Konfigurasi Prompt AI
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola <strong>Judul Prompt</strong> dan <strong>Instruksi Prompt</strong> untuk System, Analisis, Resume, dan Rekomendasi Pendidikan yang digunakan oleh AI Engine.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 p-4 flex gap-3 text-sm text-blue-700 dark:text-blue-300">
          <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-semibold">Variabel Dinamis yang Tersedia:</p>
            <p className="text-xs mt-1">
              Gunakan <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-medium">{"{{nama_orang_tua}}"}</code>, <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-medium font-medium">{"{{jenjang}}"}</code>, dan <code className="bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded font-mono font-medium">{"{{jawaban_lengkap}}"}</code> di dalam instruksi prompt.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {PROMPT_CONFIGS.map((cfg, idx) => (
            <div key={cfg.key} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-xs font-bold text-brand">
                    #{idx + 1}
                  </span>
                  <span className="font-semibold text-foreground text-base">{cfg.title}</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                  <FileText className="h-3 w-3" /> {cfg.key}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Judul Prompt
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={cfg.title}
                    className="w-full rounded-lg border border-input bg-muted/40 px-3.5 py-2 text-sm font-medium text-foreground outline-none cursor-default"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Instruksi Prompt
                  </label>
                  <textarea
                    value={prompts[cfg.key]}
                    onChange={(e) => setPrompts({ ...prompts, [cfg.key]: e.target.value })}
                    rows={cfg.rows}
                    className="w-full rounded-lg border border-input bg-background p-3.5 text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition shadow-xs"
                    placeholder={cfg.placeholder}
                    required
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">{cfg.description}</p>
                </div>
              </div>
            </div>
          ))}
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
