import React from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';

import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

type Props = {
  topOffset?: number;
  /** Video üzerinde koyu arka plan (beyaz ikon) */
  onDark?: boolean;
  /** Boş/yükleme ekranında üst satır içinde */
  inline?: boolean;
};

/** Reels tam ekran modundan akış sekmesine dönüş. */
export const SocialReelsBackButton: React.FC<Props> = ({ topOffset = 8, onDark = false, inline = false }) => {
  const insets = useSafeAreaInsets();
  const router = useSafeNavigation();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const iconColor = onDark ? '#ffffff' : colors.headerText;
  const bg = onDark
    ? 'rgba(0,0,0,0.45)'
    : isDark
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(0,0,0,0.06)';

  return (
    <TouchableOpacity
      onPress={() => router.navigate('/(social)/(feed)' as any)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={t('social.reelsBackToFeed')}
      activeOpacity={0.85}
      style={[
        styles.btn,
        inline
          ? { position: 'relative', top: undefined, left: undefined }
          : { top: insets.top + topOffset },
        { backgroundColor: bg },
      ]}
    >
      <Icon source="arrow-left" size={24} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 12,
    zIndex: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
