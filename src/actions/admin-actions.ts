import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { processConsultation } from "./process-consultation";

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials for server function");
  return createClient(supabaseUrl, supabaseServiceKey);
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
    for (const item of ctx.data.updates) {
      const { data: existing } = await supabaseAdmin.from("settings").select("key").eq("key", item.key).single();
      if (existing) {
        const { error: updateErr } = await supabaseAdmin.from("settings").update({ value: item.value, is_public: item.is_public }).eq("key", item.key);
        if (updateErr) {
          await supabaseAdmin.from("settings").upsert(item as any, { onConflict: "key" });
        }
      } else {
        const { error: insertErr } = await supabaseAdmin.from("settings").insert(item as any);
        if (insertErr) {
          await supabaseAdmin.from("settings").upsert(item as any, { onConflict: "key" });
        }
      }
    }
    return { success: true };
  });

// --- AI Providers Management ---
export const getAiProvidersAction = createServerFn({ method: "POST" })
  .handler(async () => {
    const supabaseAdmin = getAdminSupabase();
    const { data, error } = await supabaseAdmin.from("ai_providers").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
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
    const supabaseAdmin = getAdminSupabase();
    const { data, error } = await supabaseAdmin.from("ai_prompts").select("*").limit(1).single();
    if (error && error.code !== "PGRST116") throw error;
    return data;
  });

export const saveMultiPromptsAction = createServerFn({ method: "POST" })
  .validator((payload: { prompts: any; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { prompts, email } = ctx.data;

    if (prompts.id) {
      const { error } = await supabaseAdmin.from("ai_prompts").update({
        system_prompt: prompts.system_prompt,
        analysis_prompt: prompts.analysis_prompt,
        summary_prompt: prompts.summary_prompt,
        recommendation_prompt: prompts.recommendation_prompt,
        updated_at: new Date().toISOString()
      }).eq("id", prompts.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("ai_prompts").insert({
        system_prompt: prompts.system_prompt,
        analysis_prompt: prompts.analysis_prompt,
        summary_prompt: prompts.summary_prompt,
        recommendation_prompt: prompts.recommendation_prompt
      });
      if (error) throw error;
    }

    await logActivityInternal(email, "SAVE_AI_PROMPTS", {});
    return { success: true };
  });

// --- Re-Generate AI Analysis & Edit Analysis ---
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

    // Update main consultation ai_result for backward compatibility
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
    
    const { data: cons } = await supabaseAdmin.from("consultations").select("parent_name, level").eq("id", ctx.data.id).single();
    
    const { error } = await supabaseAdmin.from("consultations").delete().eq("id", ctx.data.id);
    if (error) throw error;

    await logActivityInternal(ctx.data.email, "DELETE_CONSULTATION", { 
      consultation_id: ctx.data.id, 
      parent_name: cons?.parent_name,
      level: cons?.level
    });
    
    return { success: true };
  });

// --- WhatsApp Templates Management ---
export const getWaTemplatesAction = createServerFn({ method: "POST" })
  .handler(async () => {
    const supabaseAdmin = getAdminSupabase();
    const { data, error } = await supabaseAdmin.from("wa_templates").select("*").order("template_key", { ascending: true });
    if (error) throw error;
    return data || [];
  });

export const saveWaTemplatesAction = createServerFn({ method: "POST" })
  .validator((payload: { templates: Array<{ template_key: string; template_name: string; content: string }>; email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    const { templates, email } = ctx.data;

    for (const tpl of templates) {
      const { error } = await supabaseAdmin.from("wa_templates").upsert({
        template_key: tpl.template_key,
        template_name: tpl.template_name,
        content: tpl.content,
        updated_at: new Date().toISOString()
      }, { onConflict: "template_key" });

      if (error) throw error;
    }

    await logActivityInternal(email, "SAVE_WA_TEMPLATES", { count: templates.length });
    return { success: true };
  });

// --- AI Workflow Config Management ---
export const getAiWorkflowConfigAction = createServerFn({ method: "POST" })
  .handler(async () => {
    const supabaseAdmin = getAdminSupabase();
    const { data, error } = await supabaseAdmin.from("settings").select("value").eq("key", "ai.workflow_config").single();
    if (error && error.code !== "PGRST116") throw error;
    return data?.value || null;
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


