import React, { useCallback, useRef } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

import { pickSocialProfileImage } from '../../utils/social/pickSocialMedia';
import { Text } from '../../components/common/Text';
import { AnimatedCountText } from '../../components/common/AnimatedCountText';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import {
  useGetSocialProfilePostsQuery,
  useGetSocialMyProfilesQuery,
  useUploadSocialProfileAvatarMutation,
  useUploadSocialProfileCoverMutation,
  useLazyGetSocialProfilePostsQuery,
} from '../../store/api';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { SocialProfileScreenHeader } from '../../components/social/SocialProfileScreenHeader';
import { SocialEmptyStateCard } from '../../components/social/SocialEmptyStateCard';
import { SocialProfileCoverHeader } from '../../components/social/SocialProfileCoverHeader';
import { SocialProfileMediaTabs } from '../../components/social/SocialProfileMediaTabs';
import { SocialStoryHighlights } from '../../components/social/SocialStoryHighlights';
import { SocialProfileShareSheet } from '../../components/social/SocialProfileShareSheet';
import { SocialBioText } from '../../components/social/SocialBioText';
import { socialProfileOwnerLabel } from '../../utils/social/socialProfileOwnerLabel';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { formatSocialCount } from '../../utils/formatSocialCount';
import { SocialProfileOwnerStatsRow } from '../../components/social/SocialProfileOwnerStatsRow';
import {
  SOCIAL_PROFILE_POSTS_PAGE_SIZE,
  socialProfilePostsQuery,
} from '../../utils/social/social-pagination';
import { useAuth } from '../../hook/useAuth';
import { UserType } from '../../types';
import { exitSocialMode } from '../../utils/social/exitSocialMode';
import { getSocialNoProfilePanelMessage } from '../../utils/social/socialNoProfileMessage';
import { SocialProfileSwitcherPill } from '../../components/social/SocialProfileSwitcher';

function ProfileStat({
  value,
  label,
  onPress,
  colors,
}: {
  value: number;
  label: string;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const content = (
    <View className="items-center flex-1 px-1">
      <AnimatedCountText
        value={value}
        formatValue={formatSocialCount}
        className="font-bold text-base"
        style={{ color: colors.headerText }}
        numberOfLines={1}
      />
      <Text
        className="text-[11px] mt-0.5 text-center"
        style={{ color: colors.textSecondary }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} className="flex-1">
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export default function SocialProfileScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const dispatch = useAppDispatch();
  const { userType } = useAuth();
  const { activeProfile: profile, isLoading } = useActiveSocialProfile();
  const { refetch: refetchProfiles } = useGetSocialMyProfilesQuery();
  const [uploadAvatar, { isLoading: uploadingAvatar }] = useUploadSocialProfileAvatarMutation();
  const [uploadCover, { isLoading: uploadingCover }] = useUploadSocialProfileCoverMutation();

  const postsQuery = profile?.id ? socialProfilePostsQuery(profile.id) : null;
  const {
    data: posts,
    isLoading: postsLoading,
    isFetching: postsFetching,
    isError: postsError,
    refetch: refetchPosts,
  } = useGetSocialProfilePostsQuery(
    postsQuery ?? { profileId: '', limit: SOCIAL_PROFILE_POSTS_PAGE_SIZE },
    { skip: !postsQuery, refetchOnMountOrArgChange: true },
  );
  const [fetchMorePosts, { isFetching: isFetchingMorePosts }] = useLazyGetSocialProfilePostsQuery();
  const loadingMorePostsRef = useRef(false);
  const shareSheet = useBottomSheet(['58%']);

  const handlePickAvatar = useCallback(async () => {
    if (!profile) return;
    const file = await pickSocialProfileImage({ allowsEditing: true, aspect: [1, 1] });
    if (!file) return;
    try {
      const res = await uploadAvatar({ profileId: profile.id, file }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.avatarUpdated'), isError: false }));
        refetchProfiles();
      } else {
        Alert.alert(
          String(t('common.error')),
          translateSocialApiMessage(res?.message, t, t('social.avatarFailed')),
        );
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'data' in e
          ? (e as { data?: { message?: string } }).data?.message
          : undefined;
      Alert.alert(String(t('common.error')), translateSocialApiMessage(msg, t, t('social.avatarFailed')));
    }
  }, [profile, uploadAvatar, dispatch, t, refetchProfiles]);

  const handlePickCover = useCallback(async () => {
    if (!profile) return;
    const file = await pickSocialProfileImage({ allowsEditing: true, aspect: [16, 9] });
    if (!file) return;
    try {
      const res = await uploadCover({ profileId: profile.id, file }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.coverUpdated'), isError: false }));
        refetchProfiles();
      } else {
        Alert.alert(
          String(t('common.error')),
          translateSocialApiMessage(res?.message, t, t('social.coverFailed')),
        );
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'data' in e
          ? (e as { data?: { message?: string } }).data?.message
          : undefined;
      Alert.alert(String(t('common.error')), translateSocialApiMessage(msg, t, t('social.coverFailed')));
    }
  }, [profile, uploadCover, dispatch, t, refetchProfiles]);

  const handleLoadMorePosts = useCallback(async () => {
    const list = posts ?? [];
    if (!postsQuery || loadingMorePostsRef.current || isFetchingMorePosts || postsFetching || list.length === 0) {
      return;
    }
    if (list.length % SOCIAL_PROFILE_POSTS_PAGE_SIZE !== 0) return;
    const last = list[list.length - 1];
    loadingMorePostsRef.current = true;
    try {
      await fetchMorePosts({
        ...postsQuery,
        before: last.createdAt,
        beforeId: last.id,
      }).unwrap();
    } catch {
      /* ignore */
    } finally {
      loadingMorePostsRef.current = false;
    }
  }, [posts, postsQuery, isFetchingMorePosts, postsFetching, fetchMorePosts]);

  const handleScroll = useCallback(
    (e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 240) {
        void handleLoadMorePosts();
      }
    },
    [handleLoadMorePosts],
  );

  if (isLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
        <SocialProfileScreenHeader />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <SocialProfileScreenHeader onShareProfile={() => shareSheet.open()} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
      >
        {profile ? (
          <>
            <SocialProfileCoverHeader
              profile={profile}
              uploadingCover={uploadingCover}
              uploadingAvatar={uploadingAvatar}
              onPickCover={handlePickCover}
              onPickAvatar={handlePickAvatar}
            />

            <View style={{ paddingHorizontal: 20 }}>
              <Text
                className="text-center font-bold text-base"
                style={{ color: colors.headerText }}
                numberOfLines={2}
              >
                @{profile.username}
              </Text>
              <Text
                className="text-center text-xs mt-1 mb-4"
                style={{ color: colors.textSecondary }}
              >
                {socialProfileOwnerLabel(profile.ownerType, t)}
                {profile.ownerNumber ? ` · #${profile.ownerNumber}` : ''}
              </Text>

              <View className="flex-row items-start mb-3">
                <ProfileStat value={profile.postCount} label={t('social.posts')} colors={colors} />
                <ProfileStat
                  value={profile.followerCount}
                  label={t('social.followers')}
                  colors={colors}
                  onPress={() =>
                    router.push({
                      pathname: '/(screens)/social/follow-list',
                      params: { profileId: profile.id, kind: 'followers', username: profile.username },
                    } as any)
                  }
                />
                <ProfileStat
                  value={profile.followingCount}
                  label={t('social.following')}
                  colors={colors}
                  onPress={() =>
                    router.push({
                      pathname: '/(screens)/social/follow-list',
                      params: { profileId: profile.id, kind: 'following', username: profile.username },
                    } as any)
                  }
                />
              </View>

              <TouchableOpacity
                className="py-2.5 rounded-[10px] items-center w-full mb-2"
                style={{ backgroundColor: SOCIAL_ACCENT }}
                onPress={() =>
                  router.push({
                    pathname: '/(screens)/social/edit-profile',
                    params: { profileId: profile.id },
                  } as any)
                }
              >
                <Text className="font-semibold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>
                  {t('social.editProfile')}
                </Text>
              </TouchableOpacity>

              <SocialProfileSwitcherPill />

              {!!profile.bio && (
                <SocialBioText
                  text={profile.bio}
                  numberOfLines={4}
                  style={{
                    fontSize: 13,
                    marginBottom: 12,
                    lineHeight: 19,
                    color: colors.textSecondary,
                    textAlign: 'center',
                  }}
                />
              )}
            </View>

            <View style={{ marginTop: 4, paddingHorizontal: 20 }}>
              <View className="flex-row items-center justify-between mb-1">
                <Text
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: colors.textTertiary }}
                >
                  {t('social.highlights')}
                </Text>
                {(profile.totalPostViews != null || profile.reelCount != null || profile.highlightCount != null) && (
                  <SocialProfileOwnerStatsRow
                    items={[
                      ...(profile.totalPostViews != null
                        ? [{ icon: 'eye-outline', value: profile.totalPostViews, tooltip: t('social.statTotalViewsTooltip') }]
                        : []),
                      ...(profile.reelCount != null
                        ? [{ icon: 'play-box-outline', value: profile.reelCount, tooltip: t('social.statReelCountTooltip') }]
                        : []),
                      ...(profile.highlightCount != null
                        ? [{ icon: 'star-circle-outline', value: profile.highlightCount, tooltip: t('social.statHighlightCountTooltip') }]
                        : []),
                    ]}
                  />
                )}
              </View>
              <SocialStoryHighlights profile={profile} />
            </View>

            <View style={{ marginTop: 8 }}>
              <SocialProfileMediaTabs
                posts={posts ?? []}
                loading={postsLoading && (posts ?? []).length === 0}
                loadingMore={isFetchingMorePosts}
                loadError={postsError}
                onRetry={() => void refetchPosts()}
              />
            </View>
          </>
        ) : (
          <SocialEmptyStateCard
            title={t('social.noProfilePanelTitle')}
            message={getSocialNoProfilePanelMessage(t, userType)}
            actionLabel={
              userType === UserType.FreeBarber || userType === UserType.BarberStore
                ? t('social.noProfilePanelActionBusiness')
                : t('social.noProfilePanelAction')
            }
            onAction={() => exitSocialMode(userType)}
            animationKey="social-no-profile-panel"
          />
        )}
      </ScrollView>

      {profile?.username ? <SocialProfileShareSheet sheet={shareSheet} username={profile.username} /> : null}
    </View>
  );
}
