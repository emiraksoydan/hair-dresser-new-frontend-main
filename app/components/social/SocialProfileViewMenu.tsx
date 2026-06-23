import React, { useMemo } from 'react';
import { View, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Icon, Portal } from 'react-native-paper';
import { MotiView } from 'moti';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAnchoredDropdownMenu } from '../../hook/useAnchoredDropdownMenu';
import { SOCIAL_PAIR_BLUE } from '../../constants/socialTheme';

const MENU_WIDTH = 196;

type Props = {
  onReport: () => void;
  onBlock: () => void;
  onShare?: () => void;
  onToggleMute?: () => void;
  isMuted?: boolean;
  disabled?: boolean;
};

export const SocialProfileViewMenu: React.FC<Props> = ({
  onReport,
  onBlock,
  onShare,
  onToggleMute,
  isMuted,
  disabled,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { anchorRef: menuAnchorRef, menuPos, menuReady, closeMenu, toggleMenu } = useAnchoredDropdownMenu({
    menuWidth: MENU_WIDTH,
  });

  const menuItems = useMemo(() => {
    const items = [];
    if (onShare) {
      items.push({
        key: 'share',
        icon: 'share-variant-outline' as const,
        label: t('social.shareProfile'),
        color: colors.headerText,
        onPress: () => {
          closeMenu();
          onShare();
        },
      });
    }
    if (onToggleMute) {
      items.push({
        key: 'mute',
        icon: isMuted ? 'bell-off-outline' : 'bell-outline',
        label: isMuted ? t('social.unmuteProfile') : t('social.muteProfile'),
        color: colors.headerText,
        onPress: () => {
          closeMenu();
          onToggleMute();
        },
      });
    }
    items.push(
      {
        key: 'report',
        icon: 'flag-outline' as const,
        label: t('social.report'),
        color: SOCIAL_PAIR_BLUE,
        onPress: () => {
          closeMenu();
          onReport();
        },
      },
      {
        key: 'block',
        icon: 'account-cancel-outline' as const,
        label: t('block.submit'),
        color: '#ef4444',
        onPress: () => {
          closeMenu();
          onBlock();
        },
      },
    );
    return items;
  }, [closeMenu, onBlock, onReport, onShare, onToggleMute, isMuted, colors.headerText, t]);

  const iconBtnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <>
      <View ref={menuAnchorRef} collapsable={false}>
        <TouchableOpacity
          onPress={toggleMenu}
          disabled={disabled}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBtnBg, opacity: disabled ? 0.5 : 1 }}
        >
          <Icon source="dots-vertical" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </View>

      {menuReady && menuPos ? (
        <Portal>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeMenu} />
          <MotiView
            from={{ opacity: 0, translateY: -6, scale: 0.96 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[
              styles.menuDropdown,
              {
                top: menuPos.top,
                left: menuPos.left,
                backgroundColor: colors.cardBg,
                borderColor: colors.borderColor2,
                shadowColor: '#000',
              },
            ]}
          >
            <Text
              className="text-[11px] font-semibold px-3 pt-2.5 pb-1 uppercase tracking-wide"
              style={{ color: colors.textTertiary }}
            >
              {t('social.profileActions')}
            </Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={item.onPress}
                className="flex-row items-center px-3 py-2.5 gap-2.5"
                activeOpacity={0.7}
              >
                <Icon source={item.icon} size={20} color={item.color} />
                <Text className="text-[14px] font-semibold flex-1" style={{ color: item.color }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </MotiView>
        </Portal>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  menuDropdown: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    overflow: 'hidden',
  },
});
