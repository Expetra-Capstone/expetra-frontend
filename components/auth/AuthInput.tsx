import React, { useState } from "react";
import {
  KeyboardTypeOptions,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface AuthInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
}

const EyeOpenIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      stroke="#9CA3AF"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
    />
    <Circle
      cx="12"
      cy="12"
      r="3"
      stroke="#9CA3AF"
      strokeWidth="1.8"
      fill="none"
    />
  </Svg>
);

const EyeOffIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
      stroke="#9CA3AF"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

const AuthInput: React.FC<AuthInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  error,
}) => {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-800 mb-1.5">
        {label}
      </Text>
      <View
        className={`flex-row items-center h-14 px-4 rounded-2xl border bg-white ${
          error
            ? "border-red-400"
            : focused
              ? "border-blue-500"
              : "border-gray-200"
        }`}
      >
        <TextInput
          className="flex-1 text-gray-900 text-[15px]"
          placeholder={placeholder}
          placeholderTextColor="#999999"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !visible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            className="ml-2"
          >
            {visible ? <EyeOpenIcon /> : <EyeOffIcon />}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text className="mt-1 ml-1 text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
};

export default AuthInput;
