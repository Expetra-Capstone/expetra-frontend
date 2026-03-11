// app/(tabs)/add.tsx

import { LoadingOverlay } from "@/components/screenshot/LoadingOverlay";
import { ReceiptReviewModal } from "@/components/screenshot/ReceiptReviewModal";
import { GeminiService, RateLimitError } from "@/services/gemeniService";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ReceiptData } from "../../types/expense.types";

// ─── Mock API ─────────────────────────────────────────────────────────────────
async function saveExpenseToApi(
  data: ReceiptData,
  imageUri: string,
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log("[Mock API] POST /expenses", { data, imageUri });
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

  const geminiService = GeminiService.getInstance();

  // ─── Permission gates ───────────────────────────────────────────────────────
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
      const receiptData = await geminiService.extractReceiptData(base64);
      setExtractedData(receiptData);
      setShowReview(true);
    } catch (error) {
      if (error instanceof RateLimitError) {
        Alert.alert(
          "Daily Limit Reached",
          "You've used up your free Gemini API quota for today. Resets at midnight (Pacific Time).",
          [{ text: "OK", onPress: retakePhoto }],
        );
      } else {
        Alert.alert(
          "Extraction Failed",
          "Could not read the receipt. Please retake the photo in better lighting.",
          [{ text: "Retake", onPress: retakePhoto }, { text: "Dismiss" }],
        );
      }
    } finally {
      setIsProcessing(false);
    }
  }

  // ─── Camera & gallery ───────────────────────────────────────────────────────
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

  // ─── Processing preview ─────────────────────────────────────────────────────
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

  // ─── Camera screen ──────────────────────────────────────────────────────────
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

      {/* ── Extracted receipt review ── */}
      <ReceiptReviewModal
        visible={showReview}
        extractedData={extractedData}
        capturedImage={capturedImage}
        isSaving={isSaving}
        onRetake={retakePhoto}
        onSave={handleSave}
      />
    </View>
  );
}
