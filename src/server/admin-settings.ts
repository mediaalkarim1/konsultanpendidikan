import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

// Basic auth check for server functions
function verifyToken(token: string) {
  if (token !== "mediaalkarim") {
    throw new Error("Unauthorized");
  }
}

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseServiceKey);
}

export const getAdminSettings = createServerFn("POST", async (token: string) => {
  verifyToken(token);
  const supabaseAdmin = getAdminSupabase();
  const { data, error } = await supabaseAdmin.from("settings").select("*").in("key", ["ai.prompt", "ai.gemini_key", "ai.gemini_model", "wa.provider"]);
  if (error) throw error;
  return data;
});

export const saveAdminSetting = createServerFn("POST", async (payload: { token: string, key: string, value: any }) => {
  verifyToken(payload.token);
  const supabaseAdmin = getAdminSupabase();
  const { error } = await supabaseAdmin.from("settings").upsert({ key: payload.key, value: payload.value, is_public: false });
  if (error) throw error;
  return { success: true };
});
