import React from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Svg, { G, Rect } from "react-native-svg";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface MonthDataPoint {
  income: number;
  expense: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May"] as const;
type Month = (typeof MONTHS)[number];

const CHART_DATA: MonthDataPoint[] = [
  { income: 70, expense: 50 },
  { income: 85, expense: 62 },
  { income: 60, expense: 72 },
  { income: 90, expense: 55 },
  { income: 78, expense: 68 },
];

const CHART_H = 110;
const MAX_VAL = 100;
const BAR_W = 10;
const BAR_GAP = 4;
const H_PADDING = 64;

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const IncomeExpensesChart: React.FC = () => {
  const { width } = useWindowDimensions();
  const W = width - H_PADDING;
  const colW = W / MONTHS.length;

  return (
    <View className="mt-3">
      <Svg width={W} height={CHART_H}>
        {CHART_DATA.map((d: MonthDataPoint, i: number) => {
          const cx = i * colW + colW / 2;
          const iH = (d.income / MAX_VAL) * (CHART_H - 8);
          const eH = (d.expense / MAX_VAL) * (CHART_H - 8);

          return (
            <G key={i}>
              {/* Income bar — blue */}
              <Rect
                x={cx - BAR_W - BAR_GAP}
                y={CHART_H - iH}
                width={BAR_W}
                height={iH}
                rx={4}
                fill="#3B82F6"
              />
              {/* Expense bar — gray */}
              <Rect
                x={cx + BAR_GAP}
                y={CHART_H - eH}
                width={BAR_W}
                height={eH}
                rx={4}
                fill="#D1D5DB"
              />
            </G>
          );
        })}
      </Svg>

      {/* X-axis labels */}
      <View className="flex-row mt-2">
        {MONTHS.map((m: Month) => (
          <Text key={m} className="flex-1 text-xs text-center text-gray-400">
            {m}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default IncomeExpensesChart;
