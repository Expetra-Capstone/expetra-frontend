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
      <View className="flex-1 bg-black">
        {/* ── Header ── */}
        <View
          className="flex-row items-center justify-between px-5 pb-4"
          style={{ paddingTop: Platform.OS === "ios" ? 52 : 16 }}
        >
          <TouchableOpacity onPress={onRetake}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-white">
            Review Receipt
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* ── Scrollable Body ── */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        >
          {/* Receipt thumbnail */}
          {capturedImage && (
            <View className="mb-6">
              <ReviewLabel text="Receipt Image" />
              <Image
                source={{ uri: capturedImage }}
                className="w-full h-48 rounded-xl"
                resizeMode="contain"
                style={{ backgroundColor: "#202020" }}
              />
            </View>
          )}

          {/* Extracted fields */}
          {extractedData && (
            <>
              <ReviewRow
                label="Merchant"
                value={extractedData.merchant_name || "—"}
              />
              <ReviewRow label="Date" value={extractedData.date || "—"} />
              <ReviewRow label="Time" value={extractedData.time || "—"} />
              <ReviewRow
                label="Total"
                value={`${extractedData.currency ?? "USD"} ${
                  extractedData.total_amount?.toFixed(2) ?? "0.00"
                }`}
              />
              <ReviewRow
                label="Category"
                value={extractedData.category || "—"}
              />
              <ReviewRow
                label="Payment Method"
                value={extractedData.payment_method || "—"}
              />
              {extractedData.tax_amount != null &&
                extractedData.tax_amount > 0 && (
                  <ReviewRow
                    label="Tax Amount"
                    value={`${extractedData.currency ?? "USD"} ${extractedData.tax_amount.toFixed(2)}`}
                  />
                )}

              {/* Line items */}
              {extractedData.items && extractedData.items.length > 0 && (
                <View className="mb-4">
                  <ReviewLabel text="Items" />
                  <View
                    className="overflow-hidden rounded-xl"
                    style={{
                      backgroundColor: "#202020",
                      borderWidth: 1,
                      borderColor: "#2a2a2a",
                    }}
                  >
                    {extractedData.items.map((item, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-center justify-between px-4 py-3"
                        style={{
                          borderBottomWidth:
                            idx < extractedData.items.length - 1 ? 1 : 0,
                          borderBottomColor: "#2a2a2a",
                        }}
                      >
                        <Text className="flex-1 mr-3 text-base text-white">
                          {item.name}
                        </Text>
                        <Text style={{ color: "#9ca3af" }}>
                          {item.quantity != null ? `×${item.quantity}  ` : ""}
                          {extractedData.currency ?? "USD"}{" "}
                          {item.price?.toFixed(2) ?? "—"}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* ── Bottom Buttons ── */}
        <View
          className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-5"
          style={{
            backgroundColor: "black",
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 36 : 16,
            borderTopWidth: 1,
            borderTopColor: "#1a1a1a",
          }}
        >
          <TouchableOpacity
            onPress={onRetake}
            className="flex-1 py-4 rounded-xl"
            style={{ borderWidth: 1, borderColor: "#3a4a3a" }}
          >
            <Text className="text-base font-semibold text-center text-white">
              Retake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSave}
            disabled={isSaving}
            className="flex-1 py-4 rounded-xl"
            style={{ backgroundColor: isSaving ? "#5a7a4a" : "#d15d28" }}
          >
            <Text className="text-base font-semibold text-center text-white">
              {isSaving ? "Saving…" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Internal sub-components ──────────────────────────────────────────────────

function ReviewLabel({ text }: { text: string }) {
  return (
    <Text className="mb-2 text-sm" style={{ color: "#9ca3af" }}>
      {text}
    </Text>
  );
}

interface ReviewRowProps {
  label: string;
  value: string;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <View className="mb-4">
      <ReviewLabel text={label} />
      <View
        className="px-4 py-3 rounded-xl"
        style={{ backgroundColor: "#202020" }}
      >
        <Text className="text-base text-white">{value}</Text>
      </View>
    </View>
  );
}
