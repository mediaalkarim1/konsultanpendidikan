import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side admin authorization.
 * Requires a valid Supabase session AND the "admin" role in public.user_roles.
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context as any;

    const { data: isAdmin, error } = await (supabase as any).rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (error || !isAdmin) {
      throw new Error("Forbidden: Akses ditolak. Hanya admin yang diizinkan.");
    }

    return next({ context: { supabase, userId, isAdmin: true } });
  });
