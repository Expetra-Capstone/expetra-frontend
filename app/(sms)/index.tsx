// app/(sms)/index.tsx

import { useAuth } from "@/context/AuthContext";
import { parseAllBankSms, ParsedSms, RawSms } from "@/services/smsParser";
import {
  getUploadedIds,
  runInitialSync,
  startSmsListener,
  SyncProgress,
} from "@/services/smsSync";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
type SyncStatus = "idle" | "syncing" | "done" | "error";

// ─── 3-day window in milliseconds ────────────────────────────────────────────
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

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

// ─── Read SMS inbox — last 3 days only ───────────────────────────────────────
// minDate trims the fetch to the last 72 hours so private/personal messages
// from before that window are never loaded into memory at all.
// After fetching, isBankSms() still filters out any non-bank messages that
// happen to arrive within those 3 days.
function readSmsInbox(): Promise<RawSms[]> {
  return new Promise((resolve, reject) => {
    const filter = JSON.stringify({
      box: "inbox",
      maxCount: 200,
      minDate: Date.now() - THREE_DAYS_MS,
    });
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

function SyncBanner({
  status,
  progress,
  newCount,
}: {
  status: SyncStatus;
  progress: SyncProgress | null;
  newCount: number;
}) {
  if (status === "idle") return null;

  if (status === "syncing") {
    return (
      <View className="flex-row items-center px-5 py-3 border-b border-blue-100 bg-blue-50">
        <ActivityIndicator size="small" color="#1152D4" />
        <Text className="ml-3 text-sm font-medium text-blue-700">
          {progress
            ? `Uploading… ${progress.processed} / ${progress.total}`
            : "Scanning messages…"}
        </Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View className="flex-row items-center px-5 py-3 border-b border-red-100 bg-red-50">
        <Ionicons name="warning-outline" size={16} color="#EF4444" />
        <Text className="ml-2 text-sm font-medium text-red-600">
          Sync failed. Pull down to retry.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-row items-center px-5 py-3 border-b border-green-100 bg-green-50">
      <Ionicons name="cloud-done-outline" size={16} color="#22C55E" />
      <Text className="ml-2 text-sm font-medium text-green-700">
        {progress && progress.success > 0
          ? `${progress.success} transaction${progress.success !== 1 ? "s" : ""} uploaded`
          : newCount > 0
            ? `${newCount} new transaction${newCount !== 1 ? "s" : ""} added`
            : "Up to date"}
      </Text>
    </View>
  );
}

function SmsCard({ item, uploaded }: { item: ParsedSms; uploaded: boolean }) {
  return (
    <View
      className={`flex-row items-start p-4 mb-3 rounded-2xl border-2 ${
        uploaded ? "bg-green-50 border-green-100" : "bg-white border-gray-200"
      }`}
    >
      <View
        className={`items-center justify-center w-8 h-8 mt-0.5 mr-3 rounded-full ${
          uploaded ? "bg-green-100" : "bg-gray-100"
        }`}
      >
        <Ionicons
          name={uploaded ? "cloud-done-outline" : "time-outline"}
          size={16}
          color={uploaded ? "#22C55E" : "#9CA3AF"}
        />
      </View>

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

        <Text
          className={`mt-1 text-xs font-medium ${
            uploaded ? "text-green-600" : "text-gray-400"
          }`}
        >
          {uploaded ? "Uploaded" : "Pending upload"}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SmsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("idle");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [allParsed, setAllParsed] = useState<ParsedSms[]>([]);
  const [uploadedIds, setUploadedIds] = useState<Set<string>>(new Set());
  const [selectedBank, setSelectedBank] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newLiveCount, setNewLiveCount] = useState(0);

  const refreshUploadedIds = useCallback(async () => {
    const ids = await getUploadedIds();
    setUploadedIds(new Set(ids));
  }, []);

  const loadAndSync = useCallback(
    async (isRefresh = false) => {
      if (!token) return;
      if (isRefresh) setIsRefreshing(true);
      else setSyncStatus("syncing");

      try {
        const raw = await readSmsInbox();
        const parsed = parseAllBankSms(raw);
        setAllParsed(parsed);
        await refreshUploadedIds();

        setSyncStatus("syncing");
        const progress = await runInitialSync(token, raw, (p) =>
          setSyncProgress({ ...p }),
        );

        await refreshUploadedIds();
        setSyncProgress(progress);
        setSyncStatus("done");
      } catch {
        setSyncStatus("error");
      } finally {
        setIsRefreshing(false);
      }
    },
    [token, refreshUploadedIds],
  );

  // Check permission on mount — auto-load if already granted
  useEffect(() => {
    if (Platform.OS !== "android") return;
    async function init() {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      if (alreadyGranted) {
        setPermissionStatus("granted");
        await loadAndSync();
      }
    }
    init();
  }, [loadAndSync]);

  // Start real-time listener once permission is granted
  useEffect(() => {
    if (Platform.OS !== "android" || permissionStatus !== "granted" || !token) {
      return;
    }
    const cleanup = startSmsListener(token, async () => {
      await refreshUploadedIds();
      setNewLiveCount((c) => c + 1);
      setSyncStatus("done");
      setSyncProgress(null);
    });
    return cleanup;
  }, [permissionStatus, token, refreshUploadedIds]);

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
      await loadAndSync();
    } catch {
      setPermissionStatus("denied");
    }
  }, [loadAndSync]);

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

  if (syncStatus === "syncing" && allParsed.length === 0) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="items-center justify-center flex-1">
          <ActivityIndicator size="large" color="#1152D4" />
          <Text className="mt-3 text-base font-semibold text-gray-700">
            Importing bank messages…
          </Text>
          {syncProgress && (
            <Text className="mt-1 text-sm text-gray-400">
              {syncProgress.processed} / {syncProgress.total}
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {header}

      <SyncBanner
        status={syncStatus}
        progress={syncProgress}
        newCount={newLiveCount}
      />

      {/* Filter row */}
      <View className="px-5 pt-3 pb-3 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-medium text-gray-500">
            {filtered.length} message{filtered.length !== 1 ? "s" : ""}{" "}
            <Text className="text-gray-400">(last 3 days)</Text>
          </Text>
          <TouchableOpacity onPress={() => loadAndSync(false)}>
            <Ionicons name="refresh-outline" size={22} color="#1152D4" />
          </TouchableOpacity>
        </View>

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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadAndSync(true)}
            colors={["#1152D4"]}
            tintColor="#1152D4"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
            <Text className="mt-3 text-base text-gray-400">
              No bank SMS in the last 3 days
            </Text>
            <Text className="mt-1 text-sm text-center text-gray-400">
              New messages from your bank will appear here automatically.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SmsCard item={item} uploaded={uploadedIds.has(item.id)} />
        )}
      />
    </View>
  );
}
