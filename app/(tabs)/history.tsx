import React from "react";
import { ScrollView, Text, View } from "react-native";

const history = () => {
  return (
    <View className="flex-1 px-5 text-black bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Text className="mt-4 text-2xl font-bold text-center">
          History Page
        </Text>
      </ScrollView>
    </View>
  );
};

export default history;
