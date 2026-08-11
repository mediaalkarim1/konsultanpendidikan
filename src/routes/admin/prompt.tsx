import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getMultiPromptsAction, saveMultiPromptsAction, forceActivateNewPromptAction } from "@/actions/admin-actions";

export const Route = createFileRoute("/admin/prompt")({
  component: PromptAIPage,
});

const DEFAULT_UNIFIED_PROMPT = `# PERAN
Anda adalah Konsultan Pendidikan Anak profesional yang berpengalaman dalam perkembangan anak usia TK, SD, SMP, dan SMA.

Gunakan bahasa Indonesia yang hangat, sopan, mudah dipahami, dan tidak menghakimi. Berikan analisis yang membangun, realistis, dan berorientasi pada solusi.

---

# DATA KONSULTASI
Nama Orang Tua: {{nama_orang_tua}}
Nama Anak: {{nama_anak}}
Jenjang Pendidikan: {{jenjang}}

---

# TUGAS
Baca SELURUH jawaban orang tua dengan seksama.

Temukan pola yang BENAR-BENAR muncul dari jawaban tersebut.

Jangan gunakan template kategori yang sama untuk setiap anak.

Setiap anak harus mendapatkan analisis yang berbeda sesuai jawaban orang tuanya.

---

# FORMAT OUTPUT

Hasil analisis hanya terdiri dari 4 bagian:

## 1. RINGKASAN AWAL
Berikan ringkasan singkat berdasarkan keseluruhan jawaban orang tua.
Jelaskan: gambaran umum anak, kecenderungan yang terlihat, kekuatan yang menonjol, hal utama yang perlu diperhatikan.
Gunakan 1–2 paragraf pendek.
Jangan membuat kesimpulan yang tidak didukung oleh jawaban.

## 2. AREA YANG PERLU DIPERHATIKAN
Baca seluruh jawaban dan tentukan sendiri area yang perlu diperhatikan berdasarkan jawaban tersebut.
JANGAN gunakan daftar kategori tetap seperti: konsentrasi, akademik, sosial, emosi, kemandirian, komunikasi, disiplin — kecuali memang benar-benar muncul dari jawaban.
Tampilkan SEMUA area yang ditemukan dari jawaban — jumlahnya tidak ditentukan (bisa 2, bisa 8, bisa 10).
Setiap area diawali dengan tanda ❗ dan menggunakan format heading ### ❗ [Nama Area]
Disertai penjelasan singkat berdasarkan jawaban orang tua.
Gabungkan jawaban dengan pola yang sama menjadi satu temuan.
Jangan mengarang area yang tidak didukung jawaban.
Jangan memberikan label negatif atau melakukan diagnosis medis.

## 3. MINAT & POTENSI
Temukan sendiri minat dan potensi anak berdasarkan jawaban orang tua.
Jangan gunakan template potensi yang sama untuk semua anak.
Tampilkan hanya potensi yang memiliki dasar dari jawaban.
Setiap potensi menggunakan format heading ### 🌟 [Nama Potensi]
Disertai penjelasan singkat berdasarkan jawaban.

## 4. REKOMENDASI
Berikan rekomendasi khusus untuk orang tua berdasarkan hasil analisis.
Rekomendasi harus berhubungan langsung dengan area yang perlu diperhatikan, minat, potensi, pola belajar, dan kebutuhan anak dari jawaban.
Gunakan rekomendasi konkret yang dapat dilakukan di rumah.
JANGAN memberikan rekomendasi sekolah atau lembaga pendidikan tertentu.
Gunakan heading ### 🎯 Rekomendasi Pendampingan
Disertai bullet point rekomendasi yang spesifik.

---

# ATURAN PENTING
- Jangan membuat narasi panjang yang mengalir.
- Jangan menggunakan template yang sama untuk semua anak.
- Gunakan format heading dan bullet yang terstruktur.
- Semua area perhatian WAJIB diawali tanda ❗.
- Semua potensi WAJIB diawali tanda 🌟.
- Rekomendasi WAJIB menggunakan 🎯.
- Jangan menakut-nakuti orang tua.
- Jangan melakukan diagnosis medis atau psikologis.
- Jangan memberikan rekomendasi sekolah.
- Jumlah area perhatian dan potensi mengikuti temuan dari jawaban.

Data Jawaban Konsultasi:
{{jawaban_lengkap}}`;

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
  const [activating, setActivating] = useState(false);
  const [isOldFormat, setIsOldFormat] = useState(false);

  const [promptId, setPromptId] = useState("");
  const [promptTitle, setPromptTitle] = useState("Prompt Analisis, Resume & Rekomendasi Pendidikan AI Engine");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("google/gemini-3.5-flash");

  const OLD_FORMAT_MARKERS = [
    "500 kata", "900 kata", "narasi yang mengalir", "FORMAT HASIL",
    "GAYA PENULISAN", "PANJANG ANALISIS", "narasi utuh dari awal hingga akhir",
    "# ROLE\n", "Pakar Analis Potensi", "RANGKUMAN PROFIL"
  ];
  const detectOldFormat = (p: string) => OLD_FORMAT_MARKERS.some(m => p.includes(m));

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await getMultiPromptsAction();
      if (data) {
        setPromptId(data.id || "");
        const dbPrompt = data.system_prompt || DEFAULT_UNIFIED_PROMPT;
        // If DB has old format prompt, show new default + flag warning
        if (detectOldFormat(dbPrompt)) {
          setSystemPrompt(DEFAULT_UNIFIED_PROMPT);
          setIsOldFormat(true);
        } else {
          setSystemPrompt(dbPrompt);
          setIsOldFormat(false);
        }
        if (data.selected_model) setSelectedModel(data.selected_model);
      } else {
        setSystemPrompt(DEFAULT_UNIFIED_PROMPT);
        setIsOldFormat(false);
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

  const handleForceActivate = async () => {
    setActivating(true);
    try {
      const res = await forceActivateNewPromptAction({ data: userEmail || "admin" });
      if (res && res.success) {
        toast.success("✅ Prompt baru (format 4 bagian) berhasil diaktifkan di database!");
        setIsOldFormat(false);
        await loadPrompts();
      } else {
        toast.error("Gagal mengaktifkan prompt: " + ((res as any)?.error || "Error"));
      }
    } catch (e: any) {
      toast.error("Error: " + (e.message || "Gagal mengaktifkan prompt"));
    } finally {
      setActivating(false);
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

      {isOldFormat && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30 p-4 flex gap-3">
          <div className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400 text-lg">⚠️</div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Prompt lama (format narasi) masih tersimpan di database</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Prompt AI yang tersimpan di Supabase masih menggunakan format narasi lama. AI Analysis akan menggunakan format baru dari kode, namun untuk memastikan konsistensi penuh, aktifkan prompt baru ke database sekarang.
            </p>
            <button
              type="button"
              onClick={handleForceActivate}
              disabled={activating}
              className="mt-2 flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50"
            >
              {activating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {activating ? "Mengaktifkan..." : "Aktifkan Prompt Baru ke Database Sekarang"}
            </button>
          </div>
        </div>
      )}

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
