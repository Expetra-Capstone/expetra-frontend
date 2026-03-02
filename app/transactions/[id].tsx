// app/(tabs)/transactions/[id].tsx

import { allTransactions } from "@/data/home";
import type { Transaction } from "@/types/home";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
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

const MessageIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 6a3 3 0 013-3h10a3 3 0 013 3v7a3 3 0 01-3 3H9l-4 4v-4H7a3 3 0 01-3-3V6z"
      stroke="#2563EB"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 9h6M9 12h4"
      stroke="#2563EB"
      strokeWidth={1.6}
      strokeLinecap="round"
    />
  </Svg>
);

const NoteIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 4h9l3 3v11a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"
      stroke="#6B7280"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 11h6M9 14h4"
      stroke="#6B7280"
      strokeWidth={1.6}
      strokeLinecap="round"
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

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export default function TransactionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const transaction: Transaction | undefined = useMemo(() => {
    if (!id) return undefined;
    return allTransactions.find((t) => String(t.id) === String(id));
  }, [id]);

  if (!transaction) {
    return (
      <View className="items-center justify-center flex-1 px-6 bg-white">
        <Text className="mb-4 text-center text-gray-500">
          Transaction not found.
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
          Expense Details
        </Text>
        <TouchableOpacity className="items-center justify-center w-9 h-9">
          <MoreIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Vendor */}
        <View className="py-5">
          <Text className="mb-1 text-xs font-semibold text-gray-400 uppercase">
            Vendor
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-[18px] font-semibold text-gray-900">
              {transaction.vendor}
            </Text>
            <View className="items-center justify-center w-10 h-10 bg-gray-100 rounded-2xl">
              <Text className="text-lg text-gray-400">🏦</Text>
            </View>
          </View>
        </View>
        {/* Total and Date */}
        <View className="flex flex-row items-center justify-between">
          <View>
            <Text className="mb-1 text-xs font-semibold text-gray-400 uppercase">
              Total
            </Text>
            <Text className="text-[30px] font-extrabold text-accent">
              {transaction.amount}
            </Text>
          </View>

          <View>
            <Text className="mb-1 text-xs font-semibold text-gray-400 uppercase">
              Date
            </Text>
            <Text className="text-xl font-semibold text-gray-900">
              {transaction.isoDate}
            </Text>
          </View>
        </View>

        {/* Synced Text Message */}
        <View className="py-8">
          <Text className="mb-2 text-xs font-semibold text-gray-400 uppercase">
            Synced Text Message
          </Text>

          <View className="flex-row p-4 bg-blue-50 rounded-2xl">
            <View className="items-center justify-center w-8 h-8 mr-3 bg-blue-100 rounded-full">
              <MessageIcon />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-blue-600 tracking-[1px] uppercase mb-1">
                {transaction.messageContextTitle || "Message Context"}
              </Text>
              <Text className="text-[13px] text-gray-700 leading-relaxed">
                {transaction.messageContextBody}
              </Text>
            </View>
          </View>
        </View>

        {/* Receipt preview */}
        <View className="my-4">
          <Text className="mb-2 text-xs font-semibold text-gray-400 uppercase">
            Receipt
          </Text>
          <View className="items-center">
            <View className="rounded-[24px] overflow-hidden bg-accent/10">
              {transaction.receiptImage ? (
                <Image
                  source={{ uri: transaction.receiptImage }}
                  style={{ width: 230, height: 360, resizeMode: "cover" }}
                />
              ) : (
                <View className="w-[230px] h-[360px] items-center justify-center">
                  <Text className="text-xs text-accent">
                    Receipt preview placeholder
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Notes */}
        {/* <View className="mb-6">
          <Text className="mb-2 text-xs font-semibold text-gray-400 uppercase">
            Notes
          </Text>
          <View className="flex-row p-4 bg-gray-50 rounded-2xl">
            <View className="items-center justify-center w-6 h-6 mr-3 bg-white rounded-md">
              <NoteIcon />
            </View>
            <Text className="flex-1 text-[13px] text-gray-700 leading-relaxed">
              {transaction.notes}
            </Text>
          </View>
        </View> */}

        {/* Bottom buttons */}
        <View className="flex-row mt-10">
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
