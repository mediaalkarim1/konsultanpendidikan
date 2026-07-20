import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GripVertical, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pertanyaan")({
  component: KelolaPertanyaanPage,
});

type QuestionOption = {
  id: string;
  option_text: string;
  order_index: number;
};

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  order_index: number;
  is_required: boolean;
  is_active: boolean;
  options: QuestionOption[];
};

function KelolaPertanyaanPage() {
  const [level, setLevel] = useState("tksd");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Drag and Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [level]);

  async function fetchQuestions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*, question_options(*)")
      .eq("level", level)
      .order("order_index", { ascending: true });
    
    if (error) {
      toast.error("Gagal memuat pertanyaan");
    } else {
      const formatted = (data || []).map((q: any) => ({
        ...q,
        options: (q.question_options || []).sort((a: any, b: any) => a.order_index - b.order_index)
      }));
      setQuestions(formatted);
    }
    setLoading(false);
  }

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedId) return;

    const dragIndex = questions.findIndex(q => q.id === draggedId);
    if (dragIndex === dropIndex) return;

    const newQuestions = [...questions];
    const [draggedItem] = newQuestions.splice(dragIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedItem);
    
    // Update local state for immediate feedback
    const updatedWithOrder = newQuestions.map((q, idx) => ({ ...q, order_index: idx + 1 }));
    setQuestions(updatedWithOrder);
    setDraggedId(null);

    // Save to DB
    const updates = updatedWithOrder.map((q) => ({ id: q.id, order_index: q.order_index }));
    for (const update of updates) {
      await supabase.from("questions").update({ order_index: update.order_index }).eq("id", update.id);
    }
    toast.success("Urutan berhasil diperbarui");
  };

  // --- CRUD Handlers ---
  const toggleActive = async (id: string, current: boolean) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_active: !current } : q));
    await supabase.from("questions").update({ is_active: !current }).eq("id", id);
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Hapus pertanyaan ini?")) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
    await supabase.from("questions").delete().eq("id", id);
    toast.success("Pertanyaan dihapus");
  };

  const addQuestion = async () => {
    const newQ = {
      level,
      question_text: "Pertanyaan Baru",
      question_type: "text",
      order_index: questions.length + 1,
      is_required: true,
      is_active: true
    };
    const { data, error } = await supabase.from("questions").insert(newQ).select().single();
    if (data && !error) {
      setQuestions([...questions, { ...data, options: [] }]);
      toast.success("Pertanyaan ditambahkan");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kelola Pertanyaan</h1>
        <p className="text-sm text-muted-foreground">Sesuaikan pertanyaan untuk form tes potensi per jenjang.</p>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-medium text-sm">Pilih Jenjang:</label>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
        >
          <option value="tksd">TK & SD</option>
          <option value="smp">SMP</option>
          <option value="sma">SMA</option>
        </select>
        
        <button
          onClick={addQuestion}
          className="ml-auto flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Tambah Pertanyaan
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center">Memuat pertanyaan...</div>
      ) : questions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Belum ada pertanyaan untuk jenjang ini.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              draggable
              onDragStart={(e) => handleDragStart(e, q.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              className={`flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-all ${
                draggedId === q.id ? "opacity-50 border-brand" : ""
              }`}
            >
              <QuestionEditor q={q} onUpdate={fetchQuestions} onDelete={() => deleteQuestion(q.id)} onToggleActive={() => toggleActive(q.id, q.is_active)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Child Component for Editing Individual Question
function QuestionEditor({ q, onUpdate, onDelete, onToggleActive }: { q: Question, onUpdate: () => void, onDelete: () => void, onToggleActive: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.question_text);
  const [type, setType] = useState(q.question_type);
  const [req, setReq] = useState(q.is_required);
  
  const hasOptions = type === "single_choice" || type === "multi_choice";

  const handleSave = async () => {
    await supabase.from("questions").update({ question_text: text, question_type: type, is_required: req }).eq("id", q.id);
    setEditing(false);
    toast.success("Berhasil disimpan");
    onUpdate();
  };

  const handleAddOption = async () => {
    await supabase.from("question_options").insert({
      question_id: q.id,
      option_text: "Opsi Baru",
      order_index: q.options.length + 1
    });
    onUpdate();
  };

  const handleDeleteOption = async (optId: string) => {
    await supabase.from("question_options").delete().eq("id", optId);
    onUpdate();
  };

  if (!editing) {
    return (
      <div>
        <div className="flex items-start gap-3">
          <div className="cursor-grab pt-1 text-muted-foreground hover:text-foreground">
            <GripVertical className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{q.question_text}</h3>
              {!q.is_active && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">NONAKTIF</span>}
              {q.is_required && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">WAJIB</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tipe: {q.question_type.replace("_", " ")}</p>
            
            {hasOptions && q.options.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {q.options.map((opt) => (
                  <li key={opt.id}>• {opt.option_text}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="rounded p-1.5 text-muted-foreground hover:bg-muted"><Edit2 className="h-4 w-4" /></button>
            <button onClick={onToggleActive} className="rounded px-2 py-1 text-xs font-medium border border-border hover:bg-muted">
              {q.is_active ? "Nonaktifkan" : "Aktifkan"}
            </button>
            <button onClick={onDelete} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg bg-muted/30 p-4 border border-border">
      <div>
        <label className="mb-1 block text-xs font-medium">Teks Pertanyaan</label>
        <input type="text" value={text} onChange={e => setText(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium">Tipe Jawaban</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand">
            <option value="text">Teks Pendek</option>
            <option value="textarea">Teks Panjang</option>
            <option value="single_choice">Pilihan Ganda (Satu)</option>
            <option value="multi_choice">Pilihan Ganda (Banyak)</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium">Wajib Diisi?</label>
          <select value={req ? "yes" : "no"} onChange={e => setReq(e.target.value === "yes")} className="w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand">
            <option value="yes">Ya, Wajib</option>
            <option value="no">Tidak Wajib</option>
          </select>
        </div>
      </div>

      {hasOptions && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium">Pilihan Jawaban</label>
            <button onClick={handleAddOption} className="text-xs text-brand hover:underline flex items-center gap-1"><Plus className="h-3 w-3" /> Tambah</button>
          </div>
          <div className="space-y-2">
            {q.options.map(opt => (
              <OptionEditor key={opt.id} opt={opt} onDelete={() => handleDeleteOption(opt.id)} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={() => { setEditing(false); setText(q.question_text); setType(q.question_type); }} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Batal</button>
        <button onClick={handleSave} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm text-brand-foreground hover:opacity-90"><Save className="h-4 w-4" /> Simpan</button>
      </div>
    </div>
  );
}

function OptionEditor({ opt, onDelete, onUpdate }: { opt: QuestionOption, onDelete: () => void, onUpdate: () => void }) {
  const [val, setVal] = useState(opt.option_text);
  const handleBlur = async () => {
    if (val !== opt.option_text) {
      await supabase.from("question_options").update({ option_text: val }).eq("id", opt.id);
      onUpdate();
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input type="text" value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur} className="flex-1 rounded-md border border-input px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-brand" />
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
    </div>
  );
}
