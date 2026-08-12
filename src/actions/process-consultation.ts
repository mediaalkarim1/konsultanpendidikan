import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase-admin";
import { sendWhatsAppMessage, WaProviderConfig } from "./whatsapp-client";
import { runAiEngineAnalysis } from "./ai-engine";
import { renderWaTemplate, WaTemplateData } from "./wa-template-engine";
import { seedTKSDQuestionsDirect, DEFAULT_TKSD_QUESTIONS } from "./seed-tksd";
import { seedSMPQuestionsDirect, DEFAULT_SMP_QUESTIONS } from "./seed-smp";
import { seedSMAQuestionsDirect, DEFAULT_SMA_QUESTIONS } from "./seed-sma";

const ALL_DEFAULT_QUESTIONS = [...DEFAULT_TKSD_QUESTIONS, ...DEFAULT_SMP_QUESTIONS, ...DEFAULT_SMA_QUESTIONS];
const FALLBACK_QUESTIONS_MAP: Record<string, string> = {};
const FALLBACK_OPTIONS_MAP: Record<string, string> = {};

ALL_DEFAULT_QUESTIONS.forEach(q => {
  if (q.id && q.question_text) FALLBACK_QUESTIONS_MAP[q.id] = q.question_text;
  (q.options || []).forEach(o => {
    if (o.id && o.option_text) FALLBACK_OPTIONS_MAP[o.id] = o.option_text;
  });
});

export function resolveOptionAndAnswerText(
  a: { answer_text?: string | null; answer?: string | null; selected_option_ids?: string[] | null },
  optionsMapFromDb: Record<string, string> = {}
): string {
  const combinedMap = { ...FALLBACK_OPTIONS_MAP, ...optionsMapFromDb };
  const isTechId = (str: string) => !str || str === "-" || /^[0-9a-f-]{36}$/i.test(str) || /^(opt|smp-opt|sma-opt|tksd-q\d+-o\d+)/i.test(str);

  // 1. Check raw text if it is human-readable text
  const rawText = (a.answer_text || a.answer || "").trim();
  if (rawText && !isTechId(rawText)) {
    return rawText;
  }

  // 2. Check if raw text is a key in option map
  if (rawText && combinedMap[rawText]) {
    return combinedMap[rawText];
  }

  // 3. Resolve selected_option_ids
  const optionIds = a.selected_option_ids || [];
  if (optionIds.length > 0) {
    const texts: string[] = [];
    for (const oid of optionIds) {
      if (!oid) continue;
      if (combinedMap[oid]) {
        texts.push(combinedMap[oid]);
      } else if (!isTechId(oid)) {
        texts.push(oid);
      }
    }
    if (texts.length > 0) {
      return texts.join(", ");
    }
  }

  return "-";
}



export type ConsultationSubmitPayload = {
  parent_name: string;
  child_name: string;
  whatsapp_number: string;
  level: "tksd" | "smp" | "sma";
  answers: {
    question_id: string;
    answer_text?: string | null;
    selected_option_ids?: string[] | null;
  }[];
};

export const submitConsultationAction = createServerFn({ method: "POST" })

  .validator((payload: ConsultationSubmitPayload) => payload)
  .handler(async (ctx) => {
    const { parent_name, child_name, whatsapp_number, level, answers } = ctx.data;

    let supabaseAdmin: any;
    try {
      supabaseAdmin = getAdminSupabase();
    } catch (e: any) {
      console.error("[submitConsultationAction]: Init error", e);
      return { success: false, error: e.message || "Konfigurasi kredensial server belum lengkap." };
    }

    try {
      // 1. SIMPAN DATA KONSULTASI KE DATABASE
      let consultation: any = null;
      let cErr: any = null;

      // Primary Attempt: Rich insert with all fields
      const res1 = await supabaseAdmin
        .from("consultations")
        .insert({
          parent_name: parent_name.trim(),
          child_name: child_name.trim(),
          whatsapp_number: whatsapp_number.trim(),
          parent_phone: whatsapp_number.trim(),
          level,
          education_level: level,
          status: "Menunggu Analisis",
          ai_status: "Menunggu Analisis",
          consultation_status: "Menunggu Analisis"
        })
        .select("*")
        .single();

      consultation = res1.data;
      cErr = res1.error;

      // Fallback Attempt 1: Standard fields (parent_name, child_name, whatsapp_number, level, status)
      if (cErr) {
        console.warn("[Submit DB Warning]: Rich insert failed, attempting standard insert...", cErr.message);
        const res2 = await supabaseAdmin
          .from("consultations")
          .insert({
            parent_name: parent_name.trim(),
            child_name: child_name.trim(),
            whatsapp_number: whatsapp_number.trim(),
            level,
            status: "Menunggu Analisis"
          })
          .select("*")
          .single();

        consultation = res2.data;
        cErr = res2.error;
      }

      // Fallback Attempt 2: Minimal guaranteed fields
      if (cErr) {
        console.warn("[Submit DB Warning]: Standard insert failed, attempting minimal guaranteed insert...", cErr.message);
        const fallbackParentName = child_name.trim() 
          ? `${parent_name.trim()} (Anak: ${child_name.trim()})` 
          : parent_name.trim();

        const res3 = await supabaseAdmin
          .from("consultations")
          .insert({
            parent_name: fallbackParentName,
            whatsapp_number: whatsapp_number.trim(),
            level,
            status: "Menunggu Analisis"
          })

          .select("*")
          .single();

        consultation = res3.data;
        cErr = res3.error;
      }

      if (cErr || !consultation) {
        console.error("[Submit DB Error]: Failed to insert consultation", cErr);
        // Log to system_logs if table exists
        try {
          await supabaseAdmin.from("system_logs").insert({
            level: "error",
            source: "submitConsultationAction",
            message: `Gagal simpan konsultasi: ${cErr?.message || "Error DB"}`
          });
        } catch (_) {}
        return { success: false, error: `Gagal menyimpan data konsultasi: ${cErr?.message || "Error DB"}` };
      }

      // Log success to system_logs & sync to parents table if present
      try {
        await supabaseAdmin.from("system_logs").insert({
          level: "info",
          source: "submitConsultationAction",
          message: `Konsultasi baru dibuat ID: ${consultation.id} (${parent_name})`
        });
      } catch (_) {}

      // Optional sync to dedicated parents table
      try {
        await supabaseAdmin.from("parents" as any).insert({
          parent_name: parent_name.trim(),
          child_name: child_name.trim(),
          whatsapp_number: whatsapp_number.trim(),
          phone: whatsapp_number.trim(),
          level,
          consultation_id: consultation.id
        });
      } catch (_) {
        // Table parents optional
      }

      // Ensure questions exist for the given level before inserting answers
      try {
        const { data: existingQs } = await supabaseAdmin
          .from("questions")
          .select("id")
          .eq("level", level);

        if (!existingQs || existingQs.length === 0) {
          console.info(`[Submit Info]: No questions found in DB for level ${level}, auto-seeding...`);
          if (level === "tksd") await seedTKSDQuestionsDirect();
          else if (level === "smp") await seedSMPQuestionsDirect();
          else if (level === "sma") await seedSMAQuestionsDirect();
        }
      } catch (seedErr) {
        console.warn("Auto seed warning:", seedErr);
      }

      // Fetch valid question IDs in DB
      const { data: validQuestions } = await supabaseAdmin
        .from("questions")
        .select("id, question_text")
        .eq("level", level);

      const validQIds = new Set((validQuestions || []).map((q: any) => q.id));
      const questionsTextMap: Record<string, string> = {};
      (validQuestions || []).forEach((q: any) => { questionsTextMap[q.id] = q.question_text; });

        // Fetch DB question options map
        const allOptionIds = answers.flatMap(a => a.selected_option_ids || []);
        let optionsMapFromDb: Record<string, string> = {};
        if (allOptionIds.length > 0) {
          try {
            const { data: opts } = await supabaseAdmin.from("question_options").select("id, option_text").in("id", allOptionIds);
            if (opts) opts.forEach((o: any) => { optionsMapFromDb[o.id] = o.option_text; });
          } catch (_) {}
        }

        const mappedQAs: { q: string; a: string; question_id: string }[] = [];

        for (const a of answers) {
          let targetQId = a.question_id;
          const qText = a.question_text || questionsTextMap[a.question_id] || FALLBACK_QUESTIONS_MAP[a.question_id] || "Pertanyaan Kuesioner";
          const aText = resolveOptionAndAnswerText(a, optionsMapFromDb);

          mappedQAs.push({ q: qText, a: aText, question_id: targetQId });

          try {
            await supabaseAdmin.from("consultation_answers").insert({
              consultation_id: consultation.id,
              question_id: targetQId,
              question: qText,
              answer: aText,
              answer_text: aText,
              selected_option_ids: a.selected_option_ids || []
            });
          } catch (_) {
            await supabaseAdmin.from("consultation_answers").insert({
              consultation_id: consultation.id,
              question_id: targetQId,
              answer_text: aText,
              selected_option_ids: a.selected_option_ids || []
            });
          }
        }

        // [TAHAP 2 AUDIT LOG: DEBUG ANSWERS]
        console.log("==================================================");
        console.log("[DEBUG ANSWERS]");
        console.log("assessment_id:", consultation.id);
        console.log("education_level:", level);
        console.log("child_name:", child_name || "-");
        console.log("total_questions:", mappedQAs.length);
        console.log("total_answers:", mappedQAs.filter(item => item.a !== "-").length);
        console.log("\nanswers:");
        mappedQAs.forEach((item, idx) => {
          console.log(`\nQUESTION ${String(idx + 1).padStart(2, '0')}:`);
          console.log(item.q);
          console.log(`ANSWER ${String(idx + 1).padStart(2, '0')}:`);
          console.log(item.a);
        });
        console.log("==================================================");

        const validAnswerCount = mappedQAs.filter(item => item.a !== "-").length;
        if (validAnswerCount === 0) {
          console.error("❌ [DEBUG ANSWERS ERROR]: total_answers = 0 or all answers mapped to '-'! Stopping execution before AI.");
          await supabaseAdmin.from("consultations").update({ status: "Gagal Analisis", error_message: "Jawaban kuesioner tidak dapat dipetakan." }).eq("id", consultation.id);
          return { success: false, error: "Jawaban kuesioner tidak dapat dipetakan. Mohon isi kuesioner kembali." };
        }

        const formattedAnswers = mappedQAs.map(item => `P: ${item.q}\nJ: ${item.a}`).join("\n\n");

        // [TAHAP 4 AUDIT LOG: AI REAL INPUT]
        console.log("==================================================");
        console.log("[AI REAL INPUT]");
        console.log("Nama Anak:", child_name || "-");
        console.log("Jenjang:", level.toUpperCase());
        console.log("Jumlah Jawaban:", validAnswerCount);
        console.log("\n========================\n");
        mappedQAs.forEach((item, idx) => {
          console.log(`PERTANYAAN ${idx + 1}:`);
          console.log(item.q);
          console.log(`\nJAWABAN ORANG TUA:`);
          console.log(item.a);
          console.log("");
        });
        console.log("========================\n");

        // Update status to Sedang Dianalisis
        await supabaseAdmin.from("consultations").update({ status: "Sedang Dianalisis" }).eq("id", consultation.id);

        // 2 & 3. KIRIM KE GOOGLE GEMINI & ANALISIS AI
        let aiResult = await runAiEngineAnalysis(
          parent_name,
          child_name,
          level,
          whatsapp_number,
          formattedAnswers
        );

        if (!aiResult.success || !aiResult.data) {
          const errMsg = aiResult.error || "Analisis gagal dibuat. Silakan coba kembali.";
          await supabaseAdmin.from("consultations").update({ status: "Gagal Analisis", error_message: errMsg }).eq("id", consultation.id);
          return { success: false, error: errMsg };
        }

        // 4. SIMPAN HASIL ANALISIS KE DATABASE
        const d = aiResult.data;
        const { data: savedAnalysisRow } = await supabaseAdmin.from("consultation_analysis").upsert({
          consultation_id: consultation.id,
          summary: d.summary || "",
          analysis: d.analysis || "",
          strengths: d.strengths || "",
          weaknesses: d.weaknesses || "",
          potential: d.potential || d.strengths || "",
          risk: d.risk || d.weaknesses || "",
          education_recommendation: d.education_recommendation || "",
          updated_at: new Date().toISOString()
        }, { onConflict: "consultation_id" }).select("*").single();

        try {
          await supabaseAdmin.from("settings").upsert({
            key: `analysis.${consultation.id}`,
            value: aiResult.data
          }, { onConflict: "key" });
        } catch (_) {}

        // Update Status on consultations table
        await supabaseAdmin.from("consultations").update({
          status: "Analisis AI Selesai",
          ai_result: d.analysis || null
        }).eq("id", consultation.id);

        // [TAHAP 10 AUDIT LOG: DATABASE ANALYSIS AFTER SAVE]
        console.log("==================================================");
        console.log("[DATABASE ANALYSIS AFTER SAVE]");
        console.log("analysis_id:", savedAnalysisRow?.id || "saved");
        console.log("assessment_id:", consultation.id);
        console.log("created_at:", savedAnalysisRow?.created_at || new Date().toISOString());
        console.log("updated_at:", savedAnalysisRow?.updated_at || new Date().toISOString());
        console.log("summary:\n", savedAnalysisRow?.summary);
        console.log("weaknesses (attentionAreas):\n", savedAnalysisRow?.weaknesses);
        console.log("strengths (potentials):\n", savedAnalysisRow?.strengths);
        console.log("recommendations:\n", savedAnalysisRow?.education_recommendation);
        console.log("==================================================");


      // 5 & 6. NOTIFIKASI WHATSAPP ADMIN & ORANG TUA
      const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      
      const templateData: WaTemplateData = {
        nama: parent_name,
        nama_anak: child_name || "-",
        nomor: whatsapp_number,
        jenjang: level.toUpperCase(),
        tanggal: dateStr,
        status: "Analisis AI Selesai",
        id_konsultasi: consultation.id
      };

      const defaultAdminTpl = "Konsultasi Baru\n\nNama Orang Tua: {{nama}}\nNama Anak: {{nama_anak}}\nJenjang: {{jenjang}}\n\nAnalisis AI telah selesai.\n\nSilakan buka Dashboard Admin untuk melihat hasil lengkap.";
      const defaultParticipantTpl = "Terima kasih telah mengirimkan konsultasi pendidikan di Sekolah Alam Al-Karim.\n\nData konsultasi Anda telah kami terima.\n\nTim Konsultan Sekolah Alam Al-Karim akan segera menghubungi Anda melalui WhatsApp.";

      const adminTplContent = (waTemplates || []).find((t: any) => t.template_key === "admin_notification")?.content || defaultAdminTpl;
      const participantTplContent = (waTemplates || []).find((t: any) => t.template_key === "participant_notification")?.content || defaultParticipantTpl;

      const adminMsg = renderWaTemplate(adminTplContent, templateData);
      const parentMsg = renderWaTemplate(participantTplContent, templateData);

      const logNotification = async (type: string, target: string, message: string, result: any) => {
        try {
          await supabaseAdmin.from("notification_logs").insert({
            consultation_id: consultation.id,
            type,
            target_number: target,
            message,
            status: result.success ? "success" : "failed",
            response_payload: result.responsePayload,
            error_message: result.errorMessage
          });
        } catch (_) {}
        return result.success;
      };

      let adminWaStatus = "skipped";
      let parentWaStatus = "skipped";

      // 5. Admin mendapatkan notifikasi WhatsApp
      if (wfConfig.enable_wa_admin_notif !== false && adminContact) {
        try {
          const resAdmin = await sendWhatsAppMessage(adminContact, adminMsg, waConfig);
          adminWaStatus = (await logNotification("admin_wa", adminContact, adminMsg, resAdmin)) ? "success" : "failed";
        } catch (waErr) {
          console.warn("WA Admin send notice:", waErr);
        }
      }

      // 6. Orang tua mendapatkan notifikasi bahwa konsultasi telah diterima (tanpa hasil analisis)
      if (wfConfig.enable_wa_parent_notif !== false) {
        try {
          const resParent = await sendWhatsAppMessage(whatsapp_number, parentMsg, waConfig);
          parentWaStatus = (await logNotification("participant_wa", whatsapp_number, parentMsg, resParent)) ? "success" : "failed";
        } catch (waErr) {
          console.warn("WA Parent send notice:", waErr);
        }
      }

      try {
        await supabaseAdmin.from("consultations").update({
          notification_admin_status: adminWaStatus,
          notification_parent_status: parentWaStatus
        }).eq("id", consultation.id);
      } catch (_) {}

      return { success: true, consultationId: consultation.id };

    } catch (err: any) {
      console.error("[submitConsultationAction Error]:", err);
      return { success: false, error: err.message || "Terjadi kesalahan sistem." };
    }
  });

export const processConsultation = createServerFn({ method: "POST" })
  .validator((consultationId: string) => consultationId)
  .handler(async (ctx) => {
    const consultationId = ctx.data;
    let supabaseAdmin: any;
    try {
      supabaseAdmin = getAdminSupabase();
    } catch (e: any) {
      return { success: false, error: e.message || "Init error" };
    }

    const { data: consultation } = await supabaseAdmin.from("consultations").select("*").eq("id", consultationId).single();
    if (!consultation) return { success: false, error: "Consultation not found" };

    const { data: answers } = await supabaseAdmin.from("consultation_answers").select("*").eq("consultation_id", consultationId);

    let questionsMap: Record<string, string> = { ...FALLBACK_QUESTIONS_MAP };
    let optionsMap: Record<string, string> = { ...FALLBACK_OPTIONS_MAP };

    if (answers && answers.length > 0) {
      const qIds = answers.map((a: any) => a.question_id).filter(Boolean);
      const optIds = answers.flatMap((a: any) => a.selected_option_ids || []).filter(Boolean);

      if (qIds.length > 0) {
        try {
          const { data: qRows } = await supabaseAdmin.from("questions").select("id, question_text").in("id", qIds);
          (qRows || []).forEach((q: any) => { questionsMap[q.id] = q.question_text; });
        } catch (_) {}
      }
      if (optIds.length > 0) {
        try {
          const { data: optRows } = await supabaseAdmin.from("question_options").select("id, option_text").in("id", optIds);
          (optRows || []).forEach((o: any) => { optionsMap[o.id] = o.option_text; });
        } catch (_) {}
      }
    }

    const formattedAnswersList = answers ? answers.map((a: any) => {
      let qText = a.question_text || a.question || questionsMap[a.question_id] || FALLBACK_QUESTIONS_MAP[a.question_id];
      if (!qText || qText === "Pertanyaan Kuesioner" || qText === "Pertanyaan") {
        qText = questionsMap[a.question_id] || FALLBACK_QUESTIONS_MAP[a.question_id] || "Pertanyaan Kuesioner";
      }
      const optTexts = (a.selected_option_ids || []).map((oid: string) => optionsMap[oid] || FALLBACK_OPTIONS_MAP[oid] || oid).filter((t: string) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t));
      const rawAns = a.answer_text || a.answer;
      const isValidText = rawAns && rawAns !== "-" && !rawAns.startsWith("opt-") && !rawAns.startsWith("smp-opt-") && !rawAns.startsWith("sma-opt-") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawAns);
      const aText = isValidText ? rawAns : (optTexts.length > 0 ? optTexts.join(", ") : "-");
      return `P: ${qText}\nJ: ${aText}`;
    }).join("\n\n") : "";


    const aiResult = await runAiEngineAnalysis(
      consultation.parent_name,
      consultation.child_name || "-",
      consultation.level,
      consultation.whatsapp_number,
      formattedAnswersList
    );

    if (aiResult.success && aiResult.data) {
      const d = aiResult.data;

      // 1. Upsert into consultation_analysis table
      try {
        await supabaseAdmin.from("consultation_analysis").upsert({
          consultation_id: consultationId,
          summary: d.summary || "",
          analysis: d.analysis || "",
          strengths: d.strengths || "",
          weaknesses: d.weaknesses || "",
          potential: d.potential || d.strengths || "",
          risk: d.risk || d.weaknesses || "",
          education_recommendation: d.education_recommendation || "",
          updated_at: new Date().toISOString()
        }, { onConflict: "consultation_id" });
      } catch (caErr) {
        console.warn("[processConsultation] consultation_analysis upsert notice:", caErr);
      }

      // 2. Save in settings table
      try {
        await supabaseAdmin.from("settings").upsert({
          key: `analysis.${consultationId}`,
          value: aiResult.data
        }, { onConflict: "key" });
      } catch (_) {}

      // 3. Update consultations table status & ai_result
      await supabaseAdmin.from("consultations").update({
        status: "Analisis AI Selesai",
        ai_result: d.analysis || null
      }).eq("id", consultationId);

      return { success: true, provider: aiResult.providerName, data: d };

    }

    return { success: false, error: aiResult.error };
  });
