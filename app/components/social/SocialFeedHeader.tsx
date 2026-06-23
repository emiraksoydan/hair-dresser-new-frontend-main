import React, { useCallback, useMemo } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_PAIR_BLUE, SOCIAL_PAIR_ORANGE } from '../../constants/socialTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Portal } from 'react-native-paper';
import { MotiView } from 'moti';

import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAuth } from '../../hook/useAuth';
import { exitSocialMode } from '../../utils/social/exitSocialMode';
import { getSocialProfileRequiredMessage } from '../../utils/social/socialNoProfileMessage';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import { useSocialStoryFeed } from '../../hook/useSocialStoryFeed';
import { useAnchoredDropdownMenu } from '../../hook/useAnchoredDropdownMenu';
import { SocialOwnStoryRing } from './SocialOwnStoryRing';
import { SocialStoryRingAvatar } from './SocialStoryRingAvatar';
import { SocialStoryViewer } from './SocialStoryViewer';
import { AddToHighlightSheet } from './AddToHighlightSheet';
import type { SocialStoryGroupDto } from '../../types/social';

const MENU_WIDTH = 208;

export const SocialFeedHeader: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const dispatch = useAppDispatch();
  const { userType } = useAuth();
  const { anchorRef: menuAnchorRef, menuPos, menuReady, closeMenu, toggleMenu } = useAnchoredDropdownMenu({
    menuWidth: MENU_WIDTH,
  });

  const {
    isLoading,
    myProfile,
    ownGroup,
    otherGroupsWithStories,
    groupsWithStories,
    viewerGroups,
    viewerOpen,
    setViewerOpen,
    startIndex,
    highlightStoryId,
    setHighlightStoryId,
    deletingStory,
    isGroupUnviewed,
    markViewed,
    handleDeleteStory,
    openGroup,
    viewOwnStories,
    openCreateStory,
  } = useSocialStoryFeed();

  const closeMenuCb = useCallback(() => closeMenu(), [closeMenu]);

  const menuItems = useMemo(
    () => [
      {
        key: 'story',
        icon: 'camera-plus-outline' as const,
        label: t('social.createStory'),
        color: SOCIAL_PAIR_ORANGE,
        onPress: () => {
          closeMenuCb();
          openCreateStory();
        },
      },
      {
        key: 'post',
        icon: 'image-plus-outline' as const,
        label: t('social.createPost'),
        color: SOCIAL_PAIR_BLUE,
        onPress: () => {
          closeMenuCb();
          if (!myProfile?.id) {
            dispatch(showSnack({ message: getSocialProfileRequiredMessage(t, userType), isError: true }));
            return;
          }
          router.push({
            pathname: '/(screens)/social/create-post',
            params: { profileId: myProfile.id },
          } as any);
        },
      },
      {
        key: 'highlights',
        icon: 'bookmark-plus-outline' as const,
        label: t('social.highlights'),
        color: SOCIAL_PAIR_ORANGE,
        onPress: () => {
          closeMenuCb();
          if (!myProfile?.id) {
            dispatch(showSnack({ message: getSocialProfileRequiredMessage(t, userType), isError: true }));
            return;
          }
          router.push({
            pathname: '/(screens)/social/create-highlight',
            params: { profileId: myProfile.id },
          } as any);
        },
      },
    ],
    [closeMenuCb, myProfile?.id, openCreateStory, router, t, dispatch, userType],
  );

  const ringColorForGroup = useCallback(
    (group: SocialStoryGroupDto) => {
      const hasStories = group.stories.length > 0;
      if (!hasStories) return isDark ? '#4b5563' : '#d1d5db';
      const unviewed = isGroupUnviewed(group.stories.map((s) => s.id));
      return unviewed ? SOCIAL_ACCENT : '#9ca3af';
    },
    [isGroupUnviewed, isDark],
  );

  const ownRingColor = ownGroup ? ringColorForGroup(ownGroup) : isDark ? '#4b5563' : '#d1d5db';
  const ownHasStories = (ownGroup?.stories.length ?? 0) > 0;

  return (
    <>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.screenBg }}>
        <View
          className="flex-row items-center px-2 py-2 min-h-[72px]"
          style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor2 }}
        >
          <TouchableOpacity
            onPress={() => exitSocialMode(userType)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-9 h-9 items-center justify-center rounded-full mr-3"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          >
            <Icon source="arrow-left" size={22} color={colors.headerText} />
          </TouchableOpacity>

          <View className="mr-2">
            <SocialOwnStoryRing
              avatarUrl={ownGroup?.profile.avatarUrl ?? myProfile?.avatarUrl}
              size={52}
              ringColor={ownRingColor}
              hasStories={ownHasStories}
              onViewStories={viewOwnStories}
              onAddStory={openCreateStory}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-1"
            contentContainerStyle={{ alignItems: 'flex-start', paddingRight: 4, gap: 10 }}
          >
            {!isLoading &&
              otherGroupsWithStories.map((group) => (
                <TouchableOpacity
                  key={group.profile.id}
                  onPress={() => openGroup(group)}
                  className="items-center"
                  style={{ width: 58 }}
                  activeOpacity={0.75}
                >
                  <SocialStoryRingAvatar
                    avatarUrl={group.profile.avatarUrl}
                    size={52}
                    ringColor={ringColorForGroup(group)}
                  />
                  <Text
                    numberOfLines={1}
                    className="text-[10px] mt-1 text-center"
                    style={{ color: colors.textSecondary, maxWidth: 58 }}
                  >
                    {group.profile.username}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>

          <View ref={menuAnchorRef} collapsable={false}>
            <TouchableOpacity
              onPress={toggleMenu}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="w-9 h-9 items-center justify-center rounded-full ml-1"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
            >
              <Icon source="dots-vertical" size={22} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

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
              {t('social.feedMenuTitle')}
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

      <SocialStoryViewer
        visible={viewerOpen}
        groups={viewerGroups}
        startGroupIndex={Math.min(startIndex, Math.max(0, viewerGroups.length - 1))}
        viewerProfileId={myProfile?.id}
        onClose={() => setViewerOpen(false)}
        onViewed={markViewed}
        onDeleteStory={handleDeleteStory}
        deletingStory={deletingStory}
        onAddToHighlight={(storyId) => {
          if (myProfile?.id) setHighlightStoryId(storyId);
        }}
      />

      {myProfile?.id && highlightStoryId ? (
        <AddToHighlightSheet
          visible={!!highlightStoryId}
          profileId={myProfile.id}
          storyId={highlightStoryId}
          onClose={() => setHighlightStoryId(null)}
        />
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
