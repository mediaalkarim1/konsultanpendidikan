export type WaProviderConfig = {
  provider: "mock" | "fonnte" | "wablas" | "woowa" | "starsender" | "whacenter";
  api_url: string;
  api_key: string;
  device_id?: string;
  sender_phone?: string;
};

export type WaSendResult = {
  success: boolean;
  responsePayload: any;
  errorMessage?: string;
};

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  } else if (clean.startsWith("8")) {
    clean = "62" + clean;
  }
  return clean;
}

export async function sendWhatsAppMessage(
  targetNumber: string,
  message: string,
  config: WaProviderConfig
): Promise<WaSendResult> {
  const formattedNumber = normalizePhoneNumber(targetNumber) || targetNumber;

  if (config.provider === "mock") {
    console.log(`[WA MOCK] To: ${formattedNumber} (${targetNumber}) | Message: ${message}`);
    return {
      success: true,
      responsePayload: { mock: true, formattedNumber, message: "Pesan tersimpan dalam Mode Simulasi (Mock WA)" },
    };
  }

  if (!config.api_key || !config.api_key.trim()) {
    return {
      success: false,
      responsePayload: null,
      errorMessage: "API Token / Key WhatsApp belum diisi pada Pengaturan Provider WhatsApp Gateway di Admin.",
    };
  }

  try {
    if (config.provider === "fonnte") {
      const apiUrl = config.api_url || "https://api.fonnte.com/send";
      const formData = new FormData();
      formData.append("target", formattedNumber);
      formData.append("message", message);
      formData.append("countryCode", "62");
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: config.api_key.trim(),
        },
        body: formData,
      });

      const responsePayload = await res.json().catch(() => ({ status: false, reason: "Response JSON parsing failed" }));
      
      if (!res.ok || responsePayload.status === false) {
        return {
          success: false,
          responsePayload,
          errorMessage: responsePayload.reason || responsePayload.message || "Fonnte API Error",
        };
      }
      return { success: true, responsePayload };
      
    } else if (config.provider === "wablas") {
      const apiUrl = config.api_url || "https://solo.wablas.com/api/send-message";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: config.api_key.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: formattedNumber,
          message: message,
          secret: false,
          retry: false,
          isGroup: false
        }),
      });

      const responsePayload = await res.json().catch(() => ({ status: false, message: "Response JSON parsing failed" }));
      if (!res.ok || responsePayload.status === false) {
        return {
          success: false,
          responsePayload,
          errorMessage: responsePayload.message || responsePayload.reason || "Wablas API Error",
        };
      }
      return { success: true, responsePayload };

    } else if (config.provider === "woowa") {
      const apiUrl = config.api_url || "https://api.woowa.id/send_message";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: config.api_key.trim(),
          phone: formattedNumber,
          message: message,
        }),
      });

      const responsePayload = await res.json().catch(() => ({ status: "error", message: "Response JSON parsing failed" }));
      if (!res.ok || responsePayload.status === "error" || responsePayload.status === false) {
        return {
          success: false,
          responsePayload,
          errorMessage: responsePayload.message || "WooWA API Error",
        };
      }
      return { success: true, responsePayload };

    } else if (config.provider === "starsender") {
      const apiUrl = config.api_url || "https://api.starsender.online/api/sendText";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          apikey: config.api_key.trim(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          to: formattedNumber,
        }),
      });

      const responsePayload = await res.json().catch(() => ({ status: false, message: "Response JSON parsing failed" }));
      if (!res.ok || responsePayload.status === false) {
        return {
          success: false,
          responsePayload,
          errorMessage: responsePayload.message || "StarSender API Error",
        };
      }
      return { success: true, responsePayload };

    } else if (config.provider === "whacenter") {
      const apiUrl = config.api_url || "https://api.whacenter.com/send";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: config.api_key.trim(),
          number: formattedNumber,
          message: message,
        }),
      });

      const responsePayload = await res.json().catch(() => ({ status: false, message: "Response JSON parsing failed" }));
      if (!res.ok || responsePayload.status === false) {
        return {
          success: false,
          responsePayload,
          errorMessage: responsePayload.message || "WhaCenter API Error",
        };
      }
      return { success: true, responsePayload };
    }

    throw new Error(`Unknown provider: ${config.provider}`);
  } catch (error: any) {
    console.error("WhatsApp Send Error:", error);
    return {
      success: false,
      responsePayload: null,
      errorMessage: error.message || "Network Error",
    };
  }
}
