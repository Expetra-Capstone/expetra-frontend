import TransactionList from "@/components/TransactionList";
import { useAuth } from "@/context/AuthContext";
import { getTransactions, Transaction } from "@/services/apiService";
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

// ─── Derive unique bank names from beneficiary_bank field ─────────────────────
function buildBankOptions(
  transactions: Transaction[],
): { id: string; name: string }[] {
  const banks = [
    ...new Set(
      transactions
        .map((t) => t.beneficiary_bank)
        .filter((b): b is string => !!b),
    ),
  ];
  return [
    { id: "all", name: "All Banks" },
    ...banks.map((b) => ({ id: b.toLowerCase(), name: b })),
  ];
}

// ─── Derive unique transaction types ─────────────────────────────────────────
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
    ...types.map((t) => ({
      id: t.toLowerCase(),
      name: t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    })),
  ];
}

const History = () => {
  const { token } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedBank, setSelectedBank] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [isBankDropdownVisible, setIsBankDropdownVisible] = useState(false);
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setFetchError(null);

      if (!token) {
        setFetchError("You must be logged in to view transactions.");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        const result = await getTransactions(token);
        if (result.error) {
          setFetchError(result.error);
        } else {
          setTransactions(result.data);
        }
      } catch {
        setFetchError("Network error. Please check your connection.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ─── Filter options derived from live data ──────────────────────────────────
  const bankOptions = useMemo(
    () => buildBankOptions(transactions),
    [transactions],
  );
  const typeOptions = useMemo(
    () => buildTypeOptions(transactions),
    [transactions],
  );

  // ─── Filtered list ──────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (selectedBank !== "all") {
      filtered = filtered.filter(
        (t) => (t.beneficiary_bank ?? "").toLowerCase() === selectedBank,
      );
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

  // ─── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" color="#1152D4" />
        <Text className="mt-3 text-sm text-gray-500">
          Loading transactions…
        </Text>
      </View>
    );
  }

  // ─── Error state ────────────────────────────────────────────────────────────
  if (fetchError) {
    return (
      <View className="items-center justify-center flex-1 px-8 bg-white">
        <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
        <Text className="mt-3 text-base font-semibold text-center text-gray-700">
          {fetchError}
        </Text>
        <TouchableOpacity
          className="px-6 py-3 mt-5 bg-blue-600 rounded-xl"
          onPress={() => fetchTransactions()}
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
            onRefresh={() => fetchTransactions(true)}
            colors={["#1152D4"]}
            tintColor="#1152D4"
          />
        }
      >
        {/* ── Sticky Filter Header ── */}
        <View className="pt-4 pb-3 bg-white">
          <View className="px-5 mb-4">
            <View className="flex-row">
              {/* Bank Dropdown Trigger */}
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

              {/* Type Dropdown Trigger */}
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

        {/* ── Transaction List ── */}
        <View className="px-5 pb-24">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-black">
              All Transactions
            </Text>
            <Text className="text-sm text-gray-500">
              {filteredTransactions.length} transaction(s)
            </Text>
          </View>

          <TransactionList
            transactions={filteredTransactions.reverse()}
            emptyMessage="No transactions found for the selected filters"
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default History;
