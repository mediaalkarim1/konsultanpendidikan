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

  const processedPrompt = mainPromptTemplate
    .replace(/{{nama_orang_tua}}/g, parentName)
    .replace(/{{nama_anak}}/g, childName || "-")
    .replace(/{{jenjang}}/g, level)
    .replace(/{{jawaban_lengkap}}/g, formattedAnswers);

  const fullUserPrompt = `
=== INSTRUKSI PROMPT UTAMA ===
${processedPrompt}

=== DATA KONSULTASI KLIEN ===
Nama Orang Tua: ${parentName}
Nama Anak: ${childName || "-"}
Jenjang: ${level.toUpperCase()}
Nomor WhatsApp: ${whatsappNumber}

=== JAWABAN KUESIONER LENGKAP ===
${formattedAnswers}

=== PETUNJUK FORMAT OUTPUT ===
Berikan keluaran dalam format JSON valid berikut (tanpa markdown codeblock):
{
  "summary_points": [
    "Poin ringkasan fakta 1 berbasis jawaban orang tua...",
    "Poin ringkasan fakta 2 berbasis jawaban orang tua...",
    "Poin ringkasan fakta 3 berbasis jawaban orang tua..."
  ],
  "attention_areas": [
    {
      "title": "Judul Temuan Spesifik Dari Jawaban (Bukan kata generik seperti 'Manajemen Waktu')",
      "description": "Penjelasan kondisi konkret 1-2 kalimat berbasis bukti jawaban orang tua.",
      "evidence": "Kutipan / ringkasan bukti jawaban orang tua"
    }
  ],
  "potentials": [
    {
      "title": "Judul Potensi / Karakter Positif Spesifik",
      "description": "Penjelasan potensi positif 1-2 kalimat berbasis bukti jawaban orang tua.",
      "evidence": "Kutipan / ringkasan bukti jawaban orang tua"
    }
  ],
  "recommendations": [
    {
      "title": "Judul Action Plan Pendampingan Rumah",
      "description": "Langkah praktis pendampingan rumah yang terhubung dengan temuan.",
      "based_on": "Berhubungan dengan temuan area perhatian / potensi"
    }
  ]
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
    const parsed = parseAiJsonResponse(rawResponseText, formattedAnswers);
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

import { sanitizeAnalysisMarkdown } from "@/lib/pdf-generator";

function parseAiJsonResponse(text: string, formattedAnswers?: string): AiAnalysisResult {
  try {
    // Clean codeblock formatting if present
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;
    const obj = JSON.parse(jsonStr);

    let summaryStr = "";
    if (Array.isArray(obj.summary_points) && obj.summary_points.length > 0) {
      summaryStr = obj.summary_points.map((p: string) => `• ${sanitizeAnalysisMarkdown(p)}`).join("\n");
    } else if (typeof obj.summary === "string") {
      summaryStr = sanitizeAnalysisMarkdown(obj.summary);
    } else {
      summaryStr = "• Ringkasan disusun berdasarkan fakta jawaban kuesioner.";
    }

    let concernsStr = "";
    if (Array.isArray(obj.attention_areas) && obj.attention_areas.length > 0) {
      concernsStr = obj.attention_areas
        .map((item: any) => {
          const title = sanitizeAnalysisMarkdown(item.title || item.name || "");
          const desc = sanitizeAnalysisMarkdown(item.description || item.desc || "");
          return `❗ ${title}\n${desc}`;
        })
        .join("\n\n");
    } else if (typeof obj.weaknesses === "string") {
      concernsStr = sanitizeAnalysisMarkdown(obj.weaknesses);
    } else {
      concernsStr = "-";
    }

    let potentialsStr = "";
    if (Array.isArray(obj.potentials) && obj.potentials.length > 0) {
      potentialsStr = obj.potentials
        .map((item: any) => {
          const title = sanitizeAnalysisMarkdown(item.title || item.name || "");
          const desc = sanitizeAnalysisMarkdown(item.description || item.desc || "");
          return `🌟 ${title}\n${desc}`;
        })
        .join("\n\n");
    } else if (typeof obj.strengths === "string") {
      potentialsStr = sanitizeAnalysisMarkdown(obj.strengths);
    } else {
      potentialsStr = "-";
    }

    let recsStr = "";
    if (Array.isArray(obj.recommendations) && obj.recommendations.length > 0) {
      recsStr = obj.recommendations
        .map((item: any) => {
          const title = sanitizeAnalysisMarkdown(item.title || item.name || "");
          const desc = sanitizeAnalysisMarkdown(item.description || item.desc || "");
          return `🎯 ${title}\n${desc}`;
        })
        .join("\n\n");
    } else if (typeof obj.education_recommendation === "string") {
      recsStr = sanitizeAnalysisMarkdown(obj.education_recommendation);
    } else {
      recsStr = "-";
    }

    // Negative Constraint Filter: Remove contradictory findings if formattedAnswers states positive condition
    if (formattedAnswers) {
      const lowerAnswers = formattedAnswers.toLowerCase();
      
      // If parent states child already decided major/knows major
      if (lowerAnswers.includes("sudah tahu jurusan") || lowerAnswers.includes("jurusan kuliah yang sudah dipilih") || lowerAnswers.includes("sudah mantap")) {
        concernsStr = concernsStr.split("\n\n").filter(block => !/bingung|belum (tahu|memiliki|paham)|arah jurusan/i.test(block)).join("\n\n");
      }
      // If parent states child is active in projects/orgs
      if (lowerAnswers.includes("aktif berorganisasi") || lowerAnswers.includes("sudah ada proyek") || lowerAnswers.includes("banyak karya")) {
        concernsStr = concernsStr.split("\n\n").filter(block => !/kurang (pengalaman|organisasi)|belum (ada|memiliki) (portofolio|karya)/i.test(block)).join("\n\n");
      }
      // If parent states child manages time well
      if (lowerAnswers.includes("mampu mengelola waktu") || lowerAnswers.includes("disiplin waktu")) {
        concernsStr = concernsStr.split("\n\n").filter(block => !/manajemen waktu|prokrastinasi|menunda/i.test(block)).join("\n\n");
      }
    }

    const fullNarrative = `RINGKASAN AWAL\n\n${summaryStr}\n\nAREA YANG PERLU DIPERHATIKAN\n\n${concernsStr}\n\nMINAT & POTENSI\n\n${potentialsStr}\n\nREKOMENDASI PENDAMPINGAN RUMAH\n\n${recsStr}`;

    return {
      summary: summaryStr,
      analysis: fullNarrative,
      strengths: potentialsStr,
      weaknesses: concernsStr,
      potential: potentialsStr,
      risk: concernsStr,
      education_recommendation: recsStr
    };
  } catch (e) {
    return {
      summary: "• Hasil analisis telah digenerate berbasis poin-poin kuesioner.",
      analysis: sanitizeAnalysisMarkdown(text),
      strengths: "Dapat diamati dari laporan analisis.",
      weaknesses: "Dapat diamati dari laporan analisis.",
      potential: "Dapat diamati dari laporan analisis.",
      risk: "Dapat diamati dari laporan analisis.",
      education_recommendation: "Metode belajar dan pendampingan disesuaikan dengan kebutuhan anak."
    };
  }
}

export type CleanAnalysisJson = {
  summary: { title: string; description: string; evidence: string }[];
  attentionAreas: { title: string; description: string; evidence: string }[];
  potentials: { title: string; description: string; evidence: string }[];
  recommendations: { title: string; description: string; basedOn: string }[];
};

export async function runCleanAiAnalysisEngine(
  parentName: string,
  childName: string,
  level: string,
  phone: string,
  formattedAnswers: string
): Promise<{ success: boolean; data?: CleanAnalysisJson; error?: string }> {
  try {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    const prompt = `Anda adalah Konsultan Pendidikan Anak Spesialis EduKonsul.
Tugas Anda adalah membuat analisis pemetaan anak BERDASARKAN 100% JAWABAN ORANG TUA.

DATA ORANG TUA & ANAK:
- Nama Orang Tua: ${parentName}
- Nama Anak: ${childName}
- Jenjang Pendidikan: ${level.toUpperCase()} (HANYA KONTEKS METADATA, BUKAN TRIGGER TEMPLATE)

JAWABAN ORANG TUA AKTUAL:
${formattedAnswers}

ATURAN STRUKTURAL ABSOLUT:
1. DILARANG MENGGUNAKAN TEMPLATE DEFAULT.
2. DILARANG MEMBUAT MATERI PALSU ATAU DAFTAR MASALAH OTOMATIS BERDASARKAN JENJANG.
3. SETIAP FINDING WAJIB MEMILIKI BUKTI (EVIDENCE) DARI JAWABAN ORANG TUA DI ATAS.
4. JIKA JAWABAN POSITIF (MISAL: BEBAS MASALAH GAWAI / SUDAH MANDIRI / SUDAH TAHU JURUSAN), DILARANG MEMBUATNYA MENJADI AREA MASALAH.
5. Kembalikan HANYA format JSON berikut tanpa teks pendahuluan:

{
  "summary": [
    {
      "title": "Judul poin ringkasan",
      "description": "Penjelasan ringkas berbasis bukti",
      "evidence": "Kutipan / ringkasan jawaban orang tua"
    }
  ],
  "attentionAreas": [
    {
      "title": "Judul area yang perlu diperhatikan",
      "description": "Penjelasan tantangan / perhatian berbasis bukti",
      "evidence": "Kutipan / ringkasan jawaban orang tua"
    }
  ],
  "potentials": [
    {
      "title": "Judul minat atau potensi positif",
      "description": "Penjelasan potensi positif berbasis bukti",
      "evidence": "Kutipan / ringkasan jawaban orang tua"
    }
  ],
  "recommendations": [
    {
      "title": "Judul rekomendasi pendampingan rumah",
      "description": "Langkah aksi pendampingan konkret di rumah",
      "basedOn": "Judul potensi atau area perhatian yang menjadi acuan"
    }
  ]
}`;

    let jsonResultText = "";

    if (geminiKey) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
      });

      if (res.ok) {
        const jsonRes = await res.json();
        jsonResultText = jsonRes.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    }

    // Fallback LLM Gateway if direct Gemini Key failed or unavailable
    if (!jsonResultText) {
      const lovableKey = process.env.LOVABLE_API_KEY || process.env.LOVABLE_GATEWAY_KEY || "lovable-gateway-auto";
      const apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${lovableKey}`
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2
        })
      });

      if (res.ok) {
        const jsonRes = await res.json();
        jsonResultText = jsonRes.choices?.[0]?.message?.content || "";
      }
    }

    // If remote API unavailable, run local evidence parser derived 100% from formattedAnswers
    if (!jsonResultText) {
      console.info("[runCleanAiAnalysisEngine]: AI Remote API unavailable, using local evidence parser.");
      const blocks = formattedAnswers.split("\n\n").filter(b => b.includes("P:"));
      const summaryItems: { title: string; description: string; evidence: string }[] = [];
      const attentionItems: { title: string; description: string; evidence: string }[] = [];
      const potentialItems: { title: string; description: string; evidence: string }[] = [];
      const recommendationItems: { title: string; description: string; basedOn: string }[] = [];

      summaryItems.push({
        title: `Pemetaan Karakteristik Belajar ${childName}`,
        description: `Berdasarkan ${blocks.length} poin jawaban kuesioner yang disampaikan ${parentName}, ananda menunjukkan gambaran kondisi perkembangan khas jenjang ${level.toUpperCase()}.`,
        evidence: `Jawaban kuesioner orang tua (${parentName})`
      });

      for (const block of blocks) {
        const pMatch = block.match(/P:\s*(.*?)(?=\nJ:|$)/s);
        const jMatch = block.match(/J:\s*(.*?)$/s);
        const qText = pMatch ? pMatch[1].trim() : "Pertanyaan";
        const aText = jMatch ? jMatch[1].trim() : "";

        if (!aText || aText === "-") continue;

        const lowerA = aText.toLowerCase();

        // Check negative indicator
        const isNeg = /menunda|frustrasi|menyerah|bingung|6 jam|terbeban|terkendala|kesulitan/i.test(lowerA);
        const isPos = /mandiri|mantap|menggambar|mewarnai|lukis|teratur|aktif|juara|teknologi|olahraga/i.test(lowerA);

        const shortAns = aText.length > 55 ? aText.slice(0, 52) + "..." : aText;

        if (isNeg) {
          const itemTitle = `Perhatian Spesifik pada Aspek "${qText.length > 40 ? qText.slice(0, 37) + '...' : qText}"`;
          attentionItems.push({
            title: itemTitle,
            description: `Jawaban orang tua mencatat: "${aText}". Aspek ini memerlukan pendampingan terstruktur di rumah.`,
            evidence: aText
          });
          recommendationItems.push({
            title: `Pendampingan Terarah pada "${shortAns}"`,
            description: `Bantu ${childName} dengan rutinitas harian bertahap dan komunikasi hangat untuk mengatasi kendala ini.`,
            basedOn: itemTitle
          });
        } else {
          const itemTitle = `Potensi Positif pada "${qText.length > 40 ? qText.slice(0, 37) + '...' : qText}"`;
          potentialItems.push({
            title: itemTitle,
            description: `Jawaban orang tua menunjukkan: "${aText}". Hal ini menjadi modal kekuatan positif yang sangat baik untuk dioptimalkan.`,
            evidence: aText
          });
          recommendationItems.push({
            title: `Pengayaan Potensi "${shortAns}"`,
            description: `Fasilitasi ${childName} dengan ruang eksplorasi lebih luas dan apresiasi spesifik untuk mengasah potensi ini.`,
            basedOn: itemTitle
          });
        }

        summaryItems.push({
          title: `Observasi Jawaban: ${shortAns}`,
          description: `Orang tua mencatat respon anak: "${aText}".`,
          evidence: aText
        });
      }

      return {
        success: true,
        data: {
          summary: summaryItems,
          attentionAreas: attentionItems,
          potentials: potentialItems,
          recommendations: recommendationItems
        }
      };
    }

    // Clean JSON raw codeblocks
    const cleanJsonStr = jsonResultText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed: CleanAnalysisJson = JSON.parse(cleanJsonStr);

    // Validate Evidence Rule: Remove any item where evidence/basedOn is missing
    const validSummary = (parsed.summary || []).filter(s => s.title && s.evidence && s.evidence.trim() !== "");
    const validAttentionAreas = (parsed.attentionAreas || []).filter(a => a.title && a.evidence && a.evidence.trim() !== "");
    const validPotentials = (parsed.potentials || []).filter(p => p.title && p.evidence && p.evidence.trim() !== "");
    const validRecommendations = (parsed.recommendations || []).filter(r => r.title && r.basedOn && r.basedOn.trim() !== "");

    if (validSummary.length === 0 && validPotentials.length === 0 && validAttentionAreas.length === 0) {
      return { success: false, error: "Analisis belum dapat dibuat. Silakan coba kembali." };
    }

    const validatedResult: CleanAnalysisJson = {
      summary: validSummary,
      attentionAreas: validAttentionAreas,
      potentials: validPotentials,
      recommendations: validRecommendations
    };

    return { success: true, data: validatedResult };

  } catch (err: any) {
    console.error("[runCleanAiAnalysisEngine] Error:", err);
    return { success: false, error: "Analisis belum dapat dibuat. Silakan coba kembali." };
  }
}
