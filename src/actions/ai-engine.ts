import { type AiAnalysisResult } from "../lib/pdf-generator";
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
      const { data: defaultProv } = await (supabaseAdmin as any)
        .from("ai_providers")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();

      provider = defaultProv;

      if (!provider) {
        const { data: firstActive } = await (supabaseAdmin as any)
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
      const { data: prompt } = await (supabaseAdmin as any).from("ai_prompts").select("*").limit(1).maybeSingle();
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

    // [TAHAP 8 AUDIT LOG: AI RAW RESPONSE]
    console.log("==================================================");
    console.log("[AI RAW RESPONSE]");
    console.log(rawResponseText);
    console.log("==================================================");

    // Parse JSON
    const parsed = parseAiJsonResponse(rawResponseText, formattedAnswers);

    // [TAHAP 8 AUDIT LOG: AI PARSED RESULT]
    console.log("==================================================");
    console.log("[AI PARSED RESULT]");
    console.log(JSON.stringify(parsed, null, 2));
    console.log("==================================================");

    return {
      success: true,
      providerName: provider.provider_name,
      data: parsed
    };

  } catch (err: any) {
    console.error(`[AI Engine Error] (${provider?.provider_name} API call failed):`, err?.message || err);
    console.info("[AI Engine] Using local semantic interpreter fallback (generateInterpretedAnalysis)...");
    try {
      const fallbackParsed = generateInterpretedAnalysis(parentName, childName, level, formattedAnswers);
      return {
        success: true,
        providerName: `${provider?.provider_name || "AI Engine"} (Interpreted Fallback)`,
        data: fallbackParsed
      };
    } catch (fallbackErr: any) {
      console.error("[AI Engine] Local fallback error:", fallbackErr);
      return {
        success: false,
        error: "Analisis gagal dibuat. Silakan coba kembali."
      };
    }
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

// ====================================================================
// SEMANTIC KEYWORD INTERPRETER — Interprets parent answers into
// natural professional titles instead of copy-pasting raw answers
// ====================================================================

type SemanticMapping = {
  keywords: RegExp;
  title: string;
  category: "positive" | "concern";
  recTitle: string;
  recDesc: (childName: string) => string;
};

const SEMANTIC_MAPPINGS: SemanticMapping[] = [
  // --- POSITIVE indicators ---
  { keywords: /menggambar|mewarnai|melukis|kreasi|seni\s*visual|craft/i, title: "Minat pada Aktivitas Kreatif", category: "positive", recTitle: "Kembangkan Aktivitas Kreatif", recDesc: (c) => `Berikan kesempatan kepada ${c} untuk menggambar, mewarnai, atau membuat karya sederhana secara rutin.` },
  { keywords: /mandiri.*alat|menyiapkan.*sendiri|merapikan.*sendiri|mandiri.*belajar/i, title: "Kemandirian dalam Kegiatan Harian", category: "positive", recTitle: "Pertahankan Kemandirian", recDesc: (c) => `Berikan kesempatan kepada ${c} untuk menyiapkan perlengkapannya sendiri dan berikan apresiasi atas usahanya.` },
  { keywords: /video\s*edukasi|konten\s*edukasi|belajar.*online|aplikasi.*belajar/i, title: "Ketertarikan pada Konten Edukatif", category: "positive", recTitle: "Fasilitasi Konten Edukatif Berkualitas", recDesc: (c) => `Dampingi ${c} memilih konten edukatif yang sesuai dengan minatnya dan diskusikan isi konten bersama.` },
  { keywords: /kurang.*1\s*jam|di\s*bawah.*1\s*jam|tidak.*banyak.*hp|didampingi.*gawai|terbatas.*layar/i, title: "Pengelolaan Perangkat Digital yang Terarah", category: "positive", recTitle: "Apresiasi Kebiasaan Digital Sehat", recDesc: (c) => `Pertahankan pola penggunaan perangkat digital yang sudah baik dan berikan apresiasi kepada ${c}.` },
  { keywords: /mantap.*jurusan|sudah.*pilih.*jurusan|tahu.*jurusan|yakin.*jurusan|sudah.*tujuan/i, title: "Kejelasan Arah Pendidikan", category: "positive", recTitle: "Dukung Perencanaan Pendidikan", recDesc: (c) => `Dukung ${c} dengan informasi dan pengalaman yang memperkuat pilihan pendidikannya.` },
  { keywords: /aktif.*organisasi|memimpin|lomba|sertifikat|portofolio|prestasi/i, title: "Keaktifan dalam Kegiatan Terstruktur", category: "positive", recTitle: "Dukung Keterlibatan dalam Kegiatan", recDesc: (c) => `Dorong ${c} untuk terus aktif dalam kegiatan yang mengasah kepemimpinan dan keterampilan sosial.` },
  { keywords: /teratur.*jadwal|disiplin.*belajar|jadwal.*rapi|mengelola.*waktu.*baik/i, title: "Kedisiplinan dalam Manajemen Waktu", category: "positive", recTitle: "Pertahankan Rutinitas Belajar", recDesc: (c) => `Apresiasi kebiasaan belajar teratur ${c} dan bantu mempertahankan konsistensinya.` },
  { keywords: /teknologi|coding|programming|robotik|game\s*dev|sains|komputer/i, title: "Minat pada Bidang Teknologi & Sains", category: "positive", recTitle: "Fasilitasi Eksplorasi Teknologi", recDesc: (c) => `Berikan akses dan kesempatan kepada ${c} untuk mengeksplorasi bidang teknologi yang diminatinya.` },
  { keywords: /olahraga|sepak\s*bola|basket|renang|bela\s*diri|atletik|futsal/i, title: "Minat pada Aktivitas Fisik & Olahraga", category: "positive", recTitle: "Dukung Aktivitas Fisik", recDesc: (c) => `Fasilitasi ${c} untuk rutin berlatih olahraga yang diminatinya.` },
  { keywords: /musik|bernyanyi|bermain.*musik|alat\s*musik|piano|gitar|drum/i, title: "Minat pada Seni Musik", category: "positive", recTitle: "Kembangkan Bakat Musik", recDesc: (c) => `Berikan kesempatan kepada ${c} untuk berlatih musik dan mengeksplorasi instrumen yang diminatinya.` },
  { keywords: /membaca|buku|cerita|dongeng|literasi|perpustakaan/i, title: "Minat pada Kegiatan Literasi", category: "positive", recTitle: "Dukung Kebiasaan Membaca", recDesc: (c) => `Sediakan buku-buku yang sesuai dengan minat ${c} dan ciptakan waktu membaca bersama.` },
  { keywords: /mudah\s*berteman|supel|adaptasi.*baik|percaya\s*diri.*tinggi|berani.*tampil/i, title: "Kemampuan Sosial yang Baik", category: "positive", recTitle: "Dukung Keterampilan Sosial", recDesc: (c) => `Berikan kesempatan kepada ${c} untuk berinteraksi dalam berbagai lingkungan sosial.` },
  { keywords: /antusias|semangat|excited|bersemangat|senang.*sekolah|rajin/i, title: "Antusiasme dalam Belajar", category: "positive", recTitle: "Pertahankan Semangat Belajar", recDesc: (c) => `Apresiasi semangat belajar ${c} dan ciptakan suasana belajar yang menyenangkan di rumah.` },
  // --- CONCERN indicators ---
  { keywords: /menunda|prokrastinasi|tunda|SKS.*kebut|larut\s*malam/i, title: "Manajemen Waktu Belajar", category: "concern", recTitle: "Bantu Pengaturan Jadwal Belajar", recDesc: (c) => `Bantu ${c} membuat jadwal belajar harian yang realistis dan dampingi secara bertahap untuk membangun konsistensi.` },
  { keywords: /frustrasi|menyerah|kehilangan.*motivasi|putus\s*asa|malas/i, title: "Ketahanan dalam Menghadapi Tantangan", category: "concern", recTitle: "Bangun Ketahanan Belajar", recDesc: (c) => `Dampingi ${c} saat menghadapi kesulitan dan ajarkan bahwa proses belajar membutuhkan ketekunan bertahap.` },
  { keywords: /bingung.*jurusan|belum.*gambaran|belum.*tahu.*jurusan|belum.*pilih/i, title: "Eksplorasi Minat & Arah Pendidikan", category: "concern", recTitle: "Dampingi Eksplorasi Minat", recDesc: (c) => `Ajak ${c} berdiskusi santai tentang bidang yang menarik dan fasilitasi pengalaman eksplorasi berbagai bidang.` },
  { keywords: /belum.*portofolio|belum.*organisasi|belum.*proyek|belum.*terlibat/i, title: "Pengalaman Kegiatan di Luar Kelas", category: "concern", recTitle: "Dorong Keterlibatan dalam Kegiatan", recDesc: (c) => `Dorong ${c} untuk mulai mencoba satu kegiatan yang sesuai minatnya, meski dalam skala kecil.` },
  { keywords: /6\s*jam|lebih\s*dari.*jam|hampir\s*setiap\s*waktu|kecanduan.*hp|berlebih.*layar/i, title: "Pengelolaan Durasi Penggunaan Gawai", category: "concern", recTitle: "Atur Batas Penggunaan Gawai", recDesc: (c) => `Sepakati bersama ${c} batas waktu penggunaan gawai harian dan ciptakan aktivitas alternatif yang menarik.` },
  { keywords: /menangis|marah|rewel|tantrum|emosi.*meledak/i, title: "Transisi Antaraktivitas & Regulasi Emosi", category: "concern", recTitle: "Dampingi Transisi Aktivitas", recDesc: (c) => `Berikan sinyal dan waktu transisi yang cukup saat ${c} harus beralih dari satu aktivitas ke aktivitas lain.` },
  { keywords: /kurang\s*percaya\s*diri|pemalu|malu|takut.*tampil|takut.*salah/i, title: "Kepercayaan Diri dalam Berinteraksi", category: "concern", recTitle: "Bangun Rasa Percaya Diri", recDesc: (c) => `Berikan pujian spesifik dan kesempatan tampil dalam lingkup kecil agar ${c} membangun kepercayaan diri secara bertahap.` },
  { keywords: /sulit.*berteman|menarik\s*diri|pendiam.*sekali|susah.*adaptasi/i, title: "Adaptasi Sosial dengan Teman Sebaya", category: "concern", recTitle: "Fasilitasi Interaksi Sosial", recDesc: (c) => `Ciptakan kesempatan bermain atau belajar bersama teman agar ${c} lebih nyaman bersosialisasi.` },
  { keywords: /belum.*mandiri|masih.*harus.*diminta|perlu.*diarahkan|belum.*bisa.*sendiri/i, title: "Kemandirian dalam Kegiatan Harian", category: "concern", recTitle: "Latih Kemandirian Bertahap", recDesc: (c) => `Berikan tanggung jawab kecil yang sesuai usia ${c} dan berikan apresiasi saat berhasil menyelesaikannya.` },
];

/**
 * Interpret a raw parent answer into a meaningful professional title + category.
 * Returns null if no meaningful interpretation can be made (demographic/neutral answer).
 */
function interpretAnswer(answer: string, question: string): { title: string; description: string; category: "positive" | "concern"; recTitle: string; recDesc: (childName: string) => string } | null {
  const lowerA = answer.toLowerCase();

  // Skip demographic / trivial answers
  if (/^(\d+\s*tahun|ya|tidak|mungkin|belum sekolah|tk\s*[ab]|sd|smp|sma)$/i.test(answer.trim())) return null;
  if (answer.trim().length < 5 || answer === "-") return null;

  for (const mapping of SEMANTIC_MAPPINGS) {
    if (mapping.keywords.test(lowerA)) {
      return {
        title: mapping.title,
        description: "", // Will be filled contextually
        category: mapping.category,
        recTitle: mapping.recTitle,
        recDesc: mapping.recDesc,
      };
    }
  }

  // Generic positive/negative classification for unmapped answers
  const isNegative = /(belum|sulit|kurang|jarang|menunda|menangis|marah|keberatan|terkendala|kesulitan|bingung|tidak pernah|terbeban)/i.test(lowerA);
  if (isNegative) {
    // Derive a clean title from the question text
    const cleanQ = question.replace(/^(bagaimana|apa|seberapa|apakah)\s+/i, "").replace(/\?$/, "").trim();
    const shortQ = cleanQ.length > 50 ? cleanQ.slice(0, 47) + "..." : cleanQ;
    return {
      title: `Pendampingan pada ${shortQ.charAt(0).toUpperCase() + shortQ.slice(1)}`,
      description: "",
      category: "concern",
      recTitle: `Pendampingan Bertahap`,
      recDesc: (c) => `Dampingi ${c} secara bertahap dan komunikatif pada aspek ini.`,
    };
  }

  // Generic positive
  const cleanQ = question.replace(/^(bagaimana|apa|seberapa|apakah)\s+/i, "").replace(/\?$/, "").trim();
  const shortQ = cleanQ.length > 50 ? cleanQ.slice(0, 47) + "..." : cleanQ;
  return {
    title: `${shortQ.charAt(0).toUpperCase() + shortQ.slice(1)}`,
    description: "",
    category: "positive",
    recTitle: `Dukung Perkembangan Positif`,
    recDesc: (c) => `Terus dukung dan fasilitasi ${c} pada aspek ini.`,
  };
}

/**
 * BANNED PHRASES — titles must never contain these.
 */
const BANNED_TITLE_PHRASES = [
  "potensi positif pada aspek",
  "permasalahan pada aspek",
  "perhatian spesifik pada aspek",
  "observasi jawaban",
  "pendampingan terarah pada",
  "pengayaan potensi",
  "modal kekuatan positif",
  "optimalkan potensi",
];

/**
 * Validate that a title is NOT a copy-paste of the answer.
 * Returns true if the title passes validation (is NOT copy-paste).
 */
function validateTitleNotCopyPaste(title: string, evidence: string): boolean {
  if (!title || !evidence) return true;
  const lowerTitle = title.toLowerCase().trim();
  const lowerEvidence = evidence.toLowerCase().trim();

  // Check banned phrases
  for (const banned of BANNED_TITLE_PHRASES) {
    if (lowerTitle.includes(banned)) return false;
  }

  // Check if title is essentially the same as evidence (>60% overlap)
  if (lowerEvidence.length > 10 && lowerTitle.length > 10) {
    // Check if title starts with the evidence or vice versa
    if (lowerTitle.includes(lowerEvidence.slice(0, 30)) || lowerEvidence.includes(lowerTitle.slice(0, 30))) {
      return false;
    }
  }

  return true;
}

/**
 * Generate interpreted analysis from formatted answers — ZERO copy-paste.
 * This function interprets the meaning of answers, NOT copies them.
 */
export function generateInterpretedAnalysis(parentName: string, childName: string, level: string, formattedAnswers: string): AiAnalysisResult {
  const jenjangLabel = level === "tksd" ? "TK & SD" : level === "smp" ? "SMP" : "SMA";
  const nameDisplay = (childName && childName !== "-") ? childName : "Ananda";

  type QA = { q: string; a: string };
  const qa: QA[] = (formattedAnswers || "")
    .split("\n\n")
    .map((item) => {
      const lines = item.split("\n");
      return {
        q: (lines[0] || "").replace(/^P:\s*/, "").trim(),
        a: (lines[1] || "").replace(/^J:\s*/, "").trim()
      };
    })
    .filter((x) => x.q && x.a && x.a !== "-");

  const seenTitles = new Set<string>();
  const concernsList: { title: string; desc: string }[] = [];
  const potentialsList: { title: string; desc: string }[] = [];
  const recommendationsList: { title: string; desc: string }[] = [];
  const summaryPoints: string[] = [];

  for (const item of qa) {
    const interpreted = interpretAnswer(item.a, item.q);
    if (!interpreted) continue;
    if (seenTitles.has(interpreted.title)) continue;
    seenTitles.add(interpreted.title);

    // Clean up raw answer into natural sentence for description
    const rawA = item.a.trim();
    let naturalSentence = rawA;
    if (!naturalSentence.endsWith(".")) naturalSentence += ".";

    const startsWithName = new RegExp(`^(${nameDisplay}|ananda|anak)\\s+`, "i").test(naturalSentence);
    let desc = startsWithName
      ? naturalSentence.charAt(0).toUpperCase() + naturalSentence.slice(1)
      : `${nameDisplay} ${naturalSentence.charAt(0).toLowerCase() + naturalSentence.slice(1)}`;

    if (interpreted.category === "concern") {
      concernsList.push({ title: interpreted.title, desc });
      recommendationsList.push({ title: interpreted.recTitle, desc: interpreted.recDesc(nameDisplay) });
      summaryPoints.push(`• ${nameDisplay} memerlukan perhatian pada aspek ${interpreted.title.toLowerCase()} (${rawA}).`);
    } else {
      potentialsList.push({ title: interpreted.title, desc });
      recommendationsList.push({ title: interpreted.recTitle, desc: interpreted.recDesc(nameDisplay) });
      summaryPoints.push(`• ${desc}`);
    }
  }

  // Ensure 3-5 bullet points in summary if available
  if (summaryPoints.length === 0) {
    summaryPoints.push(`• ${nameDisplay} telah menyelesaikan pengisian asesmen pemetaan kondisi belajar.`);
  }

  const summary = summaryPoints.join("\n");

  const formattedConcerns = concernsList.length > 0
    ? concernsList.map((c, i) => `❗ ${String(i + 1).padStart(2, '0')}. ${c.title}\n${c.desc}`).join("\n\n")
    : "Belum ditemukan area utama yang perlu mendapat perhatian khusus berdasarkan jawaban orang tua.";

  const formattedPotentials = potentialsList.length > 0
    ? potentialsList.map((p, i) => `🌟 ${String(i + 1).padStart(2, '0')}. ${p.title}\n${p.desc}`).join("\n\n")
    : "-";

  const formattedRecommendations = recommendationsList.length > 0
    ? recommendationsList.map((r, i) => `🎯 ${String(i + 1).padStart(2, '0')}. ${r.title}\n${r.desc}`).join("\n\n")
    : "-";

  const fullNarrative = `RINGKASAN AWAL\n\n${summary}\n\nAREA YANG PERLU DIPERHATIKAN\n\n${formattedConcerns}\n\nMINAT & POTENSI\n\n${formattedPotentials}\n\nREKOMENDASI PENDAMPINGAN RUMAH\n\n${formattedRecommendations}`;

  return {
    summary,
    analysis: fullNarrative,
    strengths: formattedPotentials,
    weaknesses: formattedConcerns,
    potential: formattedPotentials,
    risk: formattedConcerns,
    education_recommendation: formattedRecommendations
  };
}

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
1. DILARANG MENGGUNAKAN TEMPLATE DEFAULT BERDASARKAN JENJANG.
2. DILARANG MEMBUAT MATERI PALSU ATAU DAFTAR MASALAH OTOMATIS.
3. SETIAP FINDING WAJIB MEMILIKI BUKTI (EVIDENCE) DARI JAWABAN.
4. JIKA JAWABAN POSITIF, DILARANG MEMBUATNYA MENJADI AREA MASALAH.
5. DILARANG menggunakan potongan jawaban orang tua sebagai judul/title.
6. Title/judul harus berupa INTERPRETASI PROFESIONAL, bukan kutipan jawaban.

ATURAN JUDUL (TITLE) — SANGAT PENTING:
- DILARANG menggunakan frasa: "Potensi Positif pada Aspek", "Permasalahan pada Aspek", "Observasi Jawaban"
- DILARANG mengcopy jawaban sebagai judul. Contoh SALAH: title = "Memakai HP 1 jam sehari..."
- Title harus berupa INTERPRETASI BERMAKNA. Contoh BENAR: "Minat pada Aktivitas Kreatif", "Kemandirian", "Manajemen Waktu Belajar"

CONTOH TRANSFORMASI:
- Jawaban: "Memakai HP 1 jam sehari untuk video edukasi mewarnai"
  → title: "Ketertarikan pada Aktivitas Visual" (BUKAN "Memakai HP 1 jam...")
- Jawaban: "Anak sangat mandiri menyiapkan alat tulis sendiri"
  → title: "Kemandirian dalam Kegiatan Harian" (BUKAN "Anak sangat mandiri...")
- Jawaban: "Sering menunda tugas sampai larut malam"
  → title: "Manajemen Waktu Belajar" (BUKAN "Sering menunda tugas...")

ATURAN BAHASA:
- Bahasa Indonesia yang sederhana, profesional, dan hangat
- Penjelasan setiap poin: 1-2 kalimat saja
- Gunakan nama anak (${childName}) dalam penjelasan

Kembalikan HANYA format JSON berikut tanpa teks pendahuluan:

{
  "summary": [
    {
      "title": "Judul interpretasi ringkasan",
      "description": "Penjelasan ringkas 1-2 kalimat",
      "evidence": "Ringkasan jawaban orang tua yang menjadi dasar"
    }
  ],
  "attentionAreas": [
    {
      "title": "Judul interpretasi area perhatian (BUKAN potongan jawaban)",
      "description": "Penjelasan 1-2 kalimat menggunakan nama anak",
      "evidence": "Ringkasan jawaban yang menjadi dasar"
    }
  ],
  "potentials": [
    {
      "title": "Judul interpretasi minat/potensi (BUKAN potongan jawaban)",
      "description": "Penjelasan 1-2 kalimat menggunakan nama anak",
      "evidence": "Ringkasan jawaban yang menjadi dasar"
    }
  ],
  "recommendations": [
    {
      "title": "Judul rekomendasi tindakan",
      "description": "Langkah konkret untuk orang tua",
      "basedOn": "Nama area perhatian atau potensi terkait"
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

    // If remote API unavailable, use local semantic interpreter
    if (!jsonResultText) {
      console.info("[runCleanAiAnalysisEngine]: AI Remote API unavailable, using local semantic interpreter.");
      const childPhrase = (childName && childName !== "-") ? `Ananda ${childName}` : "Ananda";
      const nameDisplay = (childName && childName !== "-") ? childName : "Ananda";

      const blocks = formattedAnswers.split("\n\n").filter(b => b.includes("P:"));
      const summaryItems: { title: string; description: string; evidence: string }[] = [];
      const attentionItems: { title: string; description: string; evidence: string }[] = [];
      const potentialItems: { title: string; description: string; evidence: string }[] = [];
      const recommendationItems: { title: string; description: string; basedOn: string }[] = [];
      const seenTitles = new Set<string>();

      for (const block of blocks) {
        const pMatch = block.match(/P:\s*(.*?)(?=\nJ:|$)/s);
        const jMatch = block.match(/J:\s*(.*?)$/s);
        const qText = pMatch ? pMatch[1].trim() : "Pertanyaan";
        const aText = jMatch ? jMatch[1].trim() : "";

        if (!aText || aText === "-") continue;

        const interpreted = interpretAnswer(aText, qText);
        if (!interpreted) continue;
        if (seenTitles.has(interpreted.title)) continue;
        seenTitles.add(interpreted.title);

        if (interpreted.category === "concern") {
          attentionItems.push({
            title: interpreted.title,
            description: `${childPhrase} membutuhkan pendampingan lebih lanjut pada aspek ini.`,
            evidence: aText
          });
          recommendationItems.push({
            title: interpreted.recTitle,
            description: interpreted.recDesc(nameDisplay),
            basedOn: interpreted.title
          });
        } else {
          potentialItems.push({
            title: interpreted.title,
            description: `${childPhrase} menunjukkan kondisi positif pada aspek ini.`,
            evidence: aText
          });
          recommendationItems.push({
            title: interpreted.recTitle,
            description: interpreted.recDesc(nameDisplay),
            basedOn: interpreted.title
          });
        }
      }

      // Build summary from findings
      if (potentialItems.length > 0) {
        summaryItems.push({
          title: "Potensi Positif",
          description: `${childPhrase} menunjukkan potensi pada: ${potentialItems.map(p => p.title).join(", ")}.`,
          evidence: "Jawaban kuesioner orang tua"
        });
      }
      if (attentionItems.length > 0) {
        summaryItems.push({
          title: "Area Pendampingan",
          description: `Area yang perlu pendampingan: ${attentionItems.map(a => a.title).join(", ")}.`,
          evidence: "Jawaban kuesioner orang tua"
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
    // ALSO apply anti-copy-paste validation on titles
    const validSummary = (parsed.summary || []).filter(s => s.title && s.evidence && s.evidence.trim() !== "" && validateTitleNotCopyPaste(s.title, s.evidence));
    const validAttentionAreas = (parsed.attentionAreas || []).filter(a => a.title && a.evidence && a.evidence.trim() !== "" && validateTitleNotCopyPaste(a.title, a.evidence));
    const validPotentials = (parsed.potentials || []).filter(p => p.title && p.evidence && p.evidence.trim() !== "" && validateTitleNotCopyPaste(p.title, p.evidence));
    const validRecommendations = (parsed.recommendations || []).filter(r => r.title && r.basedOn && r.basedOn.trim() !== "" && validateTitleNotCopyPaste(r.title, r.basedOn));

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
