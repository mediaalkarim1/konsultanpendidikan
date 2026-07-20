export type WaProviderConfig = {
  provider: "mock" | "fonnte" | "wablas";
  api_url: string;
  api_key: string;
  device_id?: string;
};

export type WaSendResult = {
  success: boolean;
  responsePayload: any;
  errorMessage?: string;
};

export async function sendWhatsAppMessage(
  targetNumber: string,
  message: string,
  config: WaProviderConfig
): Promise<WaSendResult> {
  // Format target number (ensure it starts with valid country code, e.g., Fonnte usually requires 08... or 62...)
  // For safety, we just pass the number as is, the provider should handle it.

  if (config.provider === "mock" || !config.api_key) {
    console.log(`[WA MOCK] To: ${targetNumber} | Message: ${message}`);
    return {
      success: true,
      responsePayload: { mock: true, message: "Mock message sent successfully" },
    };
  }

  try {
    if (config.provider === "fonnte") {
      const apiUrl = config.api_url || "https://api.fonnte.com/send";
      const formData = new FormData();
      formData.append("target", targetNumber);
      formData.append("message", message);
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: config.api_key,
        },
        body: formData,
      });

      const responsePayload = await res.json();
      
      if (!res.ok || (responsePayload.status === false)) {
        return {
          success: false,
          responsePayload,
          errorMessage: responsePayload.reason || "Fonnte API Error",
        };
      }
      return { success: true, responsePayload };
      
    } else if (config.provider === "wablas") {
      // Wablas endpoint depends on the domain they provide, e.g., https://solo.wablas.com/api/send-message
      const apiUrl = config.api_url;
      if (!apiUrl) throw new Error("Wablas API URL is required");

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: config.api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: targetNumber,
          message: message,
          secret: false,
          retry: false,
          isGroup: false
        }),
      });

      const responsePayload = await res.json();
      if (!res.ok || responsePayload.status === false) {
        return {
          success: false,
          responsePayload,
          errorMessage: responsePayload.message || "Wablas API Error",
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
