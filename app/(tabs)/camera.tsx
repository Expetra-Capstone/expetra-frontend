// app/(tabs)/add.tsx

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Camera() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isUploadingModalVisible, setIsUploadingModalVisible] = useState(false);

  // Simple handler you can later replace with your processing logic
  function handleImageUploaded() {
    setIsUploadingModalVisible(true);
  }

  if (!permission) {
    return <View />;
  }

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

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  async function takePicture() {
    if (!cameraRef.current) return;

    try {
      await cameraRef.current.takePictureAsync({
        quality: 1,
      });

      // Just show a success modal – no processing, no state saved
      handleImageUploaded();
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
      });

      if (!result.canceled && result.assets[0]) {
        // Just show a success modal – no processing, no state saved
        handleImageUploaded();
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image from gallery");
    }
  }

  return (
    <View className="flex-1 bg-black">
      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

      {/* Bottom Controls */}
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

      {/* Simple success modal */}
      <Modal
        animationType="fade"
        transparent
        visible={isUploadingModalVisible}
        onRequestClose={() => setIsUploadingModalVisible(false)}
      >
        <View className="items-center justify-center flex-1 bg-black/50">
          <View className="w-4/5 p-6 bg-white rounded-2xl">
            <Text className="mb-2 text-xl font-bold text-center text-black">
              Photo uploaded
            </Text>
            <Text className="mb-4 text-center text-gray-700">
              Your photo was captured/selected successfully. You can process it
              later in your flow.
            </Text>
            <TouchableOpacity
              className="py-3 bg-blue-600 rounded-xl"
              onPress={() => setIsUploadingModalVisible(false)}
            >
              <Text className="text-base font-semibold text-center text-white">
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
