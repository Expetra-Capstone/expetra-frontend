import { AccountType } from "@/constants/users";
import { router } from "expo-router";
import {
  ArrowRight01Icon,
  Building03Icon,
  UserGroupIcon,
  UserIcon,
} from "hugeicons-react-native";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── ACCOUNT OPTIONS ──────────────────────────────────────────────────────────
interface AccountOption {
  type: AccountType;
  label: string;
  route: string;
  featured: boolean;
}

const ACCOUNT_OPTIONS: AccountOption[] = [
  {
    type: "personal",
    label: "Sign up as Personal",
    route: "/(auth)/register/personal",
    featured: false,
  },
  {
    type: "business",
    label: "Sign up as Business",
    route: "/(auth)/register/business",
    featured: true,
  },
  {
    type: "team",
    label: "Sign up as Team",
    route: "/(auth)/register/team",
    featured: false,
  },
];

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const getIcon = (type: AccountType, color: string) => {
    switch (type) {
      case "personal":
        return <UserIcon color={color} />;
      case "business":
        return <Building03Icon color={color} />;
      case "team":
        return <UserGroupIcon color={color} />;
    }
  };

  return (
    <SafeAreaView className="flex-1 h-screen bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Heading */}
        <View className="px-2 mt-28">
          <Text className="text-[32px] font-extrabold text-gray-900 text-center">
            Welcome to Expetra
          </Text>
          <Text className="mt-2 text-base leading-relaxed text-center text-gray-500">
            Manage your finances with confidence.{"\n"}Choose your account type
            to get started.
          </Text>
        </View>

        {/* Account type buttons */}
        <View className="gap-3 mt-80">
          {ACCOUNT_OPTIONS.map((opt) => {
            const isFeatured = opt.featured;
            const iconColor = isFeatured ? "white" : "#2563EB";
            return (
              <TouchableOpacity
                key={opt.type}
                className={`flex-row items-center h-16 rounded-2xl px-5 ${
                  isFeatured ? "bg-blue-600" : "bg-white border border-gray-200"
                }`}
                onPress={() => router.push(opt.route as any)}
                activeOpacity={0.85}
              >
                {getIcon(opt.type, iconColor)}
                <Text
                  className={`flex-1 text-[16px] font-bold ml-3 ${
                    isFeatured ? "text-white" : "text-gray-900"
                  }`}
                >
                  {opt.label}
                </Text>
                <ArrowRight01Icon color={iconColor} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Login link */}
        <TouchableOpacity
          className="items-center mt-8"
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.7}
        >
          <Text className="text-sm text-gray-500">
            Already have an account?{" "}
            <Text className="font-bold text-blue-600">Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
