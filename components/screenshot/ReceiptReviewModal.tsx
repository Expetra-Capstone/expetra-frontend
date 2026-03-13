// components/ReceiptReviewModal.tsx

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
import { ReceiptData } from "../../types/expense.types";

interface ReceiptReviewModalProps {
  visible: boolean;
  extractedData: ReceiptData | null;
  capturedImage: string | null;
  isSaving: boolean;
  onRetake: () => void;
  onSave: () => void;
}

export function ReceiptReviewModal({
  visible,
  extractedData,
  capturedImage,
  isSaving,
  onRetake,
  onSave,
}: ReceiptReviewModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible && !!extractedData}
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
            Review Receipt
          </Text>
          {/* spacer to keep title centered */}
          <View style={{ width: 36 }} />
        </View>

        {/* ── Scrollable Body ── */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        >
          {/* ── Receipt thumbnail ── */}
          {capturedImage && (
            <View className="mb-3 overflow-hidden bg-white rounded-2xl">
              <SectionLabel text="Receipt Image" />
              <Image
                source={{ uri: capturedImage }}
                className="w-full h-48"
                resizeMode="contain"
                style={{ backgroundColor: "#F9FAFB" }}
              />
              <View className="h-3" />
            </View>
          )}

          {extractedData && (
            <>
              {/* ── Main Details Card ── */}
              <View className="mb-3 overflow-hidden bg-white rounded-2xl">
                <SectionLabel text="Receipt Details" />
                <DataRow
                  iconName="storefront-outline"
                  label="Merchant"
                  value={extractedData.merchant_name || "—"}
                />
                <DataRow
                  iconName="calendar-outline"
                  label="Date"
                  value={extractedData.date || "—"}
                />
                <DataRow
                  iconName="time-outline"
                  label="Time"
                  value={extractedData.time || "—"}
                />
                <DataRow
                  iconName="grid-outline"
                  label="Category"
                  value={extractedData.category || "—"}
                />
                <DataRow
                  iconName="card-outline"
                  label="Payment Method"
                  value={extractedData.payment_method || "—"}
                  isLast
                />
              </View>

              {/* ── Amount Card ── */}
              <View className="p-4 mb-3 bg-white rounded-2xl">
                <Text className="mb-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                  Amount
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-base text-gray-500">Total</Text>
                  <Text className="text-2xl font-extrabold text-gray-900">
                    {extractedData.currency ?? "USD"}{" "}
                    {extractedData.total_amount?.toFixed(2) ?? "0.00"}
                  </Text>
                </View>

                {extractedData.tax_amount != null &&
                  extractedData.tax_amount > 0 && (
                    <>
                      <View className="h-px my-3 bg-gray-100" />
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-gray-500">Tax</Text>
                        <Text className="text-sm font-semibold text-gray-700">
                          {extractedData.currency ?? "USD"}{" "}
                          {extractedData.tax_amount.toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
              </View>

              {/* ── Line Items Card ── */}
              {extractedData.items && extractedData.items.length > 0 && (
                <View className="mb-3 overflow-hidden bg-white rounded-2xl">
                  <SectionLabel
                    text={`Items  ·  ${extractedData.items.length}`}
                  />
                  {extractedData.items.map((item, idx) => (
                    <View
                      key={idx}
                      className="flex-row items-center px-4 py-3"
                      style={{
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: "#F3F4F6",
                      }}
                    >
                      <View className="w-2 h-2 mr-3 bg-blue-500 rounded-full" />
                      <Text className="flex-1 text-[15px] font-medium text-gray-800 mr-3">
                        {item.name}
                      </Text>
                      <Text className="text-sm text-gray-500">
                        {item.quantity != null ? `×${item.quantity}  ` : ""}
                        {extractedData.currency ?? "USD"}{" "}
                        {item.price?.toFixed(2) ?? "—"}
                      </Text>
                    </View>
                  ))}
                  <View className="h-2" />
                </View>
              )}
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
              {isSaving ? "Saving…" : "Save Receipt"}
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
      {/* Icon badge */}
      <View className="items-center justify-center mr-3 w-9 h-9 rounded-xl bg-blue-50">
        <Ionicons name={iconName} size={17} color="#1152D4" />
      </View>

      {/* Label + Value stacked */}
      <View className="flex-1">
        <Text className="text-xs text-gray-400 mb-0.5">{label}</Text>
        <Text className="text-[15px] font-semibold text-gray-900">{value}</Text>
      </View>
    </View>
  );
}
