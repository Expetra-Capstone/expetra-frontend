import DailyComparisonChart from "@/components/analytics/Dailycomparisonchart";
import SpendingTrendsChart from "@/components/analytics/SpendingTrendsChart";
import { useAuth } from "@/context/AuthContext";
import {
  getTransactions,
  getValidatedBalance,
  Transaction,
} from "@/services/apiService";
import {
  buildTrendLabels,
  CategoryData,
  computeAnalytics,
  formatETB,
  formatPct,
  TabName,
  trendArrow,
} from "@/utils/analyticsData";
import { BankIcon } from "hugeicons-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TABS: TabName[] = ["Day", "Week", "Month", "Year"];

const BANK_COLORS: Record<
  string,
  { iconColor: string; bgColor: string; barColor: string }
> = {
  CBE: { iconColor: "#2563EB", bgColor: "#EEF6FF", barColor: "#3B82F6" },
  Awash: { iconColor: "#2563EB", bgColor: "#EFF6FF", barColor: "#3B82F6" },
  Telebirr: { iconColor: "#7C3AED", bgColor: "#F5F3FF", barColor: "#8B5CF6" },
};
const DEFAULT_BANK_COLOR = {
  iconColor: "#2563EB",
  bgColor: "#EEF6FF",
  barColor: "#3B82F6",
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
const CategoryBar: React.FC<{ barColor: string; pct: number }> = ({
  barColor,
  pct,
}) => (
  <View className="w-20 h-[5px] bg-gray-100 rounded-full overflow-hidden">
    <View
      className="h-full rounded-full"
      style={{ width: `${pct}%`, backgroundColor: barColor }}
    />
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const Analytics: React.FC = () => {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<TabName>("Month");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // ── Fetch transactions + balance in parallel ────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [txResult, balResult] = await Promise.all([
        getTransactions(token),
        getValidatedBalance(token),
      ]);
      if (!txResult.error) setTransactions(txResult.data);
      if (!balResult.error) setTotalBalance(balResult.data.total_balance);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Recompute whenever tab or transactions change ───────────────────────
  const derived = useMemo(
    () => computeAnalytics(transactions, activeTab),
    [transactions, activeTab],
  );

  const trendLabels = useMemo(() => buildTrendLabels(activeTab), [activeTab]);

  // ── Spending-trends header ──────────────────────────────────────────────
  // Lower flow vs previous period → spending is down → show green
  const flowIsDown = derived.flowChange <= 0;
  const flowArrow = trendArrow(-derived.flowChange); // flip: down spend = ↘ good
  const flowPctDisplay = `${flowArrow} ${Math.abs(Math.round(derived.flowChange * 100))}%`;

  // ── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-gray-100">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 pt-5 bg-gray-100">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* ── TABS ── */}
        <View className="flex-row p-1 mx-4 mb-3 bg-gray-200 rounded-xl">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2 rounded-xl items-center ${
                activeTab === tab ? "bg-white" : ""
              }`}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                className={`text-sm ${
                  activeTab === tab
                    ? "text-blue-600 font-bold"
                    : "text-gray-500 font-medium"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SPENDING TRENDS CARD ── */}
        <View className="p-4 mx-4 mb-3 bg-white rounded-2xl">
          <Text className="text-[13px] text-gray-500 mb-1">
            Transaction Flow
          </Text>
          <View className="flex-row items-end gap-2">
            <Text className="text-[28px] font-extrabold text-gray-900 tracking-tight">
              {formatETB(derived.totalFlow)}
            </Text>
            <Text
              className={`text-[13px] font-semibold mb-1 ${
                flowIsDown ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {flowPctDisplay}
            </Text>
          </View>
          <SpendingTrendsChart
            trendPoints={derived.spendTrend}
            labels={trendLabels}
          />
        </View>

        {/* ── STATS ROW ── */}
        <View className="flex-row gap-2 mx-4 mb-3">
          {/* Total Flow */}
          <View className="flex-1 p-3 bg-white rounded-2xl">
            <Text className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">
              Total Flow
            </Text>
            <Text
              className="mt-1 text-lg font-extrabold text-gray-900"
              numberOfLines={1}
            >
              {formatETB(derived.totalFlow, true)}
            </Text>
            <Text
              className={`text-xs font-semibold mt-0.5 ${
                derived.flowChange <= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {formatPct(derived.flowChange)}
            </Text>
          </View>

          {/* Avg Daily */}
          <View className="flex-1 p-3 bg-white rounded-2xl">
            <Text className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">
              Avg Daily
            </Text>
            <Text
              className="mt-1 text-lg font-extrabold text-gray-900"
              numberOfLines={1}
            >
              {formatETB(derived.avgDaily, true)}
            </Text>
            <Text
              className={`text-xs font-semibold mt-0.5 ${
                derived.avgDailyChange <= 0
                  ? "text-emerald-500"
                  : "text-red-500"
              }`}
            >
              {formatPct(derived.avgDailyChange)}
            </Text>
          </View>

          {/* Transaction Count */}
          <View className="flex-1 p-3 bg-white rounded-2xl">
            <Text className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">
              Tx Count
            </Text>
            <Text className="mt-1 text-lg font-extrabold text-gray-900">
              {derived.txCount}
            </Text>
            <Text
              className={`text-xs font-semibold mt-0.5 ${
                derived.txCountChange >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {formatPct(derived.txCountChange)}
            </Text>
          </View>
        </View>

        {/* ── DAILY COMPARISON CARD ── */}
        <View className="p-4 mx-4 mb-3 bg-white rounded-2xl">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              Daily Breakdown
            </Text>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 bg-blue-500 rounded-full" />
              <Text className="text-xs text-gray-500">Today</Text>
              <View className="w-2 h-2 ml-2 bg-gray-300 rounded-full" />
              <Text className="text-xs text-gray-500">Prior days</Text>
            </View>
          </View>
          <DailyComparisonChart data={derived.dailyComparison} />
        </View>

        {/* ── TOP CATEGORIES ── */}
        <Text className="mx-4 mt-1 mb-3 text-lg font-bold text-gray-900">
          Top Banks
        </Text>

        {derived.categoryBreakdown.length === 0 ? (
          <View className="items-center p-6 mx-4 bg-white rounded-2xl">
            <Text className="text-sm text-gray-400">
              No transactions in this period
            </Text>
          </View>
        ) : (
          derived.categoryBreakdown.map((cat: CategoryData, i: number) => {
            const colors = BANK_COLORS[cat.name] ?? DEFAULT_BANK_COLOR;
            return (
              <View
                key={i}
                className="mx-4 mb-2.5 bg-white rounded-2xl p-3.5 flex-row items-center"
              >
                {/* Bank icon */}
                <View
                  className="items-center justify-center mr-3 w-11 h-11 rounded-xl"
                  style={{ backgroundColor: colors.bgColor }}
                >
                  <BankIcon size={18} color={colors.iconColor} />
                </View>

                {/* Name + count */}
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-gray-900">
                    {cat.name}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {cat.transactions} Transaction
                    {cat.transactions !== 1 ? "s" : ""}
                  </Text>
                </View>

                {/* Amount + bar */}
                <View className="items-end min-w-[110px]">
                  <Text className="text-[13px] font-bold text-gray-900 mb-1.5">
                    {formatETB(cat.amount, true)}
                  </Text>
                  <CategoryBar barColor={colors.barColor} pct={cat.pct} />
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default Analytics;
