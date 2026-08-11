import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { processConsultation } from "./process-consultation";

function getAdminSupabase() {
  const DEFAULT_URL = "https://muyugntbzspnincoaekj.supabase.co";
  const DEFAULT_KEY = "sb_publishable_KHzSJnooFPXSFmwcL8yvpg_pHLzwSBK";
  const supabaseUrl = (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) || DEFAULT_URL;
  const supabaseServiceKey = (typeof process !== 'undefined' && (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SERVICE_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) || DEFAULT_KEY;
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

// Internal helper for logging
export async function logActivityInternal(adminEmail: string, action: string, details: any = null, ipAddress: string = "") {
  try {
    const supabaseAdmin = getAdminSupabase();
    await supabaseAdmin.from("activity_logs").insert({
      admin_email: adminEmail,
      action,
      details,
      ip_address: ipAddress
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}

export const logActivity = createServerFn({ method: "POST" })
  .validator((payload: { email: string; action: string; details?: any }) => payload)
  .handler(async (ctx) => {
    await logActivityInternal(ctx.data.email, ctx.data.action, ctx.data.details);
    return { success: true };
  });

export const saveSettingsAction = createServerFn({ method: "POST" })
  .validator((payload: { updates: Array<{ key: string; value: any; is_public: boolean }> }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    if (!ctx.data || !ctx.data.updates) {
      throw new Error("Payload 'updates' tidak ditemukan");
    }

    for (const item of ctx.data.updates) {
      const { data: existing } = await supabaseAdmin.from("settings").select("key").eq("key", item.key).maybeSingle();
      if (existing) {
        const { error: updateErr } = await supabaseAdmin.from("settings").update({ value: item.value, is_public: item.is_public }).eq("key", item.key);
        if (updateErr) {
          console.warn(`[saveSettingsAction] Update failed for ${item.key}, attempting upsert:`, updateErr);
          const { error: upsertErr } = await supabaseAdmin.from("settings").upsert(item as any, { onConflict: "key" });
          if (upsertErr) throw upsertErr;
        }
      } else {
        const { error: insertErr } = await supabaseAdmin.from("settings").insert(item as any);
        if (insertErr) {
          console.warn(`[saveSettingsAction] Insert failed for ${item.key}, attempting upsert:`, insertErr);
          const { error: upsertErr } = await supabaseAdmin.from("settings").upsert(item as any, { onConflict: "key" });
          if (upsertErr) throw upsertErr;
        }
      }
    }
    return { success: true };
  });

// --- AI Providers Management ---
export const getAiProvidersAction = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data, error } = await supabaseAdmin.from("ai_providers").select("*").order("created_at", { ascending: true });
      if (error) {
        console.warn("getAiProvidersAction error:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error("getAiProvidersAction exception:", e);
      return [];
    }
  });

export const saveAiProviderAction = createServerFn({ method: "POST" })
  .validator((payload: { provider: any; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { provider, email } = ctx.data;

    // If making this default, unset default on all other providers
    if (provider.is_default) {
      await supabaseAdmin.from("ai_providers").update({ is_default: false }).neq("id", provider.id || "00000000-0000-0000-0000-000000000000");
    }

    if (provider.id) {
      const { error } = await supabaseAdmin.from("ai_providers").update({
        provider_name: provider.provider_name,
        api_key: provider.api_key,
        base_url: provider.base_url,
        model: provider.model,
        temperature: Number(provider.temperature),
        max_tokens: Number(provider.max_tokens),
        is_default: provider.is_default,
        is_active: provider.is_active,
        updated_at: new Date().toISOString()
      }).eq("id", provider.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("ai_providers").insert({
        provider_name: provider.provider_name,
        provider_key: provider.provider_key || provider.provider_name.toLowerCase().replace(/\s+/g, "_"),
        api_key: provider.api_key,
        base_url: provider.base_url,
        model: provider.model,
        temperature: Number(provider.temperature),
        max_tokens: Number(provider.max_tokens),
        is_default: provider.is_default,
        is_active: provider.is_active
      });
      if (error) throw error;
    }

    await logActivityInternal(email, "SAVE_AI_PROVIDER", { provider_key: provider.provider_key, is_default: provider.is_default });
    return { success: true };
  });

// --- Multi-Prompts Management ---
export const getMultiPromptsAction = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabaseAdmin = getAdminSupabase();

      // 1. Try fetching from settings table first (guaranteed key-value table)
      const { data: settingRow } = await supabaseAdmin
        .from("settings")
        .select("*")
        .eq("key", "ai.unified_prompt")
        .maybeSingle();

      if (settingRow && settingRow.value) {
        const val = settingRow.value as any;
        return {
          id: val.id || "setting-prompt",
          system_prompt: val.system_prompt || val.prompt || "",
          analysis_prompt: val.analysis_prompt || val.prompt || "",
          summary_prompt: val.summary_prompt || val.prompt || "",
          recommendation_prompt: val.recommendation_prompt || val.prompt || "",
          selected_model: val.selected_model || "google/gemini-3.5-flash"
        };
      }

      // 2. Fallback: Try fetching from ai_prompts table if available
      const { data } = await supabaseAdmin.from("ai_prompts").select("*").limit(1).maybeSingle();
      if (data) {
        return { ...data, selected_model: (data as any).selected_model || "google/gemini-3.5-flash" };
      }
      return null;
    } catch (e) {
      console.error("getMultiPromptsAction exception:", e);
      return null;
    }
  });

export const saveMultiPromptsAction = createServerFn({ method: "POST" })
  .validator((payload: { prompts: any; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { prompts, email } = ctx.data;

    const selectedModel = prompts.selected_model || "google/gemini-3.5-flash";

    const settingPayload = {
      id: prompts.id || "unified-prompt",
      system_prompt: prompts.system_prompt,
      analysis_prompt: prompts.analysis_prompt || prompts.system_prompt,
      summary_prompt: prompts.summary_prompt || prompts.system_prompt,
      recommendation_prompt: prompts.recommendation_prompt || prompts.system_prompt,
      selected_model: selectedModel,
      updated_at: new Date().toISOString()
    };

    // 1. Save to settings table (key: "ai.unified_prompt")
    const { error: setErr } = await supabaseAdmin.from("settings").upsert({
      key: "ai.unified_prompt",
      value: settingPayload as any,
      is_public: false,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });

    if (setErr) {
      console.error("Save prompt to settings error:", setErr);
    }

    // Update default AI Provider model in ai_providers table if existing
    try {
      await supabaseAdmin.from("ai_providers").update({ model: selectedModel }).eq("is_default", true);
    } catch (_) {}

    // 2. Try saving to ai_prompts table if it exists
    try {
      if (prompts.id && !prompts.id.startsWith("setting-") && !prompts.id.startsWith("unified-")) {
        await supabaseAdmin.from("ai_prompts").update({
          system_prompt: prompts.system_prompt,
          analysis_prompt: prompts.analysis_prompt || prompts.system_prompt,
          summary_prompt: prompts.summary_prompt || prompts.system_prompt,
          recommendation_prompt: prompts.recommendation_prompt || prompts.system_prompt,
          updated_at: new Date().toISOString()
        }).eq("id", prompts.id);
      } else {
        const { data: inserted } = await supabaseAdmin.from("ai_prompts").insert({
          system_prompt: prompts.system_prompt,
          analysis_prompt: prompts.analysis_prompt || prompts.system_prompt,
          summary_prompt: prompts.summary_prompt || prompts.system_prompt,
          recommendation_prompt: prompts.recommendation_prompt || prompts.system_prompt
        }).select().single();

        if (inserted && inserted.id) {
          settingPayload.id = inserted.id;
          await supabaseAdmin.from("settings").upsert({
            key: "ai.unified_prompt",
            value: settingPayload as any,
            is_public: false,
            updated_at: new Date().toISOString()
          }, { onConflict: "key" });
        }
      }
    } catch (dbErr) {
      console.warn("ai_prompts table save notice:", dbErr);
    }

    await logActivityInternal(email, "SAVE_AI_PROMPTS", {});
    return { success: true };
  });

// --- Force Activate New AI Prompt Format ---
// This action writes the new 4-section structured prompt directly to DB,
// overwriting any old narrative-format prompt that may exist.
export const forceActivateNewPromptAction = createServerFn({ method: "POST" })
  .validator((email: string) => email)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const email = ctx.data || "admin";

    const NEW_PROMPT = `# PERAN
Anda adalah Konsultan Pendidikan Anak profesional yang berpengalaman dalam perkembangan anak usia TK, SD, SMP, dan SMA.

Gunakan bahasa Indonesia yang hangat, sopan, mudah dipahami, dan tidak menghakimi. Berikan analisis yang membangun, realistis, dan berorientasi pada solusi.

---

# DATA KONSULTASI
Nama Orang Tua: {{nama_orang_tua}}
Nama Anak: {{nama_anak}}
Jenjang Pendidikan: {{jenjang}}

---

# TUGAS
Baca SELURUH jawaban orang tua dengan seksama.

Temukan pola yang BENAR-BENAR muncul dari jawaban tersebut.

Jangan gunakan template kategori yang sama untuk setiap anak.

Setiap anak harus mendapatkan analisis yang berbeda sesuai jawaban orang tuanya.

---

# FORMAT OUTPUT

Hasil analisis hanya terdiri dari 4 bagian:

## 1. RINGKASAN AWAL
Berikan ringkasan singkat berdasarkan keseluruhan jawaban orang tua.
Jelaskan: gambaran umum anak, kecenderungan yang terlihat, kekuatan yang menonjol, hal utama yang perlu diperhatikan.
Gunakan 1-2 paragraf pendek.
Jangan membuat kesimpulan yang tidak didukung oleh jawaban.

## 2. AREA YANG PERLU DIPERHATIKAN
Baca seluruh jawaban dan tentukan sendiri area yang perlu diperhatikan berdasarkan jawaban tersebut.
JANGAN gunakan daftar kategori tetap seperti: konsentrasi, akademik, sosial, emosi, kemandirian, komunikasi, disiplin - kecuali memang benar-benar muncul dari jawaban.
Tampilkan SEMUA area yang ditemukan dari jawaban - jumlahnya tidak ditentukan (bisa 2, bisa 8, bisa 10).
Setiap area diawali dengan tanda dan menggunakan format heading ### [tanda seru] [Nama Area]
Disertai penjelasan singkat berdasarkan jawaban orang tua.
Gabungkan jawaban dengan pola yang sama menjadi satu temuan.
Jangan mengarang area yang tidak didukung jawaban.
Jangan memberikan label negatif atau melakukan diagnosis medis.

## 3. MINAT & POTENSI
Temukan sendiri minat dan potensi anak berdasarkan jawaban orang tua.
Jangan gunakan template potensi yang sama untuk semua anak.
Tampilkan hanya potensi yang memiliki dasar dari jawaban.
Setiap potensi menggunakan format heading ### [bintang] [Nama Potensi]
Disertai penjelasan singkat berdasarkan jawaban.

## 4. REKOMENDASI
Berikan rekomendasi khusus untuk orang tua berdasarkan hasil analisis.
Rekomendasi harus berhubungan langsung dengan area yang perlu diperhatikan, minat, potensi, pola belajar, dan kebutuhan anak dari jawaban.
Gunakan rekomendasi konkret yang dapat dilakukan di rumah.
JANGAN memberikan rekomendasi sekolah atau lembaga pendidikan tertentu.
Gunakan heading ### [target] Rekomendasi Pendampingan
Disertai bullet point rekomendasi yang spesifik.

---

# ATURAN PENTING
- Jangan membuat narasi panjang yang mengalir.
- Jangan menggunakan template yang sama untuk semua anak.
- Gunakan format heading dan bullet yang terstruktur.
- Semua area perhatian WAJIB diawali tanda seru.
- Semua potensi WAJIB diawali tanda bintang.
- Rekomendasi WAJIB menggunakan tanda target.
- Jangan menakut-nakuti orang tua.
- Jangan melakukan diagnosis medis atau psikologis.
- Jangan memberikan rekomendasi sekolah.
- Jumlah area perhatian dan potensi mengikuti temuan dari jawaban.

Data Jawaban Konsultasi:
{{jawaban_lengkap}}`;

    const settingPayload = {
      id: "unified-prompt-v2",
      system_prompt: NEW_PROMPT,
      analysis_prompt: NEW_PROMPT,
      summary_prompt: NEW_PROMPT,
      recommendation_prompt: NEW_PROMPT,
      selected_model: "google/gemini-2.5-flash",
      format_version: "v2-structured-4section",
      updated_at: new Date().toISOString()
    };

    // 1. Overwrite settings table
    const { error: settingErr } = await supabaseAdmin.from("settings").upsert({
      key: "ai.unified_prompt",
      value: settingPayload as any,
      is_public: false,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });

    if (settingErr) {
      console.error("[forceActivateNewPromptAction] settings upsert error:", settingErr);
      return { success: false, error: settingErr.message };
    }

    // 2. Also overwrite all rows in ai_prompts table
    try {
      await supabaseAdmin.from("ai_prompts").update({
        system_prompt: NEW_PROMPT,
        analysis_prompt: NEW_PROMPT,
        summary_prompt: NEW_PROMPT,
        recommendation_prompt: NEW_PROMPT,
        updated_at: new Date().toISOString()
      }).neq("id", "00000000-0000-0000-0000-000000000000"); // update all rows
    } catch (dbErr) {
      console.warn("[forceActivateNewPromptAction] ai_prompts update notice:", dbErr);
    }

    await logActivityInternal(email, "FORCE_ACTIVATE_NEW_PROMPT", { format_version: "v2-structured-4section" });
    return { success: true, message: "Prompt baru (format 4 bagian) berhasil diaktifkan di database." };
  });


export const reGenerateAnalysisAction = createServerFn({ method: "POST" })
  .validator((payload: { consultationId: string; email: string }) => payload)
  .handler(async (ctx) => {
    const { consultationId, email } = ctx.data;
    const res = await processConsultation({ data: consultationId });
    await logActivityInternal(email, "REGENERATE_AI_ANALYSIS", { consultation_id: consultationId, success: res.success });
    return res;
  });

export const updateAnalysisAction = createServerFn({ method: "POST" })
  .validator((payload: { consultationId: string; analysisData: any; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { consultationId, analysisData, email } = ctx.data;

    const { error } = await supabaseAdmin.from("consultation_analysis").upsert({
      consultation_id: consultationId,
      summary: analysisData.summary,
      analysis: analysisData.analysis,
      strengths: analysisData.strengths,
      weaknesses: analysisData.weaknesses,
      potential: analysisData.potential,
      risk: analysisData.risk,
      education_recommendation: analysisData.education_recommendation
    }, { onConflict: "consultation_id" });

    if (error) throw error;

    await supabaseAdmin.from("consultations").update({
      ai_result: analysisData.analysis
    }).eq("id", consultationId);

    await logActivityInternal(email, "EDIT_AI_ANALYSIS", { consultation_id: consultationId });
    return { success: true };
  });

// --- Existing Status & Deletion ---
export const updateConsultationStatus = createServerFn({ method: "POST" })
  .validator((payload: { id: string; status: string; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { error } = await supabaseAdmin.from("consultations").update({ status: ctx.data.status }).eq("id", ctx.data.id);
    if (error) throw error;
    await logActivityInternal(ctx.data.email, "UPDATE_STATUS", { consultation_id: ctx.data.id, new_status: ctx.data.status });
    return { success: true };
  });

export const deleteConsultation = createServerFn({ method: "POST" })
  .validator((payload: { id: string; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { data: cons } = await supabaseAdmin.from("consultations").select("parent_name, level").eq("id", ctx.data.id).maybeSingle();
    const { error } = await supabaseAdmin.from("consultations").delete().eq("id", ctx.data.id);
    if (error) throw error;
    await logActivityInternal(ctx.data.email, "DELETE_CONSULTATION", { consultation_id: ctx.data.id, parent_name: cons?.parent_name, level: cons?.level });
    return { success: true };
  });

// --- WhatsApp Templates Management ---
export const getWaTemplatesAction = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabaseAdmin = getAdminSupabase();

      // 1. First attempt: Try fetching from wa_templates table if present
      try {
        const { data, error } = await supabaseAdmin.from("wa_templates" as any).select("*").order("template_key", { ascending: true });
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (_) {
        // Table wa_templates does not exist in schema cache
      }

      // 2. Second attempt: Fetch from settings table (key: "wa.templates")
      const { data: settingRow } = await supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", "wa.templates")
        .maybeSingle();

      if (settingRow && settingRow.value && Array.isArray(settingRow.value) && settingRow.value.length > 0) {
        return settingRow.value;
      }

      // 3. Fallback defaults if neither table nor settings record exists
      return [
        {
          template_key: "admin_notification",
          template_name: "Notifikasi Admin",
          content: "Ada konsultasi baru yang masuk.\n\nNama: {{nama}}\nNomor HP: {{nomor}}\nJenjang: {{jenjang}}\nTanggal: {{tanggal}}\n\nSilakan login ke Dashboard Admin untuk melihat detail konsultasi."
        },
        {
          template_key: "participant_notification",
          template_name: "Notifikasi Orang Tua",
          content: "Terima kasih telah mengirim konsultasi di EduKonsul.\n\nData Anda telah kami terima.\n\nSaat ini sistem sedang melakukan analisis.\n\nTim kami akan menghubungi Anda apabila diperlukan.\n\nTerima kasih."
        }
      ];
    } catch (e) {
      console.error("getWaTemplatesAction exception:", e);
      return [];
    }
  });

export const saveWaTemplatesAction = createServerFn({ method: "POST" })
  .validator((payload: { templates: Array<{ template_key: string; template_name: string; content: string }>; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { templates, email } = ctx.data;

    let savedToTable = false;

    // 1. Try saving to wa_templates table if present
    try {
      for (const tpl of templates) {
        const { error } = await supabaseAdmin.from("wa_templates" as any).upsert({
          template_key: tpl.template_key,
          template_name: tpl.template_name,
          content: tpl.content,
          updated_at: new Date().toISOString()
        }, { onConflict: "template_key" });

        if (error) {
          console.warn("[saveWaTemplatesAction] wa_templates table missing or failed, saving to settings table:", error.message);
          savedToTable = false;
          break;
        }
        savedToTable = true;
      }
    } catch (_) {
      savedToTable = false;
    }

    // 2. Guaranteed Save: Save to settings table under key "wa.templates" using admin service role (bypasses RLS)
    try {
      const { data: existing } = await supabaseAdmin.from("settings").select("key").eq("key", "wa.templates").maybeSingle();
      if (existing) {
        await supabaseAdmin.from("settings").update({
          value: templates as any,
          is_public: false,
          updated_at: new Date().toISOString()
        }).eq("key", "wa.templates");
      } else {
        await supabaseAdmin.from("settings").insert({
          key: "wa.templates",
          value: templates as any,
          is_public: false,
          updated_at: new Date().toISOString()
        });
      }
    } catch (sErr: any) {
      console.error("[saveWaTemplatesAction] Settings fallback save notice:", sErr);
      if (!savedToTable) return { success: false, error: sErr.message };
    }

    await logActivityInternal(email, "SAVE_WA_TEMPLATES", { count: templates.length, savedToTable });
    return { success: true };
  });

// --- Homepage Settings Management (Server Action - Bypasses RLS) ---
export const saveHomepageSettingsAction = createServerFn({ method: "POST" })
  .validator((payload: { config: any; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { config, email } = ctx.data;

    try {
      const { data: existing } = await supabaseAdmin.from("settings").select("key").eq("key", "site.homepage_config").maybeSingle();

      if (existing) {
        const { error: updateErr } = await supabaseAdmin.from("settings").update({
          value: config as any,
          is_public: true,
          updated_at: new Date().toISOString()
        }).eq("key", "site.homepage_config");

        if (updateErr) {
          await supabaseAdmin.from("settings").upsert({
            key: "site.homepage_config",
            value: config as any,
            is_public: true,
            updated_at: new Date().toISOString()
          }, { onConflict: "key" });
        }
      } else {
        await supabaseAdmin.from("settings").insert({
          key: "site.homepage_config",
          value: config as any,
          is_public: true,
          updated_at: new Date().toISOString()
        });
      }

      await logActivityInternal(email, "SAVE_HOMEPAGE_CONFIG", {});
      return { success: true };
    } catch (e: any) {
      console.error("[saveHomepageSettingsAction exception]:", e);
      return { success: false, error: e.message };
    }
  });

// --- AI Workflow Config Management ---
export const getAiWorkflowConfigAction = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data } = await supabaseAdmin.from("settings").select("value").eq("key", "ai.workflow_config").maybeSingle();
      return data?.value || null;
    } catch (e) {
      console.error("getAiWorkflowConfigAction exception:", e);
      return null;
    }
  });

export const saveAiWorkflowConfigAction = createServerFn({ method: "POST" })
  .validator((payload: { config: any; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { config, email } = ctx.data;

    const { error } = await supabaseAdmin.from("settings").upsert({
      key: "ai.workflow_config",
      value: config,
      is_public: false
    }, { onConflict: "key" });

    if (error) throw error;

    await logActivityInternal(email, "SAVE_AI_WORKFLOW_CONFIG", {});
    return { success: true };
  });

// --- WhatsApp Provider Configuration ---
export const getWaProviderConfigAction = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data } = await supabaseAdmin
        .from("settings")
        .select("value")
        .eq("key", "wa.provider_config")
        .maybeSingle();

      return data?.value || {
        provider: "mock",
        api_url: "https://api.fonnte.com/send",
        api_key: "",
        sender_phone: ""
      };
    } catch (e) {
      console.error(e);
      return {
        provider: "mock",
        api_url: "https://api.fonnte.com/send",
        api_key: "",
        sender_phone: ""
      };
    }
  });

export const saveWaProviderConfigAction = createServerFn({ method: "POST" })
  .validator((payload: { config: any; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { config, email } = ctx.data;

    const { error } = await supabaseAdmin.from("settings").upsert({
      key: "wa.provider_config",
      value: config as any,
      is_public: false,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" });

    if (error) {
      console.error("Save WA Provider config error:", error);
      return { success: false, error: error.message };
    }

    await logActivityInternal(email, "SAVE_WA_PROVIDER_CONFIG", { provider: config.provider });
    return { success: true };
  });

export function normalizeParentRow(row: any) {
  if (!row) return row;

  let parentName = row.parent_name || row.name || "";
  let childName = (row.child_name && row.child_name !== "-") ? row.child_name : "";
  let whatsappNumber = row.whatsapp_number || row.parent_phone || row.phone || "";
  let level = row.level || row.education_level || "tksd";
  let status = (row.status || "Menunggu Analisis").trim();

  // If child_name is missing, empty, or '-', attempt to extract it from parent_name if saved as "Parent (Anak: Child)"
  if ((!childName || childName === "-") && typeof parentName === "string" && parentName.includes(" (Anak: ")) {
    const parts = parentName.split(" (Anak: ");
    parentName = parts[0].trim();
    childName = parts[1].replace(/\)$/, "").trim();
  }

  // Automatic Status determination:
  // If analysis result exists -> "Analisis AI Selesai"
  // If analysis is missing & status was pending -> "Menunggu Analisis"
  // If error occurred -> "Gagal Analisis"
  const hasAnalysisData = Boolean(row.ai_result || row.summary || row.recommendation || row.analysis);
  const isFailed = status.toLowerCase().includes("gagal") || Boolean(row.error_message);

  if (isFailed) {
    status = "Gagal Analisis";
  } else if (hasAnalysisData && (status === "Menunggu Analisis" || status === "Menunggu Analisis AI" || status === "Sedang Dianalisis" || status === "new")) {
    status = "Analisis AI Selesai";
  } else if (!hasAnalysisData && (status === "Analisis AI Selesai" || status === "Selesai Dianalisis" || status === "analyzed")) {
    status = "Menunggu Analisis";
  }

  return {
    ...row,
    id: row.id,
    parent_name: parentName,
    child_name: childName || "-",
    whatsapp_number: whatsappNumber,
    level,
    status,
    created_at: row.created_at || new Date().toISOString()
  };
}

// --- Database Orang Tua Server Action ---
export const getParentsDatabaseAction = createServerFn({ method: "POST" })
  .validator((payload: { page?: number; limit?: number; search?: string; level?: string; date?: string }) => payload)
  .handler(async (ctx) => {
    try {
      const supabaseAdmin = getAdminSupabase();
      const { page = 1, limit = 10, search = "", level = "", date = "" } = ctx.data;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // 1. First attempt: Try fetching from dedicated 'parents' table if present
      try {
        let parentQuery = supabaseAdmin
          .from("parents" as any)
          .select("*", { count: "exact" });

        if (search) {
          parentQuery = parentQuery.or(`parent_name.ilike.%${search}%,child_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%,phone.ilike.%${search}%`);
        }
        if (level) parentQuery = parentQuery.eq("level", level);
        if (date) {
          parentQuery = parentQuery.gte("created_at", `${date}T00:00:00.000Z`).lte("created_at", `${date}T23:59:59.999Z`);
        }

        const { data: pData, count: pCount, error: pErr } = await parentQuery
          .order("created_at", { ascending: false })
          .range(from, to);

        if (!pErr && pData && pData.length > 0) {
          const normalized = pData.map(normalizeParentRow);
          return { success: true, data: normalized, count: pCount || normalized.length, source: "parents" };
        }
      } catch (_) {
        // Table parents not present, fallback
      }

      // 2. Second attempt: Query 'consultations' table using select("*") to avoid column missing errors
      let query = supabaseAdmin
        .from("consultations")
        .select("*", { count: "exact" });

      if (level) {
        query = query.eq("level", level as any);
      }

      if (date) {
        query = query.gte("created_at", `${date}T00:00:00.000Z`).lte("created_at", `${date}T23:59:59.999Z`);
      }

      // Safe search execution
      if (search) {
        // Try searching with child_name first
        let searchAttempt = supabaseAdmin
          .from("consultations")
          .select("*", { count: "exact" })
          .or(`parent_name.ilike.%${search}%,child_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%`);

        if (level) searchAttempt = searchAttempt.eq("level", level as any);
        if (date) searchAttempt = searchAttempt.gte("created_at", `${date}T00:00:00.000Z`).lte("created_at", `${date}T23:59:59.999Z`);

        const { data: testCols, count: testCount, error: testErr } = await searchAttempt
          .order("created_at", { ascending: false })
          .range(from, to);

        if (!testErr && testCols) {
          const normalized = testCols.map(normalizeParentRow);
          return { success: true, data: normalized, count: testCount || normalized.length, source: "consultations" };
        }

        // If search failed because child_name column doesn't exist, search safe columns parent_name & whatsapp_number
        query = supabaseAdmin
          .from("consultations")
          .select("*", { count: "exact" })
          .or(`parent_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%`);

        if (level) query = query.eq("level", level as any);
        if (date) query = query.gte("created_at", `${date}T00:00:00.000Z`).lte("created_at", `${date}T23:59:59.999Z`);
      }

      const { data: cols, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("[getParentsDatabaseAction error]:", error);
        return { success: false, error: error.message, data: [], count: 0 };
      }

      const normalized = (cols || []).map(normalizeParentRow);
      return { success: true, data: normalized, count: count || normalized.length, source: "consultations" };
    } catch (e: any) {
      console.error("[getParentsDatabaseAction exception]:", e);
      return { success: false, error: e.message, data: [], count: 0 };
    }
  });


