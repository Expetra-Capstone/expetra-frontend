// app/index.tsx

import { ONBOARDING_STORAGE_KEY } from "@/constants/onboarding";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function Index() {
  const { user, isLoading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((v) =>
      setOnboarded(v === "true"),
    );
  }, []);

  // Hold a blank screen while both checks resolve
  if (isLoading || onboarded === null) {
    return <View className="flex-1 bg-white" />;
  }

  if (!onboarded) return <Redirect href="/(onboarding)" />;
  if (!user) return <Redirect href="/(auth)" />;
  return <Redirect href="/(tabs)" />;
}
