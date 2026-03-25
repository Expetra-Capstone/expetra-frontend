import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import { UserIcon } from "hugeicons-react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

const Navbar = () => {
  const { role, user } = useAuth(); // Use require for local images

  const isOwner = role === "owner";
  return (
    <View>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4 bg-white">
        <View className="flex-row items-center">
          <View className="items-center justify-center w-10 h-10 rounded-full bg-accent/20">
            <UserIcon size={20} color="#1152D4" />
          </View>

          <View className="pt-1 ml-3">
            <Text className="text-xs font-medium text-gray-800">Welcome</Text>
            <Text className="text-xl font-semibold text-gray-900">
              {user?.name || "User"}
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
