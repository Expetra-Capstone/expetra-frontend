import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

const Navbar = () => {
  const image = require("../assets/images/av.jpg");
  const { role } = useAuth(); // Use require for local images

  const isOwner = role === "owner";
  return (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4 bg-white">
        <View className="flex-row items-center">
          {image ? (
            <Image source={image} className="w-10 h-10 rounded-full" />
          ) : (
            <View className="items-center justify-center w-10 h-10 bg-yellow-600 rounded-full">
              <Ionicons name="person" size={24} color="#F7F7F9" />
            </View>
          )}

          <View className="pt-1 ml-3">
            <Text className="text-xs font-medium text-gray-800">
              Welcome back
            </Text>
            <Text className="text-xl font-semibold text-gray-900">
              Betemariam
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          {isOwner && (
            <TouchableOpacity
              className="mr-4"
              onPress={() => router.push("/(sms)")}
            >
              <FontAwesome5 name="sms" size={26} color="#1152D4" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.push("/(notification)")}>
            <View className="relative">
              <Ionicons
                name="notifications-outline"
                size={26}
                color="#1152D4"
              />
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
