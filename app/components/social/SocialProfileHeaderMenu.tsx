import React, { useMemo } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
  View,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Icon, Portal } from 'react-native-paper';
import { MotiView } from 'moti';

import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useGetSocialFreeTierUsageQuery } from '../../store/api';
import { useAnchoredDropdownMenu } from '../../hook/useAnchoredDropdownMenu';
import { SOCIAL_PAIR_BLUE, SOCIAL_PAIR_ORANGE } from '../../constants/socialTheme';
import { SocialProfileOwnerType } from '../../types/social';

const MENU_WIDTH = 232;

type MenuItem = {
  key: string;
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
};

type Props = {
  onShareProfile?: () => void;
};

export const SocialProfileHeaderMenu: React.FC<Props> = ({ onShareProfile }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const { activeProfile } = useActiveSocialProfile();
  const { data: freeTierUsage } = useGetSocialFreeTierUsageQuery();
  const { anchorRef: menuAnchorRef, menuPos, menuReady, closeMenu, toggleMenu } = useAnchoredDropdownMenu({
    menuWidth: MENU_WIDTH,
  });

  const menuItems = useMemo(() => {
    if (!activeProfile?.id) return [];
    const profileId = activeProfile.id;
    const items: MenuItem[] = [
      {
        key: 'post',
        icon: 'image-plus-outline',
        label: t('social.quickCreatePost'),
        color: SOCIAL_PAIR_BLUE,
        onPress: () => {
          closeMenu();
          router.push({ pathname: '/(screens)/social/create-post', params: { profileId } } as any);
        },
      },
      {
        key: 'story',
        icon: 'plus-circle-outline',
        label: t('social.quickCreateStory'),
        color: SOCIAL_PAIR_ORANGE,
        onPress: () => {
          closeMenu();
          router.push({ pathname: '/(screens)/social/create-story', params: { profileId } } as any);
        },
      },
      {
        key: 'reel',
        icon: 'movie-open-plus',
        label: t('social.quickCreateReel'),
        color: SOCIAL_PAIR_BLUE,
        onPress: () => {
          closeMenu();
          router.push({
            pathname: '/(screens)/social/create-post',
            params: { profileId, mode: 'reel' },
          } as any);
        },
      },
      {
        key: 'saved',
        icon: 'bookmark-outline',
        label: t('social.savedTitle'),
        color: colors.headerText,
        onPress: () => {
          closeMenu();
          router.push('/(screens)/social/saved-posts' as any);
        },
      },
      {
        key: 'highlights',
        icon: 'star-circle-outline',
        label: t('social.highlightsQuick'),
        color: SOCIAL_PAIR_ORANGE,
        onPress: () => {
          closeMenu();
          router.push({
            pathname: '/(screens)/social/create-highlight',
            params: { profileId },
          } as any);
        },
      },
      {
        key: 'share',
        icon: 'qrcode',
        label: t('social.shareProfile'),
        color: colors.headerText,
        onPress: () => {
          closeMenu();
          onShareProfile?.();
        },
      },
    ];

    if (
      activeProfile.ownerType === SocialProfileOwnerType.FreeBarber ||
      activeProfile.ownerType === SocialProfileOwnerType.BarberStore
    ) {
      items.push({
        key: 'panel',
        icon: 'view-dashboard-outline',
        label: t('social.goToPanel'),
        color: colors.headerText,
        onPress: () => {
          closeMenu();
          router.push(
            (activeProfile.ownerType === SocialProfileOwnerType.FreeBarber
              ? '/(screens)/profile/free-barber-panel'
              : '/(screens)/profile/barber-store-businesses') as any,
          );
        },
      });
    }

    return items;
  }, [activeProfile, closeMenu, colors.headerText, onShareProfile, router, t]);

  const freeTierNote = useMemo(() => {
    if (!freeTierUsage?.appliesLimits) return null;
    if (freeTierUsage.storyRemainingToday > 0) {
      return t('social.freeTierStoryRemaining', {
        remaining: freeTierUsage.storyRemainingToday,
        limit: freeTierUsage.storyDailyLimit,
      });
    }
    return t('social.freeTierStoryUsed');
  }, [freeTierUsage, t]);

  const iconBtnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <>
      <View className="flex-row items-center gap-1 mr-1 w-[84px] justify-end">
        <View ref={menuAnchorRef} collapsable={false}>
          <TouchableOpacity
            onPress={toggleMenu}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-9 h-9 items-center justify-center rounded-full"
            style={{ backgroundColor: iconBtnBg }}
          >
            <Icon source="plus" size={22} color={colors.headerText} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(screens)/social/settings' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: iconBtnBg }}
        >
          <Icon source="cog-outline" size={22} color={colors.headerText} />
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
            {freeTierNote ? (
              <View
                className="px-3 py-2.5"
                style={{
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.borderColor2,
                  backgroundColor: isDark ? 'rgba(240,94,35,0.1)' : 'rgba(240,94,35,0.06)',
                }}
              >
                <Text className="text-[11px] font-semibold leading-4" style={{ color: colors.headerText }}>
                  {freeTierNote}
                </Text>
                <Text className="text-[10px] mt-1 leading-3.5" style={{ color: colors.textSecondary }}>
                  {t('social.freeTierDailyHint')}
                </Text>
              </View>
            ) : null}
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
