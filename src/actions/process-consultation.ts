import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, WaProviderConfig } from "./whatsapp-client";
import { runAiEngineAnalysis } from "./ai-engine";

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
        .select("*, questions(question_text)")
        .eq("consultation_id", consultationId);

      const allOptionIds = answers?.flatMap(a => a.selected_option_ids || []) || [];
      let optionsMap: Record<string, string> = {};
      if (allOptionIds.length > 0) {
        const { data: opts } = await supabaseAdmin.from("question_options").select("id, option_text").in("id", allOptionIds);
        if (opts) optionsMap = opts.reduce((acc, o) => ({ ...acc, [o.id]: o.option_text }), {});
      }

      // Format answers string
      const formattedAnswers = (answers || []).map(a => {
        const qText = a.questions?.question_text || "Pertanyaan";
        const aText = a.answer_text || (a.selected_option_ids || []).map((oid: string) => optionsMap[oid]).join(", ");
        return `P: ${qText}\nJ: ${aText}`;
      }).join("\n\n");

      // 3. Send WhatsApp Notifications (Admin & Participant)
      const { data: settingsData } = await supabaseAdmin.from("settings").select("*").in("key", ["wa.provider_config", "site.contact"]);
      const waConfig: WaProviderConfig = settingsData?.find(s => s.key === "wa.provider_config")?.value || { provider: "mock", api_url: "", api_key: "" };
      const adminContact = settingsData?.find(s => s.key === "site.contact")?.value?.whatsapp;

      const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      
      const adminMsg = `Ada konsultasi baru yang masuk.\n\nNama: ${consultation.parent_name}\nNomor HP: ${consultation.whatsapp_number}\nJenjang: ${consultation.level.toUpperCase()}\nTanggal: ${dateStr}\n\nSilakan login ke Dashboard Admin untuk melihat detail konsultasi.`;
      
      const parentMsg = `Terima kasih telah mengirim konsultasi di EduKonsul.\n\nData Anda telah kami terima.\n\nSaat ini sistem sedang melakukan analisis.\n\nTim kami akan menghubungi Anda apabila diperlukan.\n\nTerima kasih.`;

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

      let adminWaStatus = "pending";
      let parentWaStatus = "pending";

      if (adminContact) {
        const resAdmin = await sendWhatsAppMessage(adminContact, adminMsg, waConfig);
        adminWaStatus = (await logNotification("admin_wa", adminContact, adminMsg, resAdmin)) ? "success" : "failed";
      }

      const resParent = await sendWhatsAppMessage(consultation.whatsapp_number, parentMsg, waConfig);
      parentWaStatus = (await logNotification("participant_wa", consultation.whatsapp_number, parentMsg, resParent)) ? "success" : "failed";

      await supabaseAdmin.from("consultations").update({
        notification_admin_status: adminWaStatus,
        notification_parent_status: parentWaStatus
      }).eq("id", consultationId);

      // 4. Update status to Sedang Dianalisis
      await supabaseAdmin.from("consultations").update({ status: "Sedang Dianalisis" }).eq("id", consultationId);

      // 5. Execute AI Engine Analysis
      const aiResult = await runAiEngineAnalysis(
        consultation.parent_name,
        consultation.level,
        consultation.whatsapp_number,
        formattedAnswers
      );

      if (!aiResult.success || !aiResult.data) {
        // Mark status as Gagal Analisis
        const errMsg = aiResult.error || "Gagal melakukan analisis AI.";
        await supabaseAdmin.from("consultations").update({
          status: "Gagal Analisis",
          error_message: errMsg
        }).eq("id", consultationId);

        return { success: false, error: errMsg };
      }

      // 6. Save Analysis Result into consultation_analysis
      const analysisData = aiResult.data;
      await supabaseAdmin.from("consultation_analysis").upsert({
        consultation_id: consultationId,
        summary: analysisData.summary,
        analysis: analysisData.analysis,
        strengths: analysisData.strengths,
        weaknesses: analysisData.weaknesses,
        potential: analysisData.potential,
        risk: analysisData.risk,
        education_recommendation: analysisData.education_recommendation
      }, { onConflict: "consultation_id" });

      // 7. Update Consultation Status to Selesai Dianalisis
      await supabaseAdmin.from("consultations").update({
        status: "Selesai Dianalisis",
        ai_result: analysisData.analysis,
        error_message: null
      }).eq("id", consultationId);

      return { success: true, provider: aiResult.providerName };

    } catch (err: any) {
      console.error("[processConsultation Error]:", err);
      // Mark Gagal Analisis on unexpected error
      try {
        await supabaseAdmin.from("consultations").update({
          status: "Gagal Analisis",
          error_message: err.message || "Terjadi kesalahan sistem."
        }).eq("id", consultationId);
      } catch (_) {}

      return { success: false, error: err.message || "Terjadi kesalahan sistem." };
    }
  });
