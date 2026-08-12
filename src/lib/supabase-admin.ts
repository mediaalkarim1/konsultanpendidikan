import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

export function getAdminSupabase(): any {
  const DEFAULT_URL = "https://muyugntbzspnincoaekj.supabase.co";
  const DEFAULT_KEY = "sb_publishable_KHzSJnooFPXSFmwcL8yvpg_pHLzwSBK";

  const supabaseUrl = (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) || DEFAULT_URL;
  const supabaseServiceKey = (typeof process !== 'undefined' && (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SERVICE_KEY || process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.SUPABASE_PUBLISHABLE_KEY)) || DEFAULT_KEY;

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined
        );
        if (init?.headers) {
          new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        }
        if (isNewSupabaseApiKey(supabaseServiceKey) && headers.get('Authorization') === `Bearer ${supabaseServiceKey}`) {
          headers.delete('Authorization');
        }
        headers.set('apikey', supabaseServiceKey);
        return fetch(input, { ...init, headers });
      }
    },
    auth: { persistSession: false }
  });
}
