import IncomeExpensesChart from "@/components/analytics/IncomeExpensesChart";
import SpendingTrendsChart from "@/components/analytics/SpendingTrendsChart";
import { BankIcon } from "hugeicons-react-native";
import React, { JSX, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type TabName = "Day" | "Week" | "Month" | "Year";

interface StatItem {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

interface CategoryItem {
  emoji: JSX.Element;
  bgColor: string;
  name: string;
  sub: string;
  amount: string;
  barColor: string;
  pct: number;
}

interface CategoryBarProps {
  barColor: string;
  pct: number;
}

// ─── CATEGORY BAR ─────────────────────────────────────────────────────────────
const CategoryBar: React.FC<CategoryBarProps> = ({ barColor, pct }) => (
  <View className="w-20 h-[5px] bg-gray-100 rounded-full overflow-hidden">
    <View
      className="h-full rounded-full"
      style={{ width: `${pct}%`, backgroundColor: barColor }}
    />
  </View>
);

// ─── DATA CONSTANTS ───────────────────────────────────────────────────────────
const TABS: TabName[] = ["Day", "Week", "Month", "Year"];

const STATS: StatItem[] = [
  { label: "TOTAL SPEND", value: "$2.4k", change: "+5%", positive: true },
  { label: "AVG DAILY", value: "$81", change: "-2%", positive: false },
  { label: "SAVINGS", value: "18%", change: "+1%", positive: true },
];

const CATEGORIES: CategoryItem[] = [
  {
    emoji: <BankIcon size={18} color="#2563EB" />,
    bgColor: "#EEF6FF",
    name: "CBE",
    sub: "12 Transactions",
    amount: "$840.50",
    barColor: "#3B82F6",
    pct: 75,
  },
  {
    emoji: <BankIcon size={18} color="#2563EB" />,
    bgColor: "#EFF6FF",
    name: "Awash",
    sub: "24 Transactions",
    amount: "$320.15",
    barColor: "#3B82F6",
    pct: 28,
  },
  {
    emoji: <BankIcon size={18} color="#2563EB" />,
    bgColor: "#F5F3FF",
    name: "Telebirr",
    sub: "8 Transactions",
    amount: "$1,120.00",
    barColor: "#3B82F6",
    pct: 100,
  },
];

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>("Month");

  return (
    <View className="flex-1 pt-5 bg-gray-100">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* <View className="flex-row items-center justify-between p-4">
          <Text className="text-2xl font-bold text-black">
            Analaytics Dashboard
          </Text>
          <Text className="text-sm text-accent">Export</Text>
        </View> */}

        {/* ── TABS ── */}
        <View className="flex-row p-1 mx-4 mb-3 bg-gray-200 rounded-xl">
          {TABS.map((tab: TabName) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2 rounded-xl items-center ${
                activeTab === tab ? "bg-white " : ""
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
            Spending Trends
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-[32px] font-extrabold text-gray-900 tracking-tight">
              $2,450.00
            </Text>
            <Text className="text-[13px] font-semibold text-red-500">
              ↘ 12.5%
            </Text>
          </View>
          <SpendingTrendsChart />
        </View>

        {/* ── STATS ROW ── */}
        <View className="flex-row gap-2 mx-4 mb-3">
          {STATS.map((s: StatItem) => (
            <View key={s.label} className="flex-1 p-3 bg-white rounded-2xl">
              <Text className="text-[9px] text-gray-500 font-bold tracking-widest uppercase">
                {s.label}
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-gray-900">
                {s.value}
              </Text>
              <Text
                className={`text-xs font-semibold mt-0.5 ${
                  s.positive ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {s.change}
              </Text>
            </View>
          ))}
        </View>

        {/* ── INCOME VS EXPENSES CARD ── */}
        <View className="p-4 mx-4 mb-3 bg-white rounded-2xl">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">
              Income vs. Expenses
            </Text>
            <View className="flex-row items-center gap-1">
              <View className="w-2 h-2 bg-blue-500 rounded-full" />
              <Text className="text-xs text-gray-500">Income</Text>
              <View className="w-2 h-2 ml-2 bg-gray-300 rounded-full" />
              <Text className="text-xs text-gray-500">Exp.</Text>
            </View>
          </View>
          <IncomeExpensesChart />
        </View>

        {/* ── TOP CATEGORIES ── */}
        <Text className="mx-4 mt-1 mb-3 text-lg font-bold text-gray-900">
          Top Categories
        </Text>

        {CATEGORIES.map((cat: CategoryItem, i: number) => (
          <View
            key={i}
            className="mx-4 mb-2.5 bg-white rounded-2xl p-3.5 flex-row items-center "
          >
            {/* Category icon */}
            <View
              className="items-center justify-center mr-3 w-11 h-11 rounded-xl"
              style={{ backgroundColor: cat.bgColor }}
            >
              <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
            </View>

            {/* Name + transaction count */}
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-gray-900">
                {cat.name}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">{cat.sub}</Text>
            </View>

            {/* Amount + progress bar */}
            <View className="items-end min-w-[90px]">
              <Text className="text-[15px] font-bold text-gray-900 mb-1.5">
                {cat.amount}
              </Text>
              <CategoryBar barColor={cat.barColor} pct={cat.pct} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default Analytics;
