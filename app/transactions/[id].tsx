// app/(tabs)/transactions/[id].tsx

import { useAuth } from "@/context/AuthContext";
import { getTransactions, Transaction } from "@/services/apiService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

// ─── ICONS ────────────────────────────────────────────────────────────────────
const BackIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 6l-6 6 6 6"
      stroke="#1F2937"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MoreIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm4.5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm4.5 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z"
      fill="#6B7280"
    />
  </Svg>
);

const ShareIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M12 3v12M12 3L8 7M12 3l4 4"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FlagIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 4v16M6 4h9l-2.5 4L15 12H6"
      stroke="#374151"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

// "sms" displays as "Screenshot", everything else is title-cased normally
function formatType(type: string | undefined | null): string {
  if (!type) return "Other";
  if (type.toLowerCase() === "sms") return "Screenshot";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── DETAIL ROW ───────────────────────────────────────────────────────────────
function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className="px-4 py-3"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <Text className="text-xs font-semibold text-gray-400 uppercase mb-0.5">
        {label}
      </Text>
      <Text className="text-[15px] font-semibold text-gray-900">
        {value || "—"}
      </Text>
    </View>
  );
}

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export default function TransactionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useAuth();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id || !token) {
        setError("Transaction not found.");
        setIsLoading(false);
        return;
      }

      const result = await getTransactions(token);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      const found = result.data.find((t) => String(t.id) === String(id));
      if (!found) {
        setError("Transaction not found.");
      } else {
        setTransaction(found);
      }
      setIsLoading(false);
    }

    load();
  }, [id, token]);

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color="#1152D4" />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-white">
        <Text className="mb-4 text-center text-gray-500">
          {error ?? "Transaction not found."}
        </Text>
        <TouchableOpacity
          className="px-4 py-2 bg-blue-600 rounded-xl"
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-white">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <TouchableOpacity
          className="items-center justify-center w-9 h-9"
          onPress={() => router.back()}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text className="text-xl font-semibold text-gray-900">
          Transaction Details
        </Text>
        <TouchableOpacity className="items-center justify-center w-9 h-9">
          <MoreIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Amount hero */}
        <View className="items-center py-6 mb-4 bg-blue-50 rounded-2xl">
          <Text className="mb-1 text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Amount
          </Text>
          <Text className="text-5xl font-extrabold text-blue-600">
            {transaction.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text className="mt-1 text-sm text-gray-400">ETB</Text>
        </View>

        {/* Transaction meta */}
        <View className="mb-3 overflow-hidden bg-white border border-gray-100 rounded-2xl">
          <DetailRow
            label="Transaction Time"
            value={formatDateTime(transaction.transaction_time)}
          />
          <DetailRow
            label="Transaction Type"
            value={formatType(transaction.transaction_type)}
            isLast
          />
        </View>

        {/* Sender */}
        <View className="mb-3 overflow-hidden bg-white border border-gray-100 rounded-2xl">
          <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Sender
          </Text>
          <DetailRow label="Name" value={transaction.sender_name} />
          <DetailRow
            label="Account"
            value={transaction.sender_account ?? ""}
            isLast
          />
        </View>

        {/* Beneficiary */}
        <View className="mb-3 overflow-hidden bg-white border border-gray-100 rounded-2xl">
          <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Beneficiary
          </Text>
          <DetailRow label="Name" value={transaction.beneficiary_name ?? ""} />
          <DetailRow
            label="Account"
            value={transaction.beneficiary_account ?? ""}
          />
          <DetailRow
            label="Bank"
            value={transaction.beneficiary_bank ?? ""}
            isLast
          />
        </View>

        {/* Bottom buttons */}
        <View className="flex-row mt-6">
          <TouchableOpacity
            className="flex-row items-center justify-center flex-1 h-12 mr-3 bg-white border border-gray-200 rounded-2xl"
            activeOpacity={0.8}
          >
            <FlagIcon />
            <Text className="ml-2 text-[14px] font-semibold text-gray-800">
              Report Issue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-center flex-1 h-12 bg-blue-600 rounded-2xl"
            activeOpacity={0.85}
          >
            <ShareIcon />
            <Text className="ml-2 text-[14px] font-semibold text-white">
              Share Receipt
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
