// components/TransactionList.tsx

import { useRouter } from "expo-router";
import { Invoice02Icon } from "hugeicons-react-native";
import React from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { Transaction } from "../services/apiService";

interface TransactionListProps {
  transactions: Transaction[];
  emptyMessage?: string;
  scrollEnabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatType(type: string | undefined | null): string {
  if (!type) return "Other";
  if (type === "sms") return "SMS";
  if (type === "screenshot") return "Screenshot";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  screenshot: { bg: "bg-blue-500/20", text: "text-blue-600" },
  sms: { bg: "bg-purple-500/20", text: "text-purple-600" },
  receipt: { bg: "bg-green-500/20", text: "text-green-600" },
  invoice: { bg: "bg-orange-500/20", text: "text-orange-600" },
  other: { bg: "bg-gray-400/20", text: "text-gray-600" },
};

function typeBadge(type: string | undefined | null) {
  return TYPE_COLORS[type ?? ""] ?? TYPE_COLORS.other;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionList({
  transactions,
  emptyMessage = "No transactions found",
  scrollEnabled = false,
}: TransactionListProps) {
  const router = useRouter();

  const handlePress = (item: Transaction) => {
    if (item.id == null) return;
    router.push({
      pathname: "/transactions/[id]",
      params: { id: String(item.id) },
    });
  };

  const renderTransaction = ({
    item,
    index,
  }: {
    item: Transaction;
    index: number;
  }) => {
    const badge = typeBadge(item.transaction_type);

    // Guard: amount may be undefined or arrive as a string from some endpoints
    const amount =
      typeof item.amount === "number"
        ? item.amount
        : parseFloat(String(item.amount ?? "0")) || 0;

    return (
      <TouchableOpacity
        className="flex-row items-center justify-between p-4 mb-3 bg-white border-2 border-gray-200 rounded-2xl"
        activeOpacity={0.85}
        onPress={() => handlePress(item)}
      >
        {/* Left — icon + names */}
        <View className="flex-row items-center flex-1 mr-3">
          <View className="items-center justify-center w-12 h-12 mr-3 rounded-full bg-accent/20">
            <Invoice02Icon size={20} color="#1152D4" />
          </View>

          <View className="flex-1">
            <Text
              className="text-base font-semibold text-black"
              numberOfLines={1}
            >
              {item.sender_name ?? "—"}
            </Text>

            <Text className="text-sm text-gray-500" numberOfLines={1}>
              {item.beneficiary_name
                ? `To: ${item.beneficiary_name}`
                : (item.beneficiary_bank ?? "—")}
            </Text>

            <Text className="mt-0.5 text-xs text-gray-400">
              {item.transaction_time ? formatDate(item.transaction_time) : "—"}
            </Text>
          </View>
        </View>

        {/* Right — amount + type badge */}
        <View className="items-end">
          <Text className="mb-1 text-xl font-bold text-accent">
            {amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <View className={`px-3 py-1 rounded-full ${badge.bg}`}>
            <Text
              className={`text-[9px] font-semibold uppercase ${badge.text}`}
            >
              {formatType(item.transaction_type)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      // Use index as fallback when id is undefined to prevent the duplicate-key crash
      keyExtractor={(item, index) =>
        item.id != null ? String(item.id) : `row-${index}`
      }
      scrollEnabled={scrollEnabled}
      ListEmptyComponent={
        <View className="items-center justify-center py-8">
          <Text className="text-base text-gray-500">{emptyMessage}</Text>
        </View>
      }
    />
  );
}
