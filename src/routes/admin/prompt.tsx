import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminSettings, saveAdminSetting } from "@/server/admin-settings";
import { Save, Loader2, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/prompt")({
  component: PromptAIPage,
});

function PromptAIPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promptData, setPromptData] = useState({
    system_prompt: "",
    user_prompt_template: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminSettings({ data: "mediaalkarim" });
        const aiPrompt = data.find((s: any) => s.key === "ai.prompt")?.value;
        if (aiPrompt) {
          setPromptData({
            system_prompt: aiPrompt.system_prompt || "",
            user_prompt_template: aiPrompt.user_prompt_template || "",
          });
        }
      } catch (e) {
        console.error(e);
        toast.error("Gagal memuat prompt AI");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveAdminSetting({
        data: {
          token: "mediaalkarim",
          key: "ai.prompt",
          value: promptData,
        }
      });
      toast.success("Prompt AI berhasil disimpan");
    } catch (e) {
      toast.error("Gagal menyimpan prompt");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center">Memuat konfigurasi prompt...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prompt AI</h1>
        <p className="text-sm text-muted-foreground">Sesuaikan instruksi yang dikirimkan ke Google Gemini.</p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Variabel Dinamis:</strong> Anda dapat menggunakan variabel <code>{`{{nama}}`}</code>, <code>{`{{jenjang}}`}</code>, dan <code>{`{{jawaban}}`}</code> pada Template User Prompt. Sistem akan otomatis menggantinya dengan data peserta saat form dikirim.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-5">
          <div>
            <label className="mb-2 block font-medium">System Prompt</label>
            <p className="mb-2 text-xs text-muted-foreground">Instruksi dasar untuk mengatur persona dan perilaku AI.</p>
            <textarea
              rows={4}
              value={promptData.system_prompt}
              onChange={(e) => setPromptData({ ...promptData, system_prompt: e.target.value })}
              className="w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          
          <div>
            <label className="mb-2 block font-medium">User Prompt Template</label>
            <p className="mb-2 text-xs text-muted-foreground">Format pesan utama yang menggabungkan data peserta untuk dianalisis oleh AI.</p>
            <textarea
              rows={8}
              value={promptData.user_prompt_template}
              onChange={(e) => setPromptData({ ...promptData, user_prompt_template: e.target.value })}
              className="w-full resize-y rounded-lg border border-input bg-background px-4 py-3 text-sm font-mono outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground shadow-sm hover:opacity-90 disabled:opacity-70 sm:w-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Prompt
        </button>
      </form>
    </div>
  );
}
