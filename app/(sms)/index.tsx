// app/(sms)/index.tsx

import { useAuth } from "@/context/AuthContext";
import { createTransaction } from "@/services/apiService";
import { parseAllBankSms, ParsedSms, RawSms } from "@/services/smsParser";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    PermissionsAndroid,
    Platform,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import SmsAndroid from "react-native-get-sms-android";

// ─── Types ────────────────────────────────────────────────────────────────────
type PermissionStatus = "idle" | "granted" | "denied";
type LoadStatus = "idle" | "loading" | "done" | "error";

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

function formatAmount(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Read SMS from Android inbox ─────────────────────────────────────────────
function readSmsInbox(): Promise<RawSms[]> {
  return new Promise((resolve, reject) => {
    const filter = JSON.stringify({ box: "inbox", maxCount: 500 });
    SmsAndroid.list(
      filter,
      (error: string) => reject(new Error(error)),
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function PermissionScreen({
  status,
  onRequest,
}: {
  status: PermissionStatus;
  onRequest: () => void;
}) {
  return (
    <View className="items-center justify-center flex-1 px-8 bg-white">
      <View className="items-center justify-center w-20 h-20 mb-6 rounded-full bg-blue-50">
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={36}
          color="#1152D4"
        />
      </View>
      <Text className="mb-2 text-xl font-bold text-center text-gray-900">
        Read SMS Messages
      </Text>
      <Text className="mb-8 text-sm leading-relaxed text-center text-gray-500">
        We need permission to read your SMS inbox so we can automatically detect
        and import transactions from your bank messages.
      </Text>
      {status === "denied" && (
        <Text className="mb-4 text-sm font-medium text-center text-red-500">
          Permission denied. Please enable SMS access in your device Settings.
        </Text>
      )}
      <TouchableOpacity
        onPress={onRequest}
        className="w-full py-4 bg-blue-600 rounded-2xl"
      >
        <Text className="font-semibold text-center text-white">
          {status === "denied" ? "Open Settings" : "Grant Permission"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SmsCard({
  item,
  selected,
  uploaded,
  onToggle,
}: {
  item: ParsedSms;
  selected: boolean;
  uploaded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={uploaded}
      activeOpacity={0.8}
      className={`flex-row items-start p-4 mb-3 rounded-2xl border-2 ${
        uploaded
          ? "bg-gray-50 border-gray-100"
          : selected
            ? "bg-blue-50 border-blue-500"
            : "bg-white border-gray-200"
      }`}
    >
      {/* Checkbox */}
      <View
        className={`items-center justify-center w-6 h-6 mt-0.5 mr-3 rounded-md border-2 ${
          uploaded
            ? "bg-green-500 border-green-500"
            : selected
              ? "bg-blue-600 border-blue-600"
              : "border-gray-300"
        }`}
      >
        {(selected || uploaded) && (
          <Ionicons
            name={uploaded ? "checkmark-done" : "checkmark"}
            size={14}
            color="#FFFFFF"
          />
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text
            className="text-base font-semibold text-gray-900"
            numberOfLines={1}
          >
            {item.bankName}
          </Text>
          <Text
            className={`text-lg font-bold ${
              item.isCredit ? "text-green-600" : "text-red-500"
            }`}
          >
            {item.isCredit ? "+" : "-"}
            {formatAmount(item.payload.amount)}
          </Text>
        </View>

        <Text className="mb-1 text-sm text-gray-500" numberOfLines={1}>
          {item.isCredit
            ? `From: ${item.payload.sender_name}`
            : item.payload.beneficiary_name
              ? `To: ${item.payload.beneficiary_name}`
              : item.bankName}
        </Text>

        <Text className="text-xs text-gray-400">{formatDate(item.date)}</Text>

        <Text
          className="mt-2 text-xs leading-relaxed text-gray-400"
          numberOfLines={2}
        >
          {item.rawBody}
        </Text>

        {uploaded && (
          <View className="flex-row items-center mt-2">
            <Ionicons name="cloud-done-outline" size={13} color="#22C55E" />
            <Text className="ml-1 text-xs font-medium text-green-600">
              Uploaded
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SmsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  // All hooks declared unconditionally at the top
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("idle");
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [allParsed, setAllParsed] = useState<ParsedSms[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploaded, setUploaded] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [selectedBank, setSelectedBank] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSms = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoadStatus("loading");
    try {
      const raw = await readSmsInbox();
      const parsed = parseAllBankSms(raw);
      setAllParsed(parsed);
      setLoadStatus("done");
    } catch {
      setLoadStatus("error");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ─── Check permission on mount — auto-load if already granted ────────────
  // This prevents asking for permission every time the screen is visited.
  // PermissionsAndroid.check() reads the current OS-level grant without
  // showing any dialog, so if the user already approved it stays silent.
  useEffect(() => {
    if (Platform.OS !== "android") return;

    async function checkPermissionOnMount() {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      if (alreadyGranted) {
        setPermissionStatus("granted");
        await loadSms();
      }
      // If not granted, leave status as "idle" so the permission screen shows
    }

    checkPermissionOnMount();
  }, [loadSms]);

  const requestAndLoad = useCallback(async () => {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: "SMS Permission",
          message:
            "This app needs access to your SMS messages to detect bank transactions.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        },
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionStatus("denied");
        return;
      }
      setPermissionStatus("granted");
      await loadSms();
    } catch {
      setPermissionStatus("denied");
    }
  }, [loadSms]);

  const bankOptions = useMemo(() => {
    const names = [...new Set(allParsed.map((p) => p.bankName))];
    return [
      { id: "all", label: "All" },
      ...names.map((n) => ({ id: n, label: n })),
    ];
  }, [allParsed]);

  const filtered = useMemo(() => {
    if (selectedBank === "all") return allParsed;
    return allParsed.filter((p) => p.bankName === selectedBank);
  }, [allParsed, selectedBank]);

  const selectableCount = filtered.filter((p) => !uploaded.has(p.id)).length;
  const selectedCount = filtered.filter(
    (p) => selected.has(p.id) && !uploaded.has(p.id),
  ).length;
  const allFilteredSelected =
    selectableCount > 0 && selectedCount === selectableCount;

  function toggleItem(id: string) {
    if (uploaded.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const selectableIds = filtered
      .filter((p) => !uploaded.has(p.id))
      .map((p) => p.id);
    const allSelected = selectableIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function handleUpload() {
    if (!token) {
      Alert.alert("Not logged in", "Please log in and try again.");
      return;
    }
    const toUpload = allParsed.filter(
      (p) => selected.has(p.id) && !uploaded.has(p.id),
    );
    if (toUpload.length === 0) return;

    Alert.alert(
      "Upload Transactions",
      `Upload ${toUpload.length} transaction${toUpload.length > 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Upload",
          onPress: async () => {
            setIsUploading(true);
            let successCount = 0;
            const failedIds: string[] = [];

            for (const item of toUpload) {
              const result = await createTransaction(token, item.payload);
              if (result.error) {
                failedIds.push(item.id);
              } else {
                successCount++;
                setUploaded((prev) => new Set(prev).add(item.id));
                setSelected((prev) => {
                  const next = new Set(prev);
                  next.delete(item.id);
                  return next;
                });
              }
            }

            setIsUploading(false);

            if (failedIds.length === 0) {
              Alert.alert(
                "Done!",
                `${successCount} transaction${successCount > 1 ? "s" : ""} uploaded successfully.`,
              );
            } else {
              Alert.alert(
                "Partial Success",
                `${successCount} uploaded, ${failedIds.length} failed. Please try again.`,
              );
            }
          },
        },
      ],
    );
  }

  // ── Shared header ──────────────────────────────────────────────────────────
  const header = (
    <View className="flex-row items-center justify-between px-4 pt-4 pb-3 bg-white border-b border-gray-100">
      <TouchableOpacity
        className="items-center justify-center w-9 h-9"
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={22} color="#111827" />
      </TouchableOpacity>
      <Text className="text-xl font-semibold text-gray-900">SMS Parsing</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  // ── iOS ────────────────────────────────────────────────────────────────────
  if (Platform.OS !== "android") {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="items-center justify-center flex-1 px-8">
          <Ionicons name="logo-apple" size={56} color="#9CA3AF" />
          <Text className="mt-4 text-lg font-semibold text-center text-gray-700">
            Not available on iOS
          </Text>
          <Text className="mt-2 text-sm leading-relaxed text-center text-gray-400">
            iOS does not allow apps to read SMS messages. Use the Camera tab to
            scan a screenshot of your bank notification instead.
          </Text>
        </View>
      </View>
    );
  }

  // ── Permission not yet granted ─────────────────────────────────────────────
  if (permissionStatus === "idle" || permissionStatus === "denied") {
    return (
      <View className="flex-1 bg-white">
        {header}
        <PermissionScreen
          status={permissionStatus}
          onRequest={requestAndLoad}
        />
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadStatus === "loading") {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#1152D4" />
          <Text className="mt-3 text-sm text-gray-500">
            Scanning SMS messages...
          </Text>
        </View>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (loadStatus === "error") {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="items-center justify-center flex-1 px-8">
          <Ionicons name="warning-outline" size={48} color="#9CA3AF" />
          <Text className="mt-3 text-base font-semibold text-center text-gray-700">
            Could not read SMS messages.
          </Text>
          <TouchableOpacity
            className="px-6 py-3 mt-5 bg-blue-600 rounded-xl"
            onPress={() => loadSms()}
          >
            <Text className="font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Loaded ─────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 mb-20 bg-white">
      {header}

      {/* Filter + refresh row */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-medium text-gray-500">
            {filtered.length} message{filtered.length !== 1 ? "s" : ""} found
          </Text>
          <TouchableOpacity onPress={() => loadSms(false)}>
            <Ionicons name="refresh-outline" size={22} color="#1152D4" />
          </TouchableOpacity>
        </View>

        {/* Bank filter pills */}
        <FlatList
          horizontal
          data={bankOptions}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedBank(item.id)}
              className={`mr-2 px-4 py-1.5 rounded-full border ${
                selectedBank === item.id
                  ? "bg-blue-600 border-blue-600"
                  : "bg-white border-gray-300"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  selectedBank === item.id ? "text-white" : "text-gray-700"
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Select-all row */}
      {filtered.length > 0 && (
        <TouchableOpacity
          onPress={toggleAll}
          className="flex-row items-center px-5 py-3 border-b border-gray-100"
        >
          <View
            className={`items-center justify-center w-5 h-5 mr-3 rounded border-2 ${
              allFilteredSelected
                ? "bg-blue-600 border-blue-600"
                : "border-gray-300"
            }`}
          >
            {allFilteredSelected && (
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            )}
          </View>
          <Text className="text-sm font-medium text-gray-600">
            {allFilteredSelected ? "Deselect all" : "Select all"}
          </Text>
          <Text className="ml-auto text-sm text-gray-400">
            {filtered.length} found · {selectedCount} selected
          </Text>
        </TouchableOpacity>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadSms(true)}
            colors={["#1152D4"]}
            tintColor="#1152D4"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
            <Text className="mt-3 text-base text-gray-400">
              No bank SMS found
            </Text>
            <Text className="mt-1 text-sm text-center text-gray-400">
              Make sure you receive SMS notifications from your bank.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SmsCard
            item={item}
            selected={selected.has(item.id)}
            uploaded={uploaded.has(item.id)}
            onToggle={() => toggleItem(item.id)}
          />
        )}
      />

      {/* Upload button */}
      {selectedCount > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0 px-5 bg-white border-t border-gray-100"
          style={{ paddingBottom: 24, paddingTop: 12 }}
        >
          <TouchableOpacity
            onPress={handleUpload}
            disabled={isUploading}
            className="flex-row items-center justify-center py-4 rounded-2xl"
            style={{ backgroundColor: isUploading ? "#93C5FD" : "#1152D4" }}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="ml-2 text-base font-semibold text-white">
                  Uploading...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color="#FFFFFF"
                />
                <Text className="ml-2 text-base font-semibold text-white">
                  Upload {selectedCount} Transaction
                  {selectedCount > 1 ? "s" : ""}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
