import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useActiveSocialProfile } from './useActiveSocialProfile';
import { useDeleteSocialStoryMutation, useGetSocialStoryFeedQuery } from '../store/api';
import { useAlert } from './useAlert';
import { useLanguage } from './useLanguage';
import { useAuth } from './useAuth';
import { showSnack } from '../store/snackbarSlice';
import { useAppDispatch } from '../store/hook';
import { getSocialProfileRequiredMessage } from '../utils/social/socialNoProfileMessage';
import { useStoryViews } from './useStoryViews';
import type { SocialStoryGroupDto } from '../types/social';

export function useSocialStoryFeed() {
  const { t } = useLanguage();
  const { userType } = useAuth();
  const { confirm } = useAlert();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: storyGroups, isLoading } = useGetSocialStoryFeedQuery();
  const [deleteStory, { isLoading: deletingStory }] = useDeleteSocialStoryMutation();
  const { activeProfile: myProfile } = useActiveSocialProfile();
  const { isGroupUnviewed, markViewed } = useStoryViews();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroups, setViewerGroups] = useState<SocialStoryGroupDto[]>([]);
  const [startIndex, setStartIndex] = useState(0);
  const [highlightStoryId, setHighlightStoryId] = useState<string | null>(null);

  const groups = storyGroups ?? [];
  const activeProfileId = myProfile?.id ?? null;

  const displayGroups = useMemo(() => {
    const list: SocialStoryGroupDto[] = [...groups];
    if (myProfile && !list.some((g) => g.profile.id === myProfile.id)) {
      list.unshift({
        profile: { ...myProfile, isOwnProfile: true },
        stories: [],
        hasUnviewed: false,
      });
    }
    return list;
  }, [groups, myProfile]);

  const ownGroup = useMemo(
    () => (activeProfileId ? displayGroups.find((g) => g.profile.id === activeProfileId) : undefined),
    [displayGroups, activeProfileId],
  );

  const otherGroupsWithStories = useMemo(
    () =>
      displayGroups.filter(
        (g) => g.profile.id !== activeProfileId && g.stories.length > 0,
      ),
    [displayGroups, activeProfileId],
  );

  const groupsWithStories = useMemo(
    () => displayGroups.filter((g) => g.stories.length > 0),
    [displayGroups],
  );

  const handleDeleteStory = useCallback(
    (storyId: string) => {
      confirm(
        t('social.deleteStoryTitle'),
        t('social.deleteStoryMessage'),
        async () => {
          try {
            const res = await deleteStory(storyId).unwrap();
            if (res?.success) {
              dispatch(showSnack({ message: t('social.storyDeleted'), isError: false }));
              setViewerOpen(false);
            }
          } catch {
            dispatch(showSnack({ message: t('social.storyDeleteFailed'), isError: true }));
          }
        },
        undefined,
        t('social.delete'),
        t('common.cancel'),
      );
    },
    [confirm, deleteStory, dispatch, t],
  );

  const openCreateStory = useCallback(() => {
    if (!myProfile?.id) {
      dispatch(showSnack({ message: getSocialProfileRequiredMessage(t, userType), isError: true }));
      return;
    }
    router.push({
      pathname: '/(screens)/social/create-story',
      params: { profileId: myProfile.id },
    } as any);
  }, [router, myProfile?.id, dispatch, t, userType]);

  const openGroup = useCallback(
    (group: SocialStoryGroupDto) => {
      if (!group.stories.length) {
        if (activeProfileId && group.profile.id === activeProfileId) {
          openCreateStory();
        }
        return;
      }
      setViewerGroups(groupsWithStories);
      const filteredIndex = groupsWithStories.findIndex((x) => x.profile.id === group.profile.id);
      setStartIndex(filteredIndex >= 0 ? filteredIndex : 0);
      setViewerOpen(true);
    },
    [groupsWithStories, openCreateStory, activeProfileId],
  );

  const openOwnGroup = useCallback(() => {
    if (ownGroup) openGroup(ownGroup);
    else openCreateStory();
  }, [ownGroup, openGroup, openCreateStory]);

  /** Kendi avatarına tıklanınca yalnızca kendi hikayeleri (Instagram gibi). */
  const viewOwnStories = useCallback(() => {
    if (!ownGroup?.stories.length) return;
    setViewerGroups([ownGroup]);
    setStartIndex(0);
    setViewerOpen(true);
  }, [ownGroup]);

  return {
    isLoading,
    myProfile,
    displayGroups,
    ownGroup,
    otherGroupsWithStories,
    groupsWithStories,
    viewerOpen,
    setViewerOpen,
    viewerGroups,
    startIndex,
    highlightStoryId,
    setHighlightStoryId,
    deletingStory,
    isGroupUnviewed,
    markViewed,
    handleDeleteStory,
    openGroup,
    openOwnGroup,
    viewOwnStories,
    openCreateStory,
  };
}
