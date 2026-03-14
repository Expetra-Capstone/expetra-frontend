import { LoadingOverlay } from "@/components/screenshot/LoadingOverlay";
import { TransactionReviewModal } from "@/components/screenshot/ReceiptReviewModal";
import { GeminiService, RateLimitError } from "@/services/gemeniService";
import { TransactionData } from "@/types/transaction.type";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
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

// ─── Mock API ─────────────────────────────────────────────────────────────────
async function saveTransactionToApi(data: TransactionData): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!data.amount || !data.sender_name || !data.transaction_type) {
        reject(
          new Error(
            "Missing required fields: amount, sender_name, transaction_type",
          ),
        );
        return;
      }
      console.log("[Mock API] POST /transactions", {
        transaction: {
          transaction_time: data.transaction_time,
          amount: data.amount,
          sender_name: data.sender_name,
          sender_account: data.sender_account,
          beneficiary_name: data.beneficiary_name,
          beneficiary_account: data.beneficiary_account,
          beneficiary_bank: data.beneficiary_bank,
          transaction_type: data.transaction_type,
        },
      });
      resolve();
    }, 1200);
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── FIX: Reliably read base64 from URI when ImagePicker returns null ─────────
async function getBase64FromUri(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function Camera() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [transactionData, setTransactionData] =
    useState<TransactionData | null>(null);
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
    setTransactionData(null);
    setShowReview(false);
    setIsProcessing(false);
  }

  async function processImage(uri: string, base64OrNull: string | null) {
    // FIX: Show the loading overlay for at least one render cycle before
    // the heavy async work starts — prevents the state from collapsing
    // into a single batched render on fast errors.
    setCapturedImage(uri);
    setIsProcessing(true);

    // Yield to React so the loading overlay actually paints before we block
    await new Promise((r) => setTimeout(r, 50));

    try {
      // FIX: If ImagePicker gave us null base64 (known Android bug),
      // fall back to reading the file directly via expo-file-system.
      const base64 =
        base64OrNull && base64OrNull.length > 0
          ? base64OrNull
          : await getBase64FromUri(uri);

      const data = await geminiService.extractTransactionData(base64);
      setTransactionData(data);
      setShowReview(true);
    } catch (error) {
      // FIX: Surface the actual error message so you can debug it
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (error instanceof RateLimitError) {
        Alert.alert(
          "Daily Limit Reached",
          "You've used up your free Gemini API quota for today. Resets at midnight (Pacific Time).",
          [{ text: "OK", onPress: retakePhoto }],
        );
      } else {
        Alert.alert(
          "Extraction Failed",
          `Could not read the transaction.\n\nError: ${errorMessage}`,
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
        quality: 0.8,
        base64: true,
        skipProcessing: true,
      });
      if (photo?.uri) {
        // FIX: Always pass the uri; base64 may be null
        await processImage(photo.uri, photo.base64 ?? null);
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
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const selected = result.assets[0];
        // FIX: Always call processImage — it handles null base64 internally
        await processImage(selected.uri, selected.base64 ?? null);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image from gallery");
    }
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!transactionData) return;
    setIsSaving(true);
    try {
      await saveTransactionToApi(transactionData);
      Alert.alert("Saved!", "Your transaction has been recorded.", [
        { text: "OK", onPress: retakePhoto },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Error", `Failed to save transaction. ${msg}`);
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
        {isProcessing && (
          <LoadingOverlay message="Extracting transaction data…" />
        )}
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

      <TransactionReviewModal
        visible={showReview}
        transactionData={transactionData}
        capturedImage={capturedImage}
        isSaving={isSaving}
        onRetake={retakePhoto}
        onSave={handleSave}
      />
    </View>
  );
}
