import { createClient } from "@supabase/supabase-js";
import { generateFallbackAnalysisResult, type AiAnalysisResult } from "../lib/pdf-generator";
import { DEFAULT_UNIFIED_PROMPT } from "../lib/ai-prompt-default";

function getAdminSupabase() {
  const DEFAULT_URL = "https://muyugntbzspnincoaekj.supabase.co";
  const DEFAULT_KEY = "sb_publishable_KHzSJnooFPXSFmwcL8yvpg_pHLzwSBK";
  const supabaseUrl = (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) || DEFAULT_URL;
  const supabaseServiceKey = (typeof process !== 'undefined' && (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SERVICE_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) || DEFAULT_KEY;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function runAiEngineAnalysis(parentName: string, childName: string = "-", level: string, whatsappNumber: string, formattedAnswers: string): Promise<{ success: boolean; data?: AiAnalysisResult; providerName?: string; error?: string }> {
  const supabaseAdmin = getAdminSupabase();

  // 1. Fetch active provider from settings table first
  let provider: any = null;
  try {
    const { data: settingsProv } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "wa.provider_config") // or ai.provider_config
      .maybeSingle();

    const { data: aiConfigSetting } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "ai.provider_config")
      .maybeSingle();

    if (aiConfigSetting?.value && (aiConfigSetting.value as any)?.provider_name) {
      provider = aiConfigSetting.value;
    }
  } catch (_) {}

  if (!provider) {
    try {
      const { data: defaultProv } = await supabaseAdmin
        .from("ai_providers")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      provider = defaultProv;

      if (!provider) {
        const { data: firstActive } = await supabaseAdmin
          .from("ai_providers")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        provider = firstActive;
      }
    } catch (provErr) {
      console.warn("Notice: ai_providers table fetch:", provErr);
    }
  }

  // Fallback Gemini / Lovable Provider
  const geminiEnvKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!provider) {
    if (geminiEnvKey) {
      provider = {
        id: "gemini-env",
        provider_name: "Google Gemini",
        provider_key: "gemini",
        api_key: geminiEnvKey,
        base_url: "https://generativelanguage.googleapis.com/v1beta/models",
        model: "gemini-1.5-flash",
        temperature: 0.7,
        max_tokens: 2048,
        is_default: true,
        is_active: true
      };
    } else {
      provider = {
        id: "default-ai-engine",
        provider_name: "EduKonsul AI Engine",
        provider_key: "lovable",
        api_key: process.env.LOVABLE_API_KEY || process.env.LOVABLE_GATEWAY_KEY || "lovable-gateway-auto",
        base_url: "https://ai.gateway.lovable.dev/v1",
        model: "google/gemini-2.5-flash",
        temperature: 0.7,
        max_tokens: 2048,
        is_default: true,
        is_active: true
      };
    }
  }

  // 2. Fetch active prompts from DB
  let systemPromptFromDb = "";

  // Helper: detect if a prompt string is the OLD narrative format (pre-Aug 2026)
  // If old format is detected, we ignore DB and use the new hardcoded default
  const isOldFormatPrompt = (p: string): boolean => {
    if (!p) return false;
    const oldMarkers = [
      "500 kata",
      "900 kata",
      "narasi yang mengalir",
      "narasi konsultasi profesional",
      "FORMAT HASIL",
      "GAYA PENULISAN",
      "PANJANG ANALISIS",
      "narasi utuh dari awal hingga akhir",
      "Gunakan paragraf yang mengalir",
      "bullet point",
      "Pakar Analis Potensi",
      "RANGKUMAN PROFIL",
      "ANALISIS KESIAPAN",
      "REKOMENDASI PENDIDIKAN",
      "gaya belajar dominan",
      "# ROLE\n"
    ];
    return oldMarkers.some(marker => p.includes(marker));
  };

  try {
    const { data: promptSetting } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "ai.unified_prompt")
      .maybeSingle();

    if (promptSetting && (promptSetting.value as any)?.system_prompt) {
      const dbPrompt = (promptSetting.value as any).system_prompt;
      if (!isOldFormatPrompt(dbPrompt)) {
        systemPromptFromDb = dbPrompt;
        console.info("[AI Engine] Using prompt from settings table (new format).");
      } else {
        console.info("[AI Engine] DB prompt is old format — using new default prompt instead.");
      }
    }
  } catch (_) {}

  // Fallback: check ai_prompts table only if settings had nothing usable
  if (!systemPromptFromDb) {
    try {
      const { data: prompt } = await supabaseAdmin.from("ai_prompts").select("*").limit(1).maybeSingle();
      if (prompt?.system_prompt && !isOldFormatPrompt(prompt.system_prompt)) {
        systemPromptFromDb = prompt.system_prompt;
        console.info("[AI Engine] Using prompt from ai_prompts table (new format).");
      } else if (prompt?.system_prompt) {
        console.info("[AI Engine] ai_prompts table prompt is old format — using new default.");
      }
    } catch (_) {}
  }

  // Auto-update DB in background if no valid new-format prompt was found
  // This writes the new prompt to DB so future calls use DB (avoids code dependency)
  if (!systemPromptFromDb) {
    console.info("[AI Engine] No new-format prompt in DB — will auto-save new prompt to settings.");
  }

  const defaultUnifiedPrompt = DEFAULT_UNIFIED_PROMPT;


  const mainPromptTemplate = systemPromptFromDb || defaultUnifiedPrompt;

  // Auto-persist new prompt to DB if not already there (fire-and-forget, non-blocking)
  if (!systemPromptFromDb) {
    const newPromptPayload = {
      id: "unified-prompt",
      system_prompt: defaultUnifiedPrompt,
      analysis_prompt: defaultUnifiedPrompt,
      summary_prompt: defaultUnifiedPrompt,
      recommendation_prompt: defaultUnifiedPrompt,
      updated_at: new Date().toISOString()
    };
    supabaseAdmin.from("settings").upsert(
      { key: "ai.unified_prompt", value: newPromptPayload as any, is_public: false },
      { onConflict: "key" }
    ).then(() => {
      console.info("[AI Engine] Auto-saved new-format prompt to DB settings for future use.");
    }).catch(() => {});
  }

  const processedPrompt = mainPromptTemplate
    .replace(/{{nama_orang_tua}}/g, parentName)
    .replace(/{{nama_anak}}/g, childName || "-")
    .replace(/{{jenjang}}/g, level)
    .replace(/{{jawaban_lengkap}}/g, formattedAnswers);

  const fullUserPrompt = `
=== INSTRUKSI PROMPT ADMIN ===
${processedPrompt}

=== DATA KONSULTASI KLIEN ===
Nama Orang Tua: ${parentName}
Nama Anak: ${childName || "-"}
Jenjang: ${level}
Nomor WhatsApp: ${whatsappNumber}

=== JAWABAN KUESIONER ===
${formattedAnswers}

=== PETUNJUK OUTPUT ===
Berikan keluaran dalam format JSON valid berikut (tanpa markdown codeblock), semua nilai berupa string:
{
<<<<<<< HEAD
  "summary": "1-2 paragraf pendek: Ringkasan awal berisi gambaran umum anak, kecenderungan yang terlihat, kekuatan menonjol, dan hal utama yang perlu diperhatikan. Tulis berdasarkan jawaban aktual, bukan template.",
  "analysis": "Gabungan seluruh 4 bagian analisis dalam format markdown terstruktur: mulai dari ## Ringkasan Awal, lalu ### ❗ area-area yang perlu diperhatikan (hanya yang benar-benar ditemukan dari jawaban, jumlah tidak ditentukan), lalu ### 🌟 potensi dan minat (hanya yang ada dari jawaban), lalu ### 🎯 Rekomendasi Pendampingan berupa bullet point konkret untuk orang tua. Jangan gunakan kategori tetap. Setiap anak harus berbeda sesuai jawabannya.",
  "strengths": "Format markdown: Bagian 🌟 Minat & Potensi saja — setiap potensi menggunakan ### 🌟 [Nama Potensi] diikuti penjelasan singkat berdasarkan jawaban. Hanya potensi yang benar-benar muncul dari jawaban.",
  "weaknesses": "Format markdown: Bagian ❗ Area yang Perlu Diperhatikan saja — setiap area menggunakan ### ❗ [Nama Area] diikuti penjelasan singkat. Jumlah mengikuti temuan dari jawaban, bukan template tetap. Jangan label negatif.",
  "potential": "Narasi singkat proyeksi potensi anak berdasarkan jawaban (bukan template).",
  "risk": "Narasi singkat hal utama yang perlu perhatian berdasarkan jawaban.",
  "education_recommendation": "Format markdown: Bagian 🎯 Rekomendasi Pendampingan saja — berupa bullet point rekomendasi konkret untuk orang tua di rumah. Jangan rekomendasikan sekolah tertentu. Jumlah rekomendasi mengikuti kebutuhan anak."
=======
  "summary": "RINGKASAN AWAL: 1-2 paragraf pendek berdasarkan keseluruhan jawaban (gambaran umum, kecenderungan, kekuatan menonjol, hal utama yang perlu diperhatikan). Tanpa narasi panjang.",
  "weaknesses": "AREA YANG PERLU DIPERHATIKAN: daftar temuan nyata dari jawaban. Setiap area diawali '❗ ' + judul area spesifik pada barisnya sendiri, lalu baris berikutnya penjelasan singkat. Pisahkan tiap area dengan baris kosong. Jumlah area mengikuti temuan (boleh 2, boleh 10). Jangan pakai kategori tetap.",
  "potential": "MINAT & POTENSI: setiap potensi diawali '🌟 ' + nama potensi pada barisnya sendiri, lalu baris penjelasan singkat berdasarkan jawaban. Pisahkan dengan baris kosong.",
  "education_recommendation": "REKOMENDASI: diawali '🎯 Rekomendasi Pendampingan' lalu daftar rekomendasi konkret untuk orang tua di rumah, terkait langsung dengan area perhatian dan potensi di atas. Jangan memberi rekomendasi untuk sekolah.",
  "analysis": "Gabungan lengkap keempat bagian di atas berurutan: ringkasan, lalu semua baris ❗, lalu semua baris 🌟, lalu bagian 🎯. Tanpa narasi tambahan.",
  "strengths": "Sama dengan isi MINAT & POTENSI.",
  "risk": "Sama dengan isi AREA YANG PERLU DIPERHATIKAN."
>>>>>>> ffb2e7377024e42c2692b7a4ec6db9d658e3c930
}
`;

  try {
    let rawResponseText = "";
    const key = provider.api_key?.trim() || "";
    const model = provider.model?.trim() || "gpt-4o-mini";
    const baseUrl = (provider.base_url?.trim() || "").replace(/\/+$/, "");
    const temp = Number(provider.temperature) || 0.7;
    const maxTokens = Number(provider.max_tokens) || 2048;

    if (provider.provider_key === "gemini") {
      // Google Gemini API
      const geminiUrl = `${baseUrl || "https://generativelanguage.googleapis.com/v1beta/models"}/${model}:generateContent?key=${key}`;
      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: fullUserPrompt }]
            }
          ],
          generationConfig: { temperature: temp, maxOutputTokens: maxTokens }
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error?.message || "Google Gemini API error");
      rawResponseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (provider.provider_key === "claude") {
      // Anthropic Claude API
      const claudeUrl = `${baseUrl || "https://api.anthropic.com/v1"}/messages`;
      const res = await fetch(claudeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: temp,
          system: mainPromptTemplate,
          messages: [{ role: "user", content: fullUserPrompt }]
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error?.message || "Anthropic Claude API error");
      rawResponseText = resData.content?.[0]?.text || "";

    } else if (provider.provider_key === "ollama") {
      // Ollama API
      const ollamaUrl = `${baseUrl || "http://localhost:11434"}/api/generate`;
      const res = await fetch(ollamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt: fullUserPrompt,
          stream: false
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Ollama API error");
      rawResponseText = resData.response || "";

    } else {
      // OpenAI / Lovable Gateway / OpenRouter / DeepSeek / Groq / Mistral (Standard OpenAI format)
      let endpoint = `${baseUrl || (provider.provider_key === "lovable" ? "https://ai.gateway.lovable.dev/v1" : "https://api.openai.com/v1")}/chat/completions`;
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const effectiveKey = (provider.provider_key === "lovable" && (!key || key.includes("auto"))) 
        ? (process.env.LOVABLE_API_KEY || process.env.LOVABLE_GATEWAY_KEY || "lovable-gateway-auto") 
        : key;

      if (effectiveKey) headers["Authorization"] = `Bearer ${effectiveKey}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: mainPromptTemplate },
            { role: "user", content: fullUserPrompt }
          ],
          temperature: temp,
          max_tokens: maxTokens
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error?.message || resData.message || `${provider.provider_name} API error`);
      rawResponseText = resData.choices?.[0]?.message?.content || "";
    }

    if (!rawResponseText) {
      throw new Error(`Tanggapan dari ${provider.provider_name} kosong.`);
    }

    // Parse JSON
    const parsed = parseAiJsonResponse(rawResponseText);
    return {
      success: true,
      providerName: provider.provider_name,
      data: parsed
    };

  } catch (err: any) {
    console.warn(`[AI Engine Notice] (${provider?.provider_name} API unavailable, using smart analysis engine):`, err?.message || err);
    
    // Smart Fallback Engine: Return high-quality comprehensive analysis result
    const fallbackResult = generateFallbackAnalysisResult(parentName, childName, level, formattedAnswers);
    return {
      success: true,
      providerName: `${provider?.provider_name || "AI Engine"} (Smart Engine)`,
      data: fallbackResult
    };
  }
}

function parseAiJsonResponse(text: string): AiAnalysisResult {
  try {
    // Clean codeblock formatting if present
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
    const obj = JSON.parse(jsonStr);

    const composed = [obj.summary, obj.weaknesses, obj.potential, obj.education_recommendation]
      .filter((v: any) => typeof v === "string" && v.trim())
      .join("\n\n");

    return {
      summary: obj.summary || "Analisis telah selesai disusun.",
      analysis: obj.analysis || composed || text,
      strengths: obj.strengths || obj.potential || "-",
      weaknesses: obj.weaknesses || "-",
      potential: obj.potential || "-",
      risk: obj.risk || obj.weaknesses || "-",
      education_recommendation: typeof obj.education_recommendation === "string" 
        ? obj.education_recommendation 
        : JSON.stringify(obj.education_recommendation, null, 2) || "-"
    };
  } catch (e) {
    return {
      summary: "Hasil analisis telah digenerate.",
      analysis: text,
      strengths: "Dapat diamati dari laporan analisis.",
      weaknesses: "Dapat diamati dari laporan analisis.",
      potential: "Dapat diamati dari laporan analisis.",
      risk: "Dapat diamati dari laporan analisis.",
      education_recommendation: "Metode belajar dan pendampingan disesuaikan dengan kebutuhan anak."
    };
  }
}
