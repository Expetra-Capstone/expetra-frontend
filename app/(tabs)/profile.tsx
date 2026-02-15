import { ScrollView, Text } from "react-native";

const Beneficiary: React.FC = () => {
  return (
    <ScrollView
      className="flex-1 text-black bg-white"
      showsVerticalScrollIndicator={false}
    >
      <Text className="mt-4 text-2xl font-bold text-center">Profile Page</Text>
    </ScrollView>
  );
};

export default Beneficiary;
