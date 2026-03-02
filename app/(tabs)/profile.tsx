import { ONBOARDING_STORAGE_KEY } from "@/constants/onboarding";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { EditUser02Icon } from "hugeicons-react-native";
import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Icon placeholders ───────────────────────────────────────────────────────
// Replace these with your preferred icon library (e.g. react-native-vector-icons
// or @expo/vector-icons).  We use simple emoji fallbacks so the file is
// self-contained and runnable without extra dependencies.
const Icon = ({ label }: { label: string }) => (
  <Text className="text-lg">{label}</Text>
);

// ─── Reusable row components ─────────────────────────────────────────────────

interface RowProps {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  rightElement?: React.ReactNode;
  isLast?: boolean;
}

const Row: React.FC<RowProps> = ({
  icon,
  iconBg,
  title,
  subtitle,
  rightElement,
  isLast = false,
}) => (
  <View
    className={`flex-row items-center px-4 py-3 ${
      !isLast ? "border-b border-gray-100" : ""
    }`}
  >
    {/* Icon bubble */}
    <View
      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${iconBg}`}
    >
      <Icon label={icon} />
    </View>

    {/* Labels */}
    <View className="flex-1">
      <Text className="text-sm font-semibold text-gray-800">{title}</Text>
      <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
    </View>

    {/* Right element – chevron or toggle */}
    {rightElement ?? <Text className="text-lg text-gray-300">›</Text>}
  </View>
);

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View className="mb-5">
    <Text className="px-4 mb-2 text-xs font-semibold tracking-widest text-gray-400 uppercase">
      {title}
    </Text>
    <View className="mx-4 overflow-hidden bg-white shadow-sm rounded-2xl">
      {children}
    </View>
  </View>
);

// ─── Main screen ─────────────────────────────────────────────────────────────

const Profile: React.FC = () => {
  const [biometric, setBiometric] = React.useState(true);
  const [twoFactor, setTwoFactor] = React.useState(false);

  const { logout } = useAuth();

  const router = useRouter();

  const handleOnBoarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    router.push("/(onboarding)");
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)");
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar + name ── */}
      <View className="items-center py-6 bg-gray-100">
        <View className="relative">
          <Image
            source={{ uri: "https://i.pravatar.cc/150?img=12" }}
            className="w-24 h-24 border-4 border-white rounded-full shadow"
          />
          {/* Blue badge */}
          <View className="absolute bottom-0 right-0 items-center justify-center w-8 h-8 bg-blue-600 border-2 border-white rounded-full">
            <EditUser02Icon size={13} color="#ffffff" />
          </View>
        </View>

        <Text className="mt-3 text-xl font-bold text-gray-900">
          Jonathan Doe
        </Text>
        <Text className="text-sm text-gray-400">jonathan.doe@fintech.com</Text>

        {/* Premium badge */}
        <View className="flex-row items-center px-3 py-1 mt-2 border border-blue-200 rounded-full bg-blue-50">
          <Text className="mr-1 text-xs text-blue-500">🔒</Text>
          <Text className="text-xs font-semibold tracking-wide text-blue-600">
            PREMIUM MEMBER
          </Text>
        </View>
      </View>

      {/* ── Security score card ── */}
      <View className="px-5 py-4 mx-4 mb-5 bg-white shadow-sm rounded-2xl">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm font-semibold text-gray-800">
            Profile Security Score
          </Text>
          <Text className="text-sm font-bold text-blue-600">85%</Text>
        </View>
        {/* Progress bar */}
        <View className="h-2 overflow-hidden bg-gray-200 rounded-full">
          <View className="h-2 bg-blue-600 rounded-full w-[85%]" />
        </View>
      </View>

      {/* ── Personal Information ── */}
      <Section title="Personal Information">
        <Row
          icon="👤"
          iconBg="bg-blue-100"
          title="Full Name"
          subtitle="Jonathan Doe"
        />
        <Row
          icon="📞"
          iconBg="bg-green-100"
          title="Phone Number"
          subtitle="+1 (555) 012-3456"
        />
        <Row
          icon="📍"
          iconBg="bg-purple-100"
          title="Residential Address"
          subtitle="123 Finance St, New York, NY"
          isLast
        />
      </Section>

      {/* ── Account & Wealth ── */}
      <Section title="Account & Wealth">
        <Row
          icon="💳"
          iconBg="bg-orange-100"
          title="Manage Cards"
          subtitle="2 Active cards"
        />
        <Row
          icon="🏦"
          iconBg="bg-teal-100"
          title="Bank Accounts"
          subtitle="Chase & Bank of America linked"
          isLast
        />
      </Section>

      {/* ── Security ── */}
      <Section title="Security">
        <Row
          icon="🔴"
          iconBg="bg-red-100"
          title="Biometric Login"
          subtitle="FaceID or TouchID"
          rightElement={
            <Switch
              value={biometric}
              onValueChange={setBiometric}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor="#fff"
            />
          }
        />
        <Row
          icon="🔄"
          iconBg="bg-gray-100"
          title="Change PIN"
          subtitle="Last changed 3 months ago"
        />
        <Row
          icon="🛡️"
          iconBg="bg-blue-50"
          title="Two-Factor Auth"
          subtitle="Highly recommended"
          rightElement={
            <Switch
              value={twoFactor}
              onValueChange={setTwoFactor}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor="#fff"
            />
          }
          isLast
        />
      </Section>

      {/* ── Preferences ── */}
      <Section title="Preferences">
        <Row
          icon="🔔"
          iconBg="bg-red-100"
          title="Notifications"
          subtitle="Push, Email, SMS"
        />
        <Row
          icon="🌐"
          iconBg="bg-blue-100"
          title="Language"
          subtitle="English (US)"
          isLast
        />
      </Section>

      {/* ── Support & Legal ── */}
      <Section title="Support & Legal">
        <Row icon="❓" iconBg="bg-gray-200" title="FAQ & Support" subtitle="" />
        <Row
          icon="📄"
          iconBg="bg-gray-200"
          title="Privacy Policy & Terms"
          subtitle=""
          isLast
        />
      </Section>

      {/* ── Logout ── */}
      <TouchableOpacity
        className="items-center py-4 mx-4 mb-28"
        onPress={handleLogout}
      >
        <Text className="text-sm font-semibold text-red-500">
          ⬡ Logout Account
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="items-center py-4 mx-4 mb-28"
        onPress={handleOnBoarding}
      >
        <Text className="text-sm font-semibold text-red-500">
          see Onboarding
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Profile;
