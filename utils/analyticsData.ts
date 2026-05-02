import { Transaction } from "@/services/apiService";

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type TabName = "Day" | "Week" | "Month" | "Year";

export interface DailyDataPoint {
  label: string;
  total: number; // raw ETB value
  normalized: number; // 0–100 for bar height
  isToday: boolean;
}

export interface CategoryData {
  name: string;
  amount: number;
  pct: number; // 0–100 for progress bar
  transactions: number;
}

export interface AnalyticsDerivedData {
  // ── Stats ──────────────────────────────────────────────────────────────
  totalFlow: number;
  avgDaily: number;
  txCount: number;

  // ── Change vs. previous same-length period ─────────────────────────────
  flowChange: number;
  avgDailyChange: number;
  txCountChange: number;

  // ── Charts ─────────────────────────────────────────────────────────────
  spendTrend: number[]; // 9 values 0–100
  dailyComparison: DailyDataPoint[]; // last 5 calendar days
  categoryBreakdown: CategoryData[];
}

// ─── TIME HELPERS ─────────────────────────────────────────────────────────────

function tabDays(tab: TabName): number {
  switch (tab) {
    case "Day":
      return 1;
    case "Week":
      return 7;
    case "Month":
      return 30;
    case "Year":
      return 365;
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Transactions within the CURRENT period for the active tab */
export function filterByTab(
  transactions: Transaction[],
  tab: TabName,
): Transaction[] {
  const now = new Date();
  if (tab === "Day") {
    const todayStr = startOfDay(now).toDateString();
    return transactions.filter(
      (t) =>
        startOfDay(new Date(t.transaction_time)).toDateString() === todayStr,
    );
  }
  const cutoffMs = now.getTime() - tabDays(tab) * 86_400_000;
  return transactions.filter(
    (t) => new Date(t.transaction_time).getTime() >= cutoffMs,
  );
}

/** Transactions within the PREVIOUS same-length period (for change %) */
function filterPreviousPeriod(
  transactions: Transaction[],
  tab: TabName,
): Transaction[] {
  const now = new Date();
  const periodMs = tabDays(tab) * 86_400_000;

  if (tab === "Day") {
    const yStr = startOfDay(new Date(now.getTime() - periodMs)).toDateString();
    return transactions.filter(
      (t) => startOfDay(new Date(t.transaction_time)).toDateString() === yStr,
    );
  }

  const currentStart = now.getTime() - periodMs;
  const prevStart = now.getTime() - 2 * periodMs;
  return transactions.filter((t) => {
    const ms = new Date(t.transaction_time).getTime();
    return ms >= prevStart && ms < currentStart;
  });
}

// ─── AGGREGATION HELPERS ──────────────────────────────────────────────────────

function sumAmounts(txs: Transaction[]): number {
  return txs.reduce((s, t) => s + Math.abs(t.amount), 0);
}

function safeChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return (current - previous) / previous;
}

// ─── SPEND TREND (9 buckets → 0–100) ─────────────────────────────────────────

function buildSpendTrend(transactions: Transaction[], tab: TabName): number[] {
  const now = new Date();
  const startMs =
    tab === "Day"
      ? startOfDay(now).getTime()
      : now.getTime() - tabDays(tab) * 86_400_000;
  const spanMs = now.getTime() - startMs;

  const buckets = Array<number>(9).fill(0);

  transactions.forEach((t) => {
    const elapsed = new Date(t.transaction_time).getTime() - startMs;
    if (elapsed < 0 || elapsed > spanMs) return;
    const idx = Math.min(8, Math.floor((elapsed / spanMs) * 9));
    buckets[idx] += Math.abs(t.amount);
  });

  const max = Math.max(...buckets, 1);
  return buckets.map((v) => Math.round((v / max) * 88 + 5)); // range 5–93
}

// ─── DAILY COMPARISON (last 5 calendar days, fixed window) ───────────────────

function buildDailyComparison(transactions: Transaction[]): DailyDataPoint[] {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = startOfDay(new Date());

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today.getTime() - (4 - i) * 86_400_000); // oldest→newest
    const dStr = d.toDateString();
    const total = transactions
      .filter(
        (t) => startOfDay(new Date(t.transaction_time)).toDateString() === dStr,
      )
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return { label: DAY_NAMES[d.getDay()], total, isToday: i === 4 };
  });

  const max = Math.max(...days.map((d) => d.total), 1);
  return days.map((d) => ({
    ...d,
    normalized: d.total === 0 ? 0 : Math.round((d.total / max) * 88 + 5),
  }));
}

// ─── CATEGORY BREAKDOWN ───────────────────────────────────────────────────────

function buildCategoryBreakdown(transactions: Transaction[]): CategoryData[] {
  const map = new Map<string, { total: number; count: number }>();

  transactions.forEach((t) => {
    const key = t.beneficiary_bank?.trim() || "Other";
    const cur = map.get(key) ?? { total: 0, count: 0 };
    map.set(key, {
      total: cur.total + Math.abs(t.amount),
      count: cur.count + 1,
    });
  });

  const sorted = [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxTotal = sorted[0]?.[1].total ?? 1;

  return sorted.slice(0, 3).map(([name, { total, count }]) => ({
    name,
    amount: total,
    pct: Math.round((total / maxTotal) * 100),
    transactions: count,
  }));
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

/**
 * Computes every analytics figure from real transaction data.
 * The active `tab` controls which time window is used for stats + trend.
 * `dailyComparison` always covers the last 5 calendar days regardless of tab.
 */
export function computeAnalytics(
  transactions: Transaction[],
  tab: TabName,
): AnalyticsDerivedData {
  const current = filterByTab(transactions, tab);
  const previous = filterPreviousPeriod(transactions, tab);

  const totalFlow = sumAmounts(current);
  const prevTotalFlow = sumAmounts(previous);
  const days = tabDays(tab);
  const avgDaily = totalFlow / days;
  const prevAvgDaily = prevTotalFlow / days;

  return {
    totalFlow,
    avgDaily,
    txCount: current.length,
    flowChange: safeChange(totalFlow, prevTotalFlow),
    avgDailyChange: safeChange(avgDaily, prevAvgDaily),
    txCountChange: safeChange(current.length, previous.length),
    spendTrend: buildSpendTrend(current, tab),
    dailyComparison: buildDailyComparison(transactions),
    categoryBreakdown: buildCategoryBreakdown(current),
  };
}

// ─── FORMATTING ───────────────────────────────────────────────────────────────

/** ETB 2,400.00  |  ETB 2.4k (compact)  |  ETB 1.2M (compact) */
export function formatETB(value: number, compact = false): string {
  if (compact && value >= 1_000_000) {
    return `ETB ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (compact && value >= 1_000) {
    return `ETB ${(value / 1_000).toFixed(1)}k`;
  }
  return `ETB ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** +5%  or  -2% */
export function formatPct(value: number): string {
  const abs = Math.abs(Math.round(value * 100));
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${abs}%`;
}

/** ↗ for positive, ↘ for negative/zero */
export function trendArrow(value: number): string {
  return value > 0 ? "↗" : "↘";
}

/**
 * 5 evenly-spaced x-axis labels for the trend chart,
 * scoped to the active tab's time window.
 */
export function buildTrendLabels(tab: TabName): string[] {
  const now = new Date();

  if (tab === "Day") {
    return ["12am", "6am", "12pm", "6pm", "11pm"];
  }

  if (tab === "Week") {
    const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now.getTime() - (4 - i) * 86_400_000);
      return DAY_NAMES[d.getDay()];
    });
  }

  if (tab === "Month") {
    const month = now.toLocaleString("default", { month: "short" });
    const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const step = Math.floor(total / 4);
    return Array.from({ length: 5 }, (_, i) => `${1 + i * step} ${month}`);
  }

  // Year → last 5 months
  const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
    return MONTH_NAMES[d.getMonth()];
  });
}
