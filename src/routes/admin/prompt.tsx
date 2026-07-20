import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Info, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/actions/admin-actions";

export const Route = createFileRoute("/admin/prompt")({
  component: PromptAIPage,
});

type Prompt = {
  id?: string;
  name: string;
  system_prompt: string;
  user_prompt_template: string;
  is_active: boolean;
  created_at?: string;
};

export function PromptAIPage() {
  const { userEmail } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("ai_prompts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setPrompts(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat prompt AI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrompt?.name) return toast.error("Nama prompt wajib diisi");
    
    setSaving(true);
    try {
      // If setting active, deactivate others first
      if (editingPrompt.is_active) {
        await supabase.from("ai_prompts").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000"); // update all
      }

      if (editingPrompt.id) {
        const { error } = await supabase.from("ai_prompts").update(editingPrompt).eq("id", editingPrompt.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_prompts").insert(editingPrompt);
        if (error) throw error;
      }
      
      logActivity({ data: { email: userEmail || "admin", action: "SAVE_PROMPT", details: { name: editingPrompt.name } } });
      toast.success("Prompt berhasil disimpan");
      setEditingPrompt(null);
      load();
    } catch (e: any) {
      toast.error("Gagal menyimpan prompt: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus prompt ini?")) return;
    try {
      const { error } = await supabase.from("ai_prompts").delete().eq("id", id);
      if (error) throw error;
      logActivity({ data: { email: userEmail || "admin", action: "DELETE_PROMPT", details: { id } } });
      toast.success("Prompt dihapus");
      load();
    } catch (e: any) {
      toast.error("Gagal menghapus: " + e.message);
    }
  };

  const handleSetActive = async (prompt: Prompt) => {
    try {
      await supabase.from("ai_prompts").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
      const { error } = await supabase.from("ai_prompts").update({ is_active: true }).eq("id", prompt.id);
      if (error) throw error;
      logActivity({ data: { email: userEmail || "admin", action: "SET_ACTIVE_PROMPT", details: { id: prompt.id } } });
      toast.success("Prompt diaktifkan");
      load();
    } catch (e: any) {
      toast.error("Gagal mengaktifkan prompt: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand">Manajemen Prompt AI</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola versi prompt untuk instruksi evaluasi Google Gemini.</p>
        </div>
        <button
          onClick={() => setEditingPrompt({ name: "Prompt Baru", system_prompt: "", user_prompt_template: "", is_active: false })}
          className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" /> Tambah Versi
        </button>
      </div>

      {editingPrompt ? (
        <form onSubmit={handleSave} className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b pb-4">
            <h2 className="text-lg font-semibold">{editingPrompt.id ? "Edit Prompt" : "Buat Prompt Baru"}</h2>
            <button type="button" onClick={() => setEditingPrompt(null)} className="text-sm text-muted-foreground hover:text-foreground">Batal</button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nama Versi</label>
              <input
                type="text"
                value={editingPrompt.name}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                required
              />
            </div>
            
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editingPrompt.is_active} onChange={e => setEditingPrompt({...editingPrompt, is_active: e.target.checked})} />
              Jadikan Prompt Aktif
            </label>

            <div>
              <label className="mb-1.5 block text-sm font-medium">System Prompt</label>
              <textarea
                value={editingPrompt.system_prompt}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, system_prompt: e.target.value })}
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                placeholder="Anda adalah analis pendidikan..."
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">User Prompt Template</label>
              <textarea
                value={editingPrompt.user_prompt_template}
                onChange={(e) => setEditingPrompt({ ...editingPrompt, user_prompt_template: e.target.value })}
                className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-brand"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Prompt
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map(p => (
            <div key={p.id} className={`rounded-xl border bg-card p-5 shadow-sm relative ${p.is_active ? 'border-green-500 ring-1 ring-green-500' : ''}`}>
              {p.is_active && (
                <span className="absolute -top-3 -right-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-3 w-3" /> Aktif
                </span>
              )}
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4 truncate">{p.system_prompt}</p>
              
              <div className="flex gap-2 flex-wrap mt-4">
                <button onClick={() => setEditingPrompt(p)} className="text-xs px-3 py-1.5 bg-brand/10 text-brand rounded-md hover:bg-brand/20">Edit</button>
                {!p.is_active && (
                  <button onClick={() => handleSetActive(p)} className="text-xs px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700">Set Aktif</button>
                )}
                <button onClick={() => p.id && handleDelete(p.id)} className="text-xs px-3 py-1.5 text-red-500 hover:bg-red-50 rounded-md ml-auto"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
          {prompts.length === 0 && (
            <div className="col-span-full py-10 text-center text-muted-foreground">Belum ada prompt.</div>
          )}
        </div>
      )}
    </div>
  );
}
