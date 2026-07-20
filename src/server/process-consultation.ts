import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// Mock WA sender
async function sendWhatsApp(phone: string, message: string, provider: any) {
  console.log(`[WA MOCK to ${phone}]: ${message}`);
  // If provider.name === 'fonnte', etc. implement fetch to Fonnte API here.
}

export const processConsultation = createServerFn("POST", async (consultationId: string) => {
  // Initialize Supabase admin client to bypass RLS for reading private settings
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase credentials for server function");
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Fetch private settings
    const { data: settingsData } = await supabaseAdmin.from("settings").select("*").in("key", ["ai.prompt", "ai.gemini_key", "ai.gemini_model", "wa.provider", "site.contact"]);
    
    if (!settingsData) throw new Error("Gagal mengambil pengaturan");
    
    const promptSettings = settingsData.find(s => s.key === "ai.prompt")?.value || {};
    const geminiKey = settingsData.find(s => s.key === "ai.gemini_key")?.value?.key;
    const geminiModel = settingsData.find(s => s.key === "ai.gemini_model")?.value?.model || "gemini-1.5-pro";
    const waProvider = settingsData.find(s => s.key === "wa.provider")?.value;
    const adminContact = settingsData.find(s => s.key === "site.contact")?.value?.whatsapp;

    // 2. Fetch consultation and answers
    const { data: consultation } = await supabaseAdmin.from("consultations").select("*").eq("id", consultationId).single();
    if (!consultation) throw new Error("Konsultasi tidak ditemukan");

    const { data: answers } = await supabaseAdmin
      .from("consultation_answers")
      .select("*, questions(question_text)")
      .eq("consultation_id", consultationId);

    // Fetch options if needed
    const allOptionIds = answers?.flatMap(a => a.selected_option_ids || []) || [];
    let optionsMap: Record<string, string> = {};
    if (allOptionIds.length > 0) {
      const { data: opts } = await supabaseAdmin.from("question_options").select("id, option_text").in("id", allOptionIds);
      if (opts) optionsMap = opts.reduce((acc, o) => ({ ...acc, [o.id]: o.option_text }), {});
    }

    // 3. Format answers for AI
    const formattedAnswers = (answers || []).map(a => {
      const qText = a.questions?.question_text;
      const aText = a.answer_text || (a.selected_option_ids || []).map((oid: string) => optionsMap[oid]).join(", ");
      return `P: ${qText}\nJ: ${aText}`;
    }).join("\n\n");

    // 4. Send WA to Admin and Participant (Parallel)
    const waPromises = [];
    if (adminContact) {
      waPromises.push(sendWhatsApp(adminContact, `Notifikasi EduKonsul: Terdapat konsultasi baru dari ${consultation.parent_name} (${consultation.level}). Segera cek dashboard admin.`, waProvider));
    }
    waPromises.push(sendWhatsApp(consultation.whatsapp_number, `Konsultasi Anda telah kami terima.\n\nTim Konsultan Sekolah Alam Al-Karim akan segera menghubungi Anda melalui nomor WhatsApp yang telah didaftarkan.\n\nTerima kasih.`, waProvider));
    
    // Wait for WAs to avoid blocking AI if WA fails, we use Promise.allSettled
    await Promise.allSettled(waPromises);

    // 5. Check if AI is configured
    if (!geminiKey) {
      console.warn("Gemini API Key is empty, skipping AI analysis.");
      return { success: true, ai_skipped: true };
    }

    // 6. Prepare Gemini Prompt
    const systemInstruction = promptSettings.system_prompt || "Anda adalah analis pendidikan.";
    let userPrompt = promptSettings.user_prompt_template || "Data:\n{{nama}}\n{{jenjang}}\n{{jawaban}}";
    userPrompt = userPrompt.replace("{{nama}}", consultation.parent_name);
    userPrompt = userPrompt.replace("{{jenjang}}", consultation.level);
    userPrompt = userPrompt.replace("{{jawaban}}", formattedAnswers);

    // 7. Call Gemini API via fetch (REST)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;
    
    const aiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Gemini API Error:", errText);
      throw new Error("Gagal menghubungi AI");
    }

    const aiData = await aiRes.json();
    const resultText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) throw new Error("Format respons AI tidak valid");

    // 8. Update database
    await supabaseAdmin
      .from("consultations")
      .update({ ai_result: resultText, status: "analyzed" })
      .eq("id", consultationId);

    return { success: true };
  } catch (error: any) {
    console.error("Process Consultation Error:", error);
    return { success: false, error: error.message };
  }
});
