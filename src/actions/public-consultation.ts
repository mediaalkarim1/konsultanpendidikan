import { createServerFn } from "@tanstack/react-start";
import { getAdminSupabase } from "@/lib/supabase-admin";

/**
 * PUBLIC endpoint. Returns ONLY confirmation data (no answers, no analysis, no report).
 * Deliberately never selects analysis/answer columns so nothing sensitive reaches the browser.
 */
export const getConsultationConfirmationAction = createServerFn({ method: "POST" })
  .validator((payload: { consultationId: string }) => payload)
  .handler(async (ctx) => {
    const { consultationId } = ctx.data;
    if (!consultationId || !/^[0-9a-f-]{36}$/i.test(consultationId)) {
      return { success: false as const, error: "ID konsultasi tidak valid." };
    }

    try {
      const supabaseAdmin = getAdminSupabase();
      const { data, error } = await (supabaseAdmin as any)
        .from("consultations")
        .select("id, parent_name, child_name, level, created_at")
        .eq("id", consultationId)
        .maybeSingle();

      if (error || !data) {
        return { success: false as const, error: "Data konsultasi tidak ditemukan." };
      }

      let parentName: string = data.parent_name || "-";
      let childName: string = data.child_name || "";
      const match = /^(.*?)\s*\(Anak:\s*(.*?)\)\s*$/.exec(parentName);
      if (match) {
        parentName = match[1].trim();
        if (!childName || childName === "-") childName = match[2].trim();
      }

      return {
        success: true as const,
        confirmation: {
          parent_name: parentName,
          child_name: childName && childName !== "-" ? childName : "Ananda",
          level: data.level as string,
          created_at: data.created_at as string,
        },
      };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "Gagal memuat konfirmasi." };
    }
  });
