export const GEMINI_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || "",
  // ✅ Best free vision model — 15 RPM, 500 RPD
  MODEL: "gemini-2.5-flash",
  // ✅ Fallback — higher daily quota (1000 RPD)
  FALLBACK_MODEL: "gemini-2.5-flash-lite",
  API_URL: "https://generativelanguage.googleapis.com/v1beta/models",
};

// Valid transaction types accepted by the backend enum
export const TRANSACTION_TYPES = [
  "screenshot", // uploaded from camera / gallery
  "sms", // extracted from SMS inbox
  "receipt",
  "invoice",
  "other",
];
