import { ONBOARDING_STORAGE_KEY } from "@/constants/onboarding";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { EditUser02Icon } from "hugeicons-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import * as api from "../../services/apiService";

// ─── ICONS ────────────────────────────────────────────────────────────────────
const CopyIcon: React.FC<{ color?: string }> = ({ color = "#2563EB" }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
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
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17l-5-5"
      stroke="#16A34A"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── REUSABLE ROW ─────────────────────────────────────────────────────────────
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
    <View
      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${iconBg}`}
    >
      <Text className="text-lg">{icon}</Text>
    </View>
    <View className="flex-1">
      <Text className="text-sm font-semibold text-gray-800">{title}</Text>
      {subtitle ? (
        <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
      ) : null}
    </View>
    {rightElement ?? <Text className="text-lg text-gray-300">›</Text>}
  </View>
);

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
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

// ─── COPYABLE INVITATION ID ───────────────────────────────────────────────────
const InvitationIdRow: React.FC<{ invitationId: string; isLast?: boolean }> = ({
  invitationId,
  isLast = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(invitationId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <View
      className={`flex-row items-center px-4 py-3 ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <View className="items-center justify-center w-10 h-10 mr-3 bg-yellow-100 rounded-full">
        <Text className="text-lg">🔑</Text>
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-800">
          Invitation ID
        </Text>
        <Text className="text-xs text-gray-400 mt-0.5" selectable>
          {invitationId}
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleCopy}
        activeOpacity={0.7}
        className="flex-row items-center gap-1 px-3 py-1.5 border rounded-xl border-blue-200 bg-blue-50"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <Text
          className={`text-xs font-semibold ml-1 ${
            copied ? "text-green-600" : "text-blue-600"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── SKELETON LOADER ──────────────────────────────────────────────────────────
const SkeletonBlock: React.FC<{ w?: string; h?: string; rounded?: string }> = ({
  w = "w-full",
  h = "h-4",
  rounded = "rounded-lg",
}) => <View className={`${w} ${h} ${rounded} bg-gray-200 animate-pulse`} />;

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const { user, token, role, logout } = useAuth();
  const router = useRouter();

  // Live profile data fetched from /owners/me
  const [ownerProfile, setOwnerProfile] = useState<api.OwnerResponse | null>(
    null,
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [biometric, setBiometric] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  // ── Fetch owner profile ──────────────────────────────────────────────────
  const fetchOwnerProfile = useCallback(
    async (silent = false) => {
      if (!token || role !== "owner") return;
      if (!silent) setProfileLoading(true);
      const result = await api.getOwnerProfile(token);
      if (!silent) setProfileLoading(false);
      if (!result.error) setOwnerProfile(result.data);
    },
    [token, role],
  );

  useEffect(() => {
    fetchOwnerProfile();
  }, [fetchOwnerProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOwnerProfile(true);
    setRefreshing(false);
  }, [fetchOwnerProfile]);

  // ── Derived display values ────────────────────────────────────────────────
  // For owners use the freshly-fetched profile; fall back to context user
  const isOwner = role === "owner";

  const displayName = isOwner
    ? (ownerProfile?.owner.owner_name ?? user?.name ?? "—")
    : (user?.name ?? "—");

  const displayPhone = isOwner
    ? (ownerProfile?.owner.phone ?? user?.phone ?? "—")
    : (user?.phone ?? "—");

  const displayCompany = isOwner
    ? (ownerProfile?.owner.company_name ?? user?.companyName ?? "—")
    : (user?.business?.name ?? "—");

  const displayBusinessId = isOwner
    ? (ownerProfile?.business.id?.toString() ?? "—")
    : (user?.business?.id?.toString() ?? "—");

  const displayBusinessName = isOwner
    ? (ownerProfile?.business.name ?? user?.business?.name ?? "—")
    : (user?.business?.name ?? "—");

  const displayInvitationId = isOwner
    ? (ownerProfile?.business.invitation_id ??
      user?.business?.invitation_id ??
      "")
    : "";

  // ── Handlers ──────────────────────────────────────────────────────────────
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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <ScrollView
        className="flex-1 bg-gray-100"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar skeleton */}
        <View className="items-center gap-3 py-6">
          <View className="w-24 h-24 bg-gray-200 rounded-full" />
          <SkeletonBlock w="w-40" h="h-5" />
          <SkeletonBlock w="w-28" h="h-3" />
        </View>
        <View className="gap-3 mx-4">
          <SkeletonBlock h="h-16" rounded="rounded-2xl" />
          <SkeletonBlock h="h-32" rounded="rounded-2xl" />
          <SkeletonBlock h="h-24" rounded="rounded-2xl" />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* ── Avatar + name ────────────────────────────────────────────────── */}
      <View className="items-center py-6 bg-gray-100">
        <View className="relative">
          <Image
            source={{ uri: `https://i.pravatar.cc/150?u=${user?.id ?? 1}` }}
            className="w-24 h-24 border-4 border-white rounded-full shadow"
          />
          <View className="absolute bottom-0 right-0 items-center justify-center w-8 h-8 bg-blue-600 border-2 border-white rounded-full">
            <EditUser02Icon size={13} color="#ffffff" />
          </View>
        </View>

        <Text className="mt-3 text-xl font-bold text-gray-900">
          {displayName}
        </Text>
        <Text className="text-sm text-gray-400">{displayPhone}</Text>

        {/* Role badge */}
        <View
          className={`flex-row items-center px-3 py-1 mt-2 border rounded-full ${
            isOwner
              ? "border-blue-200 bg-blue-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <Text className="mr-1 text-xs">{isOwner ? "🏢" : "👤"}</Text>
          <Text
            className={`text-xs font-semibold tracking-wide ${
              isOwner ? "text-blue-600" : "text-green-600"
            }`}
          >
            {isOwner ? "BUSINESS OWNER" : "TEAM MEMBER"}
          </Text>
        </View>
      </View>

      {/* ── Personal Information ──────────────────────────────────────────── */}
      <Section title="Personal Information">
        <Row
          icon="👤"
          iconBg="bg-blue-100"
          title="Full Name"
          subtitle={displayName}
          rightElement={<View />}
        />
        <Row
          icon="📞"
          iconBg="bg-green-100"
          title="Phone Number"
          subtitle={displayPhone}
          rightElement={<View />}
          isLast
        />
      </Section>

      {/* ── Business / Company ────────────────────────────────────────────── */}
      <Section title={isOwner ? "My Business" : "My Company"}>
        <Row
          icon="🏢"
          iconBg="bg-purple-100"
          title="Company Name"
          subtitle={displayCompany}
          rightElement={<View />}
        />
        <Row
          icon="🆔"
          iconBg="bg-indigo-100"
          title="Business ID"
          subtitle={`#${displayBusinessId}`}
          rightElement={<View />}
        />
        {isOwner ? (
          <InvitationIdRow invitationId={displayInvitationId} isLast />
        ) : (
          <Row
            icon="🏷️"
            iconBg="bg-teal-100"
            title="Business Name"
            subtitle={displayBusinessName}
            rightElement={<View />}
            isLast
          />
        )}
      </Section>

      {/* ── Account ───────────────────────────────────────────────────────── */}
      <Section title="Account">
        <Row
          icon="🔒"
          iconBg="bg-orange-100"
          title="Account Type"
          subtitle={isOwner ? "Owner Account" : "Employee Account"}
          rightElement={<View />}
        />
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
          subtitle="Linked accounts"
          isLast
        />
      </Section>

      {/* ── Security ──────────────────────────────────────────────────────── */}
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

      {/* ── Preferences ───────────────────────────────────────────────────── */}
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

      {/* ── Support & Legal ───────────────────────────────────────────────── */}
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

      {/* ── Logout ────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        className="items-center py-4 mx-4 mb-4"
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
        <Text className="text-sm font-semibold text-gray-400">
          View Onboarding
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default Profile;
