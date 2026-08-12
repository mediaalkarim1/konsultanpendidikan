import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { submitConsultationAction } from "@/actions/process-consultation";
import { seedTKSDAction, DEFAULT_TKSD_QUESTIONS, isNewTKSDQuestions } from "@/actions/seed-tksd";
import { seedSMPAction, DEFAULT_SMP_QUESTIONS, isNewSMPQuestions } from "@/actions/seed-smp";
import { seedSMAAction, DEFAULT_SMA_QUESTIONS, isNewSMAQuestions } from "@/actions/seed-sma";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, Send, Sparkles } from "lucide-react";

const LEVEL_LABELS: Record<string, string> = {
  tksd: "TK & SD",
  smp: "SMP",
  sma: "SMA",
};

const JENJANG_OPENING_SENTENCES: Record<string, { badge: string; title: string; greeting: string }> = {
  tksd: {
    badge: "Formulir Konsultasi Jenjang TK & SD (Usia Dini)",
    title: "Analisis Kebutuhan Tumbuh Kembang & Potensi Usia Emas",
    greeting: "Selamat datang di Kuesioner Konsultasi Jenjang TK & SD! Pada fase usia emas ini, setiap anak tumbuh dengan keunikan, cara belajar, dan potensi yang luar biasa. Silakan isi pertanyaan di bawah ini untuk membantu kami menganalisis kebutuhan perkembangan anak dan memberikan rekomendasi pendidikan terbaik bagi ananda."
  },
  smp: {
    badge: "Formulir Konsultasi Jenjang SMP (Menengah Pertama)",
    title: "Analisis Potensi, Karakter & Pendampingan Remaja",
    greeting: "Selamat datang di Kuesioner Konsultasi Jenjang SMP! Masa remaja adalah tahap krusial dalam pembentukan karakter, eksplorasi bakat, dan kemandirian anak. Silakan lengkapi pertanyaan berikut agar kami dapat memetakan potensi belajar, tantangan remaja, serta rekomendasi sekolah menengah yang paling tepat."
  },
  sma: {
    badge: "Formulir Konsultasi Jenjang SMA (Menengah Atas)",
    title: "Analisis Pemetaan Jurusan, Kesiapan Kuliah & Masa Depan",
    greeting: "Selamat datang di Kuesioner Konsultasi Jenjang SMA! Jenjang SMA merupakan jembatan penting menuju pendidikan tinggi dan karier masa depan ananda. Silakan jawab pertanyaan-pertanyaan berikut untuk mendapatkan pemetaan minat, kesiapan universitas, serta panduan arah masa depan anak."
  }
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
  parent_name: z.string().trim().min(2, "Nama orang tua minimal 2 karakter").max(100),
  child_name: z.string().trim().min(2, "Nama anak minimal 2 karakter").max(100),
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
  const [submitStatusText, setSubmitStatusText] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState(0); // 0 = Identity, 1..N = Questions
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let { data: qs, error } = await supabase
        .from("questions")
        .select("id, question_text, question_type, order_index, is_required, question_options(id, option_text, order_index)")
        .eq("level", jenjang as "tksd" | "smp" | "sma")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (cancelled) return;
      if (error) {
        toast.error("Gagal memuat pertanyaan");
        setLoading(false);
        return;
      }

      let mapped: Question[] = (qs ?? []).map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        order_index: q.order_index,
        is_required: q.is_required,
        options: (q.question_options ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
      }));

      if (jenjang === "tksd" && !isNewTKSDQuestions(mapped)) {
        mapped = DEFAULT_TKSD_QUESTIONS;
        seedTKSDAction().catch((err) => console.warn("Auto-seed TKSD error:", err));
      } else if (jenjang === "smp" && !isNewSMPQuestions(mapped)) {
        mapped = DEFAULT_SMP_QUESTIONS;
        seedSMPAction().catch((err) => console.warn("Auto-seed SMP error:", err));
      } else if (jenjang === "sma" && !isNewSMAQuestions(mapped)) {
        mapped = DEFAULT_SMA_QUESTIONS;
        seedSMAAction().catch((err) => console.warn("Auto-seed SMA error:", err));
      }

      setQuestions(mapped);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [jenjang]);

  const totalSteps = questions.length + 1; // +1 for identity
  const progress = Math.round(((currentStep + 1) / totalSteps) * 100);

  function setAnswer(qid: string, v: string | string[]) {
    setAnswers((prev) => ({ ...prev, [qid]: v }));
    if (errors[qid]) setErrors((e) => ({ ...e, [qid]: "" }));
  }

  function handleNext() {
    if (currentStep === 0) {
      const idParse = identitySchema.safeParse({ parent_name: parentName, child_name: childName, whatsapp_number: whatsapp });
      const newErrors: Record<string, string> = {};
      if (!idParse.success) {
        for (const issue of idParse.error.issues) {
          newErrors[issue.path[0] as string] = issue.message;
        }
      }
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        toast.error("Mohon lengkapi identitas yang wajib diisi");
        return;
      }
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const currentQ = questions[currentStep - 1];
    if (currentQ && currentQ.is_required) {
      const v = answers[currentQ.id];
      const empty = Array.isArray(v) ? v.length === 0 : !v || !v.trim();
      if (empty) {
        setErrors((prev) => ({ ...prev, [currentQ.id]: "Wajib diisi" }));
        toast.error("Mohon jawab pertanyaan ini terlebih dahulu");
        return;
      }
    }

    if (currentStep < questions.length) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate({ to: "/" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const idParse = identitySchema.safeParse({ parent_name: parentName, child_name: childName, whatsapp_number: whatsapp });
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
      toast.error("Mohon lengkapi seluruh data yang wajib diisi");
      return;
    }

    setSubmitting(true);
    setSubmitStatusText("Mengirim Data...");

    try {
      const formattedAnswersPayload = questions.map((q) => {
        const v = answers[q.id];
        const isChoice = q.question_type === "single_choice" || q.question_type === "multi_choice";
        const selectedOptTexts = isChoice && q.options
          ? q.options.filter((o) => (Array.isArray(v) ? v.includes(o.id) : v === o.id)).map((o) => o.option_text)
          : [];
        const choiceTextStr = selectedOptTexts.join(", ");

        return {
          question_id: q.id,
          question_text: q.question_text,
          answer_text: isChoice ? (choiceTextStr || null) : (((v as string) ?? "").trim() || null),
          selected_option_ids: isChoice
            ? Array.isArray(v)
              ? v
              : v
                ? [v as string]
                : []
            : [],
        };
      });

      setSubmitStatusText("Menyimpan Konsultasi...");
      const res = await submitConsultationAction({
        data: {
          parent_name: parentName.trim(),
          child_name: childName.trim(),
          whatsapp_number: whatsapp.trim(),
          level: jenjang as "tksd" | "smp" | "sma",
          answers: formattedAnswersPayload
        }
      });

      if (!res.success) {
        toast.error(res.error || "Gagal menyimpan data konsultasi");
        setSubmitting(false);
        setSubmitStatusText("");
        return;
      }

      setSubmitStatusText("Menghubungi Google Gemini...");
      await new Promise((r) => setTimeout(r, 300));

      setSubmitStatusText("Menganalisis Data...");
      await new Promise((r) => setTimeout(r, 300));

      setSubmitStatusText("Menyimpan Hasil Analisis...");
      await new Promise((r) => setTimeout(r, 300));

      setSubmitStatusText("Mengirim WhatsApp...");
      await new Promise((r) => setTimeout(r, 300));

      setSubmitStatusText("Selesai");

      toast.success("Konsultasi berhasil dikirim!");
      navigate({ to: "/sukses", search: { id: res.consultationId } });
    } catch (err: any) {
      console.error("Submit consultation error:", err);
      toast.error(err.message || "Gagal mengirim data konsultasi. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
      setSubmitStatusText("");
    }
  }

  const currentQ = currentStep > 0 ? questions[currentStep - 1] : null;

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-3xl items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-brand hover:text-brand"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {currentStep === 0
                ? "Langkah 1 dari " + totalSteps + ": Identitas"
                : "Pertanyaan " + currentStep + " dari " + questions.length}
            </p>
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
            {currentStep === 0 ? (
              <>
                {/* Jenjang Opening Banner Card */}
                {JENJANG_OPENING_SENTENCES[jenjang] && (
                  <section className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-soft/80 via-background to-brand-soft/30 p-5 shadow-sm sm:p-6">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-foreground font-bold shadow-xs">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <span className="inline-block rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                          {JENJANG_OPENING_SENTENCES[jenjang].badge}
                        </span>
                        <h1 className="text-lg font-bold text-foreground sm:text-xl">
                          {JENJANG_OPENING_SENTENCES[jenjang].title}
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground font-medium">
                          {JENJANG_OPENING_SENTENCES[jenjang].greeting}
                        </p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Identity card */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-bold text-foreground">Identitas Orang Tua & Anak</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Data ini akan digunakan oleh Tim Konsultan untuk menghubungi Anda dan menyusun laporan potensi anak.
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
                    <Field label="Nama Anak" required error={errors.child_name}>
                      <input
                        type="text"
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        placeholder="Contoh: Ananda Ali"
                        className={inputClass(!!errors.child_name)}
                        autoComplete="off"
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

                <div className="flex gap-3 pt-2">
                  <Link
                    to="/"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                  </Link>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95"
                  >
                    Lanjut ke Pertanyaan
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : currentQ ? (
              <>
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 space-y-5">
                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                      <Sparkles className="h-3.5 w-3.5" /> Pertanyaan {currentStep} dari {questions.length}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Jenjang {label}
                    </span>
                  </div>

                  <Field
                    label={`${currentStep}. ${currentQ.question_text}`}
                    required={currentQ.is_required}
                    error={errors[currentQ.id]}
                  >
                    <QuestionInput
                      q={currentQ}
                      value={answers[currentQ.id]}
                      onChange={(v) => setAnswer(currentQ.id, v)}
                    />
                  </Field>
                </section>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-background px-6 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                  </button>

                  {currentStep < questions.length ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95"
                    >
                      Selanjutnya
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95 disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {submitStatusText || "Mengirim..."}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Kirim Konsultasi
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : null}
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
  const maxMatch = q.question_text.match(/maksimal\s+(\d+)/i) || q.question_text.match(/max\s+(\d+)/i);
  const maxAllowed = maxMatch ? parseInt(maxMatch[1], 10) : null;

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
                if (!checked && maxAllowed !== null && selected.length >= maxAllowed) {
                  toast.error(`Maksimal memilih ${maxAllowed} pilihan`);
                  return;
                }
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
