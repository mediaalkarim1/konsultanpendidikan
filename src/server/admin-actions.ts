import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
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
  .validator((payload: { email: string, action: string, details?: any }) => payload)
  .handler(async (ctx) => {
    // We could get IP from headers if this was a full request object, but for now we just log the action
    await logActivityInternal(ctx.data.email, ctx.data.action, ctx.data.details);
    return { success: true };
  });

export const updateConsultationStatus = createServerFn({ method: "POST" })
  .validator((payload: { id: string, status: string, email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    
    const { error } = await supabaseAdmin.from("consultations").update({ status: ctx.data.status }).eq("id", ctx.data.id);
    if (error) throw error;

    await logActivityInternal(ctx.data.email, "UPDATE_STATUS", { consultation_id: ctx.data.id, new_status: ctx.data.status });
    
    return { success: true };
  });

export const deleteConsultation = createServerFn({ method: "POST" })
  .validator((payload: { id: string, email: string }) => payload)
  .handler(async (ctx) => {
    const supabaseAdmin = getAdminSupabase();
    
    // Fetch some info before deleting for the log
    const { data: cons } = await supabaseAdmin.from("consultations").select("parent_name, level").eq("id", ctx.data.id).single();
    
    // Deleting consultation will cascade and delete consultation_answers and notification_logs (if constraint is set to cascade)
    const { error } = await supabaseAdmin.from("consultations").delete().eq("id", ctx.data.id);
    if (error) throw error;

    await logActivityInternal(ctx.data.email, "DELETE_CONSULTATION", { 
      consultation_id: ctx.data.id, 
      parent_name: cons?.parent_name,
      level: cons?.level
    });
    
    return { success: true };
  });
