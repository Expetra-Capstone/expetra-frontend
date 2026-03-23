// app/_layout.tsx

import { ONBOARDING_STORAGE_KEY } from "@/constants/onboarding";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { startSmsListener } from "@/services/smsSync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { PermissionsAndroid, Platform, StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import "./global.css";

function GlobalSmsListener() {
  const { token } = useAuth();

  useEffect(() => {
    if (Platform.OS !== "android" || !token) return;

    let cleanup: (() => void) | null = null;

    async function init() {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      if (!granted) return;
      cleanup = startSmsListener(token, () => {});
    }

    init();

    return () => {
      cleanup?.();
    };
  }, [token]);

  return null;
}

// ─── INNER NAVIGATOR ──────────────────────────────────────────────────────────
// Must live inside <AuthProvider> so it can safely call useAuth().
function AppNavigator({ hasOnboarded }: { hasOnboarded: boolean }) {
  const { user, isLoading } = useAuth();

  // Wait for the auth session to be restored before making any routing decision
  if (isLoading) {
    return <View className="flex-1 bg-white" />;
  }

  const isAuthenticated = !!user;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "transparent" },
      }}
    >
      {/* Onboarding — only accessible before the user has completed it */}
      <Stack.Protected guard={!hasOnboarded}>
        <Stack.Screen name="(onboarding)" options={{ gestureEnabled: false }} />
      </Stack.Protected>

      {/* Auth — only accessible when onboarded but NOT logged in */}
      <Stack.Protected guard={hasOnboarded && !isAuthenticated}>
        <Stack.Screen
          name="(auth)"
          options={{ gestureEnabled: false }} // Prevents swipe-back into protected areas
        />
      </Stack.Protected>

      {/* Main app — ONLY accessible when onboarded AND authenticated */}
      <Stack.Protected guard={hasOnboarded && isAuthenticated}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* index is always accessible — it drives the initial redirect */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

// ─── ROOT LAYOUT ──────────────────────────────────────────────────────────────
export default function RootLayout() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((value) => {
      setHasOnboarded(value === "true");
    });
  }, []);

  // Hold a blank white screen while AsyncStorage resolves
  if (hasOnboarded === null) {
    return <View className="flex-1 bg-white" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="dark-content" />
        {/* AuthProvider wraps AppNavigator so useAuth works inside it */}
        <AuthProvider>
          <View className="flex-1">
            <GlobalSmsListener />
            <AppNavigator hasOnboarded={hasOnboarded} />
          </View>
        </AuthProvider>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
