import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send } from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  tksd: "TK & SD",
  smp: "SMP",
  sma: "SMA",
};

type Question = {
  id: string;
  question_text: string;
  question_type: "text" | "textarea" | "single_choice" | "multi_choice";
  order_index: number;
  is_required: boolean;
  options: { id: string; option_text: string; order_index: number }[];
};

export const Route = createFileRoute("/formulir/$jenjang")({
  beforeLoad: ({ params }) => {
    if (!LEVEL_LABELS[params.jenjang]) throw notFound();
  },
  component: FormulirPage,
});

const identitySchema = z.object({
  parent_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  whatsapp_number: z
    .string()
    .trim()
    .regex(/^[0-9+]+$/, "Nomor hanya boleh angka")
    .min(10, "Nomor minimal 10 digit")
    .max(15, "Nomor maksimal 15 digit"),
});

function FormulirPage() {
  const { jenjang } = Route.useParams();
  const navigate = useNavigate();
  const label = LEVEL_LABELS[jenjang];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [parentName, setParentName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: qs, error } = await supabase
        .from("questions")
        .select("id, question_text, question_type, order_index, is_required, question_options(id, option_text, order_index)")
        .eq("level", jenjang)
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (cancelled) return;
      if (error) {
        toast.error("Gagal memuat pertanyaan");
        setLoading(false);
        return;
      }
      const mapped: Question[] = (qs ?? []).map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        order_index: q.order_index,
        is_required: q.is_required,
        options: (q.question_options ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
      }));
      setQuestions(mapped);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jenjang]);

  const totalSteps = questions.length + 1; // +1 for identity
  const answeredCount = useMemo(() => {
    let n = 0;
    if (parentName.trim() && whatsapp.trim()) n = 1;
    for (const q of questions) {
      const v = answers[q.id];
      if (Array.isArray(v) ? v.length > 0 : (v ?? "").trim() !== "") n++;
    }
    return n;
  }, [answers, questions, parentName, whatsapp]);
  const progress = Math.round((answeredCount / totalSteps) * 100);

  function setAnswer(qid: string, v: string | string[]) {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
    if (errors[qid]) setErrors((e) => ({ ...e, [qid]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const idParse = identitySchema.safeParse({ parent_name: parentName, whatsapp_number: whatsapp });
    const newErrors: Record<string, string> = {};
    if (!idParse.success) {
      for (const issue of idParse.error.issues) {
        newErrors[issue.path[0] as string] = issue.message;
      }
    }
    for (const q of questions) {
      if (!q.is_required) continue;
      const v = answers[q.id];
      const empty = Array.isArray(v) ? v.length === 0 : !v || !v.trim();
      if (empty) newErrors[q.id] = "Wajib diisi";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error("Mohon lengkapi data yang wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const { data: consultation, error: cErr } = await supabase
        .from("consultations")
        .insert({
          parent_name: parentName.trim(),
          whatsapp_number: whatsapp.trim(),
          level: jenjang as "tksd" | "smp" | "sma",
        })
        .select("id")
        .single();
      if (cErr || !consultation) throw cErr ?? new Error("Gagal menyimpan konsultasi");

      const answerRows = questions.map((q) => {
        const v = answers[q.id];
        const isChoice = q.question_type === "single_choice" || q.question_type === "multi_choice";
        return {
          consultation_id: consultation.id,
          question_id: q.id,
          answer_text: isChoice ? null : ((v as string) ?? "").trim() || null,
          selected_option_ids: isChoice
            ? Array.isArray(v)
              ? v
              : v
                ? [v as string]
                : []
            : [],
        };
      });
      if (answerRows.length > 0) {
        const { error: aErr } = await supabase.from("consultation_answers").insert(answerRows);
        if (aErr) throw aErr;
      }
      toast.success("Konsultasi berhasil dikirim");
      navigate({ to: "/sukses" });
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-brand hover:text-brand"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Formulir Konsultasi</p>
            <p className="text-sm font-semibold">Jenjang {label}</p>
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identity card */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-foreground">Identitas Orang Tua</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Data ini akan digunakan oleh Tim Konsultan untuk menghubungi Anda.
              </p>
              <div className="mt-5 space-y-4">
                <Field label="Nama Orang Tua" required error={errors.parent_name}>
                  <input
                    type="text"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className={inputClass(!!errors.parent_name)}
                    autoComplete="name"
                  />
                </Field>
                <Field label="Nomor WhatsApp" required error={errors.whatsapp_number}>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+]/g, ""))}
                    placeholder="Contoh: 081234567890"
                    className={inputClass(!!errors.whatsapp_number)}
                    autoComplete="tel"
                    maxLength={15}
                  />
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Pastikan nomor WhatsApp yang Anda masukkan benar dan aktif, karena Tim Konsultan
                    Sekolah Alam Al-Karim akan menghubungi Anda melalui nomor tersebut.
                  </p>
                </Field>
              </div>
            </section>

            {/* Dynamic questions */}
            {questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                Belum ada pertanyaan untuk jenjang ini.
              </div>
            ) : (
              <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-bold text-foreground">
                  Tes Potensi & Kesiapan Masa Depan Anak
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Jawab pertanyaan berikut sejujurnya untuk hasil rekomendasi terbaik.
                </p>
                <ol className="mt-6 space-y-6">
                  {questions.map((q, idx) => (
                    <li key={q.id}>
                      <Field
                        label={`${idx + 1}. ${q.question_text}`}
                        required={q.is_required}
                        error={errors[q.id]}
                      >
                        <QuestionInput
                          q={q}
                          value={answers[q.id]}
                          onChange={(v) => setAnswer(q.id, v)}
                        />
                      </Field>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95 disabled:opacity-60 sm:h-14 sm:text-base"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Kirim Konsultasi
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border ${hasError ? "border-destructive" : "border-border"} bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-brand focus:ring-2 focus:ring-brand/20`;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  if (q.question_type === "text") {
    return (
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(false)}
      />
    );
  }
  if (q.question_type === "textarea") {
    return (
      <textarea
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={`${inputClass(false)} resize-none`}
      />
    );
  }
  if (q.question_type === "single_choice") {
    return (
      <div className="space-y-2">
        {q.options.map((o) => (
          <label
            key={o.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
              value === o.id
                ? "border-brand bg-brand-soft text-foreground"
                : "border-border bg-background hover:border-brand/40"
            }`}
          >
            <input
              type="radio"
              name={q.id}
              checked={value === o.id}
              onChange={() => onChange(o.id)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span>{o.option_text}</span>
          </label>
        ))}
      </div>
    );
  }
  // multi_choice
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="space-y-2">
      {q.options.map((o) => {
        const checked = selected.includes(o.id);
        return (
          <label
            key={o.id}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
              checked
                ? "border-brand bg-brand-soft text-foreground"
                : "border-border bg-background hover:border-brand/40"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                const next = checked ? selected.filter((x) => x !== o.id) : [...selected, o.id];
                onChange(next);
              }}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span>{o.option_text}</span>
          </label>
        );
      })}
    </div>
  );
}
