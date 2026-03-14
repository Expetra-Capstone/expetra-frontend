import { TransactionData } from "@/types/transaction.type";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface TransactionReviewModalProps {
  visible: boolean;
  transactionData: TransactionData | null;
  capturedImage: string | null;
  isSaving: boolean;
  onRetake: () => void;
  onSave: () => void;
}

export function TransactionReviewModal({
  visible,
  transactionData,
  capturedImage,
  isSaving,
  onRetake,
  onSave,
}: TransactionReviewModalProps) {
  // Format ISO datetime to human-readable string
  function formatDateTime(iso: string): string {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible && !!transactionData}
      onRequestClose={onRetake}
    >
      <View className="flex-1 bg-gray-100">
        {/* ── Header ── */}
        <View
          className="flex-row items-center justify-between px-4 pb-4 bg-white border-b border-gray-100"
          style={{ paddingTop: Platform.OS === "ios" ? 52 : 16 }}
        >
          <TouchableOpacity
            onPress={onRetake}
            className="items-center justify-center w-9 h-9"
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900">
            Review Transaction
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* ── Scrollable Body ── */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        >
          {/* ── Image thumbnail ── */}
          {capturedImage && (
            <View className="mb-3 overflow-hidden bg-white rounded-2xl">
              <SectionLabel text="Captured Image" />
              <Image
                source={{ uri: capturedImage }}
                className="w-full h-48"
                resizeMode="contain"
                style={{ backgroundColor: "#F9FAFB" }}
              />
              <View className="h-3" />
            </View>
          )}

          {transactionData && (
            <>
              {/* ── Amount Card ── */}
              <View className="p-4 mb-3 bg-white rounded-2xl">
                <Text className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                  Amount
                </Text>
                <Text className="text-3xl font-extrabold text-gray-900">
                  {transactionData.amount.toFixed(2)}
                </Text>
              </View>

              {/* ── Sender Card ── */}
              <View className="mb-3 overflow-hidden bg-white rounded-2xl">
                <SectionLabel text="Sender" />
                <DataRow
                  iconName="person-outline"
                  label="Sender Name"
                  value={transactionData.sender_name}
                />
                <DataRow
                  iconName="card-outline"
                  label="Sender Account"
                  value={transactionData.sender_account ?? "—"}
                  isLast
                />
              </View>

              {/* ── Beneficiary Card ── */}
              <View className="mb-3 overflow-hidden bg-white rounded-2xl">
                <SectionLabel text="Beneficiary" />
                <DataRow
                  iconName="person-outline"
                  label="Beneficiary Name"
                  value={transactionData.beneficiary_name ?? "—"}
                />
                <DataRow
                  iconName="card-outline"
                  label="Beneficiary Account"
                  value={transactionData.beneficiary_account ?? "—"}
                />
                <DataRow
                  iconName="business-outline"
                  label="Beneficiary Bank"
                  value={transactionData.beneficiary_bank ?? "—"}
                  isLast
                />
              </View>

              {/* ── Transaction Meta Card ── */}
              <View className="mb-3 overflow-hidden bg-white rounded-2xl">
                <SectionLabel text="Transaction Details" />
                <DataRow
                  iconName="time-outline"
                  label="Transaction Time"
                  value={formatDateTime(transactionData.transaction_time)}
                />
                <DataRow
                  iconName="swap-horizontal-outline"
                  label="Transaction Type"
                  value={transactionData.transaction_type.toUpperCase()}
                  isLast
                />
              </View>
            </>
          )}
        </ScrollView>

        {/* ── Bottom Buttons ── */}
        <View
          className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-4 bg-white border-t border-gray-100"
          style={{
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 36 : 16,
          }}
        >
          <TouchableOpacity
            onPress={onRetake}
            className="items-center justify-center flex-1 py-4 border border-gray-200 rounded-2xl bg-gray-50"
          >
            <Text className="text-base font-semibold text-gray-700">
              Retake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSave}
            disabled={isSaving}
            className="items-center justify-center flex-1 py-4 rounded-2xl"
            style={{ backgroundColor: isSaving ? "#93C5FD" : "#1152D4" }}
          >
            <Text className="text-base font-semibold text-white">
              {isSaving ? "Saving…" : "Save Transaction"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Internal sub-components ──────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <Text className="px-4 pt-4 pb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
      {text}
    </Text>
  );
}

interface DataRowProps {
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  isLast?: boolean;
}

function DataRow({ iconName, label, value, isLast = false }: DataRowProps) {
  return (
    <View
      className="flex-row items-center px-4 py-3"
      style={{
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#F3F4F6",
      }}
    >
      <View className="items-center justify-center mr-3 w-9 h-9 rounded-xl bg-blue-50">
        <Ionicons name={iconName} size={17} color="#1152D4" />
      </View>
      <View className="flex-1">
        <Text className="text-xs text-gray-400 mb-0.5">{label}</Text>
        <Text className="text-[15px] font-semibold text-gray-900">{value}</Text>
      </View>
    </View>
  );
}
