export const GEMINI_CONFIG = {
  API_KEY: "AIzaSyC2Bqx2OVIorvjK-EfxVotfEwfqbp2nQPo",
  // ✅ Best free vision model — 15 RPM, 500 RPD
  MODEL: "gemini-2.5-flash",
  // ✅ Fallback — higher daily quota (1000 RPD)
  FALLBACK_MODEL: "gemini-2.5-flash-lite",
  API_URL: "https://generativelanguage.googleapis.com/v1beta/models",
};

export const TRANSACTION_TYPES = [
  "sms",
  "bank_transfer",
  "receipt",
  "invoice",
  "other",
];
