import { useRouter } from "expo-router";
import { Settings01Icon } from "hugeicons-react-native";
import React from "react";
import {
    FlatList,
    SafeAreaView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────
type NotificationType = "transaction" | "reminder" | "system";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string; // "2 min ago"
  dateLabel: "Today" | "Earlier";
  unread: boolean;
  type: NotificationType;
}

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "Payment Successful",
    body: "You spent $2.01 at Awash Bank. Your balance has been updated.",
    time: "2 min ago",
    dateLabel: "Today",
    unread: true,
    type: "transaction",
  },
  {
    id: "2",
    title: "New Statement Available",
    body: "Your monthly statement for February 2026 is ready to download.",
    time: "30 min ago",
    dateLabel: "Today",
    unread: true,
    type: "system",
  },
  {
    id: "3",
    title: "Savings Goal Reached 🎉",
    body: "You just hit 80% of your ‘New Office Setup’ savings goal.",
    time: "Yesterday",
    dateLabel: "Earlier",
    unread: false,
    type: "reminder",
  },
  {
    id: "4",
    title: "Transfer Completed",
    body: "$420.00 was transferred to CBE from your Awash account.",
    time: "2 days ago",
    dateLabel: "Earlier",
    unread: false,
    type: "transaction",
  },
  {
    id: "5",
    title: "Security Tip",
    body: "Never share your OTP with anyone. Expetra will never ask for it.",
    time: "5 days ago",
    dateLabel: "Earlier",
    unread: false,
    type: "system",
  },
];

// ─── ICONS ────────────────────────────────────────────────────────────────────
const BackIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 6l-6 6 6 6"
      stroke="#111827"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BellDotIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3a5 5 0 00-5 5v3.5L6 14h12l-1-2.5V8a5 5 0 00-5-5z"
      stroke="#111827"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M10 18a2 2 0 004 0"
      stroke="#111827"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Circle cx={17.5} cy={6.5} r={3} fill="#EF4444" />
  </Svg>
);

const DotIcon: React.FC = () => (
  <Svg width={8} height={8} viewBox="0 0 8 8" fill="none">
    <Circle cx={4} cy={4} r={4} fill="#2563EB" />
  </Svg>
);

const TxIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect
      x={4}
      y={4}
      width={16}
      height={16}
      rx={4}
      stroke="#0EA5E9"
      strokeWidth={1.8}
      fill="#E0F2FE"
    />
    <Path
      d="M9 13l2 2 4-4"
      stroke="#0369A1"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ReminderIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={8} stroke="#10B981" strokeWidth={1.8} />
    <Path
      d="M12 8v4l2 2"
      stroke="#10B981"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SystemIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Rect
      x={3}
      y={5}
      width={18}
      height={14}
      rx={3}
      stroke="#6B7280"
      strokeWidth={1.8}
      fill="#F3F4F6"
    />
    <Path
      d="M3 10h18"
      stroke="#D1D5DB"
      strokeWidth={1.5}
      strokeLinecap="round"
    />
    <Circle cx={8} cy={8} r={1} fill="#F97316" />
    <Circle cx={11} cy={8} r={1} fill="#FACC15" />
    <Circle cx={14} cy={8} r={1} fill="#22C55E" />
  </Svg>
);

// ─── ITEM COMPONENT ───────────────────────────────────────────────────────────
interface RowProps {
  item: NotificationItem;
  isFirstInSection: boolean;
  sectionLabel?: "Today" | "Earlier";
}

const NotificationRow: React.FC<RowProps> = ({
  item,
  isFirstInSection,
  sectionLabel,
}) => {
  const renderLeadingIcon = () => {
    switch (item.type) {
      case "transaction":
        return <TxIcon />;
      case "reminder":
        return <ReminderIcon />;
      case "system":
      default:
        return <SystemIcon />;
    }
  };

  return (
    <View>
      {isFirstInSection && sectionLabel && (
        <Text className="mt-4 mb-2 text-xs font-semibold text-gray-400 uppercase">
          {sectionLabel}
        </Text>
      )}

      <View
        className={`flex-row items-center px-4 py-3 mb-2 rounded-2xl ${
          item.unread ? "bg-blue-50" : "bg-white"
        }`}
      >
        {/* Icon */}
        <View className="items-center justify-center w-10 h-10 mr-3 bg-white shadow-sm rounded-2xl">
          {renderLeadingIcon()}
        </View>

        {/* Text */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text
              className={`text-[14px] font-semibold ${
                item.unread ? "text-gray-900" : "text-gray-800"
              }`}
            >
              {item.title}
            </Text>
            <Text className="ml-2 text-[11px] text-gray-400">{item.time}</Text>
          </View>
          <Text
            className={`text-[13px] leading-snug ${
              item.unread ? "text-gray-700" : "text-gray-500"
            }`}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        </View>

        {/* Unread dot */}
        {item.unread && (
          <View className="ml-2">
            <DotIcon />
          </View>
        )}
      </View>
    </View>
  );
};

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const router = useRouter();

  const renderItem = ({
    item,
    index,
  }: {
    item: NotificationItem;
    index: number;
  }) => {
    const prev = index > 0 ? NOTIFICATIONS[index - 1] : undefined;
    const isFirstInSection = !prev || prev.dateLabel !== item.dateLabel;
    const sectionLabel = isFirstInSection ? item.dateLabel : undefined;

    return (
      <NotificationRow
        item={item}
        isFirstInSection={isFirstInSection}
        sectionLabel={sectionLabel}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-4">
        <TouchableOpacity
          className="items-center justify-center w-9 h-9"
          onPress={() => router.back()}
        >
          <BackIcon />
        </TouchableOpacity>
        <Text className="text-xl font-semibold text-gray-900">
          Notifications
        </Text>
        <TouchableOpacity className="items-center justify-center w-9 h-9">
          <Settings01Icon />
        </TouchableOpacity>
      </View>

      {/* List */}
      <View>
        <FlatList
          data={NOTIFICATIONS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Subheading / filter row */}
        <View className="flex-row items-center justify-between px-6 pb-2">
          <Text className="text-[13px] text-gray-500">
            You have{" "}
            <Text className="font-semibold text-blue-600">
              {NOTIFICATIONS.filter((n) => n.unread).length} unread
            </Text>{" "}
            notifications
          </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text className="text-[12px] font-semibold text-blue-600">
              Mark all as read
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
