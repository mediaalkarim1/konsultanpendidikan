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

      // Insert consultation answers safely
      if (answers && answers.length > 0) {
        for (const a of answers) {
          let targetQId = a.question_id;

          // If question_id is not in DB, auto create placeholder question row to satisfy FK constraint
          if (!validQIds.has(targetQId)) {
            const { data: qCheck } = await supabaseAdmin
              .from("questions")
              .select("id")
              .eq("id", targetQId)
              .maybeSingle();

            if (!qCheck) {
              const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetQId);
              const { data: insertedQ } = await supabaseAdmin
                .from("questions")
                .insert({
                  ...(isUuid ? { id: targetQId } : {}),
                  level,
                  question_text: "Pertanyaan Kuesioner",
                  question_type: a.answer_text ? "text" : "single_choice",
                  order_index: 99,
                  is_required: false,
                  is_active: true
                })
                .select("id")
                .maybeSingle();

              if (insertedQ) targetQId = insertedQ.id;
            }
          }

          const qText = a.question_text || questionsTextMap[a.question_id] || FALLBACK_QUESTIONS_MAP[a.question_id] || "Pertanyaan Kuesioner";
          const optTextsFromFallback = (a.selected_option_ids || []).map((oid: string) => FALLBACK_OPTIONS_MAP[oid] || oid).filter((t: string) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t));
          const rawAnswerInput = a.answer_text || a.answer;
          const isAnswerValid = rawAnswerInput && rawAnswerInput !== "-" && !rawAnswerInput.startsWith("opt-") && !rawAnswerInput.startsWith("smp-opt-") && !rawAnswerInput.startsWith("sma-opt-") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawAnswerInput);
          const aText = isAnswerValid ? rawAnswerInput : (optTextsFromFallback.length > 0 ? optTextsFromFallback.join(", ") : "-");

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
      }

      // Format answers for AI Engine
      let formattedAnswers = "";
      if (answers && answers.length > 0) {
        const questionIds = answers.map(a => a.question_id).filter(Boolean);
        const { data: questionsList } = await supabaseAdmin.from("questions").select("id, question_text").in("id", questionIds);
        const questionsMap: Record<string, string> = { ...FALLBACK_QUESTIONS_MAP };
        if (questionsList) {
          questionsList.forEach((q: any) => { questionsMap[q.id] = q.question_text; });
        }

        const allOptionIds = answers.flatMap(a => a.selected_option_ids || []);
        let optionsMap: Record<string, string> = { ...FALLBACK_OPTIONS_MAP };
        if (allOptionIds.length > 0) {
          const { data: opts } = await supabaseAdmin.from("question_options").select("id, option_text").in("id", allOptionIds);
          if (opts) opts.forEach((o: any) => { optionsMap[o.id] = o.option_text; });
        }

          let qText = (a as any).question_text || (a as any).question || questionsMap[a.question_id] || FALLBACK_QUESTIONS_MAP[a.question_id];
          if (!qText || qText === "Pertanyaan Kuesioner" || qText === "Pertanyaan") {
            qText = questionsMap[a.question_id] || FALLBACK_QUESTIONS_MAP[a.question_id] || "Pertanyaan Kuesioner";
          }
          const optTexts = (a.selected_option_ids || []).map((oid: string) => optionsMap[oid] || FALLBACK_OPTIONS_MAP[oid] || oid).filter((t: string) => t && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) && !t.startsWith("opt-") && !t.startsWith("smp-opt-") && !t.startsWith("sma-opt-"));
          const rawAns = a.answer_text || (a as any).answer;
          const isValidText = rawAns && rawAns !== "-" && !rawAns.startsWith("opt-") && !rawAns.startsWith("smp-opt-") && !rawAns.startsWith("sma-opt-") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawAns);
          const aText = isValidText ? rawAns : (optTexts.length > 0 ? optTexts.join(", ") : (rawAns && rawAns !== "-" ? rawAns : "-"));
          return `P: ${qText}\nJ: ${aText}`;
      }

      // Update status to Sedang Dianalisis
      await supabaseAdmin.from("consultations").update({ status: "Sedang Dianalisis" }).eq("id", consultation.id);

      // Fetch WA Provider Config, WA Templates, and Workflow Config
      const { data: settingsData } = await supabaseAdmin.from("settings").select("*").in("key", ["wa.provider_config", "site.contact", "ai.workflow_config", "wa.templates"]);

      let waTemplates: any[] = [];
      try {
        const { data: tData } = await supabaseAdmin.from("wa_templates" as any).select("*");
        if (tData && tData.length > 0) waTemplates = tData;
      } catch (_) {}

      if (waTemplates.length === 0) {
        const tRow = (settingsData || []).find((s: any) => s.key === "wa.templates");
        if (tRow && Array.isArray(tRow.value)) waTemplates = tRow.value;
      }

      const waConfig: WaProviderConfig = (settingsData || []).find((s: any) => s.key === "wa.provider_config")?.value || { provider: "mock", api_url: "", api_key: "" };
      const adminContact = (settingsData || []).find((s: any) => s.key === "site.contact")?.value?.whatsapp || "081234567890";
      const wfConfig = (settingsData || []).find((s: any) => s.key === "ai.workflow_config")?.value || {
        enable_wa_admin_notif: true,
        enable_wa_parent_notif: true,
        enable_ai_analysis: true,
        enable_ai_summary: true,
        enable_ai_recommendation: true,
        enable_auto_save: true,
        auto_fallback: true
      };

      // 2 & 3. KIRIM KE GOOGLE GEMINI & ANALISIS AI
      let aiResult = await runAiEngineAnalysis(
        parent_name,
        child_name,
        level,
        whatsapp_number,
        formattedAnswers
      );

      // Log to ai_logs table
      try {
        await supabaseAdmin.from("ai_logs").insert({
          consultation_id: consultation.id,
          prompt: `Analisis Kuesioner ${level.toUpperCase()}:\n${formattedAnswers}`,
          response: aiResult.data ? JSON.stringify(aiResult.data) : aiResult.error || "-",
          model: "Google Gemini",
          token_usage: { provider: aiResult.providerName || "gemini" },
          status: aiResult.success ? "success" : "failed",
          error_message: aiResult.error || null
        });
      } catch (logErr) {
        console.warn("ai_logs insert warning:", logErr);
      }

      if (!aiResult.success || !aiResult.data) {
        const errMsg = aiResult.error || "Gagal melakukan analisis AI.";
        try {
          await supabaseAdmin.from("consultations").update({
            status: "Gagal Analisis",
            error_message: errMsg
          }).eq("id", consultation.id);
        } catch (_) {
          await supabaseAdmin.from("consultations").update({ status: "Gagal Analisis" }).eq("id", consultation.id);
        }

      } else {
        // 4. SIMPAN HASIL ANALISIS KE DATABASE
        // Save analysis data safely in settings table
        try {
          await supabaseAdmin.from("settings").upsert({
            key: `analysis.${consultation.id}`,
            value: aiResult.data
          }, { onConflict: "key" });
        } catch (_) {}

        // Update Status on consultations table
        try {
          await supabaseAdmin.from("consultations").update({
            status: "Analisis AI Selesai"
          }).eq("id", consultation.id);
        } catch (statusErr) {
          console.warn("[submitConsultationAction] status update error:", statusErr);
        }
      }


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
      try {
        await supabaseAdmin.from("settings").upsert({
          key: `analysis.${consultationId}`,
          value: aiResult.data
        }, { onConflict: "key" });
      } catch (_) {}

      await supabaseAdmin.from("consultations").update({
        status: "Analisis AI Selesai"
      }).eq("id", consultationId);

      return { success: true, provider: aiResult.providerName };

    }

    return { success: false, error: aiResult.error };
  });
