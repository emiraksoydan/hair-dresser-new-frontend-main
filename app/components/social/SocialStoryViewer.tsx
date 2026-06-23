import React, { useCallback, useEffect, useRef, useState } from 'react';

import {

  Modal,

  View,

  Image,

  TouchableOpacity,

  Dimensions,

  Pressable,

  StatusBar,

  ActivityIndicator,

  KeyboardAvoidingView,

  Platform,

  Animated,

  StyleSheet,

} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Video, ResizeMode } from 'expo-av';

import { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SocialBottomSheet } from './SocialBottomSheet';

import { Icon } from 'react-native-paper';

import { Text } from '../common/Text';

import { SocialPostAuthorRow } from './SocialPostAuthorRow';

import type { SocialStoryGroupDto, SocialStoryViewerDto } from '../../types/social';

import { SocialLikeTargetType, SocialProfileOwnerType } from '../../types/social';

import { useLanguage } from '../../hook/useLanguage';

import { useTheme } from '../../hook/useTheme';

import { useBottomSheet } from '../../hook/useBottomSheet';

import {

  useCreateSocialStoryReplyMutation,

  useGetSocialStoryViewersQuery,

  useLazyGetSocialStoryViewersQuery,

  useRecordSocialStoryViewMutation,

  useToggleSocialLikeMutation,

} from '../../store/api';

import { SOCIAL_ACCENT, SOCIAL_PAIR_BLUE, SOCIAL_PAIR_ORANGE } from '../../constants/socialTheme';

import {

  SOCIAL_STORY_VIEWERS_PAGE_SIZE,

  socialStoryViewersQuery,

} from '../../utils/social/social-pagination';

import { formatSocialCount } from '../../utils/formatSocialCount';

import { useFormatTime } from '../../utils/time/time-formatter';

import {

  socialProfileOwnerLabel,

  socialProfileOwnerNumberLabel,

} from '../../utils/social/socialProfileOwnerLabel';

import { useAppDispatch } from '../../store/hook';

import { showSnack } from '../../store/snackbarSlice';

import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';

import { SocialCommentComposer } from './SocialCommentComposer';



const { width: W, height: H } = Dimensions.get('window');

const STORY_IMAGE_MS = 5000;



function viewerOwnerMeta(type: SocialProfileOwnerType, t: (k: string) => string) {

  switch (type) {

    case SocialProfileOwnerType.FreeBarber:

      return { label: t('social.ownerFreeBarber'), icon: 'content-cut', color: SOCIAL_PAIR_ORANGE };

    case SocialProfileOwnerType.BarberStore:

      return { label: t('social.ownerStore'), icon: 'store-outline', color: SOCIAL_PAIR_BLUE };

    default:

      return { label: t('social.ownerCustomer'), icon: 'account-outline', color: '#6b7280' };

  }

}



type Props = {

  visible: boolean;

  groups: SocialStoryGroupDto[];

  startGroupIndex: number;

  viewerProfileId?: string | null;

  onClose: () => void;

  onViewed: (storyIds: string[]) => void;

  onDeleteStory?: (storyId: string) => void;

  deletingStory?: boolean;

  onAddToHighlight?: (storyId: string) => void;

  /** Öne çıkan içinden tek hikaye kaldırma (sadece kendi highlight'larında) */
  highlightContext?: {
    highlightId: string;
    onRemoveItem: (itemId: string) => void;
    removing?: boolean;
  };

};



export const SocialStoryViewer: React.FC<Props> = ({

  visible,

  groups,

  startGroupIndex,

  viewerProfileId,

  onClose,

  onViewed,

  onDeleteStory,

  deletingStory,

  onAddToHighlight,

  highlightContext,

}) => {

  const { t } = useLanguage();

  const { colors } = useTheme();

  const insets = useSafeAreaInsets();

  const formatTime = useFormatTime();

  const dispatch = useAppDispatch();

  const viewersSheet = useBottomSheet({ snapPoints: ['50%', '85%'] });

  const [recordStoryView] = useRecordSocialStoryViewMutation();

  const [toggleLike] = useToggleSocialLikeMutation();

  const [createReply, { isLoading: replySending }] = useCreateSocialStoryReplyMutation();

  const recordedServerRef = useRef<Set<string>>(new Set());



  const [groupIndex, setGroupIndex] = useState(startGroupIndex);

  const [storyIndex, setStoryIndex] = useState(0);

  const [replyText, setReplyText] = useState('');

  const [likedStoryIds, setLikedStoryIds] = useState<Set<string>>(new Set());

  const progressAnim = useRef(new Animated.Value(0)).current;
  const videoProgressTsRef = useRef(0);

  const imageAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const viewedRef = useRef<Set<string>>(new Set());

  const loadingMoreViewersRef = useRef(false);



  const group = groups[groupIndex];

  const story = group?.stories[storyIndex];

  const isVideo = (story?.durationSec ?? 0) > 0 || !!story?.mediaUrl?.match(/\.(mp4|mov|webm)/i);

  const isLiked = story ? likedStoryIds.has(story.id) || !!story.isLiked : false;

  const isViewerAuthor =
    !!story && !!viewerProfileId && story.profileId === viewerProfileId;

  const canEngage = !!story && !isViewerAuthor && !!viewerProfileId;

  const headerTop = insets.top + 8;

  const footerH = canEngage ? 88 + insets.bottom : isViewerAuthor ? 56 + insets.bottom : 24;



  const viewersQuery = story?.id ? socialStoryViewersQuery(story.id) : null;

  const { data: viewers, isLoading: viewersLoading } = useGetSocialStoryViewersQuery(

    viewersQuery ?? { storyId: '', limit: SOCIAL_STORY_VIEWERS_PAGE_SIZE },

    { skip: !viewersSheet.isOpen || !viewersQuery },

  );

  const [fetchMoreViewers, { isFetching: isFetchingMoreViewers }] = useLazyGetSocialStoryViewersQuery();



  const stopImageProgress = useCallback(() => {

    imageAnimRef.current?.stop();

    imageAnimRef.current = null;

    progressAnim.stopAnimation();

  }, [progressAnim]);



  const handleLoadMoreViewers = useCallback(async () => {

    const list = viewers ?? [];

    if (!viewersQuery || loadingMoreViewersRef.current || isFetchingMoreViewers || list.length === 0) return;

    if (list.length % SOCIAL_STORY_VIEWERS_PAGE_SIZE !== 0) return;

    const last = list[list.length - 1];

    if (!last?.viewId) return;

    loadingMoreViewersRef.current = true;

    try {

      await fetchMoreViewers({

        ...viewersQuery,

        before: last.viewedAt,

        beforeId: last.viewId,

      }).unwrap();

    } catch {

      /* ignore */

    } finally {

      loadingMoreViewersRef.current = false;

    }

  }, [viewers, viewersQuery, isFetchingMoreViewers, fetchMoreViewers]);



  const markCurrentViewed = useCallback(() => {

    if (!story) return;

    viewedRef.current.add(story.id);

    onViewed([story.id]);

  }, [story, onViewed]);



  useEffect(() => {

    if (!visible || !story?.id || !viewerProfileId) return;

    if (recordedServerRef.current.has(story.id)) return;

    recordedServerRef.current.add(story.id);

    recordStoryView({ storyId: story.id, profileId: viewerProfileId }).catch(() => {});

  }, [visible, story?.id, viewerProfileId, recordStoryView]);



  const goNext = useCallback(() => {

    if (!group) return;

    markCurrentViewed();

    stopImageProgress();

    if (storyIndex < group.stories.length - 1) {

      setStoryIndex((i) => i + 1);

      progressAnim.setValue(0);

      return;

    }

    if (groupIndex < groups.length - 1) {

      setGroupIndex((i) => i + 1);

      setStoryIndex(0);

      progressAnim.setValue(0);

      return;

    }

    onClose();

  }, [group, storyIndex, groupIndex, groups.length, markCurrentViewed, onClose, stopImageProgress, progressAnim]);



  const goPrev = useCallback(() => {

    stopImageProgress();

    if (storyIndex > 0) {

      setStoryIndex((i) => i - 1);

      progressAnim.setValue(0);

      return;

    }

    if (groupIndex > 0) {

      const prevGroup = groups[groupIndex - 1];

      setGroupIndex((i) => i - 1);

      setStoryIndex(Math.max(0, (prevGroup?.stories.length ?? 1) - 1));

      progressAnim.setValue(0);

    }

  }, [storyIndex, groupIndex, groups, stopImageProgress, progressAnim]);



  useEffect(() => {

    if (!visible) return;

    setGroupIndex(startGroupIndex);

    setStoryIndex(0);

    progressAnim.setValue(0);

    setReplyText('');

    viewedRef.current = new Set();

    recordedServerRef.current = new Set();

    const initialLiked = new Set<string>();

    groups.forEach((g) =>

      g.stories.forEach((s) => {

        if (s.isLiked) initialLiked.add(s.id);

      }),

    );

    setLikedStoryIds(initialLiked);

  }, [visible, startGroupIndex, groups, progressAnim]);



  useEffect(() => {

    setReplyText('');

  }, [story?.id]);



  useEffect(() => {

    if (!visible || !story || isVideo) return;



    stopImageProgress();

    progressAnim.setValue(0);

    const anim = Animated.timing(progressAnim, {

      toValue: 1,

      duration: STORY_IMAGE_MS,

      useNativeDriver: false,

    });

    imageAnimRef.current = anim;

    anim.start(({ finished }) => {

      if (finished) goNext();

    });



    return () => {

      stopImageProgress();

    };

  }, [visible, story?.id, isVideo, goNext, progressAnim, stopImageProgress]);



  const handleToggleLike = useCallback(async () => {

    if (!story || !viewerProfileId || isViewerAuthor) return;

    const nextLiked = !isLiked;

    setLikedStoryIds((prev) => {

      const next = new Set(prev);

      if (nextLiked) next.add(story.id);

      else next.delete(story.id);

      return next;

    });

    try {

      await toggleLike({

        profileId: viewerProfileId,

        targetType: SocialLikeTargetType.Story,

        targetId: story.id,

      }).unwrap();

    } catch (err: unknown) {

      setLikedStoryIds((prev) => {

        const next = new Set(prev);

        if (nextLiked) next.delete(story.id);

        else next.add(story.id);

        return next;

      });

      const msg =

        err && typeof err === 'object' && 'data' in err

          ? (err as { data?: { message?: string } }).data?.message

          : undefined;

      dispatch(

        showSnack({

          message: translateSocialApiMessage(msg, t),

          isError: true,

        }),

      );

    }

  }, [story, viewerProfileId, isLiked, toggleLike, dispatch, t]);



  const handleSendReply = useCallback(async () => {

    if (!story || !viewerProfileId || !replyText.trim()) return;

    try {

      await createReply({

        storyId: story.id,

        profileId: viewerProfileId,

        text: replyText.trim(),

      }).unwrap();

      setReplyText('');

      dispatch(showSnack({ message: t('social.storyReplySent'), isError: false }));

    } catch (err: unknown) {

      const msg =

        err && typeof err === 'object' && 'data' in err

          ? (err as { data?: { message?: string } }).data?.message

          : undefined;

      dispatch(

        showSnack({

          message: translateSocialApiMessage(msg, t),

          isError: true,

        }),

      );

    }

  }, [story, viewerProfileId, replyText, createReply, dispatch, t]);



  if (!visible || !group || !story) return null;



  const displayViewCount = story.viewCount ?? viewers?.length ?? 0;



  return (

    <>

      <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>

        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <KeyboardAvoidingView

          style={styles.root}

          behavior={Platform.OS === 'ios' ? 'padding' : undefined}

        >

          <View style={styles.root}>

            <View style={StyleSheet.absoluteFill}>

              {isVideo ? (

                <Video

                  key={story.id}

                  source={{ uri: story.mediaUrl }}

                  style={styles.media}

                  resizeMode={ResizeMode.COVER}

                  shouldPlay

                  isLooping={false}

                  onPlaybackStatusUpdate={(status) => {

                    if (!status.isLoaded) return;

                    if (status.durationMillis) {

                      const pct = status.positionMillis / status.durationMillis;

                      const now = Date.now();

                      if (now - videoProgressTsRef.current >= 48) {

                        videoProgressTsRef.current = now;

                        progressAnim.setValue(pct);

                      }

                    }

                    if (status.didJustFinish) goNext();

                  }}

                />

              ) : (

                <Image key={story.id} source={{ uri: story.mediaUrl }} style={styles.media} resizeMode="cover" />

              )}

            </View>



            <LinearGradient

              colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.48)', 'transparent']}

              style={[styles.topGradient, { paddingTop: headerTop }]}

              pointerEvents="box-none"

            >

              <View style={styles.progressRow}>

                {group.stories.map((s, i) => (

                  <View key={s.id} style={styles.progressTrack}>

                    {i < storyIndex ? (

                      <View style={[styles.progressFill, { width: '100%' }]} />

                    ) : i === storyIndex ? (

                      <Animated.View

                        style={[

                          styles.progressFill,

                          {

                            width: progressAnim.interpolate({

                              inputRange: [0, 1],

                              outputRange: ['0%', '100%'],

                            }),

                          },

                        ]}

                      />

                    ) : null}

                  </View>

                ))}

              </View>



              <View style={styles.headerRow}>

                <View style={{ flex: 1, minWidth: 0 }}>

                  <SocialPostAuthorRow
                    profile={group.profile}
                    variant="story"
                    showAvatar
                    avatarSize={40}
                    timeAgo={story?.createdAt ? formatTime(story.createdAt) : undefined}
                  />

                </View>

                {isViewerAuthor && highlightContext && (

                  <TouchableOpacity

                    onPress={() => highlightContext.onRemoveItem(story.id)}

                    disabled={highlightContext.removing}

                    hitSlop={12}

                    style={styles.headerBtn}

                    accessibilityLabel={t('social.removeFromHighlight')}

                  >

                    <Icon source="bookmark-minus-outline" size={22} color="#fff" />

                  </TouchableOpacity>

                )}

                {isViewerAuthor && onAddToHighlight && (

                  <TouchableOpacity onPress={() => onAddToHighlight(story.id)} hitSlop={12} style={styles.headerBtn}>

                    <Icon source="bookmark-outline" size={22} color="#fff" />

                  </TouchableOpacity>

                )}

                {isViewerAuthor && onDeleteStory && (

                  <TouchableOpacity

                    onPress={() => onDeleteStory(story.id)}

                    disabled={deletingStory}

                    hitSlop={12}

                    style={styles.headerBtn}

                  >

                    <Icon source="delete-outline" size={22} color="#fff" />

                  </TouchableOpacity>

                )}

                <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.headerBtn}>

                  <Icon source="close" size={24} color="#fff" />

                </TouchableOpacity>

              </View>

            </LinearGradient>



            <View

              style={[styles.tapRow, { top: headerTop + 72, bottom: footerH }]}

              pointerEvents="box-none"

            >

              <Pressable style={styles.tapZone} onPress={goPrev} />

              <Pressable style={styles.tapZone} onPress={goNext} />

            </View>



            {isViewerAuthor && (

              <LinearGradient

                colors={['transparent', 'rgba(0,0,0,0.55)']}

                style={[styles.bottomGradient, { paddingBottom: insets.bottom + 16 }]}

                pointerEvents="box-none"

              >

                <TouchableOpacity onPress={() => viewersSheet.open()} style={styles.viewersBtn} activeOpacity={0.85}>

                  <Icon source="eye-outline" size={20} color="#fff" />

                  <Text style={styles.viewersText}>

                    {formatSocialCount(displayViewCount)} {t('social.storyViewersLabel')}

                  </Text>

                </TouchableOpacity>

              </LinearGradient>

            )}



            {canEngage && (

              <View style={[styles.replyBar, { paddingBottom: insets.bottom + 8 }]}>

                <SocialCommentComposer

                  variant="story"

                  value={replyText}

                  onChangeText={setReplyText}

                  onSend={() => void handleSendReply()}

                  placeholder={t('social.storyReplyPlaceholder')}

                  sending={replySending}

                  bottomInset={0}

                  isLiked={isLiked}

                  onToggleLike={() => void handleToggleLike()}

                />

              </View>

            )}

          </View>

        </KeyboardAvoidingView>

      </Modal>



      <SocialBottomSheet sheet={viewersSheet}>

        <BottomSheetView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>

          <Text style={{ fontWeight: '700', fontSize: 16, color: colors.headerText, marginBottom: 4 }}>

            {t('social.storyViewersTitle')}

          </Text>

          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>

            {t('social.storyViewersSubtitle', { count: formatSocialCount(displayViewCount) })}

          </Text>

          {viewersLoading ? (

            <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginVertical: 24 }} />

          ) : (

            <BottomSheetFlatList

              data={viewers ?? []}

              keyExtractor={(item: { viewId: string }) => item.viewId}

              onEndReached={handleLoadMoreViewers}

              onEndReachedThreshold={0.35}

              ListFooterComponent={

                isFetchingMoreViewers ? (

                  <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginVertical: 16 }} />

                ) : null

              }

              ListEmptyComponent={

                <Text style={{ textAlign: 'center', color: colors.textSecondary, paddingVertical: 24 }}>

                  {t('social.storyViewersEmpty')}

                </Text>

              }

              renderItem={({ item }: { item: SocialStoryViewerDto }) => {

                const meta = viewerOwnerMeta(item.profile.ownerType, t);

                const numberLabel = socialProfileOwnerNumberLabel(item.profile.ownerType, t);

                const typeLabel = socialProfileOwnerLabel(item.profile.ownerType, t);

                return (

                  <View

                    style={{

                      flexDirection: 'row',

                      alignItems: 'center',

                      paddingVertical: 10,

                      borderBottomWidth: 1,

                      borderBottomColor: colors.borderColor2,

                    }}

                  >

                    <View

                      style={{

                        width: 40,

                        height: 40,

                        borderRadius: 20,

                        marginRight: 12,

                        overflow: 'hidden',

                        backgroundColor: colors.borderColor2,

                      }}

                    >

                      {item.profile.avatarUrl ? (

                        <Image source={{ uri: item.profile.avatarUrl }} style={{ width: 40, height: 40 }} />

                      ) : (

                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>

                          <Icon source="account" size={22} color={colors.headerText} />

                        </View>

                      )}

                    </View>

                    <View style={{ flex: 1 }}>

                      <Text style={{ fontWeight: '700', color: colors.headerText, fontSize: 14 }}>

                        @{item.profile.username}

                      </Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>

                        <View

                          style={{

                            flexDirection: 'row',

                            alignItems: 'center',

                            gap: 4,

                            paddingHorizontal: 8,

                            paddingVertical: 2,

                            borderRadius: 999,

                            backgroundColor: `${meta.color}18`,

                          }}

                        >

                          <Icon source={meta.icon} size={12} color={meta.color} />

                          <Text style={{ fontSize: 11, fontWeight: '600', color: meta.color }}>{typeLabel}</Text>

                        </View>

                        {item.profile.ownerNumber ? (

                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>

                            {numberLabel} #{item.profile.ownerNumber}

                          </Text>

                        ) : null}

                      </View>

                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>

                        {formatTime(item.viewedAt)}

                      </Text>

                    </View>

                    {item.isLiked && <Icon source="thumb-up" size={18} color={SOCIAL_ACCENT} />}

                  </View>

                );

              }}

              contentContainerStyle={{ paddingBottom: 24 }}

            />

          )}

        </BottomSheetView>

      </SocialBottomSheet>

    </>

  );

};



const styles = StyleSheet.create({

  root: {

    flex: 1,

    backgroundColor: '#000',

  },

  media: {

    width: W,

    height: H,

  },

  topGradient: {

    position: 'absolute',

    top: 0,

    left: 0,

    right: 0,

    zIndex: 20,

    paddingHorizontal: 12,

    paddingBottom: 18,

  },

  progressRow: {

    flexDirection: 'row',

    gap: 3,

    marginBottom: 10,

  },

  progressTrack: {

    flex: 1,

    height: 2.5,

    borderRadius: 2,

    backgroundColor: 'rgba(255,255,255,0.35)',

    overflow: 'hidden',

  },

  progressFill: {

    height: '100%',

    backgroundColor: '#fff',

  },

  headerRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

  },

  headerBtn: {

    padding: 4,

    marginLeft: 4,

  },

  tapRow: {

    position: 'absolute',

    left: 0,

    right: 0,

    flexDirection: 'row',

    zIndex: 10,

  },

  tapZone: {

    flex: 1,

  },

  bottomGradient: {

    position: 'absolute',

    left: 0,

    right: 0,

    bottom: 0,

    zIndex: 20,

    paddingTop: 24,

    alignItems: 'center',

  },

  viewersBtn: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 8,

  },

  viewersText: {

    color: '#fff',

    fontWeight: '600',

    fontSize: 14,

  },

  replyBar: {

    position: 'absolute',

    bottom: 0,

    left: 0,

    right: 0,

    zIndex: 25,

  },

});

