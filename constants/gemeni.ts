export const GEMINI_CONFIG = {
  API_KEY: "AIzaSyC2Bqx2OVIorvjK-EfxVotfEwfqbp2nQPo",
  // ✅ Best free vision model — 15 RPM, 500 RPD, no credit card
  MODEL: "gemini-2.5-flash",
  // ✅ Fallback — higher daily quota (1000 RPD)
  FALLBACK_MODEL: "gemini-2.5-flash-lite",
  API_URL: "https://generativelanguage.googleapis.com/v1beta/models",
};

// rest of your constants stay the same...
export const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Healthcare",
  "Utilities",
  "Other",
];

export const PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Mobile Payment",
  "Other",
];
