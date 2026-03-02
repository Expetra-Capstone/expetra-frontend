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
const H_PADDING = 64; // screen margins (16) + card padding (16) × 2
const LABELS = ["1 May", "8 May", "15 May", "22 May", "29 May"] as const;

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const SpendingTrendsChart: React.FC = () => {
  const { width } = useWindowDimensions();
  const W = width - H_PADDING;

  const points: Point[] = [
    { x: 0, y: CHART_H - 12 },
    { x: W * 0.1, y: CHART_H - 42 },
    { x: W * 0.22, y: CHART_H - 80 }, // first peak  ~8 May
    { x: W * 0.36, y: CHART_H - 55 },
    { x: W * 0.5, y: CHART_H - 22 }, // valley      ~15 May
    { x: W * 0.63, y: CHART_H - 38 },
    { x: W * 0.75, y: CHART_H - 68 }, // second peak ~22 May
    { x: W * 0.88, y: CHART_H - 88 },
    { x: W, y: CHART_H - 105 }, // rising      ~29 May
  ];

  const linePath = catmullRomToBezier(points);
  const areaPath = `${linePath} L ${W} ${CHART_H} L 0 ${CHART_H} Z`;

  const dot1 = points[2]; // ~8 May
  const dot2 = points[6]; // ~22 May

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

        {/* Peak dots */}
        <Circle
          cx={dot1.x}
          cy={dot1.y}
          r="5.5"
          fill="white"
          stroke="#2563EB"
          strokeWidth="2.5"
        />
        <Circle
          cx={dot2.x}
          cy={dot2.y}
          r="5.5"
          fill="white"
          stroke="#2563EB"
          strokeWidth="2.5"
        />
      </Svg>

      {/* X-axis labels */}
      <View className="flex-row justify-between mt-2">
        {LABELS.map((label) => (
          <Text key={label} className="text-[11px] text-gray-400">
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default SpendingTrendsChart;
