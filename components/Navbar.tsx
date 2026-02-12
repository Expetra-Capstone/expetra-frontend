import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

const Navbar = () => {
  const image = require("../assets/images/avatar.jpg"); // Use require for local images
  return (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        {image ? (
          <Image source={image} className="w-10 h-10 rounded-full" />
        ) : (
          <View className="items-center justify-center w-10 h-10 bg-yellow-600 rounded-full">
            <Ionicons name="person" size={24} color="#000" />
          </View>
        )}

        {/* <View className="flex-row items-center px-4 py-2 bg-[#202020] rounded-full">
            <Text className="mr-2 text-sm text-gray-500">Lite</Text>
            <View className="items-center justify-center bg-yellow-500 rounded-full w-14 h-7">
              <Text className="text-sm font-bold text-black">Pro</Text>
            </View>
          </View> */}

        <View className="flex-row items-center">
          <TouchableOpacity className="mr-4">
            <Ionicons name="scan-outline" size={26} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity>
            <View className="relative">
              <Ionicons name="notifications-outline" size={26} color="#FFF" />
              <View className="absolute items-center justify-center w-5 h-5 bg-red-500 rounded-full -top-1 -right-1">
                <Text className="text-xs font-bold text-white">8</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Navbar;
