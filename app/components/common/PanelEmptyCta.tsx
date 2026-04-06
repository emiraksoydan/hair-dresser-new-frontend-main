import React from "react";
import { View, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { LottieViewComponent } from "./lottieview";
import { Button } from "./Button";
import { Text } from "./Text";
import { useTheme } from "../../hook/useTheme";

type Props = {
  title: string;
  subtitle?: string;
  buttonLabel: string;
  onPress: () => void;
};

/** Panel / işletme listesi boşken: Lottie + kısa açıklama + sarı CTA */
export function PanelEmptyCta({ title, subtitle, buttonLabel, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.borderColor2,
        },
      ]}
    >
      <LottieViewComponent message={title} animationSize={110} />
      {subtitle ? (
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 200 }}
        >
          <Text
            numberOfLines={4}
            style={{
              color: colors.textSecondary,
              textAlign: "center",
              paddingHorizontal: 20,
              marginTop: 2,
              marginBottom: 2,
              fontSize: 15,
              lineHeight: 21,
              fontFamily: "CenturyGothic",
            }}
          >
            {subtitle}
          </Text>
        </MotiView>
      ) : null}
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500, delay: 350 }}
      >
        <Button
          style={{ marginTop: 12, marginBottom: 16, marginHorizontal: 16 }}
          buttonColor="#ffb900"
          mode="contained"
          icon="plus"
          onPress={onPress}
          labelStyle={{ fontFamily: "CenturyGothic-Bold" }}
        >
          {buttonLabel}
        </Button>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    marginTop: 8,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
