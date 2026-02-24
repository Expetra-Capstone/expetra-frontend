import TransactionList from "@/components/TransactionList";
import { allTransactions, categories, dateRangeOptions } from "@/data/home";
import { Category } from "@/types/home";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  ImageBackground,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomePage() {
  // State management
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filteredTransactions, setFilteredTransactions] =
    useState(allTransactions);
  const [isDataVisible, setIsDataVisible] = useState(true);
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [isDateDropdownVisible, setIsDateDropdownVisible] = useState(false);

  // Filter handler
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);

    if (categoryId === "all") {
      setFilteredTransactions(allTransactions);
    } else {
      const filtered = allTransactions.filter(
        (transaction) =>
          transaction.bank.toLowerCase() === categoryId.toLowerCase(),
      );
      setFilteredTransactions(filtered);
    }
  };

  // Date range selector handler
  const handleDateRangeSelect = (rangeId: string) => {
    setSelectedDateRange(rangeId);
    setIsDateDropdownVisible(false);
  };

  const displayBalance = isDataVisible ? "24,892.00" : "******";
  const displayPhone = isDataVisible ? "+251 911 781 912" : "+251 911 *** *12";

  const getCurrentDateLabel = () => {
    return (
      dateRangeOptions.find((opt) => opt.id === selectedDateRange)?.label ||
      "7 days"
    );
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      onPress={() => handleCategoryPress(item.id)}
      className={`mr-2 px-5 py-2 rounded-full border ${
        selectedCategory === item.id
          ? "bg-blue-600 border-blue-600"
          : "bg-white border-gray-300"
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          selectedCategory === item.id ? "text-white" : "text-black"
        }`}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      className="flex-1 bg-white"
      showsVerticalScrollIndicator={false}
    >
      {/* Balance Card - keeping existing code */}
      <View className="px-5 pt-3 pb-6">
        <View
          className="overflow-hidden rounded-3xl"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 10,
          }}
        >
          <ImageBackground
            source={require("@/assets/images/card-bg.png")}
            resizeMode="cover"
            className="w-full"
          >
            <View className="p-6 pb-8 pt-7">
              <View className="flex-row items-center justify-between mb-8">
                <Text className="text-base font-normal text-white opacity-95">
                  Total Balance
                </Text>

                <TouchableOpacity
                  onPress={() => setIsDateDropdownVisible(true)}
                  className="flex-row items-center px-4 py-2 rounded-full bg-white/25"
                >
                  <Text className="mr-1 text-sm font-medium text-white">
                    {getCurrentDateLabel()}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View className="mb-10">
                <Text className="text-5xl font-bold tracking-tight text-white">
                  {displayBalance} <Text className="text-lg">ETB</Text>
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="relative w-12 h-8 mr-3">
                    <View className="absolute left-0 w-8 h-8 rounded-full bg-white/35" />
                    <View
                      className="absolute w-8 h-8 rounded-full bg-white/45"
                      style={{ left: 18 }}
                    />
                  </View>

                  <Text className="text-base font-normal tracking-wide text-white">
                    {displayPhone}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setIsDataVisible(!isDataVisible)}
                >
                  <Ionicons
                    name={isDataVisible ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        </View>
      </View>

      {/* Date Range Modal - keeping existing code */}
      <Modal
        visible={isDateDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDateDropdownVisible(false)}
      >
        <TouchableOpacity
          className="items-center justify-center flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setIsDateDropdownVisible(false)}
        >
          <View className="w-64 overflow-hidden bg-white rounded-2xl">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-center">
                Select Date Range
              </Text>
            </View>
            {dateRangeOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleDateRangeSelect(option.id)}
                className={`p-4 border-b border-gray-100 ${
                  selectedDateRange === option.id ? "bg-blue-50" : ""
                }`}
              >
                <Text
                  className={`text-base text-center ${
                    selectedDateRange === option.id
                      ? "text-blue-600 font-semibold"
                      : "text-gray-700"
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Recent Transaction Section */}
      <View className="px-4 pb-6">
        <Text className="mb-4 text-2xl font-bold text-black">
          Recent Transaction
        </Text>

        {/* Category Pills */}
        <FlatList
          horizontal
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ paddingRight: 20 }}
        />

        {/* Use the new TransactionList component */}
        <TransactionList
          transactions={filteredTransactions}
          emptyMessage="No transactions found for this filter"
        />
      </View>
    </ScrollView>
  );
}
