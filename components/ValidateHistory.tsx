import { useAuth } from "@/context/AuthContext";
import { getValidatedTransactions, Transaction } from "@/services/apiService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Invoice02Icon } from "hugeicons-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

// A validation group as returned by the backend
interface ValidationGroup {
  transactions: Transaction[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTypeLabel(type: string): string {
  if (type === "sms") return "SMS";
  if (type === "screenshot") return "Screenshot";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

function toAmount(raw: unknown): number {
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  return parseFloat(String(raw ?? "0")) || 0;
}

// ─── Parse response into groups ───────────────────────────────────────────────
function parseGroups(raw: unknown): ValidationGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        Array.isArray((item as Record<string, unknown>).transactions),
    )
    .map((item) => {
      const g = item as Record<string, unknown>;
      const txs = (g.transactions as Record<string, unknown>[]).map((row) => ({
        id: row.id as number,
        transaction_time:
          (row.transaction_time as string) ?? new Date().toISOString(),
        amount: toAmount(row.amount),
        sender_name: (row.sender_name as string) || "—",
        sender_account: (row.sender_account as string) || undefined,
        beneficiary_name: (row.beneficiary_name as string) || undefined,
        beneficiary_account: (row.beneficiary_account as string) || undefined,
        beneficiary_bank: (row.beneficiary_bank as string) || undefined,
        transaction_type: (row.transaction_type as string) || "other",
      })) as Transaction[];
      return { transactions: txs };
    });
}

// ─── Filter builders ──────────────────────────────────────────────────────────

function buildBankOptions(
  groups: ValidationGroup[],
): { id: string; name: string }[] {
  const bankSet = new Set<string>();
  groups.forEach(({ transactions }) =>
    transactions.forEach((t) => {
      if (t.beneficiary_bank?.trim()) bankSet.add(t.beneficiary_bank.trim());
      if (t.transaction_type === "sms" && t.sender_name?.trim())
        bankSet.add(t.sender_name.trim());
    }),
  );
  return [
    { id: "all", name: "All Banks" },
    ...[...bankSet].sort().map((b) => ({ id: b.toLowerCase(), name: b })),
  ];
}

function buildTypeOptions(
  groups: ValidationGroup[],
): { id: string; name: string }[] {
  const typeSet = new Set<string>();
  groups.forEach(({ transactions }) =>
    transactions.forEach((t) => {
      if (t.transaction_type) typeSet.add(t.transaction_type);
    }),
  );
  return [
    { id: "all", name: "All Types" },
    ...[...typeSet].map((t) => ({
      id: t.toLowerCase(),
      name: formatTypeLabel(t),
    })),
  ];
}

// ─── Group card ───────────────────────────────────────────────────────────────
// Shows one representative row per validation group.
// Displays the shared amount + sender, and a count badge showing how many
// transactions are in the group. Tapping opens the detail with all of them.

function GroupCard({
  group,
  onPress,
}: {
  group: ValidationGroup;
  onPress: () => void;
}) {
  const rep = group.transactions[0]; // representative transaction
  const count = group.transactions.length;
  const types = [...new Set(group.transactions.map((t) => t.transaction_type))];

  return (
    <TouchableOpacity
      className="flex-row items-center justify-between p-4 mb-3 bg-white border-2 border-gray-200 rounded-2xl"
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Left */}
      <View className="flex-row items-center flex-1 mr-3">
        <View className="items-center justify-center w-12 h-12 mr-3 rounded-full bg-accent/20">
          <Invoice02Icon size={20} color="#1152D4" />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="text-base font-semibold text-black"
              numberOfLines={1}
            >
              {rep.sender_name}
            </Text>
            {/* Group size badge
            <View className="px-1.5 py-0.5 bg-blue-100 rounded-full">
              <Text className="text-[10px] font-bold text-blue-600">
                {count} match{count !== 1 ? "es" : ""}
              </Text>
            </View> */}
          </View>

          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {rep.beneficiary_name
              ? `To: ${rep.beneficiary_name}`
              : (rep.beneficiary_bank ?? "—")}
          </Text>

          <Text className="mt-0.5 text-xs text-gray-400">
            {formatDate(rep.transaction_time)}
          </Text>
        </View>
      </View>

      {/* Right */}
      <View className="items-end">
        <Text className="mb-1 text-xl font-bold text-accent">
          {rep.amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
        {/* Type pills for all unique types in the group */}
        <View className="flex-row gap-1">
          <View className="px-2 py-0.5 rounded-full bg-green-100">
            <Text className="text-[9px] font-semibold uppercase text-green-700">
              Validated
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ValidatedHistoryScreen = () => {
  const { token } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<ValidationGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedBank, setSelectedBank] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [isBankDropdownVisible, setIsBankDropdownVisible] = useState(false);
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);

  // ─── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setFetchError("You must be logged in.");
        setIsLoading(false);
        return;
      }
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setFetchError(null);

      try {
        const result = await getValidatedTransactions(token);
        if (result.error) throw new Error(result.error);
        const parsed = parseGroups(result.data);
        // Sort groups by the most recent transaction in each group
        parsed.sort(
          (a, b) =>
            new Date(b.transactions[0].transaction_time).getTime() -
            new Date(a.transactions[0].transaction_time).getTime(),
        );
        setGroups(parsed);
      } catch (e) {
        setFetchError(
          e instanceof Error ? e.message : "Network error. Please try again.",
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  // ─── Filters ──────────────────────────────────────────────────────────────
  const bankOptions = useMemo(() => buildBankOptions(groups), [groups]);
  const typeOptions = useMemo(() => buildTypeOptions(groups), [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter(({ transactions }) => {
      const bankMatch =
        selectedBank === "all" ||
        transactions.some(
          (t) =>
            (t.beneficiary_bank ?? "").toLowerCase() === selectedBank ||
            (t.sender_name ?? "").toLowerCase() === selectedBank,
        );
      const typeMatch =
        selectedType === "all" ||
        transactions.some(
          (t) => (t.transaction_type ?? "").toLowerCase() === selectedType,
        );
      return bankMatch && typeMatch;
    });
  }, [groups, selectedBank, selectedType]);

  const currentBankLabel =
    bankOptions.find((b) => b.id === selectedBank)?.name ?? "All Banks";
  const currentTypeLabel =
    typeOptions.find((t) => t.id === selectedType)?.name ?? "All Types";

  // Navigate to detail, passing all transaction IDs in the group
  function openGroup(group: ValidationGroup) {
    const ids = group.transactions.map((t) => t.id).join(",");
    router.push({
      pathname: "/transactions/[id]",
      params: {
        id: String(group.transactions[0].id),
        groupIds: ids,
      },
    });
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color="#1152D4" />
        <Text className="mt-3 text-sm text-gray-500">
          Loading validated transactions…
        </Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View className="items-center justify-center flex-1 px-8 bg-white">
        <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
        <Text className="mt-3 text-base font-semibold text-center text-gray-700">
          {fetchError}
        </Text>
        <TouchableOpacity
          className="px-6 py-3 mt-5 bg-blue-600 rounded-xl"
          onPress={() => load()}
        >
          <Text className="font-semibold text-white">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => load(true)}
            colors={["#1152D4"]}
            tintColor="#1152D4"
          />
        }
      >
        {/* ── Sticky Filter Header ── */}
        <View className="pt-4 pb-3 bg-white">
          <View className="px-5 mb-4">
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setIsBankDropdownVisible(true)}
                className="flex-row items-center justify-between flex-1 px-4 py-3 mr-2 bg-white border-2 border-gray-200 rounded-xl"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="business-outline" size={18} color="#666" />
                  <Text
                    className="flex-1 ml-2 text-sm font-medium text-gray-700"
                    numberOfLines={1}
                  >
                    {currentBankLabel}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsTypeDropdownVisible(true)}
                className="flex-row items-center justify-between flex-1 px-4 py-3 ml-2 bg-white border-2 border-gray-200 rounded-xl"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={18}
                    color="#666"
                  />
                  <Text
                    className="flex-1 ml-2 text-sm font-medium text-gray-700"
                    numberOfLines={1}
                  >
                    {currentTypeLabel}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Bank Dropdown ── */}
        <Modal
          visible={isBankDropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsBankDropdownVisible(false)}
        >
          <TouchableOpacity
            className="items-center justify-center flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setIsBankDropdownVisible(false)}
          >
            <View className="w-4/5 overflow-hidden bg-white rounded-2xl">
              <View className="p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-center">
                  Filter by Bank
                </Text>
              </View>
              <ScrollView className="max-h-96">
                {bankOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => {
                      setSelectedBank(option.id);
                      setIsBankDropdownVisible(false);
                    }}
                    className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${selectedBank === option.id ? "bg-blue-50" : ""}`}
                  >
                    <Text
                      className={`text-base ${selectedBank === option.id ? "text-blue-600 font-semibold" : "text-gray-700"}`}
                    >
                      {option.name}
                    </Text>
                    {selectedBank === option.id && (
                      <Ionicons name="checkmark" size={20} color="#1152D4" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Type Dropdown ── */}
        <Modal
          visible={isTypeDropdownVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsTypeDropdownVisible(false)}
        >
          <TouchableOpacity
            className="items-center justify-center flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setIsTypeDropdownVisible(false)}
          >
            <View className="w-4/5 overflow-hidden bg-white rounded-2xl">
              <View className="p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-center">
                  Filter by Type
                </Text>
              </View>
              <ScrollView className="max-h-96">
                {typeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => {
                      setSelectedType(option.id);
                      setIsTypeDropdownVisible(false);
                    }}
                    className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${selectedType === option.id ? "bg-blue-50" : ""}`}
                  >
                    <Text
                      className={`text-base ${selectedType === option.id ? "text-blue-600 font-semibold" : "text-gray-700"}`}
                    >
                      {option.name}
                    </Text>
                    {selectedType === option.id && (
                      <Ionicons name="checkmark" size={20} color="#1152D4" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Group List ── */}
        <View className="px-5 pb-24">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-black">
              Validated Transactions
            </Text>
            <Text className="text-sm text-gray-500">
              {filteredGroups.length} group(s)
            </Text>
          </View>

          {filteredGroups.length === 0 ? (
            <View className="items-center justify-center py-8">
              <Text className="text-base text-gray-500">
                No validated transactions found
              </Text>
            </View>
          ) : (
            filteredGroups.map((group, index) => (
              <GroupCard
                key={`group-${group.transactions[0]?.id ?? index}`}
                group={group}
                onPress={() => openGroup(group)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ValidatedHistoryScreen;
