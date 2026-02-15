import Navbar from "@/components/Navbar";
import { icons } from "@/constants/icons";
import { Tabs } from "expo-router";
import { Image, ImageStyle, Platform, Text, View } from "react-native";

interface TabIconProps {
  focused: boolean;
  icon: any;
  title: string;
}

function TabIcon({ focused, icon, title }: TabIconProps) {
  return (
    <View className="items-center justify-center pt-5">
      <Image
        source={icon}
        style={
          {
            width: 24,
            height: 24,
            tintColor: focused ? "#1152D4" : "#6B7280",
          } as ImageStyle
        }
        resizeMode="contain"
      />
      <Text
        className={`text-xs mt-1 ${
          focused ? "text-accent font-semibold" : "text-gray-500"
        }`}
      >
        {title}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <>
      <Navbar />
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#ffffff",
            borderTopWidth: 0,
            height: Platform.OS === "ios" ? 60 : 65,
            paddingBottom: Platform.OS === "ios" ? 20 : 10,
            paddingTop: 8,
            position: "absolute",
            elevation: 0,
            shadowOpacity: 0,
          },
          headerShown: false,
          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: "#6B7280",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={icons.home} title="Home" />
            ),
          }}
        />

        <Tabs.Screen
          name="camera"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={icons.add} title="Add" />
            ),
          }}
        />

        <Tabs.Screen
          name="history"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={icons.history} title="History" />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={icons.account} title="Profile" />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
