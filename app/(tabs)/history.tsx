import TransactionList from "@/components/TransactionList";
import { allTransactions, categories } from "@/data/home";
import { FilterState, StatusOption } from "@/types/history";
import { Category } from "@/types/home";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

const History = () => {
  const [selectedCategory, setSelectedCategory] =
    useState<FilterState["selectedCategory"]>("all");
  const [selectedStatus, setSelectedStatus] =
    useState<FilterState["selectedStatus"]>("all");
  const [selectedFilter] = useState<FilterState["selectedFilter"]>("all");
  const [isBankDropdownVisible, setIsBankDropdownVisible] =
    useState<boolean>(false);
  const [isStatusDropdownVisible, setIsStatusDropdownVisible] =
    useState<boolean>(false);

  // Get unique statuses from transactions
  const statusOptions = useMemo<StatusOption[]>(() => {
    const statuses = [...new Set(allTransactions.map((t) => t.status))];
    return [
      { id: "all", name: "All Status" },
      ...statuses.map((s) => ({ id: s.toLowerCase(), name: s })),
    ];
  }, []);

  // Filter transactions based on category, status, and type
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (transaction) =>
          transaction.bank.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter(
        (transaction) =>
          transaction.status.toLowerCase() === selectedStatus.toLowerCase(),
      );
    }

    if (selectedFilter === "deposits") {
      filtered = filtered.filter(
        (transaction) => transaction.type === "deposit",
      );
    } else if (selectedFilter === "withdrawals") {
      filtered = filtered.filter(
        (transaction) => transaction.type === "withdrawal",
      );
    }

    return filtered;
  }, [selectedCategory, selectedStatus, selectedFilter]);

  // Filter handlers
  const handleCategorySelect = (categoryId: string): void => {
    setSelectedCategory(categoryId);
    setIsBankDropdownVisible(false);
  };

  const handleStatusSelect = (statusId: string): void => {
    setSelectedStatus(statusId);
    setIsStatusDropdownVisible(false);
  };

  // Get current selected bank name
  const getCurrentBankLabel = (): string => {
    const selected: Category | undefined = categories.find(
      (cat) => cat.id === selectedCategory,
    );
    return selected ? selected.name : "All Banks";
  };

  // Get current selected status name
  const getCurrentStatusLabel = (): string => {
    const selected: StatusOption | undefined = statusOptions.find(
      (opt) => opt.id === selectedStatus,
    );
    return selected ? selected.name : "All Status";
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        {/* Header */}
        <View className="pt-4 pb-3 bg-white">
          {/* Dropdown Filters Row */}
          <View className="px-5 mb-4">
            <View className="flex-row">
              {/* Bank Dropdown */}
              <TouchableOpacity
                onPress={() => setIsBankDropdownVisible(true)}
                className="flex-row items-center justify-between flex-1 px-4 py-3 mr-2 bg-white border-2 border-gray-200 rounded-xl"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons name="business-outline" size={18} color="#666" />
                  <Text
                    className="flex-1 ml-2 text-sm font-medium text-gray-700"
                    numberOfLines={1}
                  >
                    {getCurrentBankLabel()}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>

              {/* Status Dropdown */}
              <TouchableOpacity
                onPress={() => setIsStatusDropdownVisible(true)}
                className="flex-row items-center justify-between flex-1 px-4 py-3 ml-2 bg-white border-2 border-gray-200 rounded-xl"
              >
                <View className="flex-row items-center flex-1">
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#666"
                  />
                  <Text
                    className="flex-1 ml-2 text-sm font-medium text-gray-700"
                    numberOfLines={1}
                  >
                    {getCurrentStatusLabel()}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bank Dropdown Modal */}
        <Modal
          visible={isBankDropdownVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsBankDropdownVisible(false)}
        >
          <TouchableOpacity
            className="items-center justify-center flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setIsBankDropdownVisible(false)}
          >
            <View className="w-4/5 overflow-hidden bg-white rounded-2xl">
              <View className="p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-center">
                  Select Bank
                </Text>
              </View>
              <ScrollView className="max-h-96">
                {categories.map((option: Category) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => handleCategorySelect(option.id)}
                    className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${
                      selectedCategory === option.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        selectedCategory === option.id
                          ? "text-blue-600 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {option.name}
                    </Text>
                    {selectedCategory === option.id && (
                      <Ionicons name="checkmark" size={20} color="#1152D4" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Status Dropdown Modal */}
        <Modal
          visible={isStatusDropdownVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsStatusDropdownVisible(false)}
        >
          <TouchableOpacity
            className="items-center justify-center flex-1 bg-black/50"
            activeOpacity={1}
            onPress={() => setIsStatusDropdownVisible(false)}
          >
            <View className="w-4/5 overflow-hidden bg-white rounded-2xl">
              <View className="p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-center">
                  Select Status
                </Text>
              </View>
              <ScrollView className="max-h-96">
                {statusOptions.map((option: StatusOption) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => handleStatusSelect(option.id)}
                    className={`p-4 border-b border-gray-100 flex-row items-center justify-between ${
                      selectedStatus === option.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        selectedStatus === option.id
                          ? "text-blue-600 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {option.name}
                    </Text>
                    {selectedStatus === option.id && (
                      <Ionicons name="checkmark" size={20} color="#1152D4" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Transaction List */}
        <View className="px-5 pb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-black">
              All Transactions
            </Text>
            <Text className="text-sm text-gray-500">
              {filteredTransactions.length} transaction(s)
            </Text>
          </View>

          <TransactionList
            transactions={filteredTransactions}
            emptyMessage="No transactions found for the selected filters"
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default History;
