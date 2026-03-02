import { Stack } from "expo-router";
import { StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import "./global.css";

export default function RootLayout() {
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
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
