// config/constants.ts

export const OPENROUTER_CONFIG = {
  API_KEY:
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "YOUR_OPENROUTER_API_KEY",
  MODEL: "qwen/qwen-2.5-vl-7b-instruct",
  API_URL: "https://openrouter.ai/api/v1/chat/completions",
  APP_NAME: "ExpenseTracker",
  SITE_URL: "",
};

export const STORAGE_KEYS = {
  EXPENSES: "@expense_tracker:expenses",
};

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
