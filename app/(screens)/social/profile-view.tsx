import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { SocialBottomSheet } from '../../components/social/SocialBottomSheet';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/common/Text';
import { AnimatedCountText } from '../../components/common/AnimatedCountText';
import { SocialBioText } from '../../components/social/SocialBioText';
import { SocialProfileMediaTabs } from '../../components/social/SocialProfileMediaTabs';
import { SocialProfileViewMenu } from '../../components/social/SocialProfileViewMenu';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAlert } from '../../hook/useAlert';
import { useActionGuard } from '../../hook/useActionGuard';
import { useBottomSheet } from '../../hook/useBottomSheet';
import {
  useBlockUserMutation,
  useEnsureSocialChatThreadMutation,
  useFollowSocialProfileMutation,
  useGetSocialProfileByOwnerQuery,
  useGetSocialProfileByUsernameQuery,
  useGetSocialProfileQuery,
  useGetSocialProfilePostsQuery,
  useLazyGetSocialProfilePostsQuery,
  useGetSocialStoryHighlightsQuery,
  useGetSocialProfileStoriesQuery,
  useUnfollowSocialProfileMutation,
  useToggleSocialProfileMuteMutation,
} from '../../store/api';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { FavoriteTargetType } from '../../types';
import { SocialProfileOwnerType, type SocialStoryGroupDto } from '../../types/social';
import { SocialStoryHighlights } from '../../components/social/SocialStoryHighlights';
import { SocialStoryViewer } from '../../components/social/SocialStoryViewer';
import { useStoryViews } from '../../hook/useStoryViews';
import { SocialProfileVisitorCoverHeader } from '../../components/social/SocialProfileVisitorCoverHeader';
import { SocialStoryRingAvatar } from '../../components/social/SocialStoryRingAvatar';
import { SocialProfileShareSheet } from '../../components/social/SocialProfileShareSheet';
import { SocialMutualFollowersSheet } from '../../components/social/SocialMutualFollowersSheet';
import { SocialReportBottomSheet } from '../../components/social/SocialReportBottomSheet';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import { formatSocialCount } from '../../utils/formatSocialCount';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { socialProfileOwnerLabel } from '../../utils/social/socialProfileOwnerLabel';
import {
  SOCIAL_PROFILE_POSTS_PAGE_SIZE,
  socialProfilePostsQuery,
} from '../../utils/social/social-pagination';
import { isActiveSocialProfile } from '../../utils/social/socialActiveProfileScope';

const AVATAR = 60;
const LEFT_COL_W = 96;
const ACTION_BTN_RADIUS = 10;
const ICON_BTN_SIZE = 32;
const ACTION_LABEL = { fontSize: 10, fontWeight: '700' as const, lineHeight: 13 };

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
    <View className="items-center min-w-[44px]">
      <AnimatedCountText
        value={value}
        formatValue={formatSocialCount}
        className="font-bold text-sm"
        style={{ color: colors.headerText }}
        numberOfLines={1}
      />
      <Text
        className="text-[10px] mt-0.5 text-center"
        style={{ color: colors.textSecondary }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

export default function SocialProfileViewScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
    const router = useSafeNavigation();
  const { goBack } = router;
  const dispatch = useAppDispatch();
  const { confirm, alertSuccess, alertError } = useAlert();
  const guard = useActionGuard();
  const params = useLocalSearchParams<{
    ownerType?: string;
    ownerId?: string;
    profileId?: string;
    username?: string;
    openStoryId?: string;
  }>();

  const profileIdParam = params.profileId ? String(params.profileId) : '';
  const openStoryIdParam = params.openStoryId ? String(params.openStoryId) : '';
  const usernameParam = params.username ? String(params.username).toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
  const ownerType = Number(params.ownerType);
  const ownerId = String(params.ownerId ?? '');
  const useUsernameLookup = !profileIdParam && !!usernameParam;
  const useOwnerLookup = !profileIdParam && !usernameParam && !!ownerId && !Number.isNaN(ownerType);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        /* konum yok */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const geoArg = coords ? { latitude: coords.latitude, longitude: coords.longitude } : {};

  const { data: profileById, isLoading: loadingById, isError: errorById } = useGetSocialProfileQuery(
    profileIdParam ? { profileId: profileIdParam, ...geoArg } : profileIdParam,
    { skip: !profileIdParam },
  );
  const { data: profileByUsername, isLoading: loadingByUsername, isError: errorByUsername } =
    useGetSocialProfileByUsernameQuery(usernameParam, { skip: !useUsernameLookup });
  const { data: profileByOwner, isLoading: loadingByOwner, isError: errorByOwner } =
    useGetSocialProfileByOwnerQuery({ ownerType, ownerId, ...geoArg }, { skip: !useOwnerLookup });

  const profile = profileIdParam ? profileById : useUsernameLookup ? profileByUsername : profileByOwner;
  const isLoading = profileIdParam ? loadingById : useUsernameLookup ? loadingByUsername : loadingByOwner;
  const isError = profileIdParam ? errorById : useUsernameLookup ? errorByUsername : errorByOwner;

  const { activeProfileId: myProfileId } = useActiveSocialProfile();

  const { data: highlights } = useGetSocialStoryHighlightsQuery(profile?.id ?? '', {
    skip: !profile?.id,
  });
  const showHighlightsSection =
    isActiveSocialProfile(profile?.id, myProfileId) || (highlights?.length ?? 0) > 0;

  const iconBtnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

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
  const { data: profileStories } = useGetSocialProfileStoriesQuery(profile?.id ?? '', {
    skip: !profile?.id || !openStoryIdParam,
  });

  const { markViewed } = useStoryViews();
  const openedStoryRef = useRef(false);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerGroup, setStoryViewerGroup] = useState<SocialStoryGroupDto | null>(null);
  const [follow, { isLoading: following }] = useFollowSocialProfileMutation();
  const [unfollow, { isLoading: unfollowing }] = useUnfollowSocialProfileMutation();
  const [ensureChat, { isLoading: startingChat }] = useEnsureSocialChatThreadMutation();
  const [blockUser, { isLoading: blocking }] = useBlockUserMutation();
  const [toggleMute] = useToggleSocialProfileMuteMutation();
  const reportSheet = useBottomSheet({ snapPoints: ['70%'], enableHandlePanningGesture: false });
  const shareSheet = useBottomSheet(['58%']);
  const mutualSheet = useBottomSheet(['72%']);

  useEffect(() => {
    if (!profile || !openStoryIdParam || !profileStories?.length || openedStoryRef.current) return;
    const story = profileStories.find((s) => s.id === openStoryIdParam);
    if (!story) return;
    openedStoryRef.current = true;
    setStoryViewerGroup({
      profile,
      hasUnviewed: false,
      stories: [story],
    });
    setStoryViewerOpen(true);
  }, [profile, openStoryIdParam, profileStories]);

  const canFollow = profile && !profile.isOwnProfile && myProfileId;
  const canMessage = profile && !profile.isOwnProfile;
  const canModerate = profile && !profile.isOwnProfile && !!profile.userId;
  const isBookable =
    profile &&
    (profile.ownerType === SocialProfileOwnerType.FreeBarber ||
      profile.ownerType === SocialProfileOwnerType.BarberStore);
  const favoriteTargetType =
    profile?.ownerType === SocialProfileOwnerType.BarberStore
      ? FavoriteTargetType.Store
      : profile?.ownerType === SocialProfileOwnerType.FreeBarber
        ? FavoriteTargetType.FreeBarber
        : undefined;
  const { isFavorite, toggleFavorite, favoriteDisabled } = useFavoriteToggle({
    targetId: profile?.ownerId ?? '',
    targetType: favoriteTargetType,
    counterpartyUserId: profile?.userId,
    skipQuery: !isBookable || !profile?.ownerId,
  });

  const visitorEmptyMessages = useMemo(
    () => ({
      posts: t('social.profileVisitorPostsEmpty'),
      videos: t('social.profileVisitorVideosEmpty'),
      reels: t('social.profileVisitorReelsEmpty'),
    }),
    [t],
  );

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

  const handleFollowToggle = () =>
    guard(async () => {
      if (!profile || !myProfileId) return;
      if (profile.isFollowing) {
        await unfollow({ followerProfileId: myProfileId, followingProfileId: profile.id });
      } else {
        await follow({ followerProfileId: myProfileId, followingProfileId: profile.id });
      }
    });

  const handleMessage = useCallback(() => {
    guard(async () => {
      if (!profile?.id || !myProfileId) return;
      try {
        const res = await ensureChat({ fromProfileId: myProfileId, toProfileId: profile.id }).unwrap();
        const threadId = res?.data;
        if (threadId) {
          router.push({
            pathname: '/(screens)/chat/[threadId]',
            params: { threadId, source: 'social' },
          } as any);
        } else {
          dispatch(showSnack({ message: t('social.messageFailed'), isError: true }));
        }
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'data' in e
            ? (e as { data?: { message?: string } }).data?.message
            : undefined;
        dispatch(
          showSnack({
            message: translateSocialApiMessage(msg, t, t('social.messageFailed')),
            isError: true,
          }),
        );
      }
    });
  }, [profile?.id, myProfileId, ensureChat, router, dispatch, t, guard]);

  const handleToggleMute = useCallback(() => {
    guard(async () => {
      if (!profile || !myProfileId) return;
      try {
        await toggleMute({
          mutedByProfileId: myProfileId,
          mutedProfileId: profile.id,
        }).unwrap();
        dispatch(
          showSnack({
            message: profile.isMuted ? t('social.unmuteProfileSuccess') : t('social.muteProfileSuccess'),
            isError: false,
          }),
        );
      } catch {
        dispatch(showSnack({ message: t('common.error'), isError: true }));
      }
    });
  }, [profile, myProfileId, toggleMute, dispatch, t, guard]);

  const handleBook = useCallback(() => {
    if (!profile) return;
    if (profile.ownerType === SocialProfileOwnerType.FreeBarber) {
      router.push({ pathname: '/freebarber/[freeBarberId]', params: { freeBarberId: profile.ownerId } } as any);
      return;
    }
    if (profile.ownerType === SocialProfileOwnerType.BarberStore) {
      router.push({ pathname: '/store/[storeId]', params: { storeId: profile.ownerId } } as any);
    }
  }, [profile, router]);

  const handleBlock = useCallback(() => {
    if (!profile?.userId) return;
    confirm(
      t('block.confirmTitle'),
      t('block.confirmMessage', { name: profile.username }),
      () =>
        guard(async () => {
          const result = await blockUser({ blockedToUserId: profile.userId });
          if ('error' in result) {
            const errorMessage =
              (result.error as { data?: { message?: string } })?.data?.message || t('block.createError');
            alertError(t('common.error'), errorMessage);
            return;
          }
          alertSuccess(t('common.success'), t('block.createSuccess'));
          goBack();
        }),
      undefined,
      t('block.submit'),
      t('common.cancel'),
    );
  }, [profile, blockUser, confirm, guard, alertError, alertSuccess, t, goBack]);

  const renderVisitorAvatar = () => (
    <View className="items-center shrink-0" style={{ width: LEFT_COL_W }}>
      {profile!.hasActiveStory ? (
        <SocialStoryRingAvatar avatarUrl={profile!.avatarUrl} size={AVATAR + 8} ringColor={SOCIAL_ACCENT} />
      ) : (
        <View
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: AVATAR / 2,
            overflow: 'hidden',
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {profile!.avatarUrl ? (
            <Image source={{ uri: profile!.avatarUrl }} style={{ width: AVATAR, height: AVATAR }} />
          ) : (
            <Icon source="account" size={30} color={colors.headerText} />
          )}
        </View>
      )}
      <Text
        className="font-bold text-xs mt-2 text-center px-0.5"
        style={{ color: colors.headerText, width: LEFT_COL_W }}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        @{profile!.username}
      </Text>
    </View>
  );

  const renderVisitorStatsRow = () => (
    <View className="flex-row items-start justify-between pt-0.5">
      <ProfileStat value={profile!.postCount} label={t('social.posts')} colors={colors} />
      <ProfileStat
        value={profile!.followerCount}
        label={t('social.followers')}
        colors={colors}
        onPress={() =>
          router.push({
            pathname: '/(screens)/social/follow-list',
            params: { profileId: profile!.id, kind: 'followers', username: profile!.username },
          } as any)
        }
      />
      <ProfileStat
        value={profile!.followingCount}
        label={t('social.following')}
        colors={colors}
        onPress={() =>
          router.push({
            pathname: '/(screens)/social/follow-list',
            params: { profileId: profile!.id, kind: 'following', username: profile!.username },
          } as any)
        }
      />
    </View>
  );

  const renderVisitorActions = () => {
    if (!profile || (!canFollow && !isBookable && !canMessage)) return null;

    return (
      <View
        className={`flex-row items-center gap-1.5 ${profile.coverUrl ? 'justify-center mb-1 mt-1' : 'mt-2'}`}
        style={{ flexWrap: 'nowrap' }}
      >
        {canFollow ? (
          <TouchableOpacity
            onPress={handleFollowToggle}
            disabled={following || unfollowing}
            className="px-1.5 items-center justify-center"
            style={{
              flex: 1,
              minWidth: 0,
              height: ICON_BTN_SIZE,
              borderRadius: ACTION_BTN_RADIUS,
              backgroundColor: profile.isFollowing ? colors.cardBg : SOCIAL_ACCENT,
              borderWidth: profile.isFollowing ? 1 : 0,
              borderColor: colors.borderColor2,
              opacity: following || unfollowing ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                ...ACTION_LABEL,
                color: profile.isFollowing ? colors.headerText : SOCIAL_ACCENT_TEXT,
              }}
              numberOfLines={1}
            >
              {profile.isFollowing ? t('social.following') : t('social.follow')}
            </Text>
          </TouchableOpacity>
        ) : null}
        {isBookable ? (
          <TouchableOpacity
            onPress={handleBook}
            disabled={favoriteDisabled}
            className="px-1.5 items-center justify-center"
            style={{
              flex: 1,
              minWidth: 0,
              height: ICON_BTN_SIZE,
              borderRadius: ACTION_BTN_RADIUS,
              backgroundColor: SOCIAL_ACCENT,
              opacity: favoriteDisabled ? 0.5 : 1,
            }}
          >
            <Text style={{ ...ACTION_LABEL, color: SOCIAL_ACCENT_TEXT }} numberOfLines={1}>
              {t('card.bookAppointment')}
            </Text>
          </TouchableOpacity>
        ) : null}
        {isBookable ? (
          <TouchableOpacity
            onPress={() => toggleFavorite()}
            disabled={favoriteDisabled}
            className="items-center justify-center"
            style={{
              width: ICON_BTN_SIZE,
              height: ICON_BTN_SIZE,
              borderRadius: ACTION_BTN_RADIUS,
              backgroundColor: colors.cardBg,
              borderWidth: 1,
              borderColor: colors.borderColor2,
              opacity: favoriteDisabled ? 0.5 : 1,
            }}
          >
            <Icon
              source={isFavorite ? 'heart' : 'heart-outline'}
              size={15}
              color={isFavorite ? '#ef4444' : colors.headerText}
            />
          </TouchableOpacity>
        ) : null}
        {canMessage ? (
          <TouchableOpacity
            onPress={() => shareSheet.open()}
            disabled={startingChat}
            className="items-center justify-center"
            style={{
              width: ICON_BTN_SIZE,
              height: ICON_BTN_SIZE,
              borderRadius: ACTION_BTN_RADIUS,
              backgroundColor: colors.cardBg,
              borderWidth: 1,
              borderColor: colors.borderColor2,
            }}
            accessibilityLabel={t('social.shareProfile')}
          >
            <Icon source="qrcode" size={15} color={colors.headerText} />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={['top']}>
      <View
        className="flex-row items-center gap-3 px-3 py-2.5 border-b"
        style={{ borderBottomColor: colors.borderColor2 }}
      >
        <TouchableOpacity onPress={goBack} hitSlop={12} className="p-1">
          <Icon source="arrow-left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View className="flex-1 min-w-0">
          <Text
            className="text-base font-bold"
            style={{ color: colors.headerText }}
            numberOfLines={1}
          >
            {profile?.username ?? t('social.noProfile')}
          </Text>
          {profile ? (
            <View className="flex-row items-center flex-wrap gap-x-1.5 mt-0.5">
              <Text className="text-[10px]" style={{ color: colors.textSecondary }} numberOfLines={1}>
                {socialProfileOwnerLabel(profile.ownerType, t)}
              </Text>
              {profile.ownerNumber ? (
                <Text className="text-[10px] font-bold" style={{ color: colors.textSecondary }} numberOfLines={1}>
                  #{profile.ownerNumber}
                </Text>
              ) : null}
              {profile.distanceKm != null ? (
                <Text className="text-[10px]" style={{ color: colors.textSecondary }} numberOfLines={1}>
                  · {t('social.distanceAway', { km: profile.distanceKm })}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        {canMessage && (
          <TouchableOpacity
            onPress={handleMessage}
            disabled={startingChat}
            hitSlop={10}
            className="w-9 h-9 items-center justify-center rounded-full mr-1"
            style={{ backgroundColor: iconBtnBg, opacity: startingChat ? 0.5 : 1 }}
            accessibilityLabel={t('social.sendMessage')}
          >
            <Icon source="message-outline" size={20} color={colors.headerText} />
          </TouchableOpacity>
        )}
        {canModerate && (
          <SocialProfileViewMenu
            onReport={() => reportSheet.present()}
            onBlock={handleBlock}
            onShare={() => shareSheet.open()}
            onToggleMute={myProfileId ? handleToggleMute : undefined}
            isMuted={profile?.isMuted}
            disabled={blocking}
          />
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
        </View>
      ) : isError || !profile ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center" style={{ color: colors.textSecondary }}>
            {t('social.profileNotFound')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          onScroll={handleScroll}
          scrollEventThrottle={200}
        >
          {profile.coverUrl ? <SocialProfileVisitorCoverHeader profile={profile} /> : null}

          <View className="px-4 pt-4">
            <View className="flex-row items-start gap-2 mb-3">
              {renderVisitorAvatar()}
              <View className="flex-1 min-w-0">
                {renderVisitorStatsRow()}
                {renderVisitorActions()}
              </View>
            </View>

            {!!profile.averageRating && !!profile.ratingCount && (
              <View className="flex-row items-center gap-1 mb-2 mt-2">
                <Icon source="star" size={14} color="#f59e0b" />
                <Text className="text-xs font-semibold" style={{ color: colors.headerText }}>
                  {t('social.profileRating', {
                    rating: profile.averageRating,
                    count: profile.ratingCount,
                  })}
                </Text>
              </View>
            )}

            {profile.isAvailable === true && (
                  <View className="flex-row items-center gap-1 mt-1">
                    <View className="w-2 h-2 rounded-full bg-green-500" />
                    <Text className="text-xs font-semibold" style={{ color: '#22c55e' }}>
                      {t('social.availableNow')}
                    </Text>
                  </View>
                )}

                {(profile.mutualFollowerCount ?? 0) > 0 && !profile.isOwnProfile && (
                  <TouchableOpacity onPress={() => mutualSheet.open()} activeOpacity={0.75} className="mt-1">
                    <Text className="text-xs" style={{ color: colors.textSecondary }}>
                      {t('social.mutualFollowers', { count: profile.mutualFollowerCount })}
                    </Text>
                  </TouchableOpacity>
                )}

            {!!profile.bio && (
              <SocialBioText
                text={profile.bio}
                numberOfLines={4}
                style={{ fontSize: 12, marginBottom: 8, lineHeight: 18, color: colors.textSecondary }}
              />
            )}

            {!!profile.externalUrl && (
              <TouchableOpacity
                onPress={() => Linking.openURL(profile.externalUrl!).catch(() => {})}
                className="flex-row items-center gap-1.5 mb-2"
              >
                <Icon source="link-variant" size={14} color={SOCIAL_ACCENT} />
                <Text className="text-xs font-semibold" style={{ color: SOCIAL_ACCENT }} numberOfLines={1}>
                  {profile.externalUrl}
                </Text>
              </TouchableOpacity>
            )}

            {showHighlightsSection ? (
            <View style={{ marginTop: 8 }}>
              <Text
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: colors.textTertiary }}
              >
                {t('social.highlights')}
              </Text>
              <SocialStoryHighlights profile={profile} />
            </View>
            ) : null}
          </View>

          <View style={{ marginHorizontal: 0 }}>
            <SocialProfileMediaTabs
              posts={posts ?? []}
              loading={postsLoading && (posts ?? []).length === 0}
              loadingMore={isFetchingMorePosts}
              loadError={postsError}
              onRetry={() => void refetchPosts()}
              emptyMessages={visitorEmptyMessages}
            />
          </View>
        </ScrollView>
      )}

      {canModerate && profile && (
        <SocialBottomSheet sheet={reportSheet}>
          <SocialReportBottomSheet
            targetUserId={profile.userId}
            targetName={`@${profile.username}`}
            targetImage={profile.avatarUrl ?? undefined}
            onClose={reportSheet.dismiss}
          />
        </SocialBottomSheet>
      )}
      {profile?.username ? <SocialProfileShareSheet sheet={shareSheet} username={profile.username} /> : null}
      {profile && !profile.isOwnProfile && (profile.mutualFollowerCount ?? 0) > 0 ? (
        <SocialMutualFollowersSheet
          sheet={mutualSheet}
          profileId={profile.id}
          username={profile.username}
        />
      ) : null}
      {storyViewerGroup ? (
        <SocialStoryViewer
          visible={storyViewerOpen}
          groups={[storyViewerGroup]}
          startGroupIndex={0}
          viewerProfileId={myProfileId}
          onClose={() => {
            setStoryViewerOpen(false);
            setStoryViewerGroup(null);
          }}
          onViewed={markViewed}
        />
      ) : null}
    </SafeAreaView>
  );
}
