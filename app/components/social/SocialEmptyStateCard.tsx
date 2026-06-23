import React from 'react';
import { View, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { LottieViewComponent } from '../common/lottieview';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useSocialLottieAnimation } from '../../hook/useSocialLottieAnimation';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

type Props = {
  title?: string;
  message: string;
  animationSource?: any;
  animationSize?: number;
  animationKey?: string;
  style?: StyleProp<ViewStyle>;
  messageColor?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const SocialEmptyStateCard: React.FC<Props> = ({
  title,
  message,
  animationSource = require('../../../assets/animations/empty.json'),
  animationSize = 130,
  animationKey = 'social-empty',
  style,
  messageColor,
  actionLabel,
  onAction,
}) => {
  const { colors } = useTheme();
  const { autoPlay, loop } = useSocialLottieAnimation();

  return (
    <View className="px-4 pt-4 pb-2" style={style}>
      <View
        className="rounded-2xl p-6 pb-8 items-center w-full"
        style={{
          backgroundColor: colors.cardBg,
          borderWidth: 1,
          borderColor: colors.borderColor2,
        }}
      >
        {title ? (
          <Text
            className="text-base font-bold text-center mb-2 px-2"
            style={{ color: colors.headerText }}
          >
            {title}
          </Text>
        ) : null}
        <LottieViewComponent
          animationSource={animationSource}
          message={message}
          animationSize={animationSize}
          animationKey={animationKey}
          messageColor={messageColor ?? colors.textSecondary}
          autoPlay={autoPlay}
          loop={loop}
          style={{ minHeight: 0, maxHeight: 280 }}
        />
        {actionLabel && onAction ? (
          <TouchableOpacity
            onPress={onAction}
            activeOpacity={0.85}
            className="mt-4 px-5 py-2.5 rounded-xl"
            style={{ backgroundColor: SOCIAL_ACCENT }}
          >
            <Text className="font-semibold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
