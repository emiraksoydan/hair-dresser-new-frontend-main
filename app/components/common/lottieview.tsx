import React, { useMemo } from 'react';
import { View, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import { MotiText } from 'moti';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';
import { COLORS } from '../../constants/colors';
import { Text } from './Text';

type EmptyStateProps = {
    message?: string;
    style?: StyleProp<ViewStyle>;
    animationSource?: any;
    animationSize?: number;
    onRetry?: () => void;
    showRetryButton?: boolean;
    /** Stable key to prevent animation reset on re-renders */
    animationKey?: string;
};

export const LottieViewComponent: React.FC<EmptyStateProps> = ({
    message,
    style,
    animationSource = require('../../../assets/animations/empty.json'),
    animationSize = 120,
    onRetry,
    showRetryButton = false,
    animationKey,
}) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const defaultMessage = message || t('empty.noBarbersNearby');

    // Stable key for animation - prevents reset on parent re-renders
    const stableKey = useMemo(() => animationKey || 'lottie-anim', [animationKey]);

    const shouldShowRetry = showRetryButton || (onRetry && animationSource?.toString?.()?.includes?.('error'));

    return (
        <View className="items-center justify-center" style={[{ minHeight: 200, maxHeight: 400 }, style]}>
            <LottieView
                key={stableKey}
                source={animationSource}
                autoPlay
                loop
                style={{ width: animationSize, height: animationSize }}
            />
            <MotiText
                key={`${stableKey}-text`}
                from={{ opacity: 0.7, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    type: 'timing',
                    duration: 1200,
                    loop: true,
                    repeat: Infinity,
                    repeatReverse: true,
                }}
                className="mt-2 text-base text-center px-4"
                style={{ fontFamily: 'CenturyGothic', color: colors.sectionHeaderText }}
                numberOfLines={3}
            >
                {defaultMessage}
            </MotiText>
            {onRetry && (
                <View className="mt-4">
                    <TouchableOpacity
                        onPress={onRetry}
                        style={{ backgroundColor: COLORS.UI.ACCENT_GOLD }}
                        className="px-6 py-2 rounded-lg"
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: COLORS.UI.TEXT_ON_GOLD }} className="font-medium">
                            {t("common.retry")}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};
