import PaginationDots from "@/components/onboarding/PaginationDots";
import SlideIllustration from "@/components/onboarding/SlideIllustration";
import {
    ONBOARDING_SLIDES,
    ONBOARDING_STORAGE_KEY,
    OnboardingSlide,
} from "@/constants/onboarding";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    ListRenderItemInfo,
    NativeScrollEvent,
    NativeSyntheticEvent,
    SafeAreaView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── INDIVIDUAL SLIDE ─────────────────────────────────────────────────────────
const OnboardingSlideItem: React.FC<{ item: OnboardingSlide }> = ({ item }) => (
  <View style={{ width: SCREEN_WIDTH }} className="flex-1">
    {/* Illustration area */}
    <View
      className="items-center justify-center flex-1"
      style={{ backgroundColor: item.bgColor }}
    >
      {/* Outer glow ring */}
      <View
        className="items-center justify-center rounded-full w-72 h-72"
        style={{ backgroundColor: `${item.accentColor}12` }}
      >
        <SlideIllustration type={item.illustrationKey} size={220} />
      </View>
    </View>

    {/* Text content */}
    <View className="px-8 pb-2 bg-white pt-9">
      <Text
        className="text-[30px] font-extrabold text-gray-900 leading-tight"
        style={{ lineHeight: 38 }}
      >
        {item.title}
      </Text>
      <Text className="text-[15px] text-gray-500 mt-3 leading-relaxed">
        {item.subtitle}
      </Text>
    </View>
  </View>
);

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
const OnboardingScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;
  const activeSlide = ONBOARDING_SLIDES[currentIndex];

  // ── handlers ────────────────────────────────────────────────────────────────
  const completeOnboarding = useCallback(async (): Promise<void> => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    router.replace("/(tabs)");
  }, []);

  const handleNext = useCallback((): void => {
    if (isLastSlide) {
      completeOnboarding();
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex, isLastSlide, completeOnboarding]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (newIndex !== currentIndex) setCurrentIndex(newIndex);
    },
    [currentIndex],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<OnboardingSlide>) => (
      <OnboardingSlideItem item={item} />
    ),
    [],
  );

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />

      {/* Skip button — hidden on last slide */}
      <View className="absolute z-10 top-14 right-5">
        {!isLastSlide && (
          <TouchableOpacity
            onPress={completeOnboarding}
            activeOpacity={0.7}
            className="px-3 py-1.5"
          >
            <Text className="text-sm font-semibold text-gray-400">Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slides */}
      <FlatList<OnboardingSlide>
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Bottom controls */}
      <View className="px-8 pt-5 pb-10 bg-white">
        {/* Dot indicator */}
        <PaginationDots
          total={ONBOARDING_SLIDES.length}
          current={currentIndex}
          activeColor={activeSlide.accentColor}
        />

        {/* CTA Button */}
        <TouchableOpacity
          className="flex-row items-center justify-center gap-2 mt-6 h-14 rounded-2xl"
          style={{ backgroundColor: activeSlide.accentColor }}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text className="text-base font-bold tracking-wide text-white">
            {isLastSlide ? "Get Started 🚀" : "Next"}
          </Text>
        </TouchableOpacity>

        {/* Slide counter */}
        {/* <Text className="mt-4 text-xs font-medium text-center text-gray-300">
          {currentIndex + 1} / {ONBOARDING_SLIDES.length}
        </Text> */}
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
