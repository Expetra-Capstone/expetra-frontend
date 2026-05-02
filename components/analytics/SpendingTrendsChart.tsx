import React from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Point {
  x: number;
  y: number;
}

interface SpendingTrendsChartProps {
  /**
   * 9 values in the range 0–100.
   * Produced by `computeAnalytics().spendTrend`.
   */
  trendPoints: number[];
  /**
   * 5 x-axis labels scoped to the active tab.
   * Produced by `buildTrendLabels(tab)`.
   */
  labels: string[];
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const catmullRomToBezier = (points: Point[]): string => {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x} ${p2.y}`;
  }
  return d;
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CHART_H = 130;
const H_PADDING = 64;
const V_PAD = 8; // top headroom so peaks don't clip

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const SpendingTrendsChart: React.FC<SpendingTrendsChartProps> = ({
  trendPoints,
  labels,
}) => {
  const { width } = useWindowDimensions();
  const W = width - H_PADDING;

  // Map each 0–100 value to an SVG (x, y) coordinate
  const points: Point[] = trendPoints.map((val, i) => ({
    x: (i / (trendPoints.length - 1)) * W,
    y: CHART_H - (val / 100) * (CHART_H - V_PAD),
  }));

  // Highlight the two highest data points with dots
  const dotIndices = [...trendPoints]
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map((d) => d.i)
    .sort((a, b) => a - b);

  const linePath = catmullRomToBezier(points);
  const areaPath = `${linePath} L ${W} ${CHART_H} L 0 ${CHART_H} Z`;

  return (
    <View className="mt-4">
      <Svg width={W} height={CHART_H + 4}>
        <Defs>
          <LinearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        <Path d={areaPath} fill="url(#spendGrad)" />

        {/* Trend line */}
        <Path
          d={linePath}
          stroke="#2563EB"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Peak highlight dots */}
        {dotIndices.map((idx) => (
          <Circle
            key={idx}
            cx={points[idx].x}
            cy={points[idx].y}
            r="5.5"
            fill="white"
            stroke="#2563EB"
            strokeWidth="2.5"
          />
        ))}
      </Svg>

      {/* X-axis labels (5 evenly distributed under 9 SVG points) */}
      <View className="flex-row justify-between mt-2">
        {labels.map((label) => (
          <Text key={label} className="text-[11px] text-gray-400">
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default SpendingTrendsChart;
