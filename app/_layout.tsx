import { ONBOARDING_STORAGE_KEY } from "@/constants/onboarding";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import "./global.css";

export default function RootLayout() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((value) => {
      setHasOnboarded(value === "true");
    });
  }, []);

  // Hold a blank white screen while AsyncStorage resolves
  // (keeps the splash screen feeling seamless)
  if (hasOnboarded === null) {
    return <View className="flex-1 bg-white" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="dark-content" />
        <View className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
            }}
          >
            {!hasOnboarded && (
              <Stack.Screen
                name="(onboarding)"
                options={{ gestureEnabled: false }}
              />
            )}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
