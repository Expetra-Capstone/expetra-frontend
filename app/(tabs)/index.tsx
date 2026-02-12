import React from "react";
import { ScrollView, Text } from "react-native";

export default function HomePage() {
  return (
    <ScrollView
      className="flex-1 bg-black"
      showsVerticalScrollIndicator={false}
    >
      <Text className="mt-4 text-2xl font-bold text-center text-white">
        Home Page
      </Text>
    </ScrollView>
  );
}
