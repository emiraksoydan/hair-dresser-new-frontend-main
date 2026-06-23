import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useSocialStoryFeed } from '../../hook/useSocialStoryFeed';
import { SocialStoryRingAvatar } from './SocialStoryRingAvatar';
import { SocialOwnStoryRing } from './SocialOwnStoryRing';
import { SocialStoryViewer } from './SocialStoryViewer';
import { AddToHighlightSheet } from './AddToHighlightSheet';
import type { SocialStoryGroupDto } from '../../types/social';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

interface SocialStoryRingsProps {
  hideBottomBorder?: boolean;
}

export const SocialStoryRings: React.FC<SocialStoryRingsProps> = ({ hideBottomBorder = false }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const {
    isLoading,
    myProfile,
    displayGroups,
    viewerGroups,
    groupsWithStories,
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

  const ringColorForGroup = (group: SocialStoryGroupDto) => {
    const hasStories = group.stories.length > 0;
    if (!hasStories) return '#d1d5db';
    const unviewed = isGroupUnviewed(group.stories.map((s) => s.id));
    return unviewed ? SOCIAL_ACCENT : '#9ca3af';
  };

  if (isLoading && !displayGroups.length) return null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 14 }}
        style={hideBottomBorder ? undefined : { borderBottomWidth: 1, borderBottomColor: colors.borderColor2 }}
      >
        {displayGroups.map((group) => {
          const hasStories = group.stories.length > 0;
          const isActiveOwn = group.profile.id === myProfile?.id;

          if (isActiveOwn) {
            return (
              <View key={group.profile.id} className="items-center" style={{ width: 72 }}>
                <SocialOwnStoryRing
                  avatarUrl={group.profile.avatarUrl ?? myProfile?.avatarUrl}
                  size={64}
                  ringColor={ringColorForGroup(group)}
                  hasStories={hasStories}
                  onViewStories={viewOwnStories}
                  onAddStory={openCreateStory}
                />
                <Text
                  numberOfLines={1}
                  style={{ marginTop: 6, fontSize: 11, color: colors.textSecondary, maxWidth: 72, textAlign: 'center' }}
                >
                  {t('social.yourStory')}
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={group.profile.id}
              onPress={() => openGroup(group)}
              style={{ alignItems: 'center', width: 72 }}
              disabled={!hasStories}
              activeOpacity={hasStories ? 0.75 : 1}
            >
              <SocialStoryRingAvatar
                avatarUrl={group.profile.avatarUrl}
                size={64}
                ringColor={ringColorForGroup(group)}
              />
              <Text
                numberOfLines={1}
                style={{ marginTop: 6, fontSize: 11, color: colors.textSecondary, maxWidth: 72, textAlign: 'center' }}
              >
                {group.profile.username}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <SocialStoryViewer
        visible={viewerOpen}
        groups={viewerGroups.length > 0 ? viewerGroups : groupsWithStories}
        startGroupIndex={Math.min(
          startIndex,
          Math.max(0, (viewerGroups.length > 0 ? viewerGroups : groupsWithStories).length - 1),
        )}
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
