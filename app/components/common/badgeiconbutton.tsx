import React, { useEffect } from "react";
import { View } from "react-native";
import { Badge, IconButton } from "react-native-paper";
import { useTheme } from "../../hook/useTheme";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    interpolate
} from "react-native-reanimated";

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
    const text = badgeCount > 99 ? "99+" : String(badgeCount);

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
                <Badge
                    style={{
                        position: "absolute",
                        top: -2, // Dairenin biraz dışına/kenarına taşması için
                        right: -2,
                        backgroundColor: badgeColor,
                        fontSize: 10,
                        fontWeight: 'bold',
                        lineHeight: 14,
                    }}
                    size={16}
                >
                    {text}
                </Badge>
            )}
        </View>
    );
}