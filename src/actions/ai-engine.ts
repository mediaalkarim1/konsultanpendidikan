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

export async function runAiEngineAnalysis(parentName: string, level: string, whatsappNumber: string, formattedAnswers: string): Promise<{ success: boolean; data?: AiAnalysisResult; providerName?: string; error?: string }> {
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
  let { data: prompt } = await supabaseAdmin.from("ai_prompts").select("*").limit(1).single();

  const systemPrompt = prompt?.system_prompt || "Anda adalah Pakar Analis Potensi & Konsultan Pendidikan Anak Senior.";
  const analysisPrompt = (prompt?.analysis_prompt || "Lakukan analisis terhadap jawaban berikut:\n{{jawaban_lengkap}}")
    .replace("{{nama_orang_tua}}", parentName)
    .replace("{{jenjang}}", level)
    .replace("{{jawaban_lengkap}}", formattedAnswers);

  const summaryPrompt = (prompt?.summary_prompt || "Rangkum kondisi anak.").replace("{{jenjang}}", level);
  const recommendationPrompt = (prompt?.recommendation_prompt || "Berikan rekomendasi pendidikan.").replace("{{jenjang}}", level);

  const fullUserPrompt = `
=== DATA KONSULTASI ===
Nama Orang Tua: ${parentName}
Jenjang: ${level}
Nomor WhatsApp: ${whatsappNumber}

=== JAWABAN TES ===
${formattedAnswers}

=== INSTRUKSI ANALISIS ===
${analysisPrompt}

${summaryPrompt}

${recommendationPrompt}

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
              parts: [{ text: `${systemPrompt}\n\n${fullUserPrompt}` }]
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
          system: systemPrompt,
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
          prompt: `${systemPrompt}\n\n${fullUserPrompt}`,
          stream: false
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Ollama API error");
      rawResponseText = resData.response || "";

    } else {
      // OpenAI / Lovable Gateway / OpenRouter / DeepSeek / Groq / Mistral (Standard OpenAI format)
      let endpoint = `${baseUrl || "https://api.openai.com/v1"}/chat/completions`;
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (key) headers["Authorization"] = `Bearer ${key}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
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
