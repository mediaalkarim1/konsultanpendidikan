import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, WaProviderConfig } from "./whatsapp-client";

export type SimulateWaInput = {
  targetAdmin: string;
  targetParent: string;
  adminMessage: string;
  parentMessage: string;
};

export type SimulateWaResult = {
  admin: { success: boolean; target: string; message: string; error?: string; responsePayload?: any };
  parent: { success: boolean; target: string; message: string; error?: string; responsePayload?: any };
  provider: string;
};

export const simulateWaSend = createServerFn({ method: "POST" })
  .validator((input: SimulateWaInput) => input)
  .handler(async ({ data }): Promise<SimulateWaResult> => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    let waConfig: WaProviderConfig = { provider: "mock", api_url: "", api_key: "" };

    if (supabaseUrl && supabaseKey) {
      const db = createClient(supabaseUrl, supabaseKey);
      const { data: row } = await db.from("settings").select("value").eq("key", "wa.provider_config").maybeSingle();
      if (row?.value) waConfig = row.value as WaProviderConfig;
    }

    const result: SimulateWaResult = {
      admin: { success: false, target: data.targetAdmin, message: data.adminMessage },
      parent: { success: false, target: data.targetParent, message: data.parentMessage },
      provider: waConfig.provider,
    };

    if (data.targetAdmin && data.adminMessage) {
      const r = await sendWhatsAppMessage(data.targetAdmin, data.adminMessage, waConfig);
      result.admin = { success: r.success, target: data.targetAdmin, message: data.adminMessage, error: r.errorMessage, responsePayload: r.responsePayload };
    }
    if (data.targetParent && data.parentMessage) {
      const r = await sendWhatsAppMessage(data.targetParent, data.parentMessage, waConfig);
      result.parent = { success: r.success, target: data.targetParent, message: data.parentMessage, error: r.errorMessage, responsePayload: r.responsePayload };
    }

    return result;
  });
