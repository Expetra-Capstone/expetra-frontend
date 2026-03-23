import AuthInput from "@/components/auth/AuthInput";
import GoogleButton from "@/components/auth/GoogleButton";
import { RegisterOwnerData, useAuth } from "@/context/AuthContext";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

// ─── ICONS ────────────────────────────────────────────────────────────────────
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

const CopyIcon: React.FC<{ color?: string }> = ({ color = "#2563EB" }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Rect
      x="9"
      y="9"
      width="13"
      height="13"
      rx="2"
      stroke={color}
      strokeWidth="2"
      fill="none"
    />
    <Path
      d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const CheckIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke="#16A34A"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── VALIDATION ───────────────────────────────────────────────────────────────
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

// ─── INVITATION MODAL ─────────────────────────────────────────────────────────
interface InvitationModalProps {
  invitationId: string;
  onContinue: () => void;
}

const InvitationModal: React.FC<InvitationModalProps> = ({
  invitationId,
  onContinue,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(invitationId);
    setCopied(true);
    // Reset the copied state after 2.5 seconds
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal animationType="fade" transparent visible statusBarTranslucent>
      {/* Backdrop */}
      <View
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        className="items-center justify-center flex-1 px-6"
      >
        <View className="w-full overflow-hidden bg-white rounded-3xl">
          {/* Header stripe */}
          <View className="px-6 pb-5 bg-blue-600 pt-7">
            <Text className="text-xl font-extrabold text-center text-white">
              🎉 Business Registered!
            </Text>
            <Text className="mt-1 text-sm text-center text-blue-100">
              Share this Invitation ID with your team members so they can join.
            </Text>
          </View>

          <View className="px-6 py-6">
            {/* ID display */}
            <Text className="mb-2 text-xs font-semibold tracking-widest text-center text-gray-400 uppercase">
              Invitation ID
            </Text>

            <View className="flex-row items-center justify-between px-4 py-4 mb-2 border border-gray-200 bg-gray-50 rounded-2xl">
              <Text
                className="flex-1 text-2xl font-extrabold tracking-widest text-center text-gray-900"
                selectable
              >
                {invitationId}
              </Text>
              <TouchableOpacity
                onPress={handleCopy}
                activeOpacity={0.7}
                className="p-2 ml-3"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </TouchableOpacity>
            </View>

            {copied && (
              <Text className="mb-1 text-xs font-semibold text-center text-green-600">
                Copied to clipboard!
              </Text>
            )}

            <Text className="mt-2 mb-6 text-xs leading-5 text-center text-gray-400">
              Keep this ID safe. Team members will need it to create their
              accounts and join your business.
            </Text>

            {/* Continue button */}
            <TouchableOpacity
              className="items-center justify-center bg-blue-600 h-14 rounded-2xl"
              onPress={onContinue}
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-[17px]">
                Continue to App
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export default function RegisterBusiness() {
  const { registerOwner } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<BusinessErrors>({});
  const [loading, setLoading] = useState(false);
  const [invitationId, setInvitationId] = useState<string | null>(null);

  const handleRegister = async () => {
    const errs = validate(companyName, name, phone, password, confirmPassword);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const data: RegisterOwnerData = {
      accountType: "business",
      name,
      companyName,
      phone,
      password,
    };

    const result = await registerOwner(data);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Registration Failed", result.error);
    } else {
      // Show modal with invitation ID before navigating
      setInvitationId(result.invitationId ?? "");
    }
  };

  const handleContinue = () => {
    setInvitationId(null);
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Invitation ID modal — shown after successful registration */}
      {invitationId !== null && (
        <InvitationModal
          invitationId={invitationId}
          onContinue={handleContinue}
        />
      )}

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
          placeholder="Brave Systems"
          value={companyName}
          onChangeText={setCompanyName}
          autoCapitalize="words"
          error={errors.companyName}
        />
        <AuthInput
          label="Your Name"
          placeholder="Nahom"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          error={errors.name}
        />
        <AuthInput
          label="Phone Number"
          placeholder="0911223344"
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
