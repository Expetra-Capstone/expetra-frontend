import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSmsPermission } from "../../hooks/useSmsPermission";
import {
    KNOWN_BANK_ADDRESSES,
    PROVIDER_DISPLAY_NAMES,
    SmsConversation,
    SmsReaderService
} from "../../services/smsReaderService";
import { RawSmsMessage } from "../../types/sms.types";

// ─── iOS manual provider list ─────────────────────────────────────────────────
const IOS_PROVIDERS = Array.from(KNOWN_BANK_ADDRESSES).map((address) => ({
  address,
  label: PROVIDER_DISPLAY_NAMES[address] ?? address,
}));

// ─── Date preset shortcuts ─────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 180 },
];

type Step = "SELECT_CHAT" | "DATE_RANGE";

interface SmsImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (messages: RawSmsMessage[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function defaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SmsImportModal({
  visible,
  onClose,
  onImport,
}: SmsImportModalProps) {
  const smsReader = SmsReaderService.getInstance();
  const { status, isGranted, isChecking, requestPermission } =
    useSmsPermission();

  // ── Shared state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("SELECT_CHAT");

  // ── Android: conversation list ────────────────────────────────────────
  const [conversations, setConversations] = useState<SmsConversation[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState<SmsConversation | null>(
    null,
  );

  // ── Android: date range ───────────────────────────────────────────────
  const [fromDate, setFromDate] = useState<Date>(defaultFromDate);
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(1); // 30 days default

  // ── Android: message preview ──────────────────────────────────────────
  const [previewMessages, setPreviewMessages] = useState<RawSmsMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // ── iOS: manual paste ─────────────────────────────────────────────────
  const [manualBody, setManualBody] = useState("");
  const [manualProvider, setManualProvider] = useState(IOS_PROVIDERS[0]);

  // ── Load conversations on open (Android) ─────────────────────────────
  useEffect(() => {
    if (visible && Platform.OS === "android" && isGranted) {
      loadConversations();
    }
  }, [visible, isGranted]);

  // ── Reload preview when step/chat/dates change ────────────────────────
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      step === "DATE_RANGE" &&
      selectedChat &&
      isGranted
    ) {
      loadPreviewMessages();
    }
  }, [step, selectedChat, fromDate, toDate]);

  // ─── Loaders ────────────────────────────────────────────────────────────
  async function loadConversations() {
    setIsLoadingChats(true);
    try {
      const convos = await smsReader.getConversations();
      setConversations(convos);
    } catch (e) {
      console.error("[SmsImport] loadConversations:", e);
    } finally {
      setIsLoadingChats(false);
    }
  }

  async function loadPreviewMessages() {
    if (!selectedChat) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await smsReader.getMessages({
        address: selectedChat.address,
        fromDate,
        toDate,
        maxCount: 200,
      });
      setPreviewMessages(msgs);
    } catch (e) {
      console.error("[SmsImport] loadPreviewMessages:", e);
      setPreviewMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  function handleSelectChat(convo: SmsConversation) {
    setSelectedChat(convo);
    setStep("DATE_RANGE");
  }

  function applyPreset(days: number, index: number) {
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFromDate(from);
    setToDate(new Date());
    setActivePreset(index);
  }

  function handleImport() {
    if (Platform.OS === "ios") {
      if (!manualBody.trim()) return;
      onImport([
        {
          id: `manual-${Date.now()}`,
          body: manualBody.trim(),
          address: manualProvider.address,
          date: new Date().toISOString(),
        },
      ]);
    } else {
      if (!previewMessages.length) return;
      onImport(previewMessages);
    }
    handleClose();
  }

  function handleClose() {
    setStep("SELECT_CHAT");
    setSelectedChat(null);
    setPreviewMessages([]);
    setManualBody("");
    setShowFromPicker(false);
    setShowToPicker(false);
    onClose();
  }

  function handleBackOrClose() {
    if (step === "DATE_RANGE") {
      setStep("SELECT_CHAT");
      setSelectedChat(null);
      setPreviewMessages([]);
    } else {
      handleClose();
    }
  }

  // ─── Sub-renders ──────────────────────────────────────────────────────────

  // Permission gate
  const renderPermissionScreen = () => (
    <View className="items-center justify-center flex-1 p-8">
      <View className="items-center justify-center w-20 h-20 mb-5 rounded-full bg-blue-50">
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={36}
          color="#2563EB"
        />
      </View>
      <Text className="mb-2 text-lg font-bold text-center text-gray-900">
        {status === "never_ask_again"
          ? "Permission Blocked"
          : "SMS Access Required"}
      </Text>
      <Text className="mb-6 text-sm leading-6 text-center text-gray-500">
        {status === "never_ask_again"
          ? "Please enable SMS permission in your device Settings → Apps → [App Name] → Permissions."
          : "Allow access to read bank SMS messages for automatic expense tracking. No messages are sent anywhere."}
      </Text>
      {status !== "never_ask_again" && (
        <TouchableOpacity
          onPress={requestPermission}
          className="px-10 py-4 bg-blue-600 rounded-2xl"
        >
          <Text className="text-base font-semibold text-white">
            Grant Permission
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Android Step 1: conversation list
  const renderChatList = () => {
    if (isChecking || isLoadingChats) {
      return (
        <View className="items-center justify-center flex-1 gap-3">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-sm text-gray-400">Loading conversations…</Text>
        </View>
      );
    }

    const bankChats = conversations.filter((c) => c.isKnownBank);
    const otherChats = conversations.filter((c) => !c.isKnownBank);

    return (
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.address}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ListHeaderComponent={() =>
          bankChats.length > 0 ? (
            <Text className="mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
              Supported Banks
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const prevItem = index > 0 ? conversations[index - 1] : null;
          const isFirstOther =
            !item.isKnownBank && (prevItem === null || prevItem.isKnownBank);

          return (
            <>
              {isFirstOther && otherChats.length > 0 && (
                <Text className="mt-4 mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                  Other Senders
                </Text>
              )}
              <TouchableOpacity
                onPress={() => handleSelectChat(item)}
                activeOpacity={0.7}
                className="flex-row items-center bg-white rounded-2xl p-3.5 mb-2"
              >
                {/* Icon */}
                <View
                  className="items-center justify-center mr-3 w-11 h-11 rounded-xl"
                  style={{
                    backgroundColor: item.isKnownBank ? "#EFF6FF" : "#F3F4F6",
                  }}
                >
                  <Ionicons
                    name={
                      item.isKnownBank
                        ? "business-outline"
                        : "chatbubble-outline"
                    }
                    size={20}
                    color={item.isKnownBank ? "#2563EB" : "#6B7280"}
                  />
                </View>

                {/* Text */}
                <View className="flex-1">
                  <View className="flex-row items-center justify-between mb-0.5">
                    <Text className="text-[15px] font-semibold text-gray-900">
                      {item.displayName}
                    </Text>
                    <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                      <Text className="text-xs font-medium text-gray-500">
                        {item.messageCount}
                      </Text>
                    </View>
                  </View>
                  <Text
                    className="text-xs leading-4 text-gray-400"
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#D1D5DB"
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            </>
          );
        }}
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20">
            <Ionicons name="chatbubbles-outline" size={52} color="#E5E7EB" />
            <Text className="mt-3 text-sm text-gray-400">
              No messages found
            </Text>
          </View>
        )}
      />
    );
  };

  // Android Step 2: date range + preview
  const renderDateRange = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      {/* Selected chat chip */}
      {selectedChat && (
        <View className="flex-row items-center bg-white rounded-2xl p-3.5 mb-3">
          <View className="items-center justify-center mr-3 w-11 h-11 rounded-xl bg-blue-50">
            <Ionicons
              name={
                selectedChat.isKnownBank
                  ? "business-outline"
                  : "chatbubble-outline"
              }
              size={20}
              color="#2563EB"
            />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-gray-900">
              {selectedChat.displayName}
            </Text>
            <Text className="text-xs text-gray-400">
              {selectedChat.address}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setStep("SELECT_CHAT")}
            className="bg-gray-100 px-3 py-1.5 rounded-xl"
          >
            <Text className="text-xs font-semibold text-gray-500">Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Date range card */}
      <View className="mb-3 overflow-hidden bg-white rounded-2xl">
        <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Date Range
        </Text>

        {/* From */}
        <TouchableOpacity
          onPress={() => {
            setShowToPicker(false);
            setShowFromPicker((v) => !v);
          }}
          className="flex-row items-center justify-between px-4 py-3"
          style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
        >
          <View className="flex-row items-center gap-3">
            <View className="items-center justify-center w-9 h-9 rounded-xl bg-blue-50">
              <Ionicons name="calendar-outline" size={17} color="#2563EB" />
            </View>
            <Text className="text-sm text-gray-500">From</Text>
          </View>
          <Text className="text-[15px] font-semibold text-gray-900">
            {formatDate(fromDate)}
          </Text>
        </TouchableOpacity>

        {showFromPicker && (
          <View className="px-4 pb-2">
            <DateTimePicker
              value={fromDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={toDate}
              onChange={(_, date) => {
                if (Platform.OS !== "ios") setShowFromPicker(false);
                if (date) {
                  setFromDate(date);
                  setActivePreset(null);
                }
              }}
            />
          </View>
        )}

        {/* To */}
        <TouchableOpacity
          onPress={() => {
            setShowFromPicker(false);
            setShowToPicker((v) => !v);
          }}
          className="flex-row items-center justify-between px-4 py-3"
          style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
        >
          <View className="flex-row items-center gap-3">
            <View className="items-center justify-center w-9 h-9 rounded-xl bg-blue-50">
              <Ionicons name="calendar-outline" size={17} color="#2563EB" />
            </View>
            <Text className="text-sm text-gray-500">To</Text>
          </View>
          <Text className="text-[15px] font-semibold text-gray-900">
            {formatDate(toDate)}
          </Text>
        </TouchableOpacity>

        {showToPicker && (
          <View className="px-4 pb-2">
            <DateTimePicker
              value={toDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={fromDate}
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (Platform.OS !== "ios") setShowToPicker(false);
                if (date) {
                  setToDate(date);
                  setActivePreset(null);
                }
              }}
            />
          </View>
        )}
      </View>

      {/* Quick preset buttons */}
      <View className="flex-row gap-2 mb-3">
        {DATE_PRESETS.map((preset, i) => (
          <TouchableOpacity
            key={preset.days}
            onPress={() => applyPreset(preset.days, i)}
            className="flex-1 py-2.5 rounded-xl items-center"
            style={{
              backgroundColor: activePreset === i ? "#2563EB" : "#FFFFFF",
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: activePreset === i ? "#FFFFFF" : "#2563EB" }}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Messages found + preview */}
      <View className="mb-3 overflow-hidden bg-white rounded-2xl">
        <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
          <Text className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
            Messages Found
          </Text>
          {isLoadingMessages ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <View className="bg-blue-50 px-2.5 py-1 rounded-full">
              <Text className="text-xs font-bold text-blue-600">
                {previewMessages.length}
              </Text>
            </View>
          )}
        </View>

        {isLoadingMessages ? (
          <View className="items-center py-10">
            <ActivityIndicator color="#2563EB" />
          </View>
        ) : previewMessages.length === 0 ? (
          <View className="items-center py-10">
            <Ionicons name="document-outline" size={36} color="#E5E7EB" />
            <Text className="mt-2 text-sm text-gray-400">
              No messages in this date range
            </Text>
          </View>
        ) : (
          <>
            {previewMessages.slice(0, 3).map((msg, idx) => (
              <View
                key={msg.id}
                className="px-4 py-3"
                style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
              >
                <Text className="mb-1 text-xs text-gray-400">
                  {new Date(msg.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text
                  className="text-[13px] text-gray-700 leading-5"
                  numberOfLines={2}
                >
                  {msg.body}
                </Text>
              </View>
            ))}
            {previewMessages.length > 3 && (
              <View
                className="items-center py-3"
                style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
              >
                <Text className="text-xs text-gray-400">
                  +{previewMessages.length - 3} more messages
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );

  // iOS: manual paste
  const renderIosContent = () => (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      {/* Info banner */}
      <View className="flex-row gap-2 p-4 mb-3 bg-blue-50 rounded-2xl">
        <Ionicons
          name="information-circle-outline"
          size={18}
          color="#2563EB"
          style={{ marginTop: 1 }}
        />
        <Text className="flex-1 text-sm leading-5 text-blue-700">
          iOS does not allow apps to read SMS. Copy your bank message and paste
          it below.
        </Text>
      </View>

      {/* Provider selector */}
      <View className="mb-3 overflow-hidden bg-white rounded-2xl">
        <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Bank / Provider
        </Text>
        {IOS_PROVIDERS.map((p) => {
          const isSelected = manualProvider.address === p.address;
          return (
            <TouchableOpacity
              key={p.address}
              onPress={() => setManualProvider(p)}
              className="flex-row items-center justify-between px-4 py-3"
              style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6" }}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className="items-center justify-center w-9 h-9 rounded-xl"
                  style={{
                    backgroundColor: isSelected ? "#EFF6FF" : "#F3F4F6",
                  }}
                >
                  <Ionicons
                    name="business-outline"
                    size={17}
                    color={isSelected ? "#2563EB" : "#9CA3AF"}
                  />
                </View>
                <Text
                  className="text-[15px] font-medium"
                  style={{ color: isSelected ? "#1D4ED8" : "#374151" }}
                >
                  {p.label}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Paste input */}
      <View className="mb-3 overflow-hidden bg-white rounded-2xl">
        <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Paste SMS Text
        </Text>
        <TextInput
          style={{
            minHeight: 160,
            textAlignVertical: "top",
            paddingHorizontal: 16,
            paddingBottom: 16,
            fontSize: 14,
            color: "#111827",
            lineHeight: 22,
          }}
          multiline
          placeholder="Paste your bank SMS message here…"
          placeholderTextColor="#9CA3AF"
          value={manualBody}
          onChangeText={setManualBody}
        />
        {manualBody.length > 0 && (
          <TouchableOpacity
            onPress={() => setManualBody("")}
            className="flex-row items-center gap-1.5 px-4 pb-3"
          >
            <Ionicons name="close-circle-outline" size={14} color="#9CA3AF" />
            <Text className="text-xs text-gray-400">Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  // ─── Bottom action button ─────────────────────────────────────────────────
  const importDisabled =
    Platform.OS === "ios"
      ? !manualBody.trim()
      : previewMessages.length === 0 || isLoadingMessages;

  const importLabel =
    Platform.OS === "ios"
      ? "Parse SMS"
      : `Import ${previewMessages.length} Message${previewMessages.length !== 1 ? "s" : ""}`;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-gray-100">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View
          className="flex-row items-center justify-between px-4 pb-4 bg-white border-b border-gray-100"
          style={{ paddingTop: Platform.OS === "ios" ? 52 : 16 }}
        >
          <TouchableOpacity
            onPress={handleBackOrClose}
            className="items-center justify-center w-9 h-9"
          >
            <Ionicons
              name={step === "DATE_RANGE" ? "arrow-back" : "close"}
              size={22}
              color="#111827"
            />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-[17px] font-semibold text-gray-900">
              {Platform.OS === "ios"
                ? "Paste SMS"
                : step === "SELECT_CHAT"
                  ? "Select Chat"
                  : "Date Range"}
            </Text>
            {/* Step indicator dots (Android only) */}
            {Platform.OS === "android" && isGranted && (
              <View className="flex-row gap-1.5 mt-1.5">
                {(["SELECT_CHAT", "DATE_RANGE"] as Step[]).map((s) => (
                  <View
                    key={s}
                    className="h-1.5 rounded-full"
                    style={{
                      width: step === s ? 18 : 6,
                      backgroundColor: step === s ? "#2563EB" : "#D1D5DB",
                    }}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        {Platform.OS === "ios"
          ? renderIosContent()
          : !isGranted && !isChecking
            ? renderPermissionScreen()
            : step === "SELECT_CHAT"
              ? renderChatList()
              : renderDateRange()}

        {/* ── Import button — visible on step 2 (Android) or always (iOS) ── */}
        {(Platform.OS === "ios" ||
          (Platform.OS === "android" && step === "DATE_RANGE")) && (
          <View
            className="absolute bottom-0 left-0 right-0 px-4 bg-white border-t border-gray-100"
            style={{
              paddingTop: 12,
              paddingBottom: Platform.OS === "ios" ? 36 : 16,
            }}
          >
            <TouchableOpacity
              onPress={handleImport}
              disabled={importDisabled}
              className="items-center py-4 rounded-2xl"
              style={{
                backgroundColor: importDisabled ? "#93C5FD" : "#2563EB",
              }}
            >
              <Text className="text-base font-semibold text-white">
                {importLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}
