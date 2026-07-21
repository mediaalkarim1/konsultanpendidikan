import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, WaProviderConfig } from "./whatsapp-client";
import { runAiEngineAnalysis } from "./ai-engine";
import { renderWaTemplate, WaTemplateData } from "./wa-template-engine";

export const processConsultation = createServerFn({ method: "POST" })
  .validator((consultationId: string) => consultationId)
  .handler(async (ctx) => {
    const consultationId = ctx.data;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase env vars");
      return { success: false, error: "Missing config" };
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // 1. Fetch consultation
      const { data: consultation, error: consErr } = await supabaseAdmin
        .from("consultations")
        .select("*")
        .eq("id", consultationId)
        .single();

      if (consErr || !consultation) {
        throw new Error("Data konsultasi tidak ditemukan");
      }

      // Update initial status to Menunggu Analisis
      await supabaseAdmin.from("consultations").update({
        status: "Menunggu Analisis",
        error_message: null
      }).eq("id", consultationId);

      // 2. Fetch answers
      const { data: answers } = await supabaseAdmin
        .from("consultation_answers")
        .select("*")
        .eq("consultation_id", consultationId);

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

      // 3. Fetch WA Provider Config, WA Templates, and Workflow Config
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

      const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      
      const templateData: WaTemplateData = {
        nama: consultation.parent_name,
        nomor: consultation.whatsapp_number,
        jenjang: consultation.level.toUpperCase(),
        tanggal: dateStr,
        status: "Menunggu Analisis",
        id_konsultasi: consultationId
      };

      const defaultAdminTpl = "Ada konsultasi baru yang masuk.\n\nNama: {{nama}}\nNomor HP: {{nomor}}\nJenjang: {{jenjang}}\nTanggal: {{tanggal}}\n\nSilakan login ke Dashboard Admin untuk melihat detail konsultasi.";
      const defaultParticipantTpl = "Terima kasih telah mengirim konsultasi di EduKonsul.\n\nData Anda telah kami terima.\n\nSaat ini sistem sedang melakukan analisis.\n\nTim kami akan menghubungi Anda apabila diperlukan.\n\nTerima kasih.";

      const adminTplContent = waTemplates?.find((t: any) => t.template_key === "admin_notification")?.content || defaultAdminTpl;
      const participantTplContent = waTemplates?.find((t: any) => t.template_key === "participant_notification")?.content || defaultParticipantTpl;

      const adminMsg = renderWaTemplate(adminTplContent, templateData);
      const parentMsg = renderWaTemplate(participantTplContent, templateData);

      const logNotification = async (type: string, target: string, message: string, result: any) => {
        await supabaseAdmin.from("notification_logs").insert({
          consultation_id: consultationId,
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

      // 4. Send WA Notifications based on Workflow Config toggles
      if (wfConfig.enable_wa_admin_notif !== false && adminContact) {
        const resAdmin = await sendWhatsAppMessage(adminContact, adminMsg, waConfig);
        adminWaStatus = (await logNotification("admin_wa", adminContact, adminMsg, resAdmin)) ? "success" : "failed";
      }

      if (wfConfig.enable_wa_parent_notif !== false) {
        const resParent = await sendWhatsAppMessage(consultation.whatsapp_number, parentMsg, waConfig);
        parentWaStatus = (await logNotification("participant_wa", consultation.whatsapp_number, parentMsg, resParent)) ? "success" : "failed";
      }

      await supabaseAdmin.from("consultations").update({
        notification_admin_status: adminWaStatus,
        notification_parent_status: parentWaStatus
      }).eq("id", consultationId);

      // Check if AI Analysis toggle is disabled
      if (wfConfig.enable_ai_analysis === false) {
        await supabaseAdmin.from("consultations").update({
          status: "Sudah Dihubungi",
          error_message: null
        }).eq("id", consultationId);
        return { success: true, message: "AI Analysis disabled via workflow config." };
      }

      // 5. Update status to Sedang Dianalisis
      await supabaseAdmin.from("consultations").update({ status: "Sedang Dianalisis" }).eq("id", consultationId);

      // 6. Execute AI Engine Analysis
      let aiResult = await runAiEngineAnalysis(
        consultation.parent_name,
        consultation.level,
        consultation.whatsapp_number,
        formattedAnswers
      );

      // Auto Fallback to Gemini if main provider failed and auto_fallback is enabled
      if ((!aiResult.success || !aiResult.data) && wfConfig.auto_fallback !== false) {
        console.warn("[AI Engine Fallback Triggered] Primary provider failed, attempting fallback to Gemini...");
        const { data: geminiProv } = await supabaseAdmin.from("ai_providers").select("*").eq("provider_key", "gemini").single();
        if (geminiProv && geminiProv.api_key) {
          // Temporarily set gemini as default for fallback
          await supabaseAdmin.from("ai_providers").update({ is_default: false }).neq("id", geminiProv.id);
          await supabaseAdmin.from("ai_providers").update({ is_default: true, is_active: true }).eq("id", geminiProv.id);
          
          aiResult = await runAiEngineAnalysis(
            consultation.parent_name,
            consultation.level,
            consultation.whatsapp_number,
            formattedAnswers
          );
        }
      }

      if (!aiResult.success || !aiResult.data) {
        const errMsg = aiResult.error || "Gagal melakukan analisis AI.";
        await supabaseAdmin.from("consultations").update({
          status: "Gagal Analisis",
          error_message: errMsg
        }).eq("id", consultationId);

        return { success: false, error: errMsg };
      }

      // 7. Save Analysis Result into consultation_analysis (if auto save enabled)
      const analysisData = aiResult.data;
      if (wfConfig.enable_auto_save !== false) {
        await supabaseAdmin.from("consultation_analysis").upsert({
          consultation_id: consultationId,
          summary: wfConfig.enable_ai_summary !== false ? analysisData.summary : "-",
          analysis: analysisData.analysis,
          strengths: analysisData.strengths,
          weaknesses: analysisData.weaknesses,
          potential: analysisData.potential,
          risk: analysisData.risk,
          education_recommendation: wfConfig.enable_ai_recommendation !== false ? analysisData.education_recommendation : "-"
        }, { onConflict: "consultation_id" });
      }

      // 8. Update Consultation Status to Selesai Dianalisis
      await supabaseAdmin.from("consultations").update({
        status: "Selesai Dianalisis",
        ai_result: analysisData.analysis,
        error_message: null
      }).eq("id", consultationId);

      return { success: true, provider: aiResult.providerName };

    } catch (err: any) {
      console.error("[processConsultation Error]:", err);
      try {
        await supabaseAdmin.from("consultations").update({
          status: "Gagal Analisis",
          error_message: err.message || "Terjadi kesalahan sistem."
        }).eq("id", consultationId);
      } catch (_) {}

      return { success: false, error: err.message || "Terjadi kesalahan sistem." };
    }
  });
