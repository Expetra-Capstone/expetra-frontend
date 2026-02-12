import { ScrollView, Text } from "react-native";

const Beneficiary: React.FC = () => {
  return (
    <ScrollView
      className="flex-1 bg-black"
      showsVerticalScrollIndicator={false}
    >
      <Text className="mt-4 text-2xl font-bold text-center text-white">
        Profile Page
      </Text>
    </ScrollView>
  );
};

export default Beneficiary;
