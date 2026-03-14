import AuthInput from "@/components/auth/AuthInput";
import GoogleButton from "@/components/auth/GoogleButton";
import { AccountType } from "@/constants/users";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

// ─── ICONS ────────────────────────────────────────────────────────────────────

const PersonIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" fill="none" />
    <Path
      d="M4 20c0-3 3.6-5.5 8-5.5s8 2.5 8 5.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const BuildingIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />
    <Path
      d="M8 9h2M14 9h2M8 13h2M14 13h2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const TeamIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="8" r="3" stroke={color} strokeWidth="2" fill="none" />
    <Circle cx="17" cy="8" r="3" stroke={color} strokeWidth="2" fill="none" />
    <Path
      d="M2 20c0-2.5 3-4.5 7-4.5s7 2 7 4.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <Path
      d="M16 15.5c2.5.3 5 1.8 5 4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────

interface TabConfig {
  type: AccountType;
  label: string;
  Icon: React.FC<{ color: string }>;
}

const TABS: TabConfig[] = [
  { type: "personal", label: "Personal", Icon: PersonIcon },
  { type: "business", label: "Business", Icon: BuildingIcon },
  { type: "team", label: "Team", Icon: TeamIcon },
];

// ─── VALIDATION ───────────────────────────────────────────────────────────────

interface LoginErrors {
  phone?: string;
  password?: string;
}

const validate = (phone: string, password: string): LoginErrors => {
  const errors: LoginErrors = {};
  if (!phone.trim()) errors.phone = "Phone number is required.";
  else if (phone.trim().length < 9)
    errors.phone = "Enter a valid phone number.";
  if (!password) errors.password = "Password is required.";
  return errors;
};

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountType>("personal");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const errs = validate(phone, password);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const result = await login(phone, password, activeTab);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Login Failed", result.error);
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      className="h-screen pt-20 bg-white"
    >
      {/* Heading */}
      <Text className="text-[32px] font-extrabold text-gray-900 leading-tight">
        Welcome back
      </Text>
      <Text className="text-gray-500 mt-1 mb-8 text-[15px]">
        Please enter your details to sign in.
      </Text>

      {/* Account type tab switcher */}
      <View className="flex-row p-1 bg-gray-100 rounded-2xl mb-7">
        {TABS.map(({ type, label, Icon }) => {
          const isActive = activeTab === type;
          const color = isActive ? "#2563EB" : "#9CA3AF";
          return (
            <TouchableOpacity
              key={type}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl ${
                isActive ? "bg-white" : ""
              }`}
              style={
                isActive
                  ? {
                      shadowColor: "#000",
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 1 },
                      elevation: 2,
                    }
                  : undefined
              }
              onPress={() => setActiveTab(type)}
              activeOpacity={0.8}
            >
              <Icon color={color} />
              <Text
                className={`text-sm font-semibold ${
                  isActive ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Form */}
      <AuthInput
        label="Phone Number"
        placeholder="09211122112"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        error={errors.phone}
      />

      <AuthInput
        label="Password"
        placeholder="password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={errors.password}
      />

      {/* Forgot password */}
      <TouchableOpacity className="self-end mb-8 -mt-1">
        <Text className="text-sm font-semibold text-blue-500">
          Forget Password?
        </Text>
      </TouchableOpacity>

      {/* OR divider */}
      <View className="flex-row items-center gap-3 mb-4">
        <View className="flex-1 h-[1px] bg-gray-200" />
        <Text className="text-sm text-gray-400">or</Text>
        <View className="flex-1 h-[1px] bg-gray-200" />
      </View>

      {/* Google */}
      <GoogleButton />

      {/* Login button */}
      <TouchableOpacity
        className="items-center justify-center mt-4 bg-blue-600 h-14 rounded-2xl"
        onPress={handleLogin}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold text-[17px] tracking-wide">
            Login
          </Text>
        )}
      </TouchableOpacity>

      {/* Sign up link */}
      <TouchableOpacity
        className="items-center mt-6"
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Text className="text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Text className="font-bold text-blue-600">Sign up</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
