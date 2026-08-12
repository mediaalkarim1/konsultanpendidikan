import { createServerFn } from "@tanstack/start";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { runCleanAiAnalysisEngine } from "./ai-engine";

export type AssessmentSubmitPayload = {
  parent_name: string;
  parent_phone: string;
  child_name: string;
  education_level: "tksd" | "smp" | "sma";
  answers: {
    question_id: string;
    question_text?: string;
    answer_text: string;
  }[];
};

export const submitAssessmentCleanAction = createServerFn({ method: "POST" })
  .validator((payload: AssessmentSubmitPayload) => payload)
  .handler(async (ctx) => {
    const { parent_name, parent_phone, child_name, education_level, answers } = ctx.data;

    if (!parent_name || !parent_name.trim()) throw new Error("Nama Orang Tua wajib diisi.");
    if (!parent_phone || !parent_phone.trim()) throw new Error("Nomor WhatsApp wajib diisi.");
    if (!child_name || !child_name.trim()) throw new Error("Nama Anak wajib diisi.");
    if (!education_level) throw new Error("Jenjang pendidikan wajib dipilih.");
    if (!answers || answers.length === 0) throw new Error("Jawaban assessment wajib diisi lengkap.");

    const supabaseAdmin = getAdminSupabase();

    // 1. Save Assessment Record to DB
    const fallbackParentName = `${parent_name.trim()} (Anak: ${child_name.trim()})`;
    const { data: consultation, error: cErr } = await supabaseAdmin
      .from("consultations")
      .insert({
        parent_name: fallbackParentName,
        whatsapp_number: parent_phone.trim(),
        level: education_level,
        status: "Sedang Dianalisis"
      })
      .select("*")
      .single();

    if (cErr || !consultation) {
      console.error("[submitAssessmentCleanAction] DB Insert Error:", cErr);
      throw new Error(`Gagal menyimpan data assessment: ${cErr?.message || "Kesalahan database."}`);
    }

    const assessmentId = consultation.id;

    // 2. Save Answers to DB ensuring text answer is saved (not raw UUID or "-")
    const answerRows = answers.map(a => {
      const cleanText = (a.answer_text || "").trim();
      if (!cleanText || cleanText === "-" || /^opt-[a-z0-9-]+$/i.test(cleanText) || /^[0-9a-f-]{36}$/i.test(cleanText)) {
        throw new Error(`Jawaban untuk pertanyaan "${a.question_text || a.question_id}" belum valid.`);
      }
      return {
        consultation_id: assessmentId,
        question_id: a.question_id,
        answer_text: cleanText
      };
    });

    const { error: aErr } = await supabaseAdmin.from("consultation_answers").insert(answerRows);
    if (aErr) {
      console.error("[submitAssessmentCleanAction] Answers Insert Error:", aErr);
      throw new Error(`Gagal menyimpan jawaban assessment: ${aErr.message}`);
    }

    // 3. Fetch all saved Q&A from DB to verify persistence before AI execution
    const { data: savedAnswers } = await supabaseAdmin
      .from("consultation_answers")
      .select("*, questions(question_text)")
      .eq("consultation_id", assessmentId);

    if (!savedAnswers || savedAnswers.length === 0) {
      throw new Error("Penyimpanan jawaban gagal terverifikasi di database.");
    }

    const formattedAnswersList = savedAnswers.map((sa, idx) => {
      const qText = sa.questions?.question_text || answers[idx]?.question_text || `Pertanyaan ${idx + 1}`;
      return `P: ${qText}\nJ: ${sa.answer_text}`;
    }).join("\n\n");

    // 4. Run Strict Evidence AI Analysis Engine
    const aiResponse = await runCleanAiAnalysisEngine(
      parent_name.trim(),
      child_name.trim(),
      education_level,
      parent_phone.trim(),
      formattedAnswersList
    );

    if (!aiResponse.success || !aiResponse.data) {
      throw new Error(aiResponse.error || "Analisis belum dapat dibuat. Silakan coba kembali.");
    }

    const analysisJson = aiResponse.data;

    // 5. Save Analysis JSON to consultation_analysis
    const { error: caErr } = await supabaseAdmin
      .from("consultation_analysis")
      .upsert({
        consultation_id: assessmentId,
        summary: JSON.stringify(analysisJson.summary || []),
        analysis: JSON.stringify(analysisJson),
        strengths: JSON.stringify(analysisJson.potentials || []),
        weaknesses: JSON.stringify(analysisJson.attentionAreas || []),
        potential: JSON.stringify(analysisJson.potentials || []),
        education_recommendation: JSON.stringify(analysisJson.recommendations || []),
        updated_at: new Date().toISOString()
      }, { onConflict: "consultation_id" });

    if (caErr) {
      console.error("[submitAssessmentCleanAction] Analysis Save Error:", caErr);
    }

    await supabaseAdmin.from("consultations").update({
      status: "Analisis AI Selesai",
      ai_result: JSON.stringify(analysisJson)
    }).eq("id", assessmentId);

    return {
      success: true,
      assessmentId,
      analysis: analysisJson
    };
  });
