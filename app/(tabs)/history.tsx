import React from "react";
import { ScrollView, Text, View } from "react-native";

const history = () => {
  return (
    <View className="flex-1 px-5 bg-black">
      <ScrollView
        className="flex-1 bg-black"
        showsVerticalScrollIndicator={false}
      >
        <Text className="mt-4 text-2xl font-bold text-center text-white">
          History Page
        </Text>
      </ScrollView>
    </View>
  );
};

export default history;
