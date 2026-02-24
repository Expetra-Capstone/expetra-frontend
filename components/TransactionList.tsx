import { Transaction } from "@/types/home";
import { Invoice02Icon } from "hugeicons-react-native";
import React from "react";
import { FlatList, Text, View } from "react-native";

interface TransactionListProps {
  transactions: Transaction[];
  emptyMessage?: string;
  scrollEnabled?: boolean;
}

export default function TransactionList({
  transactions,
  emptyMessage = "No transactions found",
  scrollEnabled = false,
}: TransactionListProps) {
  // Render transaction item
  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View className="flex-row items-center justify-between p-4 mb-3 bg-white border-2 border-gray-200 rounded-2xl">
      <View className="flex-row items-center flex-1">
        <View className="items-center justify-center w-12 h-12 mr-3 rounded-full bg-accent/20">
          <Invoice02Icon size={20} color="#1152D4" />
        </View>

        <View className="flex-1">
          <Text className="text-base font-semibold text-black">
            {item.bank}
          </Text>
          <Text className="text-sm text-gray-500">{item.date}</Text>
        </View>
      </View>

      <View className="items-end">
        <Text className="mb-1 text-xl font-bold text-accent">
          {item.amount}
        </Text>
        <View
          className={`px-3 py-1 rounded-full ${
            item.type === "deposit" ? "bg-green-500/20" : "bg-red-500/20"
          }`}
        >
          <Text
            className={`text-[9px] font-medium ${
              item.type === "deposit" ? "text-green-500" : "text-red-500"
            }`}
          >
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.id.toString()}
      scrollEnabled={scrollEnabled}
      ListEmptyComponent={
        <View className="items-center justify-center py-8">
          <Text className="text-base text-gray-500">{emptyMessage}</Text>
        </View>
      }
    />
  );
}
