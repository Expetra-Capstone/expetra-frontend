import { DailyDataPoint } from "@/utils/analyticsData";
import React from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface DailyComparisonChartProps {
  /**
   * Last 5 calendar days of aggregated transaction totals.
   * Produced by `computeAnalytics().dailyComparison`.
   */
  data: DailyDataPoint[];
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CHART_H = 110;
const H_PADDING = 64;
const BAR_W = 22;
const RADIUS = 6;

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const DailyComparisonChart: React.FC<DailyComparisonChartProps> = ({
  data,
}) => {
  const { width } = useWindowDimensions();
  const W = width - H_PADDING;
  const colW = W / data.length;

  return (
    <View className="mt-3">
      <Svg width={W} height={CHART_H}>
        {data.map((d: DailyDataPoint, i: number) => {
          const cx = i * colW + colW / 2;
          const barH = (d.normalized / 100) * (CHART_H - 8);
          const barColor = d.isToday ? "#3B82F6" : "#D1D5DB";

          return (
            <Rect
              key={i}
              x={cx - BAR_W / 2}
              y={CHART_H - barH}
              width={BAR_W}
              height={barH}
              rx={RADIUS}
              fill={barColor}
            />
          );
        })}
      </Svg>

      {/* X-axis labels */}
      <View className="flex-row mt-2">
        {data.map((d: DailyDataPoint, i: number) => (
          <Text
            key={i}
            className={`flex-1 text-xs text-center font-medium ${
              d.isToday ? "text-blue-500" : "text-gray-400"
            }`}
          >
            {d.isToday ? "Today" : d.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default DailyComparisonChart;
