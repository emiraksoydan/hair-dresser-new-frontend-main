import React, { useEffect } from "react";
import { View, Text, Platform, StyleSheet } from "react-native";
import { IconButton } from "react-native-paper";
import { useTheme } from "../../hook/useTheme";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    interpolate
} from "react-native-reanimated";
import { badgeCountLabel } from "../../utils/badgeDisplay";

type Props = {
    icon: string;
    iconColor?: string;
    size?: number;
    badgeCount?: number;
    onPress?: () => void;
    badgeColor?: string;
    animateWhenActive?: boolean;
};

export function BadgeIconButton({
    icon,
    iconColor = "white",
    size = 22,
    badgeCount = 0,
    onPress,
    badgeColor = "#ef4444",
    animateWhenActive = false,
}: Props) {
    const { colors, isDark } = useTheme();
    const show = badgeCount > 0;
    const text = badgeCountLabel(badgeCount);

    // Animasyon değerleri
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
        if (animateWhenActive && show) {
            scale.value = withRepeat(
                withTiming(1.15, { duration: 600 }),
                -1,
                true
            );
            rotation.value = withRepeat(
                withTiming(1, { duration: 600 }),
                -1,
                true
            );
        } else {
            scale.value = withTiming(1, { duration: 200 });
            rotation.value = withTiming(0, { duration: 200 });
        }
    }, [show, animateWhenActive]);

    const animatedIconStyle = useAnimatedStyle(() => {
        const rotate = interpolate(rotation.value, [0, 1], [-15, 15]);
        return {
            transform: [
                { scale: scale.value },
                { rotate: `${rotate}deg` },
            ],
        };
    });

    return (
        // Menü butonuyla aynı: w-10 h-10, rounded-full ve bg-[#1F2937]
        <View
            className="w-12 h-12 items-center justify-center rounded-full relative"
            style={(icon === 'bell-outline' || icon === 'bell') ? { backgroundColor: isDark ? colors.cardBg : colors.screenBg } : undefined}
        >
            <Animated.View style={animateWhenActive && show ? animatedIconStyle : {}}>
                <IconButton
                    icon={icon}
                    iconColor={iconColor}
                    size={size}
                    onPress={onPress}
                    style={{ margin: 0 }} // Ekstra boşluğu kaldırır
                />
            </Animated.View>

            {show && (
                <View
                    pointerEvents="none"
                    style={[
                        styles.countBubble,
                        {
                            backgroundColor: badgeColor,
                            top: Platform.OS === "android" ? -6 : -2,
                            right: Platform.OS === "android" ? -6 : -2,
                        },
                        text.length > 2 ? styles.countBubbleWide : null,
                    ]}
                >
                    <Text
                        style={[
                            styles.countText,
                            Platform.OS === "android" ? { includeFontPadding: false } : null,
                        ]}
                    >
                        {text}
                    </Text>
                </View>
            )}
        </View>
    );
}

/** Paper Badge Android'de metni aşağıda bırakıyordu; küçük rozet için RN görünümü kullanılıyor. */
const styles = StyleSheet.create({
    countBubble: {
        position: "absolute",
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 3,
        alignItems: "center",
        justifyContent: "center",
    },
    countBubbleWide: {
        minWidth: 22,
        paddingHorizontal: 5,
        borderRadius: 10,
    },
    countText: {
        color: "#ffffff",
        fontSize: 10,
        fontWeight: "700",
        lineHeight: Platform.OS === "android" ? 12 : 14,
        ...Platform.select({
            android: { textAlignVertical: "center" },
        }),
    },
});