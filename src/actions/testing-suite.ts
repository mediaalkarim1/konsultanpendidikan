import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { sendWhatsAppMessage, WaProviderConfig } from "./whatsapp-client";

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials for server function");
  return createClient(supabaseUrl, supabaseServiceKey);
}

export type TestResult = {
  testName: string;
  success: boolean;
  executionTimeMs: number;
  responsePayload: any;
  errorMessage?: string;
};

// 1. Test Database
export const testDatabaseAction = createServerFn({ method: "POST" })
  .handler(async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data, count, error } = await supabaseAdmin.from("questions").select("id", { count: "exact" }).limit(5);
      const duration = Math.round(performance.now() - start);
      if (error) throw error;
      return {
        testName: "Test Database Supabase",
        success: true,
        executionTimeMs: duration,
        responsePayload: { status: "CONNECTED", sampleCount: count, data }
      };
    } catch (e: any) {
      return {
        testName: "Test Database Supabase",
        success: false,
        executionTimeMs: Math.round(performance.now() - start),
        responsePayload: null,
        errorMessage: e.message || "Gagal menghubungi database."
      };
    }
  });

// 2. Test Supabase Credentials & Config
export const testSupabaseConfigAction = createServerFn({ method: "POST" })
  .handler(async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const duration = Math.round(performance.now() - start);
      
      if (!url) throw new Error("URL Supabase belum diset di env");
      if (!key) throw new Error("Key Supabase belum diset di env");

      return {
        testName: "Test Konfigurasi Supabase",
        success: true,
        executionTimeMs: duration,
        responsePayload: { url, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY }
      };
    } catch (e: any) {
      return {
        testName: "Test Konfigurasi Supabase",
        success: false,
        executionTimeMs: Math.round(performance.now() - start),
        responsePayload: null,
        errorMessage: e.message
      };
    }
  });

// 3. Test Active AI Provider
export const testActiveAiProviderAction = createServerFn({ method: "POST" })
  .handler(async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data: provider, error } = await supabaseAdmin
        .from("ai_providers")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .single();

      const duration = Math.round(performance.now() - start);
      if (error || !provider) {
        throw new Error("Tidak ada Default AI Provider aktif di database.");
      }

      return {
        testName: "Test Active AI Provider",
        success: true,
        executionTimeMs: duration,
        responsePayload: {
          provider_name: provider.provider_name,
          provider_key: provider.provider_key,
          model: provider.model,
          hasApiKey: !!provider.api_key
        }
      };
    } catch (e: any) {
      return {
        testName: "Test Active AI Provider",
        success: false,
        executionTimeMs: Math.round(performance.now() - start),
        responsePayload: null,
        errorMessage: e.message
      };
    }
  });

// 4. Test Gemini API
export const testGeminiApiAction = createServerFn({ method: "POST" })
  .validator((payload: { apiKey?: string }) => payload)
  .handler(async (ctx): Promise<TestResult> => {
    const start = performance.now();
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data: geminiProvider } = await supabaseAdmin
        .from("ai_providers")
        .select("*")
        .eq("provider_key", "gemini")
        .single();

      const key = ctx.data.apiKey || geminiProvider?.api_key;
      if (!key) throw new Error("API Key Gemini belum diisi.");

      const model = geminiProvider?.model || "gemini-1.5-pro";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Tes koneksi EduKonsul. Balas 'OK'." }] }]
        })
      });

      const duration = Math.round(performance.now() - start);
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error?.message || "Google Gemini API Error");

      const reply = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      return {
        testName: "Test Google Gemini API",
        success: true,
        executionTimeMs: duration,
        responsePayload: { reply, model }
      };
    } catch (e: any) {
      return {
        testName: "Test Google Gemini API",
        success: false,
        executionTimeMs: Math.round(performance.now() - start),
        responsePayload: null,
        errorMessage: e.message
      };
    }
  });

// 5. Test OpenAI / Lovable Gateway
export const testOpenAiApiAction = createServerFn({ method: "POST" })
  .validator((payload: { apiKey?: string; baseUrl?: string }) => payload)
  .handler(async (ctx): Promise<TestResult> => {
    const start = performance.now();
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data: openaiProvider } = await supabaseAdmin
        .from("ai_providers")
        .select("*")
        .in("provider_key", ["lovable", "openai"])
        .eq("is_active", true)
        .limit(1)
        .single();

      const key = ctx.data.apiKey || openaiProvider?.api_key;
      const baseUrl = (ctx.data.baseUrl || openaiProvider?.base_url || "https://api.openai.com/v1").replace(/\/+$/, "");
      const model = openaiProvider?.model || "gpt-4o-mini";

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (key) headers["Authorization"] = `Bearer ${key}`;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Tes koneksi. Balas 'OK'." }],
          max_tokens: 10
        })
      });

      const duration = Math.round(performance.now() - start);
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error?.message || "OpenAI API Error");

      const reply = resData.choices?.[0]?.message?.content;
      return {
        testName: "Test OpenAI / Gateway API",
        success: true,
        executionTimeMs: duration,
        responsePayload: { reply, model, baseUrl }
      };
    } catch (e: any) {
      return {
        testName: "Test OpenAI / Gateway API",
        success: false,
        executionTimeMs: Math.round(performance.now() - start),
        responsePayload: null,
        errorMessage: e.message
      };
    }
  });

// 6. Test WhatsApp Connection
export const testWhatsAppAction = createServerFn({ method: "POST" })
  .validator((payload: { targetNumber: string }) => payload)
  .handler(async (ctx): Promise<TestResult> => {
    const start = performance.now();
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data: settingsData } = await supabaseAdmin.from("settings").select("*").eq("key", "wa.provider_config").single();
      const waConfig: WaProviderConfig = settingsData?.value || { provider: "mock", api_url: "", api_key: "" };

      const msg = `Percobaan koneksi WhatsApp dari EduKonsul.\nWaktu: ${new Date().toLocaleString('id-ID')}`;
      const res = await sendWhatsAppMessage(ctx.data.targetNumber, msg, waConfig);
      const duration = Math.round(performance.now() - start);

      return {
        testName: "Test WhatsApp Provider API",
        success: res.success,
        executionTimeMs: duration,
        responsePayload: { provider: waConfig.provider, payload: res.responsePayload },
        errorMessage: res.errorMessage
      };
    } catch (e: any) {
      return {
        testName: "Test WhatsApp Provider API",
        success: false,
        executionTimeMs: Math.round(performance.now() - start),
        responsePayload: null,
        errorMessage: e.message
      };
    }
  });

// 7. Test Storage
export const testStorageAction = createServerFn({ method: "POST" })
  .handler(async (): Promise<TestResult> => {
    const start = performance.now();
    try {
      const supabaseAdmin = getAdminSupabase();
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
      const duration = Math.round(performance.now() - start);
      if (error) throw error;

      return {
        testName: "Test Storage Supabase",
        success: true,
        executionTimeMs: duration,
        responsePayload: { bucketsCount: buckets.length, buckets: buckets.map(b => b.name) }
      };
    } catch (e: any) {
      return {
        testName: "Test Storage Supabase",
        success: false,
        executionTimeMs: Math.round(performance.now() - start),
        responsePayload: null,
        errorMessage: e.message
      };
    }
  });

// 8. Test Server Action Roundtrip
export const testServerFunctionsAction = createServerFn({ method: "POST" })
  .handler(async (): Promise<TestResult> => {
    const start = performance.now();
    const duration = Math.round(performance.now() - start);
    return {
      testName: "Test Server Functions RPC",
      success: true,
      executionTimeMs: duration,
      responsePayload: { status: "ACTIVE", serverTime: new Date().toISOString() }
    };
  });
