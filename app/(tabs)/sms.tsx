// app/(tabs)/sms.tsx

import { SmsImportModal } from "@/components/sms/SmsImportModal";
import { OditService } from "@/services/oditService";
import { OditResult, RawSmsMessage } from "@/types/sms.types";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    SafeAreaView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";


// ─── Category → color + icon map ──────────────────────────────────────────────
const CATEGORY_META: Record<
  string,
  {
    bg: string;
    color: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
  }
> = {
  "Food & Dining": {
    bg: "#FFF7ED",
    color: "#F97316",
    icon: "restaurant-outline",
  },
  Transportation: { bg: "#EFF6FF", color: "#3B82F6", icon: "car-outline" },
  Shopping: { bg: "#F5F3FF", color: "#8B5CF6", icon: "bag-outline" },
  Entertainment: { bg: "#FFF0F0", color: "#EF4444", icon: "film-outline" },
  Healthcare: { bg: "#ECFDF5", color: "#10B981", icon: "medkit-outline" },
  Utilities: { bg: "#F0FDF4", color: "#22C55E", icon: "flash-outline" },
  Other: {
    bg: "#F3F4F6",
    color: "#6B7280",
    icon: "ellipsis-horizontal-circle-outline",
  },
};

const PROVIDER_COLORS: Record<string, string> = {
  telebirr: "#0070F3",
  cbe: "#007A39",
  boa: "#C8102E",
  zemenbank: "#1A3E7C",
  awashbank: "#F7A800",
  dashenbank: "#003087",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseAmount(str: string): number {
  return parseFloat(str.replace(/,/g, "")) || 0;
}

function formatAmount(amount: number, currency = "ETB"): string {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatTimestamp(ts: string): string {
  // odit format: "DD/MM/YYYY HH:MM:SS"
  const match = ts?.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, dd, mm, yyyy, hh, min] = match;
    const date = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return ts ?? "—";
}

function getProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    telebirr: "Telebirr",
    cbe: "CBE",
    boa: "Bank of Abyssinia",
    zemenbank: "Zemen Bank",
    awashbank: "Awash Bank",
    dashenbank: "Dashen Bank",
  };
  return map[provider?.toLowerCase()] ?? provider ?? "Unknown";
}

function getMerchantName(result: OditResult): string {
  const merchant = result.participants?.find(
    (p) => p.role === "MERCHANT" || p.type === "MERCHANT",
  );
  return (
    merchant?.account.accountName ??
    result.extraction?.rawFields?.MERCHANT_NAME ??
    result.extraction?.rawFields?.RECEIVER_NAME ??
    result.extraction?.rawFields?.SENDER_NAME ??
    getProviderLabel(result.provider)
  );
}

// ─── Parsed result card ────────────────────────────────────────────────────────
function ResultCard({ result }: { result: OditResult }) {
  const amount = parseAmount(result.amounts.principal.amount);
  const currency = result.amounts.principal.currency ?? "ETB";
  const isIncoming = result.metadata?.type === "INCOMING";
  const merchant = getMerchantName(result);
  const timestamp = result.transaction?.timestamp ?? "";
  const txnId = Object.values(result.transaction?.transactionId ?? {})[0];
  const provider = result.provider?.toLowerCase() ?? "";
  const providerColor = PROVIDER_COLORS[provider] ?? "#6B7280";
  const msgType = result.messageType?.replace(/_/g, " ") ?? "Transaction";

  // Infer category from messageType
  const category = (() => {
    if (result.messageType === "MERCHANT_PAYMENT") return "Shopping";
    if (result.transaction?.type === "TRANSFER") return "Other";
    return "Other";
  })();
  const meta = CATEGORY_META[category] ?? CATEGORY_META["Other"];

  return (
    <View className="p-4 mx-4 mb-3 bg-white rounded-2xl">
      {/* ── Row 1: icon + merchant + amount ── */}
      <View className="flex-row items-center">
        <View
          className="items-center justify-center mr-3 w-11 h-11 rounded-xl"
          style={{ backgroundColor: meta.bg }}
        >
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>

        <View className="flex-1">
          <Text
            className="text-[15px] font-semibold text-gray-900"
            numberOfLines={1}
          >
            {merchant}
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">{msgType}</Text>
        </View>

        <Text
          className="text-[17px] font-extrabold"
          style={{ color: isIncoming ? "#10B981" : "#111827" }}
        >
          {isIncoming ? "+" : "-"}
          {formatAmount(amount, currency)}
        </Text>
      </View>

      {/* ── Divider ── */}
      <View className="h-px my-3 bg-gray-100" />

      {/* ── Row 2: meta chips ── */}
      <View className="flex-row flex-wrap gap-2">
        {/* Provider badge */}
        <View
          className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${providerColor}18` }}
        >
          <View
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: providerColor }}
          />
          <Text
            className="text-[11px] font-semibold"
            style={{ color: providerColor }}
          >
            {getProviderLabel(result.provider)}
          </Text>
        </View>

        {/* Direction badge */}
        <View
          className="flex-row items-center gap-1 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: isIncoming ? "#ECFDF5" : "#FFF7ED" }}
        >
          <Ionicons
            name={isIncoming ? "arrow-down-outline" : "arrow-up-outline"}
            size={10}
            color={isIncoming ? "#10B981" : "#F97316"}
          />
          <Text
            className="text-[11px] font-semibold"
            style={{ color: isIncoming ? "#10B981" : "#F97316" }}
          >
            {isIncoming ? "Incoming" : "Outgoing"}
          </Text>
        </View>

        {/* Timestamp */}
        {timestamp ? (
          <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100">
            <Ionicons name="time-outline" size={10} color="#6B7280" />
            <Text className="text-[11px] text-gray-500">
              {formatTimestamp(timestamp)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Balance after (if available) ── */}
      {result.amounts.balance && (
        <View
          className="flex-row items-center justify-between pt-3 mt-3"
          style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
        >
          <Text className="text-xs text-gray-400">Balance after</Text>
          <Text className="text-xs font-semibold text-gray-600">
            {formatAmount(
              parseAmount(result.amounts.balance.amount),
              result.amounts.balance.currency,
            )}
          </Text>
        </View>
      )}

      {/* ── TXN ID ── */}
      {txnId && (
        <View
          className="flex-row items-center justify-between mt-2"
          style={
            !result.amounts.balance
              ? { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12 }
              : undefined
          }
        >
          <Text className="text-xs text-gray-400">Txn ID</Text>
          <Text className="text-xs font-medium text-gray-500">{txnId}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({
  results,
  total,
  unknown,
}: {
  results: OditResult[];
  total: number;
  unknown: number;
}) {
  const outgoing = results
    .filter((r) => r.metadata?.type === "OUTGOING")
    .reduce((sum, r) => sum + parseAmount(r.amounts.principal.amount), 0);

  const incoming = results
    .filter((r) => r.metadata?.type === "INCOMING")
    .reduce((sum, r) => sum + parseAmount(r.amounts.principal.amount), 0);

  return (
    <View className="flex-row gap-2 mx-4 mb-3">
      {/* Parsed */}
      <View className="flex-1 p-3 bg-white rounded-2xl">
        <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          Parsed
        </Text>
        <Text className="mt-1 text-xl font-extrabold text-gray-900">
          {results.length}
        </Text>
        <Text className="text-[10px] text-gray-400 mt-0.5">
          of {total} messages
        </Text>
      </View>
      {/* Outgoing */}
      <View className="flex-1 p-3 bg-white rounded-2xl">
        <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          Outgoing
        </Text>
        <Text className="mt-1 text-base font-extrabold text-gray-900">
          {outgoing.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>
        <Text className="text-[10px] text-orange-400 mt-0.5 font-semibold">
          ETB
        </Text>
      </View>
      {/* Incoming */}
      <View className="flex-1 p-3 bg-white rounded-2xl">
        <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
          Incoming
        </Text>
        <Text className="mt-1 text-base font-extrabold text-gray-900">
          {incoming.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </Text>
        <Text className="text-[10px] text-emerald-500 mt-0.5 font-semibold">
          ETB
        </Text>
      </View>
    </View>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onPress }: { onPress: () => void }) {
  return (
    <View className="items-center justify-center flex-1 px-10">
      <View className="items-center justify-center w-24 h-24 mb-5 rounded-full bg-blue-50">
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={44}
          color="#2563EB"
        />
      </View>
      <Text className="mb-2 text-xl font-bold text-center text-gray-900">
        Import Bank SMS
      </Text>
      <Text className="mb-8 text-sm leading-6 text-center text-gray-400">
        {Platform.OS === "android"
          ? "Select a chat from your inbox and a date range to automatically extract transactions."
          : "Paste an SMS from your Ethiopian bank to extract transaction data instantly."}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center gap-2 px-8 py-4 bg-blue-600 rounded-2xl"
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-down-circle-outline" size={20} color="white" />
        <Text className="text-base font-semibold text-white">
          {Platform.OS === "android" ? "Import from SMS" : "Paste SMS"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Unknown banner ────────────────────────────────────────────────────────────
function UnknownBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <View className="flex-row items-center gap-2 mx-4 mb-3 p-3.5 bg-orange-50 rounded-2xl">
      <Ionicons name="alert-circle-outline" size={18} color="#F97316" />
      <Text className="flex-1 text-sm text-orange-700">
        <Text className="font-semibold">
          {count} message{count > 1 ? "s" : ""}
        </Text>{" "}
        could not be parsed — unsupported format.
      </Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SmsScreen() {
  const oditService = OditService.getInstance();

  const [showImport, setShowImport] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [results, setResults] = useState<OditResult[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [hasImported, setHasImported] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Called when user taps "Import" in the modal ──────────────────────────
  async function handleImport(messages: RawSmsMessage[]) {
    setIsParsing(true);
    setErrorMsg(null);
    setResults([]);

    try {
      const response = await oditService.parseSmsMessages(messages);
      setResults(response.results);
      setTotalMessages(response.stats.total);
      setUnknownCount(response.stats.unknown);
      setHasImported(true);
    } catch (err: any) {
      setErrorMsg(
        err?.message ?? "Failed to parse messages. Please try again.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  function handleReset() {
    setResults([]);
    setHasImported(false);
    setErrorMsg(null);
    setTotalMessages(0);
    setUnknownCount(0);
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-4 bg-white border-b border-gray-100">
        <View>
          <Text className="text-2xl font-bold text-gray-900">SMS Import</Text>
          <Text className="text-xs text-gray-400 mt-0.5">
            Parse Ethiopian bank messages
          </Text>
        </View>
        <View className="flex-row gap-2">
          {hasImported && (
            <TouchableOpacity
              onPress={handleReset}
              className="items-center justify-center bg-gray-100 w-9 h-9 rounded-xl"
            >
              <Ionicons name="refresh-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowImport(true)}
            className="flex-row items-center gap-1.5 px-4 py-2 bg-blue-600 rounded-xl"
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-sm font-semibold text-white">Import</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Parsing loader ───────────────────────────────────────────────── */}
      {isParsing ? (
        <View className="items-center justify-center flex-1 gap-4">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-sm font-medium text-gray-500">
            Parsing messages…
          </Text>
        </View>
      ) : errorMsg ? (
        /* ── Error state ─────────────────────────────────────────────────── */
        <View className="items-center justify-center flex-1 px-10">
          <View className="items-center justify-center w-20 h-20 mb-4 rounded-full bg-red-50">
            <Ionicons name="close-circle-outline" size={40} color="#EF4444" />
          </View>
          <Text className="mb-2 text-lg font-bold text-center text-gray-900">
            Parse Failed
          </Text>
          <Text className="mb-6 text-sm leading-6 text-center text-gray-400">
            {errorMsg}
          </Text>
          <TouchableOpacity
            onPress={() => setShowImport(true)}
            className="px-8 py-4 bg-blue-600 rounded-2xl"
          >
            <Text className="text-base font-semibold text-white">
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      ) : !hasImported ? (
        /* ── Empty / welcome state ───────────────────────────────────────── */
        <EmptyState onPress={() => setShowImport(true)} />
      ) : (
        /* ── Results list ─────────────────────────────────────────────────── */
        <FlatList
          data={results}
          keyExtractor={(_, i) => String(i)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          ListHeaderComponent={() => (
            <>
              <StatsBar
                results={results}
                total={totalMessages}
                unknown={unknownCount}
              />
              <UnknownBanner count={unknownCount} />
              {results.length > 0 && (
                <Text className="mx-4 mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                  Transactions · {results.length}
                </Text>
              )}
            </>
          )}
          renderItem={({ item }) => <ResultCard result={item} />}
          ListEmptyComponent={() => (
            <View className="items-center justify-center px-8 py-16">
              <Ionicons name="document-outline" size={48} color="#E5E7EB" />
              <Text className="mt-3 text-sm text-center text-gray-400">
                No transactions could be parsed from the selected messages.
              </Text>
            </View>
          )}
        />
      )}

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      <SmsImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />
    </SafeAreaView>
  );
}
