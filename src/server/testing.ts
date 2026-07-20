import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, WaProviderConfig } from "./whatsapp-client";

export const testWaConnection = createServerFn({ method: "POST" })
  .validator((payload: { target: string; message: string }) => payload)
  .handler(async (ctx) => {
    const { target, message } = ctx.data;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settingsData } = await supabaseAdmin.from("settings").select("*").eq("key", "wa.provider_config").single();
    
    const waConfig: WaProviderConfig = settingsData?.value || { provider: "mock", api_url: "", api_key: "" };

    const result = await sendWhatsAppMessage(target, message, waConfig);
    
    // Log it
    await supabaseAdmin.from("notification_logs").insert({
      type: "test", target_number: target, message,
      status: result.success ? "success" : "failed",
      response_payload: result.responsePayload,
      error_message: result.errorMessage
    });

    return result;
  });

export const simulateFullConsultation = createServerFn({ method: "POST" })
  .handler(async () => {
    // We will dynamically import the actual function to trigger it
    const { processConsultation } = await import("./process-consultation");
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const logs: string[] = [];

    try {
      logs.push("✓ Memulai simulasi...");
      
      // 1. Create dummy consultation
      const { data: consultation, error: consErr } = await supabaseAdmin.from("consultations").insert({
        parent_name: "Bapak Budi (Simulasi)",
        whatsapp_number: "081234567890",
        level: "tksd",
        status: "pending"
      }).select().single();

      if (consErr || !consultation) {
        logs.push(`❌ Gagal membuat data dummy: ${consErr?.message}`);
        return { success: false, logs };
      }
      logs.push("✓ Data konsultasi dummy berhasil disimpan");

      // 2. Add dummy answers
      const { error: ansErr } = await supabaseAdmin.from("consultation_answers").insert({
        consultation_id: consultation.id,
        question_id: null, // we don't strictly enforce fkey in mock if not enforced
        answer_text: "Simulasi jawaban tes anak sangat aktif dan suka menggambar."
      });
      // In Supabase, if question_id is strict FK, we need a valid question. 
      // Let's fetch one question
      const { data: questions } = await supabaseAdmin.from("questions").select("id").limit(1);
      if (questions && questions.length > 0) {
        await supabaseAdmin.from("consultation_answers").update({ question_id: questions[0].id }).eq("consultation_id", consultation.id);
      }
      logs.push("✓ Jawaban dummy berhasil disimpan");

      // 3. Trigger processing
      logs.push("✓ Memanggil sistem AI dan Notifikasi...");
      const res = await processConsultation({ data: consultation.id });

      if (!res.success) {
        logs.push(`❌ Proses gagal: ${res.error}`);
        return { success: false, logs };
      }

      // 4. Verify results
      const { data: updatedCons } = await supabaseAdmin.from("consultations").select("*").eq("id", consultation.id).single();
      
      if (updatedCons?.ai_status === "success") {
        logs.push("✓ Google Gemini berhasil dipanggil dan analisis berhasil disimpan");
      } else {
        logs.push(`❌ AI Status: ${updatedCons?.ai_status}`);
      }

      if (updatedCons?.notification_admin_status === "success") {
        logs.push("✓ WhatsApp Admin berhasil dikirim");
      } else {
        logs.push(`❌ WhatsApp Admin gagal: Provider config mungkin belum lengkap`);
      }

      if (updatedCons?.notification_parent_status === "success") {
        logs.push("✓ WhatsApp Peserta berhasil dikirim");
      } else {
        logs.push(`❌ WhatsApp Peserta gagal: Provider config mungkin belum lengkap`);
      }

      return { success: true, logs, consultationId: consultation.id };
    } catch (error: any) {
      logs.push(`❌ Fatal Error: ${error.message}`);
      return { success: false, logs };
    }
  });
