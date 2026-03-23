import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { Text } from "./Text";
import { Icon } from "react-native-paper";
import { useTheme } from "../../hook/useTheme";

export type StepConfig = {
  id: string;
  label: string;
  icon?: string;
};

type StepFormIndicatorProps = {
  steps: StepConfig[];
  currentStep: number;
  onStepPress?: (index: number) => void;
  canNavigateFreely?: boolean;
  completedSteps?: Set<number>;
  style?: ViewStyle;
};

const STEP_COL_WIDTH = 64;
const LINE_WIDTH = 20;
const CIRCLE_SIZE = 36;

export const StepFormIndicator = React.memo(
  ({
    steps,
    currentStep,
    onStepPress,
    canNavigateFreely = false,
    completedSteps = new Set(),
    style,
  }: StepFormIndicatorProps) => {
    const { colors, isDark } = useTheme();
    const scaleAnims = useRef<Record<number, Animated.Value>>({});
    const scrollRef = useRef<ScrollView>(null);
    const scrollViewWidth = useRef(0);

    const getScale = (i: number) => {
      if (!scaleAnims.current[i]) scaleAnims.current[i] = new Animated.Value(1);
      return scaleAnims.current[i];
    };

    // Bounce animation on step change
    useEffect(() => {
      const s = getScale(currentStep);
      Animated.sequence([
        Animated.timing(s, {
          toValue: 1.12,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(s, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, [currentStep]);

    // Auto-scroll to active step
    useEffect(() => {
      if (!scrollRef.current) return;
      const stepUnitWidth = STEP_COL_WIDTH + LINE_WIDTH;
      const targetX = currentStep * stepUnitWidth;
      const halfView = scrollViewWidth.current / 2;
      const scrollTo = Math.max(0, targetX - halfView + STEP_COL_WIDTH / 2);
      scrollRef.current.scrollTo({ x: scrollTo, animated: true });
    }, [currentStep]);

    const onScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
      scrollViewWidth.current = e.nativeEvent.layout.width;
    }, []);

    const isStepClickable = (index: number) => {
      if (canNavigateFreely) return true;
      return index <= currentStep || completedSteps.has(index);
    };

    return (
      <View style={[{ paddingVertical: 10, paddingHorizontal: 4 }, style]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={onScrollViewLayout}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          <View>
            {/* Row 1: Circles + connector lines */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isCompleted = completedSteps.has(index) || index < currentStep;
                const isClickable = onStepPress && isStepClickable(index);
                const isFutureIncomplete = index > currentStep && !completedSteps.has(index);
                const scale = getScale(index);

                return (
                  <React.Fragment key={step.id}>
                    <View style={{ width: STEP_COL_WIDTH, alignItems: "center" }}>
                      <TouchableOpacity
                        onPress={() => isClickable && onStepPress(index)}
                        disabled={!isClickable}
                        activeOpacity={isClickable ? 0.7 : 1}
                        style={{ opacity: isFutureIncomplete ? 0.5 : 1 }}
                      >
                        <Animated.View
                          style={{
                            transform: [{ scale }],
                            width: CIRCLE_SIZE,
                            height: CIRCLE_SIZE,
                            borderRadius: CIRCLE_SIZE / 2,
                            backgroundColor: isActive
                              ? "#ffb900"
                              : isCompleted
                                ? "#10B981"
                                : colors.cardBg2,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 2,
                            borderColor: isActive ? "#ffb900" : "transparent",
                          }}
                        >
                          {step.icon ? (
                            <Icon source={step.icon as any} size={18} color={isDark ? 'white' : colors.sectionHeaderText} />
                          ) : isCompleted ? (
                            <Icon source="check" size={20} color="white" />
                          ) : (
                            <Icon source="chevron-right" size={18} color={isDark ? 'white' : colors.sectionHeaderText} />
                          )}
                        </Animated.View>
                      </TouchableOpacity>
                    </View>
                    {index < steps.length - 1 && (
                      <View
                        style={{
                          width: LINE_WIDTH,
                          height: 2,
                          backgroundColor: isCompleted ? "#10B981" : colors.borderColor,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>

            {/* Row 2: Labels */}
            <View style={{ flexDirection: "row", marginTop: 4 }}>
              {steps.map((step, index) => {
                const isActive = index === currentStep;
                const isFutureIncomplete = index > currentStep && !completedSteps.has(index);

                return (
                  <React.Fragment key={`label-${step.id}`}>
                    <View
                      style={{
                        width: STEP_COL_WIDTH,
                        alignItems: "center",
                        opacity: isFutureIncomplete ? 0.5 : 1,
                      }}
                    >
                      <Text
                        className="font-century-gothic text-center"
                        style={{
                          fontSize: 10,
                          color: isActive ? "#ffb900" : colors.sectionHeaderText,
                        }}
                        numberOfLines={1}
                      >
                        {step.label}
                      </Text>
                    </View>
                    {index < steps.length - 1 && (
                      <View style={{ width: LINE_WIDTH }} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  },
);
