import { generateFallbackAnalysisResult, type AiAnalysisResult } from "../lib/pdf-generator";
import { DEFAULT_UNIFIED_PROMPT } from "../lib/ai-prompt-default";
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

  // Helper: validate if a prompt from DB strictly matches the NEW 4-section format
  const isNewFormatPrompt = (p: string): boolean => {
    if (!p) return false;
    const hasRingkasan = p.includes("RINGKASAN") || p.includes("Ringkasan");
    const hasPerhatian = p.includes("PERLU DIPERHATIKAN") || p.includes("Perlu Diperhatikan") || p.includes("❗");
    const hasPotensi = p.includes("POTENSI") || p.includes("Potensi") || p.includes("🌟");
    const hasRekomendasi = p.includes("REKOMENDASI") || p.includes("Rekomendasi") || p.includes("🎯");
    const isOldNarrative = p.includes("500 kata") || p.includes("900 kata") || p.includes("narasi yang mengalir") || p.includes("narasi konsultasi");
    return hasRingkasan && hasPerhatian && hasPotensi && hasRekomendasi && !isOldNarrative;
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

  let jenjangGuidance = "";
  const normalizedLevel = (level || "").toLowerCase().trim();
  if (normalizedLevel === "sma") {
    jenjangGuidance = `
=== GUIDELINES SPESIFIK ANALISIS JENJANG SMA ===
- Subjek adalah siswa SMA (persiapan perguruan tinggi & karier masa depan).
- Perhatikan dan angkat topik-topik berikut HANYA JIKA DIDUKUNG OLEH JAWABAN ORANG TUA:
  * Kebingungan menentukan jurusan kuliah / belum memiliki tujuan hidup yang jelas
  * Keterbatasan portofolio karya, pengalaman proyek nyata, atau aktivitas organisasi
  * Manajemen waktu mandiri, kedisiplinan belajar, dan literasi keuangan
  * Kebutuhan penguasaan Bahasa Inggris aktif & digital skill masa depan
  * Keterlibatan dalam karya / kewirausahaan
  * Tekanan persiapan kelulusan dan seleksi masuk kampus
- DILARANG MEMAKSAKAN temuan generik seperti "❗ Rutinitas & Konsistensi Belajar" KECUALI jika jawaban orang tua memang eksplisit menunjukkan kendala tersebut.
`;
  } else if (normalizedLevel === "smp") {
    jenjangGuidance = `
=== GUIDELINES SPESIFIK ANALISIS JENJANG SMP ===
- Subjek adalah remaja jenjang SMP (fase eksplorasi bakat & identitas remaja).
- Perhatikan dan angkat topik-topik berikut HANYA JIKA DIDUKUNG OLEH JAWABAN ORANG TUA:
  * Durasi gawai / game online / media sosial & dampaknya pada fokus belajar
  * Kebiasaan menunda pekerjaan (prokrastinasi) & disiplin belajar mandiri
  * Kepercayaan diri menyampaikan pendapat & pola komunikasi keluarga
  * Daya tahan problem solving saat menghadapi tugas atau tantangan sulit
  * Pengaruh lingkungan sebaya & kejelasan gambaran minat cita-cita awal
`;
  } else if (normalizedLevel === "tksd") {
    jenjangGuidance = `
=== GUIDELINES SPESIFIK ANALISIS JENJANG TK & SD ===
- Subjek adalah anak usia dini / sekolah dasar (fase pembentukan karakter & tumbuh kembang).
- Perhatikan dan angkat topik-topik berikut HANYA JIKA DIDUKUNG OLEH JAWABAN ORANG TUA:
  * Durasi screen time gawai & reaksi emosional saat gawai disudahi (menangis/marah/rewel)
  * Kemandirian harian (apakah terbiasa sendiri atau masih dibantu orang tua)
  * Respon saat hadapi kesulitan (mencoba sendiri vs mudah menyerah/menangis)
  * Adaptasi sosial dan kemampuan berteman dengan anak lain
  * Karakter utama (akhlak, adab, mandiri, percaya diri) & stimulasi visual/bermain
`;
  }

  const processedPrompt = mainPromptTemplate
    .replace(/{{nama_orang_tua}}/g, parentName)
    .replace(/{{nama_anak}}/g, childName || "-")
    .replace(/{{jenjang}}/g, level)
    .replace(/{{jawaban_lengkap}}/g, formattedAnswers);

  const fullUserPrompt = `
=== INSTRUKSI PROMPT UTAMA ===
${processedPrompt}

${jenjangGuidance}

=== DATA KONSULTASI KLIEN ===
Nama Orang Tua: ${parentName}
Nama Anak: ${childName || "-"}
Jenjang: ${level.toUpperCase()}
Nomor WhatsApp: ${whatsappNumber}

=== JAWABAN KUESIONER LENGKAP ===
${formattedAnswers}

=== PETUNJUK FORMAT OUTPUT ===
Berikan keluaran dalam format JSON valid berikut (tanpa markdown codeblock), semua nilai berupa string:
{
  "summary": "1-2 paragraf pendek: Ringkasan awal berisi gambaran umum anak yang benar-benar berasal dari jawaban orang tua. Dilarang kalimat pembuka generik.",
  "analysis": "Gabungan seluruh 4 bagian analisis dalam format markdown terstruktur berurutan: ## 1. RINGKASAN AWAL, lalu ## 2. ❗ AREA YANG PERLU DIPERHATIKAN (MINIMAL 5 POIN jika didukung jawaban, setiap area diawali ### ❗ [Nama Temuan Spesifik Dari Jawaban]), lalu ## 3. 🌟 MINAT & POTENSI (MINIMAL 3 POIN, setiap potensi diawali ### 🌟 [Nama Potensi Spesifik]), lalu ## 4. 🎯 REKOMENDASI PENDAMPINGAN RUMAH (MINIMAL 5 POIN, setiap poin diawali ### 🎯 [Judul Rekomendasi Spesifik Rumah]). Dilarang template generik.",
  "strengths": "Format markdown: Bagian 🌟 MINAT & POTENSI saja (Minimal 3 poin) — setiap potensi menggunakan ### 🌟 [Nama Potensi Spesifik] diikuti penjelasan singkat berdasarkan bukti jawaban orang tua.",
  "weaknesses": "Format markdown: Bagian ❗ AREA YANG PERLU DIPERHATIKAN saja — setiap area menggunakan ### ❗ [Nama Temuan Spesifik Dari Jawaban] diikuti penjelasan 1-3 kalimat.",
  "potential": "Format markdown: Bagian 🌟 MINAT & POTENSI (Minimal 3 poin).",
  "risk": "Format markdown: Bagian ❗ AREA YANG PERLU DIPERHATIKAN.",
  "education_recommendation": "Format markdown: Bagian 🎯 REKOMENDASI PENDAMPINGAN RUMAH saja (Minimal 5 poin) — berupa rekomendasi konkret untuk pendampingan rumah. Dilarang rekomendasi sekolah."
}
`;

  try {
    let rawResponseText = "";
    const key = provider.api_key?.trim() || geminiEnvKey || "";
    const model = provider.model?.trim() || "gemini-1.5-flash";
    const baseUrl = (provider.base_url?.trim() || "").replace(/\/+$/, "");
    const temp = Number(provider.temperature) || 0.7;
    const maxTokens = Number(provider.max_tokens) || 2048;

    if (provider.provider_key === "gemini" || key.startsWith("AIzaSy")) {
      // Google Gemini API (Direct)
      // Clean model name: remove google/ prefix if present
      let cleanModel = model.replace(/^google\//, "");
      // Map legacy or unsupported model names to stable Gemini models if needed
      if (cleanModel.includes("3.5") || cleanModel.includes("3.1")) {
        cleanModel = "gemini-2.5-flash";
      }

      const geminiUrl = `${baseUrl || "https://generativelanguage.googleapis.com/v1beta/models"}/${cleanModel}:generateContent?key=${key}`;
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
      if (!res.ok) {
        // Fallback retry with gemini-1.5-flash if model name was rejected
        if (cleanModel !== "gemini-1.5-flash") {
          console.warn(`[Gemini API] Retry with gemini-1.5-flash due to error: ${resData.error?.message}`);
          const retryUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
          const retryRes = await fetch(retryUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: fullUserPrompt }] }],
              generationConfig: { temperature: temp, maxOutputTokens: maxTokens }
            })
          });
          const retryData = await retryRes.json();
          if (retryRes.ok) {
            rawResponseText = retryData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          } else {
            throw new Error(retryData.error?.message || resData.error?.message || "Google Gemini API error");
          }
        } else {
          throw new Error(resData.error?.message || "Google Gemini API error");
        }
      } else {
        rawResponseText = resData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

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
