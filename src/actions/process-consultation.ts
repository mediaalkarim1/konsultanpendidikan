import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, WaProviderConfig } from "./whatsapp-client";
import { runAiEngineAnalysis } from "./ai-engine";
import { renderWaTemplate, WaTemplateData } from "./wa-template-engine";

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

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase env vars");
      return { success: false, error: "Konfigurasi kredensial server belum lengkap." };
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // 1. SIMPAN DATA KE DATABASE (Atomically via Service Role)
      const { data: consultation, error: cErr } = await supabaseAdmin
        .from("consultations")
        .insert({
          parent_name: parent_name.trim(),
          child_name: child_name.trim(),
          whatsapp_number: whatsapp_number.trim(),
          level,
          status: "Menunggu Analisis AI",
          error_message: null
        })
        .select("*")
        .single();

      if (cErr || !consultation) {
        console.error("[Submit DB Error]: Failed to insert consultation", cErr);
        return { success: false, error: "Gagal menyimpan data konsultasi ke database." };
      }

      // Insert consultation answers
      if (answers && answers.length > 0) {
        const answerRows = answers.map((a) => ({
          consultation_id: consultation.id,
          question_id: a.question_id,
          answer_text: a.answer_text || null,
          selected_option_ids: a.selected_option_ids || []
        }));

        const { error: aErr } = await supabaseAdmin.from("consultation_answers").insert(answerRows);
        if (aErr) {
          console.error("[Submit DB Error]: Failed to insert answers", aErr);
          await supabaseAdmin.from("consultations").delete().eq("id", consultation.id);
          return { success: false, error: "Gagal menyimpan jawaban kuesioner ke database." };
        }
      }

      // Format answers for AI Engine
      let formattedAnswers = "";
      if (answers && answers.length > 0) {
        const questionIds = answers.map(a => a.question_id).filter(Boolean);
        const { data: questionsList } = await supabaseAdmin.from("questions").select("id, question_text").in("id", questionIds);
        const questionsMap: Record<string, string> = {};
        if (questionsList) {
          questionsList.forEach(q => { questionsMap[q.id] = q.question_text; });
        }

        const allOptionIds = answers.flatMap(a => a.selected_option_ids || []);
        let optionsMap: Record<string, string> = {};
        if (allOptionIds.length > 0) {
          const { data: opts } = await supabaseAdmin.from("question_options").select("id, option_text").in("id", allOptionIds);
          if (opts) opts.forEach(o => { optionsMap[o.id] = o.option_text; });
        }

        formattedAnswers = answers.map(a => {
          const qText = questionsMap[a.question_id] || "Pertanyaan";
          const optTexts = (a.selected_option_ids || []).map((oid: string) => optionsMap[oid] || oid).filter(Boolean);
          const aText = a.answer_text || (optTexts.length > 0 ? optTexts.join(", ") : "-");
          return `P: ${qText}\nJ: ${aText}`;
        }).join("\n\n");
      }

      // Update status to Sedang Dianalisis
      await supabaseAdmin.from("consultations").update({ status: "Sedang Dianalisis" }).eq("id", consultation.id);

      // Fetch WA Provider Config, WA Templates, and Workflow Config
      const [{ data: settingsData }, { data: waTemplates }] = await Promise.all([
        supabaseAdmin.from("settings").select("*").in("key", ["wa.provider_config", "site.contact", "ai.workflow_config"]),
        supabaseAdmin.from("wa_templates").select("*")
      ]);

      const waConfig: WaProviderConfig = settingsData?.find(s => s.key === "wa.provider_config")?.value || { provider: "mock", api_url: "", api_key: "" };
      const adminContact = settingsData?.find(s => s.key === "site.contact")?.value?.whatsapp;
      const wfConfig = settingsData?.find(s => s.key === "ai.workflow_config")?.value || {
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

      if (!aiResult.success || !aiResult.data) {
        const errMsg = aiResult.error || "Gagal melakukan analisis AI.";
        await supabaseAdmin.from("consultations").update({
          status: "Gagal Analisis AI",
          error_message: errMsg
        }).eq("id", consultation.id);
      } else {
        // 4. SIMPAN HASIL ANALISIS KE DATABASE
        const analysisData = aiResult.data;
        if (wfConfig.enable_auto_save !== false) {
          await supabaseAdmin.from("consultation_analysis").upsert({
            consultation_id: consultation.id,
            summary: wfConfig.enable_ai_summary !== false ? analysisData.summary : "-",
            analysis: analysisData.analysis,
            strengths: analysisData.strengths,
            weaknesses: analysisData.weaknesses,
            potential: analysisData.potential,
            risk: analysisData.risk,
            education_recommendation: wfConfig.enable_ai_recommendation !== false ? analysisData.education_recommendation : "-"
          }, { onConflict: "consultation_id" });
        }

        // Update Status to Analisis AI Selesai
        await supabaseAdmin.from("consultations").update({
          status: "Analisis AI Selesai",
          ai_result: analysisData.analysis,
          error_message: null
        }).eq("id", consultation.id);
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

      const adminTplContent = waTemplates?.find((t: any) => t.template_key === "admin_notification")?.content || defaultAdminTpl;
      const participantTplContent = waTemplates?.find((t: any) => t.template_key === "participant_notification")?.content || defaultParticipantTpl;

      const adminMsg = renderWaTemplate(adminTplContent, templateData);
      const parentMsg = renderWaTemplate(participantTplContent, templateData);

      const logNotification = async (type: string, target: string, message: string, result: any) => {
        await supabaseAdmin.from("notification_logs").insert({
          consultation_id: consultation.id,
          type,
          target_number: target,
          message,
          status: result.success ? "success" : "failed",
          response_payload: result.responsePayload,
          error_message: result.errorMessage
        });
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

      await supabaseAdmin.from("consultations").update({
        notification_admin_status: adminWaStatus,
        notification_parent_status: parentWaStatus
      }).eq("id", consultation.id);

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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return { success: false, error: "Missing config" };
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: consultation } = await supabaseAdmin.from("consultations").select("*").eq("id", consultationId).single();
    if (!consultation) return { success: false, error: "Consultation not found" };

    const { data: answers } = await supabaseAdmin.from("consultation_answers").select("*").eq("consultation_id", consultationId);

    const formattedAnswersList = answers ? answers.map(a => `P: ${a.question_id}\nJ: ${a.answer_text || (a.selected_option_ids || []).join(", ")}`).join("\n\n") : "";

    const aiResult = await runAiEngineAnalysis(
      consultation.parent_name,
      consultation.child_name || "-",
      consultation.level,
      consultation.whatsapp_number,
      formattedAnswersList
    );

    if (aiResult.success && aiResult.data) {
      await supabaseAdmin.from("consultation_analysis").upsert({
        consultation_id: consultationId,
        summary: aiResult.data.summary,
        analysis: aiResult.data.analysis,
        strengths: aiResult.data.strengths,
        weaknesses: aiResult.data.weaknesses,
        potential: aiResult.data.potential,
        risk: aiResult.data.risk,
        education_recommendation: aiResult.data.education_recommendation
      }, { onConflict: "consultation_id" });

      await supabaseAdmin.from("consultations").update({
        status: "Analisis AI Selesai",
        ai_result: aiResult.data.analysis,
        error_message: null
      }).eq("id", consultationId);

      return { success: true, provider: aiResult.providerName };
    }

    return { success: false, error: aiResult.error };
  });
