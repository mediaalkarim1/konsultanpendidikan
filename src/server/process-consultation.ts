import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, WaProviderConfig } from "./whatsapp-client";

export const processConsultation = createServerFn({ method: "POST" })
  .validator((consultationId: string) => consultationId)
  .handler(async (ctx) => {
    const consultationId = ctx.data;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials for server function");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // 1. Fetch settings and active prompt
      const [{ data: settingsData }, { data: promptData }] = await Promise.all([
        supabaseAdmin.from("settings").select("*").in("key", ["ai.gemini_key", "ai.gemini_params", "wa.provider_config", "site.contact"]),
        supabaseAdmin.from("ai_prompts").select("*").eq("is_active", true).single()
      ]);

      const geminiKey = settingsData?.find(s => s.key === "ai.gemini_key")?.value?.key;
      const geminiParams = settingsData?.find(s => s.key === "ai.gemini_params")?.value || { temperature: 0.7, max_tokens: 2048, model: "gemini-1.5-pro" };
      const waConfig: WaProviderConfig = settingsData?.find(s => s.key === "wa.provider_config")?.value || { provider: "mock", api_url: "", api_key: "" };
      const adminContact = settingsData?.find(s => s.key === "site.contact")?.value?.whatsapp;

      // 2. Fetch consultation and answers
      const { data: consultation } = await supabaseAdmin.from("consultations").select("*").eq("id", consultationId).single();
      if (!consultation) throw new Error("Konsultasi tidak ditemukan");

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

      // Format answers
      const formattedAnswers = (answers || []).map(a => {
        const qText = a.questions?.question_text;
        const aText = a.answer_text || (a.selected_option_ids || []).map((oid: string) => optionsMap[oid]).join(", ");
        return `P: ${qText}\nJ: ${aText}`;
      }).join("\n\n");

      // 3. Send WhatsApp Notifications
      const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
      const adminMsg = `Konsultasi Baru\n\nNama Orang Tua:\n${consultation.parent_name}\n\nJenjang:\n${consultation.level}\n\nTanggal:\n${dateStr}\n\nSilakan login ke Dashboard EduKonsul untuk melihat hasil analisis AI.`;
      const parentMsg = `Assalamu'alaikum.\n\nTerima kasih telah mengirimkan konsultasi melalui EduKonsul.\n\nData konsultasi Anda telah kami terima.\n\nTim Konsultan Sekolah Alam Al-Karim akan segera menghubungi Anda melalui nomor WhatsApp yang telah didaftarkan.\n\nMohon menunggu informasi selanjutnya.\n\nTerima kasih.`;

      const logNotification = async (type: string, target: string, message: string, result: any) => {
        await supabaseAdmin.from("notification_logs").insert({
          consultation_id: consultationId, type, target_number: target, message,
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

      // 4. Gemini AI processing
      if (!geminiKey || !promptData) {
        await supabaseAdmin.from("consultations").update({ ai_status: "failed" }).eq("id", consultationId);
        return { success: true, ai_skipped: true };
      }

      let userPrompt = promptData.user_prompt_template;
      userPrompt = userPrompt.replace("{{nama}}", consultation.parent_name);
      userPrompt = userPrompt.replace("{{jenjang}}", consultation.level);
      userPrompt = userPrompt.replace("{{jawaban}}", formattedAnswers);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiParams.model || "gemini-1.5-pro"}:generateContent?key=${geminiKey}`;
      
      const aiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: promptData.system_prompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: Number(geminiParams.temperature) || 0.7,
            maxOutputTokens: Number(geminiParams.max_tokens) || 2048,
          }
        })
      });

      if (!aiRes.ok) {
        await supabaseAdmin.from("consultations").update({ ai_status: "failed" }).eq("id", consultationId);
        throw new Error("Gemini API Error");
      }

      const aiData = await aiRes.json();
      const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!resultText) {
        await supabaseAdmin.from("consultations").update({ ai_status: "failed" }).eq("id", consultationId);
        throw new Error("Format respons AI tidak valid");
      }

      // Save AI Result
      await supabaseAdmin.from("consultations").update({
        ai_result: resultText,
        ai_status: "success",
        ai_created_at: new Date().toISOString(),
        ai_prompt_used: { system: promptData.system_prompt, template: promptData.user_prompt_template },
        status: "analyzed"
      }).eq("id", consultationId);

      return { success: true };
    } catch (error: any) {
      console.error("Process Consultation Error:", error);
      return { success: false, error: error.message };
    }
  });
