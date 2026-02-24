import Navbar from "@/components/Navbar";
import { Tabs } from "expo-router";
import { Platform, Text, View } from "react-native";

import {
  Analytics01Icon,
  Clock04Icon,
  Home01Icon,
  QrCode01Icon,
  UserIcon,
} from "hugeicons-react-native";

interface TabIconProps {
  focused: boolean;
  title: string;
  IconComponent: any;
}

function TabIcon({ focused, title, IconComponent }: TabIconProps) {
  return (
    <View className="items-center justify-center w-16 mt-7">
      <IconComponent
        size={22}
        color={focused ? "#1152D4" : "#9CA3AF"}
        strokeWidth={focused ? 2.5 : 2.0}
        absoluteStrokeWidth
      />
      <Text
        numberOfLines={1}
        className={`text-[10px] mt-1 text-center w-full ${
          focused ? "text-[#1152D4]" : "text-gray-400"
        }`}
      >
        {title}
      </Text>
    </View>
  );
}

function CenterTabIcon() {
  return (
    <View
      className="items-center justify-center w-16"
      style={{ marginTop: 10 }}
    >
      <View className="w-20 h-20 rounded-full bg-[#1152D4] items-center justify-center">
        <QrCode01Icon size={33} color="#ffffff" variant="stroke" />
      </View>
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
            height: Platform.OS === "ios" ? 72 : 72,
            paddingBottom: 0,
            paddingTop: 0,
            position: "absolute",
            elevation: 0,
            shadowOpacity: 0,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                title="Home"
                IconComponent={Home01Icon}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="history"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                title="History"
                IconComponent={Clock04Icon}
              />
            ),
          }}
        />

        {/* Center elevated QR/Scan button */}
        <Tabs.Screen
          name="camera"
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => <CenterTabIcon />,
          }}
        />

        <Tabs.Screen
          name="analytics"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                title="Analytics"
                IconComponent={Analytics01Icon}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                title="Profile"
                IconComponent={UserIcon}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
