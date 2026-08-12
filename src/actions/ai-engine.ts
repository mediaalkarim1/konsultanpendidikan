import { generateFallbackAnalysisResult, type AiAnalysisResult } from "../lib/pdf-generator";
import { DEFAULT_UNIFIED_PROMPT, PROMPT_VERSION_MARKER } from "../lib/ai-prompt-default";
import { getAdminSupabase } from "../lib/supabase-admin";


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

  // Helper: validate if a prompt from DB matches the CURRENT (v3-spesifik) format.
  // Older prompts (narrative or generic 4-section) are ignored so the new logic always wins.
  const isNewFormatPrompt = (p: string): boolean => {
    if (!p) return false;
    if (p.includes(PROMPT_VERSION_MARKER)) return true;
    const hasSpecificityRules = /MINIMAL 5/i.test(p) && /PRINSIP ANALISIS/i.test(p);
    const isOldNarrative = p.includes("500 kata") || p.includes("900 kata") || p.includes("narasi yang mengalir") || p.includes("narasi konsultasi");
    return hasSpecificityRules && !isOldNarrative;
  };


  try {
    const { data: promptSetting } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "ai.unified_prompt")
      .maybeSingle();

    if (promptSetting && (promptSetting.value as any)?.system_prompt) {
      const dbPrompt = (promptSetting.value as any).system_prompt;
      if (isNewFormatPrompt(dbPrompt)) {
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
      if (prompt?.system_prompt && isNewFormatPrompt(prompt.system_prompt)) {
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
    console.info("[AI Engine] No new-format prompt in DB — auto-saving new prompt to settings.");
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

=== PETUNJUK OUTPUT (WAJIB DIPATUHI) ===
Sebelum menulis, baca ulang SETIAP pasangan pertanyaan-jawaban di atas dan catat pola nyatanya.
Aturan wajib:
- "weaknesses" berisi MINIMAL 5 poin ❗ (lebih banyak bila temuan memang lebih banyak), masing-masing spesifik dan bersumber dari jawaban.
- "potential" berisi MINIMAL 3 poin 🌟 yang spesifik.
- "education_recommendation" berisi MINIMAL 5 poin 🎯 yang terhubung langsung dengan poin ❗/🌟 di atas.
- Judul poin harus mendeskripsikan kondisi (mis. "❗ Fokus mudah menurun saat aktivitas terasa monoton"), BUKAN nama kategori (mis. "❗ Konsentrasi").
- Setiap penjelasan wajib merujuk isi jawaban orang tua (parafrase konkret), bukan kalimat umum.
- DILARANG kalimat seperti "memiliki potensi berkembang yang positif", "membutuhkan pendampingan yang konsisten", "berikan motivasi kepada anak", "bangun rutinitas yang konsisten" tanpa penjelasan spesifik dari jawaban.
- DILARANG menyimpulkan berdasarkan jenjang. DILARANG merekomendasikan sekolah/lembaga. DILARANG diagnosis.

Berikan keluaran dalam format JSON valid berikut (tanpa markdown codeblock), semua nilai berupa string:
{
  "summary": "RINGKASAN AWAL maksimal 2 paragraf: pola utama yang terlihat, kekuatan yang muncul, dan kondisi yang perlu diperhatikan — semuanya berdasarkan jawaban aktual anak ini.",
  "weaknesses": "MINIMAL 5 blok. Setiap blok: baris '❗ [temuan spesifik]' lalu baris penjelasan 1-3 kalimat berbasis jawaban. Pisahkan antar blok dengan baris kosong.",
  "potential": "MINIMAL 3 blok. Setiap blok: baris '🌟 [minat/kemampuan/karakter spesifik]' lalu baris penjelasan berbasis jawaban. Pisahkan dengan baris kosong.",
  "education_recommendation": "MINIMAL 5 blok. Setiap blok: baris '🎯 [rekomendasi spesifik]' lalu baris penjelasan cara orang tua melakukannya di rumah, terkait langsung dengan poin ❗/🌟 di atas.",
  "strengths": "Sama persis dengan isi potential.",
  "risk": "Sama persis dengan isi weaknesses.",
  "analysis": "Gabungan berurutan: '## 1. RINGKASAN AWAL' + summary, '## 2. ❗ AREA YANG PERLU DIPERHATIKAN' + weaknesses, '## 3. 🌟 MINAT & POTENSI' + potential, '## 4. 🎯 REKOMENDASI' + education_recommendation. Tanpa narasi tambahan."
}
`;



  try {
    let rawResponseText = "";
    const key = provider.api_key?.trim() || "";
    const model = provider.model?.trim() || "gpt-4o-mini";
    const baseUrl = (provider.base_url?.trim() || "").replace(/\/+$/, "");
    const temp = Number(provider.temperature) || 0.7;
    // Analisis butuh minimal 5 area + 3 potensi + 5 rekomendasi → butuh ruang token lebih besar
    const maxTokens = Math.max(Number(provider.max_tokens) || 0, 4096);

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

    const asText = (v: any) => (typeof v === "string" ? v.trim() : Array.isArray(v) ? v.join("\n\n") : v ? String(v) : "");

    const summary = asText(obj.summary);
    const weaknesses = asText(obj.weaknesses) || asText(obj.risk);
    const potential = asText(obj.potential) || asText(obj.strengths);
    const recommendation = asText(obj.education_recommendation);

    const composed = [
      summary ? `## 1. RINGKASAN AWAL\n\n${summary}` : "",
      weaknesses ? `## 2. ❗ AREA YANG PERLU DIPERHATIKAN\n\n${weaknesses}` : "",
      potential ? `## 3. 🌟 MINAT & POTENSI\n\n${potential}` : "",
      recommendation ? `## 4. 🎯 REKOMENDASI\n\n${recommendation}` : ""
    ].filter(Boolean).join("\n\n");

    return {
      summary: summary || "Analisis telah selesai disusun.",
      analysis: composed || asText(obj.analysis) || text,
      strengths: potential || "-",
      weaknesses: weaknesses || "-",
      potential: potential || "-",
      risk: weaknesses || "-",
      education_recommendation: recommendation || "-"
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
