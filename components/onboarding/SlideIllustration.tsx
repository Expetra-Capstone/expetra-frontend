import { IllustrationKey } from "@/constants/onboarding";
import React from "react";
import Svg, {
    Circle,
    Defs,
    Line,
    LinearGradient,
    Path,
    Rect,
    Stop
} from "react-native-svg";

interface SlideIllustrationProps {
  type: IllustrationKey;
  size?: number;
}

// ─── SLIDE 1: WALLET (unchanged — already blue) ───────────────────────────────
const WalletIllustration: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 240 240">
    <Defs>
      <LinearGradient id="cardGrad1" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#3B82F6" />
        <Stop offset="100%" stopColor="#1D4ED8" />
      </LinearGradient>
    </Defs>

    {/* Phone body */}
    <Rect x="60" y="30" width="115" height="185" rx="20" fill="#1E3A8A" />
    {/* Screen */}
    <Rect x="68" y="48" width="99" height="152" rx="12" fill="#EFF6FF" />
    {/* Notch */}
    <Rect x="98" y="36" width="40" height="8" rx="4" fill="#172554" />

    {/* Card */}
    <Rect x="75" y="56" width="85" height="52" rx="10" fill="url(#cardGrad1)" />
    {/* Chip */}
    <Rect x="83" y="68" width="16" height="12" rx="3" fill="#FBBF24" />
    <Line x1="91" y1="68" x2="91" y2="80" stroke="#F59E0B" strokeWidth="1.2" />
    <Line x1="83" y1="74" x2="99" y2="74" stroke="#F59E0B" strokeWidth="1.2" />
    {/* Card dots */}
    <Circle cx="118" cy="96" r="3" fill="white" opacity="0.8" />
    <Circle cx="126" cy="96" r="3" fill="white" opacity="0.8" />
    <Circle cx="134" cy="96" r="3" fill="white" opacity="0.8" />
    <Circle cx="142" cy="96" r="3" fill="white" opacity="0.8" />

    {/* Transaction Row 1 */}
    <Rect x="75" y="116" width="85" height="22" rx="6" fill="white" />
    <Rect x="80" y="121" width="12" height="12" rx="3" fill="#DBEAFE" />
    <Path
      d="M86 124 L89 127 L93 121"
      stroke="#2563EB"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Rect x="96" y="123" width="28" height="3" rx="1.5" fill="#D1D5DB" />
    <Rect x="96" y="129" width="18" height="2" rx="1" fill="#E5E7EB" />
    <Rect x="142" y="123" width="14" height="5" rx="2" fill="#DBEAFE" />

    {/* Transaction Row 2 */}
    <Rect x="75" y="142" width="85" height="22" rx="6" fill="white" />
    <Rect x="80" y="147" width="12" height="12" rx="3" fill="#DBEAFE" />
    <Circle cx="86" cy="153" r="3" fill="#3B82F6" />
    <Rect x="96" y="149" width="24" height="3" rx="1.5" fill="#D1D5DB" />
    <Rect x="96" y="155" width="16" height="2" rx="1" fill="#E5E7EB" />
    <Rect x="142" y="149" width="14" height="5" rx="2" fill="#DBEAFE" />

    {/* Transaction Row 3 */}
    <Rect x="75" y="168" width="85" height="22" rx="6" fill="white" />
    <Rect x="80" y="173" width="12" height="12" rx="3" fill="#DBEAFE" />
    <Rect x="83" y="176" width="6" height="6" rx="1" fill="#2563EB" />
    <Rect x="96" y="175" width="26" height="3" rx="1.5" fill="#D1D5DB" />
    <Rect x="96" y="181" width="20" height="2" rx="1" fill="#E5E7EB" />
    <Rect x="142" y="175" width="14" height="5" rx="2" fill="#DBEAFE" />

    {/* Floating gold coin */}
    <Circle cx="42" cy="72" r="20" fill="#FCD34D" />
    <Circle cx="42" cy="72" r="16" fill="#F59E0B" />
    <Rect x="39" y="64" width="6" height="16" rx="1.5" fill="#FCD34D" />
    <Rect x="36" y="67" width="12" height="2" rx="1" fill="#FCD34D" />
    <Rect x="36" y="71" width="12" height="2" rx="1" fill="#FCD34D" />

    {/* Floating check badge */}
    <Circle cx="200" cy="145" r="16" fill="#DBEAFE" />
    <Path
      d="M193 145 L198 150 L207 140"
      stroke="#2563EB"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// ─── SLIDE 2: ANALYTICS (repainted — all blue) ────────────────────────────────
const AnalyticsIllustration: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 240 240">
    <Defs>
      <LinearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
        <Stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
      </LinearGradient>
    </Defs>

    {/* Background circle */}
    <Circle cx="120" cy="120" r="95" fill="#DBEAFE" />

    {/* Chart card */}
    <Rect x="30" y="50" width="180" height="145" rx="18" fill="white" />

    {/* Card header dots */}
    <Circle cx="50" cy="68" r="5" fill="#DBEAFE" />
    <Circle cx="63" cy="68" r="5" fill="#DBEAFE" />
    <Rect x="150" y="62" width="40" height="12" rx="6" fill="#DBEAFE" />

    {/* Trend line — blue */}
    <Path
      d="M46 105 C60 105 65 82 80 82 C95 82 100 115 115 115 C130 115 135 88 150 80 C165 72 170 65 185 58"
      stroke="#2563EB"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Area fill under line */}
    <Path
      d="M46 105 C60 105 65 82 80 82 C95 82 100 115 115 115 C130 115 135 88 150 80 C165 72 170 65 185 58 L185 115 L46 115 Z"
      fill="url(#blueAreaGrad)"
    />
    {/* Dot on line */}
    <Circle
      cx="150"
      cy="80"
      r="5"
      fill="white"
      stroke="#2563EB"
      strokeWidth="2.5"
    />

    {/* Separator */}
    <Line
      x1="40"
      y1="122"
      x2="200"
      y2="122"
      stroke="#F3F4F6"
      strokeWidth="1.5"
    />

    {/* Bar chart — four blue shades */}
    {/* Bar 1 */}
    <Rect x="55" y="148" width="22" height="28" rx="5" fill="#1D4ED8" />
    <Rect x="55" y="138" width="22" height="12" rx="5" fill="#BFDBFE" />

    {/* Bar 2 */}
    <Rect x="90" y="155" width="22" height="21" rx="5" fill="#2563EB" />
    <Rect x="90" y="148" width="22" height="9" rx="5" fill="#BFDBFE" />

    {/* Bar 3 — tallest */}
    <Rect x="125" y="143" width="22" height="33" rx="5" fill="#3B82F6" />
    <Rect x="125" y="133" width="22" height="12" rx="5" fill="#BFDBFE" />

    {/* Bar 4 */}
    <Rect x="160" y="150" width="22" height="26" rx="5" fill="#60A5FA" />
    <Rect x="160" y="143" width="22" height="9" rx="5" fill="#BFDBFE" />

    {/* Floating top-right badge — blue */}
    <Rect x="172" y="38" width="56" height="28" rx="10" fill="#2563EB" />
    <Circle cx="183" cy="52" r="6" fill="white" opacity="0.2" />
    <Path
      d="M180 52 L183 55 L188 48"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Rect
      x="192"
      y="48"
      width="28"
      height="4"
      rx="2"
      fill="white"
      opacity="0.6"
    />
    <Rect
      x="192"
      y="55"
      width="20"
      height="3"
      rx="1.5"
      fill="white"
      opacity="0.4"
    />

    {/* Floating left badge — light blue */}
    <Rect x="12" y="130" width="48" height="28" rx="10" fill="#DBEAFE" />
    <Rect
      x="20"
      y="138"
      width="30"
      height="4"
      rx="2"
      fill="#2563EB"
      opacity="0.5"
    />
    <Rect
      x="20"
      y="145"
      width="20"
      height="3"
      rx="1.5"
      fill="#2563EB"
      opacity="0.3"
    />
  </Svg>
);

// ─── SLIDE 3: GOALS (repainted — all blue) ────────────────────────────────────
const GoalsIllustration: React.FC<{ size: number }> = ({ size }) => (
  <Svg width={size} height={size} viewBox="0 0 240 240">
    {/* Outer ring track — light blue */}
    <Circle
      cx="120"
      cy="115"
      r="80"
      fill="none"
      stroke="#BFDBFE"
      strokeWidth="14"
    />
    {/* Progress arc ~85% — blue */}
    <Circle
      cx="120"
      cy="115"
      r="80"
      fill="none"
      stroke="#2563EB"
      strokeWidth="14"
      strokeLinecap="round"
      strokeDasharray="428"
      strokeDashoffset="64"
      transform="rotate(-90 120 115)"
    />

    {/* Inner white circle */}
    <Circle cx="120" cy="115" r="62" fill="white" />

    {/* Trophy body — keep gold, it reads as "achievement" */}
    <Rect x="100" y="100" width="40" height="36" rx="8" fill="#FCD34D" />
    {/* Trophy base */}
    <Rect x="108" y="136" width="24" height="8" rx="3" fill="#F59E0B" />
    <Rect x="104" y="144" width="32" height="6" rx="3" fill="#F59E0B" />
    {/* Trophy handles */}
    <Path
      d="M100 108 Q88 108 88 118 Q88 128 100 128"
      stroke="#F59E0B"
      strokeWidth="5"
      fill="none"
      strokeLinecap="round"
    />
    <Path
      d="M140 108 Q152 108 152 118 Q152 128 140 128"
      stroke="#F59E0B"
      strokeWidth="5"
      fill="none"
      strokeLinecap="round"
    />
    {/* Star on trophy */}
    <Path
      d="M120 108 L122.5 115 L130 115 L124 119 L126.5 126 L120 122 L113.5 126 L116 119 L110 115 L117.5 115 Z"
      fill="#FEF08A"
    />

    {/* Percentage badge — blue */}
    <Circle cx="182" cy="65" r="22" fill="#2563EB" />
    <Rect
      x="170"
      y="60"
      width="24"
      height="5"
      rx="2.5"
      fill="white"
      opacity="0.9"
    />
    <Rect
      x="173"
      y="68"
      width="18"
      height="4"
      rx="2"
      fill="white"
      opacity="0.7"
    />

    {/* Sparkles — blue palette */}
    {/* Top-left sparkle */}
    <Path
      d="M48 72 L50 66 L52 72 L58 74 L52 76 L50 82 L48 76 L42 74 Z"
      fill="#93C5FD"
    />
    {/* Bottom-right sparkle */}
    <Path
      d="M186 155 L187.5 150 L189 155 L194 156.5 L189 158 L187.5 163 L186 158 L181 156.5 Z"
      fill="#BFDBFE"
    />
    {/* Dot sparkles */}
    <Circle cx="58" cy="150" r="4" fill="#DBEAFE" />
    <Circle cx="175" cy="42" r="3" fill="#93C5FD" />
    <Circle cx="35" cy="100" r="3" fill="#BFDBFE" />
    <Circle cx="205" cy="115" r="5" fill="#DBEAFE" />

    {/* Floating coin — keep gold for "wealth" feel */}
    <Circle cx="48" cy="168" r="12" fill="#FCD34D" />
    <Circle cx="48" cy="168" r="9" fill="#F59E0B" />
    <Rect x="45" y="162" width="6" height="12" rx="1.2" fill="#FCD34D" />
  </Svg>
);

// ─── EXPORTED SWITCHER ────────────────────────────────────────────────────────
const SlideIllustration: React.FC<SlideIllustrationProps> = ({
  type,
  size = 240,
}) => {
  switch (type) {
    case "wallet":
      return <WalletIllustration size={size} />;
    case "analytics":
      return <AnalyticsIllustration size={size} />;
    case "goals":
      return <GoalsIllustration size={size} />;
  }
};

export default SlideIllustration;
