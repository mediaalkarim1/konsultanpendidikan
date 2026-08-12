import { getAdminSupabase } from "../src/lib/supabase-admin.ts";

async function testSettingsInsert() {
  const supabaseAdmin = getAdminSupabase();

  const payload = {
    key: "test.key." + Date.now(),
    value: { test: "data" },
    is_public: true,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseAdmin.from("settings").upsert(payload, { onConflict: "key" });
  console.log("Settings insert result:", data, "Err:", error?.message || "SUCCESS!");
}

testSettingsInsert();
