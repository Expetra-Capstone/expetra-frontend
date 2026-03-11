import React from "react";
import { Text, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";

const GoogleLogo: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path
      fill="#FFC107"
      d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.6-7.9 19.6-20 0-1.3-.1-2.7-.4-4z"
    />
    <Path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <Path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.5 26.9 36 24 36c-5.3 0-9.7-2.9-11.3-7.1l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
    />
    <Path
      fill="#1976D2"
      d="M43.6 20H24v8h11.3c-.8 2.3-2.4 4.2-4.5 5.5l6.2 5.2C40.6 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"
    />
  </Svg>
);

interface GoogleButtonProps {
  onPress?: () => void;
}

const GoogleButton: React.FC<GoogleButtonProps> = ({ onPress }) => (
  <TouchableOpacity
    className="flex-row items-center justify-center gap-3 bg-white border border-gray-200 h-14 rounded-2xl"
    onPress={onPress}
    activeOpacity={0.8}
  >
    <GoogleLogo />
    <Text className="text-gray-700 font-semibold text-[15px]">
      Sign in with Google
    </Text>
  </TouchableOpacity>
);

export default GoogleButton;
