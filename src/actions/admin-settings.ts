import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "./admin-guard";

function getAdminSupabase() {
  const DEFAULT_URL = "https://muyugntbzspnincoaekj.supabase.co";
  const DEFAULT_KEY = "sb_publishable_KHzSJnooFPXSFmwcL8yvpg_pHLzwSBK";
  const supabaseUrl = (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) || DEFAULT_URL;
  const supabaseServiceKey = (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY)) || DEFAULT_KEY;
  return createClient(supabaseUrl, supabaseServiceKey);
}

function verifyToken(token: string) {
  if (token !== "mediaalkarim") throw new Error("Unauthorized");
}

export const getAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((token: string) => token)
  .handler(async (ctx) => {
    verifyToken(ctx.data);
    const supabaseAdmin = getAdminSupabase();
    const { data, error } = await supabaseAdmin.from("settings").select("*").in("key", ["ai.gemini_key", "ai.gemini_params", "wa.provider_config", "site.contact"]);
    if (error) throw error;
    return data;
  });

export const saveAdminSetting = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((payload: { token: string, key: string, value: any }) => payload)
  .handler(async (ctx) => {
    verifyToken(ctx.data.token);
    const supabaseAdmin = getAdminSupabase();
    const { error } = await supabaseAdmin.from("settings").upsert({ key: ctx.data.key, value: ctx.data.value, is_public: false });
    if (error) throw error;
    return { success: true };
  });

// Prompts Management
export const getPrompts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((token: string) => token)
  .handler(async (ctx) => {
    verifyToken(ctx.data);
    const supabaseAdmin = getAdminSupabase();
    const { data, error } = await supabaseAdmin.from("ai_prompts").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const savePrompt = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((payload: { token: string, prompt: any }) => payload)
  .handler(async (ctx) => {
    verifyToken(ctx.data.token);
    const supabaseAdmin = getAdminSupabase();
    
    // If setting active, deactivate others
    if (ctx.data.prompt.is_active) {
      await supabaseAdmin.from("ai_prompts").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000"); // update all
    }

    if (ctx.data.prompt.id) {
      const { error } = await supabaseAdmin.from("ai_prompts").update(ctx.data.prompt).eq("id", ctx.data.prompt.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("ai_prompts").insert(ctx.data.prompt);
      if (error) throw error;
    }
    return { success: true };
  });

export const deletePrompt = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((payload: { token: string, id: string }) => payload)
  .handler(async (ctx) => {
    verifyToken(ctx.data.token);
    const supabaseAdmin = getAdminSupabase();
    const { error } = await supabaseAdmin.from("ai_prompts").delete().eq("id", ctx.data.id);
    if (error) throw error;
    return { success: true };
  });
