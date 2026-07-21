import { createClient } from "@supabase/supabase-js";

export type AiProviderConfig = {
  id: string;
  provider_name: string;
  provider_key: string;
  api_key: string;
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_default: boolean;
  is_active: boolean;
};

export type AiAnalysisResult = {
  summary: string;
  analysis: string;
  strengths: string;
  weaknesses: string;
  potential: string;
  risk: string;
  education_recommendation: string;
};

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials for server function");
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function runAiEngineAnalysis(parentName: string, childName: string = "-", level: string, whatsappNumber: string, formattedAnswers: string): Promise<{ success: boolean; data?: AiAnalysisResult; providerName?: string; error?: string }> {
  const supabaseAdmin = getAdminSupabase();

  // 1. Fetch active/default provider
  let { data: provider } = await supabaseAdmin
    .from("ai_providers")
    .select("*")
    .eq("is_default", true)
    .eq("is_active", true)
    .single();

  if (!provider) {
    const { data: firstActive } = await supabaseAdmin
      .from("ai_providers")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .single();
    provider = firstActive;
  }

  if (!provider) {
    return { success: false, error: "Tidak ada AI Provider aktif yang dikonfigurasikan di sistem." };
  }

  // 2. Fetch active prompts
  let systemPromptFromDb = "";
  const { data: promptSetting } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "ai.unified_prompt")
    .maybeSingle();

  if (promptSetting && (promptSetting.value as any)?.system_prompt) {
    systemPromptFromDb = (promptSetting.value as any).system_prompt;
  } else {
    let { data: prompt } = await supabaseAdmin.from("ai_prompts").select("*").limit(1).maybeSingle();
    if (prompt?.system_prompt) {
      systemPromptFromDb = prompt.system_prompt;
    }
  }

  const defaultUnifiedPrompt = `Anda adalah Pakar Analis Potensi & Konsultan Pendidikan Anak Senior.

Analisis dan susunlah resume lengkap berdasarkan data jawaban konsultasi pendidikan berikut dengan bahasa yang hangat, profesional, dan empatik.

Instruksi Kalimat Pembuka:
- Awali setiap bagian laporan (Analisis, Resume, dan Rekomendasi) dengan kalimat pembuka yang ramah dan apresiatif sesuai dengan jenjang {{jenjang}}.
- Pada bagian ANALISIS, awali dengan kalimat pembuka yang menyapa {{nama_orang_tua}} (orang tua dari {{nama_anak}}) serta mengapresiasi perhatian orang tua terhadap tumbuh kembang anak.
- Pada bagian RESUME & REKOMENDASI PENDIDIKAN, sertakan pula kalimat pembuka yang memberikan pengantar positif bagi orang tua.

1. ANALISIS: Lakukan analisis mendalam mengenai karakteristik, gaya belajar, kelebihan, tantangan, serta potensi anak (Nama Orang Tua: {{nama_orang_tua}}, Nama Anak: {{nama_anak}}, Jenjang: {{jenjang}}).
2. RESUME: Susun ringkasan (resume) profil anak secara singkat, padat, dan intuitif.
3. REKOMENDASI PENDIDIKAN: Berikan rekomendasi pendidikan yang konkret meliputi metode pembelajaran yang disarankan, tipe sekolah yang cocok, serta panduan parenting untuk orang tua.

Data Jawaban Konsultasi:
{{jawaban_lengkap}}`;

  const mainPromptTemplate = systemPromptFromDb || defaultUnifiedPrompt;
  const processedPrompt = mainPromptTemplate
    .replace(/{{nama_orang_tua}}/g, parentName)
    .replace(/{{nama_anak}}/g, childName || "-")
    .replace(/{{jenjang}}/g, level)
    .replace(/{{jawaban_lengkap}}/g, formattedAnswers);

  const fullUserPrompt = `
=== INSTRUKSI KONSULTASI AI ===
${processedPrompt}

=== DATA KONSULTASI KLIEN ===
Nama Orang Tua: ${parentName}
Nama Anak: ${childName || "-"}
Jenjang: ${level}
Nomor WhatsApp: ${whatsappNumber}

=== JAWABAN KUESIONER ===
${formattedAnswers}

=== TUGAS & FORMAT OUTPUT ===
Anda WAJIB memberikan jawaban dalam bentuk JSON valid dengan struktur persis berikut tanpa teks tambahan di luar JSON:
{
  "summary": "Ringkasan profil dan kondisi anak (1-2 paragraf)",
  "analysis": "Penjelasan analisis mendalam mengenai gaya belajar dan karakter anak",
  "strengths": "Kekuatan utama & poin positif anak",
  "weaknesses": "Area yang perlu dikembangkan atau membutuhkan stimulasi lebih",
  "potential": "Potensi minat & bakat anak di masa depan",
  "risk": "Risiko atau tantangan yang mungkin dihadapi bila tidak didampingi dengan tepat",
  "education_recommendation": "Rekomendasi metode belajar, pendekatan parenting, aktivitas rumah, serta lingkungan sekolah untuk jenjang ${level}"
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
      let endpoint = `${baseUrl || (provider.provider_key === "lovable" ? "https://ai-gateway.lovable.dev/v1" : "https://api.openai.com/v1")}/chat/completions`;
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const effectiveKey = (provider.provider_key === "lovable" && (!key || key.includes("auto"))) 
        ? (process.env.LOVABLE_GATEWAY_KEY || "lovable-gateway-auto") 
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
    console.error(`[AI Engine Error] (${provider?.provider_name}):`, err);
    return {
      success: false,
      providerName: provider?.provider_name,
      error: err.message || "Gagal menghubungi layanan AI."
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

    return {
      summary: obj.summary || "Analisis telah selesai disusun.",
      analysis: obj.analysis || text,
      strengths: obj.strengths || "-",
      weaknesses: obj.weaknesses || "-",
      potential: obj.potential || "-",
      risk: obj.risk || "-",
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
