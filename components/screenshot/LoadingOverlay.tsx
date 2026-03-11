import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = "Processing...",
}) => {
  return (
    <View
      style={StyleSheet.absoluteFill}
      className="items-center justify-center bg-black/70"
    >
      <View className="items-center p-8 bg-white rounded-2xl">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-base font-semibold text-gray-800">
          {message}
        </Text>
      </View>
    </View>
  );
};
