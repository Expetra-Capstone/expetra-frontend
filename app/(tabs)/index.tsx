import TransactionList from "@/components/TransactionList";
import { useAuth } from "@/context/AuthContext";
import {
  getTransactions,
  getValidatedBalance,
  Transaction,
} from "@/services/apiService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ImageBackground,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DATE_RANGE_OPTIONS = [
  { id: "all", label: "All time" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
];

function isWithinDays(isoDate: string, days: number): boolean {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(isoDate) >= cutoff;
  } catch {
    return true;
  }
}

function buildBankCategories(
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
    { id: "all", name: "All" },
    ...banks.map((b) => ({ id: b.toLowerCase(), name: b })),
  ];
}

export default function HomePage() {
  const { token, user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalBalance, setTotalBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDataVisible, setIsDataVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [isDateDropdownVisible, setIsDateDropdownVisible] = useState(false);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setIsRefreshing(true);

      try {
        // Fetch transactions and validated balance in parallel
        const [txResult, balResult] = await Promise.all([
          getTransactions(token),
          getValidatedBalance(token),
        ]);

        if (!txResult.error) {
          const sorted = [...txResult.data].sort(
            (a, b) =>
              new Date(b.transaction_time).getTime() -
              new Date(a.transaction_time).getTime(),
          );
          setTransactions(sorted);
        }

        if (!balResult.error) {
          setTotalBalance(balResult.data.total_balance);
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const bankCategories = useMemo(
    () => buildBankCategories(transactions),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (selectedDateRange !== "all") {
      result = result.filter((t) =>
        isWithinDays(t.transaction_time, Number(selectedDateRange)),
      );
    }

    if (selectedBank !== "all") {
      result = result.filter(
        (t) => (t.beneficiary_bank ?? "").toLowerCase() === selectedBank,
      );
    }

    return result.slice(0, 5);
  }, [transactions, selectedBank, selectedDateRange]);

  // Display the validated balance from the backend, masked if hidden
  const displayBalance = isDataVisible
    ? totalBalance !== null
      ? totalBalance.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—"
    : "********";

  const rawPhone = user?.phone ?? "";
  const displayPhone = isDataVisible
    ? rawPhone
    : rawPhone.replace(/(\+?\d{4})\d+(\d{3})/, "$1 *** $2");

  const currentDateLabel =
    DATE_RANGE_OPTIONS.find((o) => o.id === selectedDateRange)?.label ??
    "All time";

  const renderCategory = ({ item }: { item: { id: string; name: string } }) => (
    <TouchableOpacity
      onPress={() => setSelectedBank(item.id)}
      className={`mr-2 px-5 py-2 rounded-full border ${
        selectedBank === item.id
          ? "bg-blue-600 border-blue-600"
          : "bg-white border-gray-300"
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          selectedBank === item.id ? "text-white" : "text-black"
        }`}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => fetchData(true)}
          colors={["#1152D4"]}
          tintColor="#1152D4"
        />
      }
    >
      {/* ── Balance Card ── */}
      <View className="px-5 pt-3 pb-6">
        <View
          className="overflow-hidden rounded-3xl"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <ImageBackground
            source={require("@/assets/images/card-bg.png")}
            resizeMode="cover"
            className="w-full"
          >
            <View className="p-6 pb-8 pt-7">
              <View className="flex-row items-center justify-between mb-8">
                <Text className="text-base font-normal text-white opacity-95">
                  Total Balance
                </Text>

                <TouchableOpacity
                  onPress={() => setIsDateDropdownVisible(true)}
                  className="flex-row items-center px-4 py-2 rounded-full bg-white/25"
                >
                  <Text className="mr-1 text-sm font-medium text-white">
                    {currentDateLabel}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View className="mb-10">
                <Text className="text-5xl font-bold tracking-tight text-white">
                  {displayBalance} <Text className="text-lg">ETB</Text>
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="relative w-12 h-8 mr-3">
                    <View className="absolute left-0 w-8 h-8 rounded-full bg-white/35" />
                    <View
                      className="absolute w-8 h-8 rounded-full bg-white/45"
                      style={{ left: 18 }}
                    />
                  </View>
                  <Text className="text-base font-normal tracking-wide text-white">
                    {displayPhone}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setIsDataVisible((v) => !v)}>
                  <Ionicons
                    name={isDataVisible ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </View>
      </View>

      {/* ── Date Range Modal ── */}
      <Modal
        visible={isDateDropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDateDropdownVisible(false)}
      >
        <TouchableOpacity
          className="items-center justify-center flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setIsDateDropdownVisible(false)}
        >
          <View className="w-64 overflow-hidden bg-white rounded-2xl">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-center">
                Select Date Range
              </Text>
            </View>
            {DATE_RANGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => {
                  setSelectedDateRange(option.id);
                  setIsDateDropdownVisible(false);
                }}
                className={`p-4 border-b border-gray-100 ${
                  selectedDateRange === option.id ? "bg-blue-50" : ""
                }`}
              >
                <Text
                  className={`text-base text-center ${
                    selectedDateRange === option.id
                      ? "text-blue-600 font-semibold"
                      : "text-gray-700"
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Recent Transactions ── */}
      <View className="px-4 pb-24">
        <Text className="mb-4 text-2xl font-bold text-black">
          Recent Transaction
        </Text>

        {/* Bank filter pills */}
        <FlatList
          horizontal
          data={bankCategories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ paddingRight: 20 }}
        />

        <TransactionList
          transactions={filteredTransactions}
          emptyMessage="No transactions found for this filter"
        />
      </View>
    </ScrollView>
  );
}
