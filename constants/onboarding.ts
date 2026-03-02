export type IllustrationKey = "wallet" | "analytics" | "goals";

export interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  illustrationKey: IllustrationKey;
  accentColor: string;
  bgColor: string;
}

export const ONBOARDING_STORAGE_KEY = "@onboarding_done" as const;

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: "1",
    title: "Track Every\nTransaction",
    subtitle:
      "Stay on top of every purchase with real-time expense tracking and instant spending alerts.",
    illustrationKey: "wallet",
    accentColor: "#2563EB",
    bgColor: "#EFF6FF",
  },
  {
    id: "2",
    title: "Understand Your\nSpending",
    subtitle:
      "Beautiful analytics and smart insights help you see exactly where your money goes each month.",
    illustrationKey: "analytics",
    accentColor: "#2563EB", // ← was #7C3AED
    bgColor: "#EFF6FF", // ← was #F5F3FF
  },
  {
    id: "3",
    title: "Achieve Your\nFinancial Goals",
    subtitle:
      "Set savings targets, build better habits, and take full control of your financial future.",
    illustrationKey: "goals",
    accentColor: "#2563EB", // ← was #059669
    bgColor: "#EFF6FF", // ← was #ECFDF5
  },
];
