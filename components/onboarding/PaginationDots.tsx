import React from "react";
import { View } from "react-native";

interface PaginationDotsProps {
  total: number;
  current: number;
  activeColor?: string;
}

const PaginationDots: React.FC<PaginationDotsProps> = ({
  total,
  current,
  activeColor = "#2563EB",
}) => {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        return (
          <View
            key={i}
            className="h-2 rounded-full"
            style={{
              width: isActive ? 24 : 8,
              backgroundColor: isActive ? activeColor : "#D1D5DB",
            }}
          />
        );
      })}
    </View>
  );
};

export default PaginationDots;
