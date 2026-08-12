import { createServerFn } from "@tanstack/react-start";
import { processConsultation } from "./process-consultation";
import { getAdminSupabase } from "@/lib/supabase-admin";


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
    const NEW_PROMPT = DEFAULT_UNIFIED_PROMPT;

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

import { sanitizeAnalysisMarkdown } from "@/lib/pdf-generator";

export const updateAnalysisAction = createServerFn({ method: "POST" })
  .validator((payload: { consultationId: string; analysisData: any; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { consultationId, analysisData, email } = ctx.data;

    const sSummary = sanitizeAnalysisMarkdown(analysisData.summary);
    const sAnalysis = sanitizeAnalysisMarkdown(analysisData.analysis);
    const sStrengths = sanitizeAnalysisMarkdown(analysisData.strengths);
    const sWeaknesses = sanitizeAnalysisMarkdown(analysisData.weaknesses);
    const sPotential = sanitizeAnalysisMarkdown(analysisData.potential || analysisData.strengths);
    const sRisk = sanitizeAnalysisMarkdown(analysisData.risk || analysisData.weaknesses);
    const sRec = sanitizeAnalysisMarkdown(analysisData.education_recommendation);

    const { error } = await supabaseAdmin.from("consultation_analysis").upsert({
      consultation_id: consultationId,
      summary: sSummary,
      analysis: sAnalysis,
      strengths: sStrengths,
      weaknesses: sWeaknesses,
      potential: sPotential,
      risk: sRisk,
      education_recommendation: sRec
    }, { onConflict: "consultation_id" });

    if (error) throw error;

    await supabaseAdmin.from("consultations").update({
      ai_result: sAnalysis
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

  // Normalize status strings according to standard values
  if (status.toLowerCase().includes("gagal")) {
    status = "Gagal Analisis";
  } else if (status.includes("AI Selesai") || status.includes("Selesai Dianalisis") || status === "Analisis AI Selesai") {
    status = "Analisis AI Selesai";
  } else if (status === "Sudah Dihubungi" || status.includes("Follow Up")) {
    status = "Sudah Dihubungi";
  } else if (status === "Selesai" || status === "Closed" || status.includes("Konsultasi Selesai")) {
    status = "Selesai";
  } else {
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

// --- Consultation Management Server Action (Bypasses Client RLS) ---
export const getConsultationsListAction = createServerFn({ method: "POST" })
  .validator((payload: { page?: number; limit?: number; search?: string; status?: string; level?: string; date?: string }) => payload)
  .handler(async (ctx) => {
    try {
      const supabaseAdmin = getAdminSupabase();
      const { page = 1, limit = 10, search = "", status = "", level = "", date = "" } = ctx.data;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // 1. Fetch analysis records from settings table (bypasses non-existent table issues)
      let analyzedSet = new Set<string>();
      try {
        const { data: allAnalysis } = await supabaseAdmin.from("settings").select("key").like("key", "analysis.%");
        analyzedSet = new Set((allAnalysis || []).map((a: any) => a.key.replace("analysis.", "")));
      } catch (_) {}

      // 2. Fetch all consultations for stats
      const { data: allCons } = await supabaseAdmin.from("consultations").select("id, created_at, status, parent_name, whatsapp_number, level");
      
      const todayStr = new Date().toISOString().split("T")[0];
      let todayCount = 0;
      let pendingAiCount = 0;
      let pendingFollowUpCount = 0;
      let completedCount = 0;

      (allCons || []).forEach((item) => {
        const itemDate = new Date(item.created_at).toISOString().split("T")[0];
        if (itemDate === todayStr) todayCount++;

        const isAnalyzed = analyzedSet.has(item.id);
        const norm = normalizeParentRow({
          ...item,
          status: isAnalyzed && item.status !== "Sudah Dihubungi" && item.status !== "Selesai" ? "Analisis AI Selesai" : item.status
        });

        if (norm.status === "Analisis AI Selesai" || norm.status === "Sudah Dihubungi") {
          pendingFollowUpCount++;
        } else if (norm.status === "Selesai") {
          completedCount++;
        } else {
          pendingAiCount++;
        }
      });



      // 3. Build query for paginated data
      let query = supabaseAdmin.from("consultations").select("*", { count: "exact" });

      if (search) {
        query = query.or(`parent_name.ilike.%${search}%,whatsapp_number.ilike.%${search}%`);
      }
      if (status) {
        if (status === "Menunggu Analisis") query = query.in("status", ["Menunggu Analisis", "Menunggu Analisis AI", "Sedang Dianalisis"]);
        else if (status === "Analisis AI Selesai") query = query.in("status", ["Analisis AI Selesai", "Selesai Dianalisis"]);
        else if (status === "Sudah Dihubungi") query = query.in("status", ["Sudah Dihubungi", "Menunggu Follow Up Konsultan"]);
        else if (status === "Selesai") query = query.in("status", ["Selesai", "Konsultasi Selesai", "Closed"]);
        else if (status === "Gagal Analisis") query = query.in("status", ["Gagal Analisis", "Gagal Analisis AI"]);
        else query = query.eq("status", status);
      }
      if (level) query = query.eq("level", level as any);
      if (date) {
        query = query.gte("created_at", `${date}T00:00:00.000Z`).lte("created_at", `${date}T23:59:59.999Z`);
      }

      const { data: cols, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const normalizedData = (cols || []).map((row) => {
        const isAnalyzed = analyzedSet.has(row.id) || Boolean(row.ai_result);
        return normalizeParentRow({
          ...row,
          ai_result: row.ai_result || (isAnalyzed ? "ANALYZED_DONE" : null)
        });
      });

      return {

        success: true,
        data: normalizedData,
        count: count || normalizedData.length,
        stats: {
          total: (allCons || []).length,
          today: todayCount,
          pendingAi: pendingAiCount,
          pendingFollowUp: pendingFollowUpCount,
          completed: completedCount
        }
      };
    } catch (e: any) {
      console.error("getConsultationsListAction exception:", e);
      return { success: false, error: e.message, data: [], count: 0, stats: { total: 0, today: 0, pendingAi: 0, pendingFollowUp: 0, completed: 0 } };
    }
  });

// --- Bulk Sync & Auto-Generate Statuses Action ---

// --- Clean Database Markdown Action ---
export const sanitizeDatabaseAnalysisMarkdownAction = createServerFn({ method: "POST" })
  .validator((payload: { email: string }) => payload)
  .handler(async (ctx) => {
    try {
      const supabaseAdmin = getAdminSupabase();
      let cleanedAnalysisCount = 0;
      let cleanedConsultationsCount = 0;

      // 1. Clean consultation_analysis table
      const { data: analysisRows } = await supabaseAdmin.from("consultation_analysis").select("*");
      if (analysisRows) {
        for (const row of analysisRows) {
          const hasMarkdownHash = /#{1,6}/.test(
            (row.summary || "") + (row.analysis || "") + (row.weaknesses || "") + (row.strengths || "") + (row.education_recommendation || "")
          );

          if (hasMarkdownHash) {
            await supabaseAdmin.from("consultation_analysis").update({
              summary: sanitizeAnalysisMarkdown(row.summary),
              analysis: sanitizeAnalysisMarkdown(row.analysis),
              weaknesses: sanitizeAnalysisMarkdown(row.weaknesses),
              strengths: sanitizeAnalysisMarkdown(row.strengths),
              potential: sanitizeAnalysisMarkdown(row.potential || row.strengths),
              risk: sanitizeAnalysisMarkdown(row.risk || row.weaknesses),
              education_recommendation: sanitizeAnalysisMarkdown(row.education_recommendation)
            }).eq("consultation_id", row.consultation_id);
            cleanedAnalysisCount++;
          }
        }
      }

      // 2. Clean consultations table ai_result
      const { data: consultationRows } = await supabaseAdmin.from("consultations").select("id, ai_result").not("ai_result", "is", null);
      if (consultationRows) {
        for (const row of consultationRows) {
          if (row.ai_result && /#{1,6}/.test(row.ai_result)) {
            await supabaseAdmin.from("consultations").update({
              ai_result: sanitizeAnalysisMarkdown(row.ai_result)
            }).eq("id", row.id);
            cleanedConsultationsCount++;
          }
        }
      }

      await logActivityInternal(ctx.data.email || "admin", "SANITIZE_DATABASE_MARKDOWN", { cleanedAnalysisCount, cleanedConsultationsCount });
      return { success: true, cleanedAnalysisCount, cleanedConsultationsCount };
    } catch (e: any) {
      console.error("sanitizeDatabaseAnalysisMarkdownAction error:", e);
      return { success: false, error: e.message };
    }
  });

import { generateFallbackAnalysisResult } from "@/lib/pdf-generator";

export const sanitizeAndUpgradeAllDatabaseAnalysisAction = createServerFn({ method: "POST" })
  .validator((payload: { email: string }) => payload)
  .handler(async (ctx) => {
    try {
      const supabaseAdmin = getAdminSupabase();
      let upgradedCount = 0;

      const { data: consultations } = await supabaseAdmin.from("consultations").select("*");
      if (consultations) {
        for (const cons of consultations) {
          const { data: answers } = await supabaseAdmin
            .from("consultation_answers")
            .select("*, questions(question_text)")
            .eq("consultation_id", cons.id);

          if (!answers || answers.length === 0) continue;

          const allOptionIds = answers.flatMap((a: any) => a.selected_option_ids || []).filter(Boolean);
          let optionsMap: Record<string, string> = {};
          if (allOptionIds.length > 0) {
            const { data: opts } = await supabaseAdmin.from("question_options").select("id, option_text").in("id", allOptionIds);
            if (opts) optionsMap = (opts || []).reduce((acc: any, o: any) => ({ ...acc, [o.id]: o.option_text }), {});
          }

          const mappedAnswers = answers.map((a: any) => {
            const qText = a.questions?.question_text || a.question || "Pertanyaan Kuesioner";
            const optTexts = (a.selected_option_ids || [])
              .map((oid: string) => optionsMap[oid] || oid)
              .filter((t: string) => t && !/^[0-9a-f-]{36}$/i.test(t) && !t.startsWith("opt-") && !t.startsWith("smp-opt-") && !t.startsWith("sma-opt-"));

            const rawAns = a.answer_text || a.answer;
            const isValidAns = rawAns && rawAns !== "-" && !rawAns.startsWith("opt-") && !/^[0-9a-f-]{36}$/i.test(rawAns);
            const aText = isValidAns ? rawAns : (optTexts.length > 0 ? optTexts.join(", ") : (rawAns && rawAns !== "-" ? rawAns : "-"));
            return `P: ${qText}\nJ: ${aText}`;
          }).join("\n\n");

          const freshResult = generateFallbackAnalysisResult(cons.parent_name, cons.child_name || "-", cons.level, mappedAnswers);

          await supabaseAdmin.from("consultation_analysis").upsert({
            consultation_id: cons.id,
            summary: freshResult.summary,
            analysis: freshResult.analysis,
            strengths: freshResult.strengths,
            weaknesses: freshResult.weaknesses,
            potential: freshResult.potential,
            risk: freshResult.risk,
            education_recommendation: freshResult.education_recommendation,
            updated_at: new Date().toISOString()
          }, { onConflict: "consultation_id" });

          await supabaseAdmin.from("consultations").update({
            ai_result: freshResult.analysis,
            status: "Analisis AI Selesai"
          }).eq("id", cons.id);

          try {
            await supabaseAdmin.from("settings").upsert({
              key: `analysis.${cons.id}`,
              value: freshResult
            }, { onConflict: "key" });
          } catch (_) {}

          upgradedCount++;
        }
      }

      await logActivityInternal(ctx.data.email || "admin", "UPGRADE_ALL_DATABASE_ANALYSIS", { upgradedCount });
      return { success: true, upgradedCount };
    } catch (e: any) {
      console.error("sanitizeAndUpgradeAllDatabaseAnalysisAction error:", e);
      return { success: false, error: e.message };
    }
  });

export const bulkSyncConsultationStatusesAction = createServerFn({ method: "POST" })
  .validator((payload: { email: string }) => payload)
  .handler(async (ctx) => {
    try {
      const supabaseAdmin = getAdminSupabase();
      const { email } = ctx.data;

      // First run DB Markdown sanitizer
      try {
        await sanitizeDatabaseAnalysisMarkdownAction({ data: { email } });
      } catch (_) {}

      const { data: allCons } = await supabaseAdmin.from("consultations").select("id, parent_name, child_name, level, whatsapp_number, status, ai_result");
      const { data: allAnalysis } = await supabaseAdmin.from("consultation_analysis").select("consultation_id");
      const analyzedSet = new Set((allAnalysis || []).map((a: any) => a.consultation_id));

      let updatedCount = 0;
      let generatedCount = 0;

      for (const item of allCons || []) {
        const hasAnalysis = analyzedSet.has(item.id) || Boolean(item.ai_result);
        const s = (item.status || "").trim();

        if (hasAnalysis) {
          if (s !== "Analisis AI Selesai" && s !== "Sudah Dihubungi" && s !== "Selesai" && s !== "Closed" && s !== "Konsultasi Selesai") {
            await supabaseAdmin.from("consultations").update({ status: "Analisis AI Selesai" }).eq("id", item.id);
            updatedCount++;
          }
        } else if (s !== "Sudah Dihubungi" && s !== "Selesai" && s !== "Closed" && s !== "Konsultasi Selesai") {
          // Auto generate analysis for unanalyzed rows
          const res = await processConsultation({ data: item.id });
          if (res.success) {
            generatedCount++;
            updatedCount++;
          }
        }
      }

      await logActivityInternal(email, "BULK_SYNC_STATUSES", { updatedCount, generatedCount });
      return { success: true, updatedCount, generatedCount, message: `Berhasil menyinkronkan status (${updatedCount} data diperbarui, ${generatedCount} analisis ter-generate).` };
    } catch (e: any) {
      console.error("bulkSyncConsultationStatusesAction exception:", e);
      return { success: false, error: e.message };
    }
  });

