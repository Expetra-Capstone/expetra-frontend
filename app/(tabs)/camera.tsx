// app/(tabs)/add.tsx

import { LoadingOverlay } from "@/components/LoadingOverlay";
import { OpenRouterService } from "@/services/openRouterService";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ReceiptData } from "../../types/expense.types";

// ─── Mock API ────────────────────────────────────────────────────────────────
// Replace this with your real API call when ready
async function saveExpenseToApi(
  data: ReceiptData,
  imageUri: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("[Mock API] POST /expenses", { data, imageUri });
      // Simulate occasional failure for testing:
      // reject(new Error("Network error"));
      resolve();
    }, 1200);
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Camera() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const openRouterService = OpenRouterService.getInstance();

  // ─── Permission Gates ───────────────────────────────────────────────────────
  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View className="justify-center flex-1 bg-black">
        <Ionicons
          name="camera"
          size={100}
          color="gray"
          className="self-center mb-5"
        />
        <Text className="text-center pb-2.5 text-white">
          We need your permission to show the camera
        </Text>
        <TouchableOpacity
          className="py-3 mx-16 bg-blue-500 rounded-lg"
          onPress={requestPermission}
        >
          <Text className="font-semibold text-center text-white">
            Grant Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  function retakePhoto() {
    setCapturedImage(null);
    setExtractedData(null);
    setShowReview(false);
  }

  async function processImage(base64: string, uri: string) {
    setIsProcessing(true);
    try {
      const receiptData = await openRouterService.extractReceiptData(base64);
      setExtractedData(receiptData);
      setShowReview(true);
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert(
        "Extraction Error",
        "Failed to extract receipt data. Please retake the photo.",
        [{ text: "Retake", onPress: retakePhoto }, { text: "Dismiss" }],
      );
    } finally {
      setIsProcessing(false);
    }
  }

  // ─── Camera & Gallery ───────────────────────────────────────────────────────
  async function takePicture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        base64: true,
        skipProcessing: true,
      });
      if (photo?.base64) {
        setCapturedImage(photo.uri);
        await processImage(photo.base64, photo.uri);
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to capture image");
    }
  }

  async function pickImageFromGallery() {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Sorry, we need camera roll permissions to upload images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const selected = result.assets[0];
        setCapturedImage(selected.uri);
        if (selected.base64) {
          await processImage(selected.base64, selected.uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image from gallery");
    }
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!extractedData || !capturedImage) return;
    setIsSaving(true);
    try {
      await saveExpenseToApi(extractedData, capturedImage);
      Alert.alert("Saved!", "Your expense has been recorded.", [
        { text: "OK", onPress: retakePhoto },
      ]);
    } catch {
      Alert.alert("Error", "Failed to save expense. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  // ─── Processing Preview (image shown while AI runs) ────────────────────────
  if (capturedImage && !showReview) {
    return (
      <View className="justify-center flex-1 bg-black">
        <Image
          source={{ uri: capturedImage }}
          className="flex-1"
          resizeMode="contain"
        />
        {isProcessing && <LoadingOverlay message="Extracting receipt data…" />}
        {!isProcessing && (
          <View className="absolute flex-row justify-around w-full px-16 bottom-16">
            <TouchableOpacity
              className="px-8 py-4 bg-red-500 rounded-full"
              onPress={retakePhoto}
            >
              <Text className="text-lg font-bold text-white">Retake</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ─── Camera Screen ──────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

      <View className="absolute flex-row items-center justify-between w-full px-16 bottom-28">
        <TouchableOpacity
          className="p-4 rounded-full bg-white/30"
          onPress={pickImageFromGallery}
        >
          <Ionicons name="images" size={32} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          className="w-20 h-20 bg-white border-4 border-gray-300 rounded-full"
          onPress={takePicture}
        >
          <View className="w-full h-full bg-white rounded-full" />
        </TouchableOpacity>

        <TouchableOpacity
          className="p-4 rounded-full bg-white/30"
          onPress={toggleCameraFacing}
        >
          <MaterialIcons name="flip-camera-ios" size={32} color="white" />
        </TouchableOpacity>
      </View>

      {/* ─── Read-Only Review Modal ─────────────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={showReview && !!extractedData}
        onRequestClose={retakePhoto}
      >
        <View className="flex-1 bg-black">
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-5 pb-4"
            style={{ paddingTop: Platform.OS === "ios" ? 52 : 16 }}
          >
            <TouchableOpacity onPress={retakePhoto}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-white">
              Review Receipt
            </Text>
            {/* Spacer to keep title centred */}
            <View style={{ width: 28 }} />
          </View>

          {/* Scrollable content */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 140,
            }}
          >
            {/* Receipt thumbnail */}
            {capturedImage && (
              <View className="mb-6">
                <Text className="mb-2 text-sm" style={{ color: "#9ca3af" }}>
                  Receipt Image
                </Text>
                <Image
                  source={{ uri: capturedImage }}
                  className="w-full h-48 rounded-xl"
                  resizeMode="contain"
                  style={{ backgroundColor: "#202020" }}
                />
              </View>
            )}

            {/* Extracted fields – read-only */}
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
                {extractedData.tax_amount != null && (
                  <ReviewRow
                    label="Tax Amount"
                    value={`${extractedData.currency ?? "USD"} ${extractedData.tax_amount.toFixed(
                      2,
                    )}`}
                  />
                )}

                {/* Line items */}
                {extractedData.items && extractedData.items.length > 0 && (
                  <View className="mb-4">
                    <Text className="mb-2 text-sm" style={{ color: "#9ca3af" }}>
                      Items
                    </Text>
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

          {/* Bottom action buttons */}
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
            {/* Retake */}
            <TouchableOpacity
              onPress={retakePhoto}
              className="flex-1 py-4 rounded-xl"
              style={{ borderWidth: 1, borderColor: "#3a4a3a" }}
            >
              <Text className="text-base font-semibold text-center text-white">
                Retake
              </Text>
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
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
    </View>
  );
}

// ─── Read-Only Row ────────────────────────────────────────────────────────────
interface ReviewRowProps {
  label: string;
  value: string;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm" style={{ color: "#9ca3af" }}>
        {label}
      </Text>
      <View
        className="px-4 py-3 rounded-xl"
        style={{ backgroundColor: "#202020" }}
      >
        <Text className="text-base text-white">{value}</Text>
      </View>
    </View>
  );
}
