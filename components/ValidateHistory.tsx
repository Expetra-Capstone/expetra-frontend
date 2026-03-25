import TransactionList from "@/components/TransactionList";
import { useAuth } from "@/context/AuthContext";
import { getValidatedTransactions, Transaction } from "@/services/apiService";
import { Ionicons } from "@expo/vector-icons";
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

// ─── Helpers (mirrored from history.tsx) ─────────────────────────────────────

function formatTypeLabel(type: string): string {
  if (type === "sms") return "SMS";
  if (type === "screenshot") return "Screenshot";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildBankOptions(
  transactions: Transaction[],
): { id: string; name: string }[] {
  const bankSet = new Set<string>();
  transactions.forEach((t) => {
    if (t.beneficiary_bank?.trim()) bankSet.add(t.beneficiary_bank.trim());
    if (t.transaction_type === "sms" && t.sender_name?.trim()) {
      bankSet.add(t.sender_name.trim());
    }
  });
  return [
    { id: "all", name: "All Banks" },
    ...[...bankSet].sort().map((b) => ({ id: b.toLowerCase(), name: b })),
  ];
}

function buildTypeOptions(
  transactions: Transaction[],
): { id: string; name: string }[] {
  const types = [
    ...new Set(
      transactions
        .map((t) => t.transaction_type)
        .filter((t): t is string => !!t),
    ),
  ];
  return [
    { id: "all", name: "All Types" },
    ...types.map((t) => ({ id: t.toLowerCase(), name: formatTypeLabel(t) })),
  ];
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchValidated(token: string): Promise<Transaction[]> {
  const result = await getValidatedTransactions(token);
  if (result.error) throw new Error(result.error);
  return [...result.data].sort(
    (a, b) =>
      new Date(b.transaction_time).getTime() -
      new Date(a.transaction_time).getTime(),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const ValidatedHistoryScreen = () => {
  const { token } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
        setFetchError("You must be logged in to view transactions.");
        setIsLoading(false);
        return;
      }
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setFetchError(null);

      try {
        const data = await fetchValidated(token);
        setTransactions(data);
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

  // Load on mount (component mounts when tab becomes active)
  useEffect(() => {
    load();
  }, [load]);

  // ─── Filters ──────────────────────────────────────────────────────────────
  const bankOptions = useMemo(
    () => buildBankOptions(transactions),
    [transactions],
  );
  const typeOptions = useMemo(
    () => buildTypeOptions(transactions),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (selectedBank !== "all") {
      filtered = filtered.filter((t) => {
        const bank = (t.beneficiary_bank ?? "").toLowerCase();
        const sender = (t.sender_name ?? "").toLowerCase();
        return bank === selectedBank || sender === selectedBank;
      });
    }

    if (selectedType !== "all") {
      filtered = filtered.filter(
        (t) => (t.transaction_type ?? "").toLowerCase() === selectedType,
      );
    }

    return filtered;
  }, [transactions, selectedBank, selectedType]);

  const currentBankLabel =
    bankOptions.find((b) => b.id === selectedBank)?.name ?? "All Banks";
  const currentTypeLabel =
    typeOptions.find((t) => t.id === selectedType)?.name ?? "All Types";

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

  // ─── Error ─────────────────────────────────────────────────────────────────
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

        {/* ── Bank Dropdown Modal ── */}
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
                    className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${
                      selectedBank === option.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        selectedBank === option.id
                          ? "text-blue-600 font-semibold"
                          : "text-gray-700"
                      }`}
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

        {/* ── Type Dropdown Modal ── */}
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
                    className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${
                      selectedType === option.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        selectedType === option.id
                          ? "text-blue-600 font-semibold"
                          : "text-gray-700"
                      }`}
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

        {/* ── Validated Badge Banner ── */}
        <View className="px-5 pb-3">
          <View className="flex-row items-center px-4 py-3 border border-green-200 rounded-2xl bg-green-50">
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#16a34a"
            />
            <Text className="ml-2 text-sm font-medium text-green-700">
              Showing only verified & validated transactions
            </Text>
          </View>
        </View>

        {/* ── Transaction List ── */}
        <View className="px-5 pb-24">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-black">
              Validated Transactions
            </Text>
            <Text className="text-sm text-gray-500">
              {filteredTransactions.length} transaction(s)
            </Text>
          </View>

          <TransactionList
            transactions={filteredTransactions}
            emptyMessage="No validated transactions found for the selected filters"
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default ValidatedHistoryScreen;
