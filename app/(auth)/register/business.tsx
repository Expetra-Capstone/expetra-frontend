import AuthInput from "@/components/auth/AuthInput";
import GoogleButton from "@/components/auth/GoogleButton";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

const BackIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M5 12l7-7M5 12l7 7"
      stroke="#111827"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface BusinessErrors {
  companyName?: string;
  name?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

const validate = (
  companyName: string,
  name: string,
  phone: string,
  password: string,
  confirmPassword: string,
): BusinessErrors => {
  const e: BusinessErrors = {};
  if (!companyName.trim()) e.companyName = "Company name is required.";
  if (!name.trim()) e.name = "Name is required.";
  if (!phone.trim() || phone.trim().length < 9)
    e.phone = "Enter a valid phone number.";
  if (password.length < 8)
    e.password = "Password must be at least 8 characters.";
  if (password !== confirmPassword)
    e.confirmPassword = "Passwords do not match.";
  return e;
};

export default function RegisterBusiness() {
  const { register } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<BusinessErrors>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const errs = validate(companyName, name, phone, password, confirmPassword);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const result = await register({
      accountType: "business",
      name,
      phone,
      password,
      companyName,
    });
    setLoading(false);

    if (!result.success) {
      Alert.alert("Registration Failed", result.error);
    } else {
      router.replace("/(tabs)");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            className="items-center justify-center w-9 h-9"
            onPress={() => router.back()}
          >
            <BackIcon />
          </TouchableOpacity>
        </View>

        <Text className="text-[32px] font-extrabold text-gray-900 leading-tight">
          Register Business
        </Text>
        <Text className="text-gray-500 mt-1 mb-8 text-[15px]">
          Please enter your business details to register.
        </Text>

        <AuthInput
          label="Company Name"
          placeholder="Expetra Corp"
          value={companyName}
          onChangeText={setCompanyName}
          autoCapitalize="words"
          error={errors.companyName}
        />
        <AuthInput
          label="Your Name"
          placeholder="Sarah Business"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={errors.name}
        />
        <AuthInput
          label="Phone Number"
          placeholder="09311122113"
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
        <AuthInput
          label="Confirm Password"
          placeholder="confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          error={errors.confirmPassword}
        />

        <View className="flex-row items-center gap-3 my-4">
          <View className="flex-1 h-[1px] bg-gray-200" />
          <Text className="text-sm text-gray-400">or</Text>
          <View className="flex-1 h-[1px] bg-gray-200" />
        </View>

        <GoogleButton />

        <TouchableOpacity
          className="items-center justify-center mt-4 bg-blue-600 h-14 rounded-2xl"
          onPress={handleRegister}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-[17px] tracking-wide">
              Register
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center mt-6"
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
