import TransactionList from "@/components/TransactionList";
import ValidatedHistoryScreen from "@/components/ValidateHistory";
import { useAuth } from "@/context/AuthContext";
import { getTransactions, Transaction } from "@/services/apiService";
import { RawSms } from "@/services/smsParser";
import {
  forceFullSync,
  isForceSyncDone,
  runInitialSync,
  SyncProgress,
} from "@/services/smsSync";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SmsAndroid from "react-native-get-sms-android";

// ─── 3-day window ─────────────────────────────────────────────────────────────
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// ─── Read inbox (last 3 days) ─────────────────────────────────────────────────
function readSmsInbox(): Promise<RawSms[]> {
  return new Promise((resolve) => {
    const filter = JSON.stringify({
      box: "inbox",
      maxCount: 200,
      minDate: Date.now() - THREE_DAYS_MS,
    });
    SmsAndroid.list(
      filter,
      () => resolve([]),
      (_count: number, smsList: string) => {
        try {
          resolve(JSON.parse(smsList) as RawSms[]);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

// ─── Silent sync + fetch ──────────────────────────────────────────────────────
async function syncAndFetch(token: string): Promise<Transaction[]> {
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      if (granted) {
        const raw = await readSmsInbox();
        await runInitialSync(token, raw);
      }
    } catch {
      // SMS sync failure never blocks the transaction list
    }
  }

  const result = await getTransactions(token);
  if (result.error) throw new Error(result.error);

  return [...result.data].sort(
    (a, b) =>
      new Date(b.transaction_time).getTime() -
      new Date(a.transaction_time).getTime(),
  );
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

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

// ─── Tab type ─────────────────────────────────────────────────────────────────
type HistoryTab = "all" | "validated";

// ─── Component ────────────────────────────────────────────────────────────────

const History = () => {
  const { token } = useAuth();

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<HistoryTab>("all");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [selectedBank, setSelectedBank] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [isBankDropdownVisible, setIsBankDropdownVisible] = useState(false);
  const [isTypeDropdownVisible, setIsTypeDropdownVisible] = useState(false);

  // ── Force-extract state ────────────────────────────────────────────────────
  const [forceDone, setForceDone] = useState(true);
  const [isForcing, setIsForcing] = useState(false);
  const [forceProgress, setForceProgress] = useState<SyncProgress | null>(null);
  const [showSmsButton, setShowSmsButton] = useState(false);

  // ── Check on mount whether the force sync has already been done ───────────
  useEffect(() => {
    if (Platform.OS !== "android") return;

    async function checkForceAndPermission() {
      const [done, granted] = await Promise.all([
        isForceSyncDone(),
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS),
      ]);
      setForceDone(done);
      setShowSmsButton(granted);
    }

    checkForceAndPermission();
  }, []);

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
        const data = await syncAndFetch(token);
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // ─── Force-extract handler ─────────────────────────────────────────────────
  const handleForceExtract = useCallback(async () => {
    if (!token) return;

    Alert.alert(
      "Extract All SMS",
      "This will re-upload every bank SMS from the last 3 days, including ones already uploaded. This action can only be done once. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Extract All",
          style: "destructive",
          onPress: async () => {
            setIsForcing(true);
            setForceProgress(null);

            try {
              const raw = await readSmsInbox();
              const progress = await forceFullSync(token, raw, (p) =>
                setForceProgress({ ...p }),
              );

              setForceDone(true);

              const data = await syncAndFetch(token);
              setTransactions(data);

              Alert.alert(
                "Done",
                `${progress.success} transaction${progress.success !== 1 ? "s" : ""} extracted.${
                  progress.failed > 0 ? ` ${progress.failed} failed.` : ""
                }`,
              );
            } catch {
              Alert.alert("Error", "Extraction failed. Please try again.");
            } finally {
              setIsForcing(false);
              setForceProgress(null);
            }
          },
        },
      ],
    );
  }, [token]);

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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-white">
      {/* ── Tab Switcher — always visible ── */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row p-1 bg-gray-100 rounded-2xl">
          <TouchableOpacity
            onPress={() => setActiveTab("all")}
            className={`flex-1 items-center py-2.5 rounded-xl ${
              activeTab === "all" ? "bg-[#1152D4]" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === "all" ? "text-white" : "text-gray-500"
              }`}
            >
              All Transactions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("validated")}
            className={`flex-1 items-center py-2.5 rounded-xl ${
              activeTab === "validated" ? "bg-[#1152D4]" : ""
            }`}
          >
            <View className="flex-row items-center gap-1.5">
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={activeTab === "validated" ? "#ffffff" : "#6b7280"}
              />
              <Text
                className={`text-sm font-semibold ${
                  activeTab === "validated" ? "text-white" : "text-gray-500"
                }`}
              >
                Validated
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab Content ── */}
      {activeTab === "all" ? (
        // ── All Transactions tab ──────────────────────────────────────────
        isLoading ? (
          <View className="items-center justify-center flex-1 bg-white">
            <ActivityIndicator size="large" color="#1152D4" />
            <Text className="mt-3 text-sm text-gray-500">
              Loading transactions…
            </Text>
          </View>
        ) : fetchError ? (
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
        ) : (
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
                      <Ionicons
                        name="business-outline"
                        size={18}
                        color="#666"
                      />
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
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#1152D4"
                          />
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
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#1152D4"
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>

            {/* ── Force Extract Button ── */}
            {showSmsButton && (
              <View className="px-5 pb-4">
                <TouchableOpacity
                  onPress={handleForceExtract}
                  disabled={forceDone || isForcing}
                  className={`flex-row items-center justify-center py-3 rounded-2xl border-2 ${
                    forceDone
                      ? "bg-gray-100 border-gray-200"
                      : isForcing
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-blue-600"
                  }`}
                >
                  {isForcing ? (
                    <>
                      <ActivityIndicator size="small" color="#1152D4" />
                      <Text className="ml-2 text-sm font-semibold text-blue-600">
                        {forceProgress
                          ? `Extracting… ${forceProgress.processed} / ${forceProgress.total}`
                          : "Reading inbox…"}
                      </Text>
                    </>
                  ) : forceDone ? (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#9CA3AF"
                      />
                      <Text className="ml-2 text-sm font-semibold text-gray-400">
                        All SMS Extracted
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color="#1152D4"
                      />
                      <Text className="ml-2 text-sm font-semibold text-blue-600">
                        Extract All SMS
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

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
                transactions={filteredTransactions}
                emptyMessage="No transactions found for the selected filters"
              />
            </View>
          </ScrollView>
        )
      ) : (
        // ── Validated tab — mounts fresh each time tab is activated ──────────
        <ValidatedHistoryScreen key="validated-tab" />
      )}
    </View>
  );
};

export default History;
