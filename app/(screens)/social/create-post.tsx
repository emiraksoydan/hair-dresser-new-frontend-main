import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { Text } from '../../components/common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAuth } from '../../hook/useAuth';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { getSocialProfileRequiredMessage } from '../../utils/social/socialNoProfileMessage';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { SocialCaptionInput } from '../../components/social/SocialCaptionInput';
import { KeyboardDismissExclusionView } from '../../components/common/KeyboardDismissExclusionView';
import { useCreateSocialPostMutation } from '../../store/api';
import { SocialPostType } from '../../types/social';
import type { FileObject } from '../../types';
import { useSocialLimits } from '../../hook/useSocialLimits';
import { pickSocialPhotos, pickSocialVideo, pickCarouselMedia, prepareSocialImagesForUpload, type StoryItemPick } from '../../utils/social/pickSocialMedia';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import {
  SOCIAL_ACCENT,
  SOCIAL_ACCENT_SOFT,
  SOCIAL_ACCENT_SOFT_DARK,
  SOCIAL_ACCENT_TEXT,
} from '../../constants/socialTheme';
import { SocialLocalMediaThumb } from '../../components/social/SocialLocalMediaThumb';
import { SocialProfilePostAsPicker } from '../../components/social/SocialProfileSwitcher';

type PostMode = 'photo' | 'carousel' | 'video' | 'reel';

const MODE_TO_TYPE: Record<PostMode, SocialPostType> = {
  photo: SocialPostType.Photo,
  carousel: SocialPostType.Carousel,
  video: SocialPostType.Video,
  reel: SocialPostType.Reel,
};

const MODES: { key: PostMode; icon: string }[] = [
  { key: 'photo', icon: 'image-outline' },
  { key: 'carousel', icon: 'image-multiple-outline' },
  { key: 'video', icon: 'video-outline' },
  { key: 'reel', icon: 'play-box-outline' },
];

const MEDIA_PREVIEW_H = Math.min(320, Dimensions.get('window').width * 0.7);
const THUMB_SIZE = 112;
const MEDIA_DELETE_RED = '#ef4444';

type ModeChipProps = {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

function ModeChip({ icon, label, active, onPress }: ModeChipProps) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full mr-2"
      style={{
        backgroundColor: active ? SOCIAL_ACCENT : colors.cardBg,
        borderWidth: 1,
        borderColor: active ? SOCIAL_ACCENT : isDark ? colors.borderColor2 : colors.borderColor,
      }}
    >
      <Icon source={icon} size={16} color={active ? SOCIAL_ACCENT_TEXT : colors.headerText} />
      <Text
        className="text-[12px] font-semibold"
        style={{ color: active ? SOCIAL_ACCENT_TEXT : colors.headerText }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function SocialCreatePostScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { userType } = useAuth();
  const router = useSafeNavigation();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const captionLayoutRef = useRef({ y: 0, height: 0 });
  const inputFocusedRef = useRef(false);

  const params = useLocalSearchParams<{
    profileId?: string;
    mode?: string;
    caption?: string;
    appointmentId?: string;
  }>();
  const { profiles, activeProfileId, setActiveProfileId, isLoading: profilesLoading } =
    useActiveSocialProfile();
  const [createPost, { isLoading: submitting }] = useCreateSocialPostMutation();
  const { limits } = useSocialLimits();
  const carouselMax = limits.postCarouselMaxImages;
  const videoMaxSec = limits.postVideoMaxDurationSec;

  const [mode, setMode] = useState<PostMode>('photo');
  const [photos, setPhotos] = useState<FileObject[]>([]);
  const [carouselItems, setCarouselItems] = useState<StoryItemPick[]>([]);
  const [video, setVideo] = useState<FileObject | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number | undefined>();
  const [caption, setCaption] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const fromRoute = params.profileId ? String(params.profileId) : '';
    if (fromRoute && profiles.some((p) => p.id === fromRoute)) {
      setActiveProfileId(fromRoute);
    }
  }, [params.profileId, profiles, setActiveProfileId]);

  useEffect(() => {
    const m = params.mode ? String(params.mode) : '';
    if (m === 'photo' || m === 'carousel' || m === 'video' || m === 'reel') {
      setMode(m);
    }
  }, [params.mode]);

  useEffect(() => {
    const fromCaption = params.caption ? String(params.caption) : '';
    if (fromCaption) setCaption(fromCaption);
  }, [params.caption]);

  const onCaptionSectionLayout = useCallback((e: LayoutChangeEvent) => {
    captionLayoutRef.current = {
      y: e.nativeEvent.layout.y,
      height: e.nativeEvent.layout.height,
    };
  }, []);

  const scrollCaptionIntoView = useCallback((kbHeight?: number) => {
    const kb = kbHeight ?? keyboardHeight;
    if (kb <= 0) return;

    const { y, height } = captionLayoutRef.current;
    const headerH = insets.top + 52;
    const viewportH = Dimensions.get('window').height - headerH - kb;
    const captionBottom = y + height;
    const visibleBottom = scrollYRef.current + viewportH;

    if (captionBottom > visibleBottom - 12) {
      scrollRef.current?.scrollTo({
        y: Math.max(0, captionBottom - viewportH + 24),
        animated: true,
      });
    }
  }, [keyboardHeight, insets.top]);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      const h = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(h);
      if (inputFocusedRef.current) {
        setTimeout(() => scrollCaptionIntoView(h), Platform.OS === 'ios' ? 40 : 80);
      }
    };
    const onHide = () => setKeyboardHeight(0);
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollCaptionIntoView]);

  const handleCaptionFocus = useCallback(() => {
    inputFocusedRef.current = true;
  }, []);

  const handleCaptionBlur = useCallback(() => {
    inputFocusedRef.current = false;
  }, []);

  const isVideoMode = mode === 'video' || mode === 'reel';

  const canSubmit = useMemo(() => {
    if (!activeProfileId) return false;
    if (isVideoMode) return !!video;
    if (mode === 'photo') return photos.length === 1;
    if (mode === 'carousel') return carouselItems.length >= 2;
    return false;
  }, [activeProfileId, isVideoMode, video, photos, carouselItems, mode]);

  const mediaHint = useMemo(() => {
    if (isVideoMode) return t('social.pickVideo', { max: videoMaxSec });
    if (mode === 'carousel') return t('social.carouselHint', { max: carouselMax });
    return t('social.photoHint');
  }, [isVideoMode, mode, t, carouselMax, videoMaxSec]);

  const emptyMediaIcon = isVideoMode
    ? mode === 'reel'
      ? 'play-box-outline'
      : 'video-plus-outline'
    : mode === 'carousel'
      ? 'image-multiple-outline'
      : 'image-plus-outline';

  const resetMedia = useCallback(() => {
    setPhotos([]);
    setCarouselItems([]);
    setVideo(null);
    setVideoDurationSec(undefined);
  }, []);

  const onModeChange = useCallback(
    (next: PostMode) => {
      setMode(next);
      resetMedia();
    },
    [resetMedia],
  );

  const handleAddPhotos = useCallback(async () => {
    const max = mode === 'photo' ? 1 : carouselMax;
    const picked = await pickSocialPhotos(photos.length, max);
    if (!picked?.length) return;
    if (mode === 'photo') {
      setPhotos([picked[0]!]);
      return;
    }
    setPhotos((prev) => [...prev, ...picked].slice(0, carouselMax));
  }, [mode, photos.length, carouselMax]);

  const handlePickVideo = useCallback(async () => {
    const picked = await pickSocialVideo();
    if (!picked || picked.kind !== 'video') return;
    setVideo(picked.file);
    setVideoDurationSec(picked.durationSec);
    setPhotos([]);
  }, []);

  const handleAddCarouselMedia = useCallback(async () => {
    const remaining = carouselMax - carouselItems.length;
    const picked = await pickCarouselMedia(remaining);
    if (!picked?.length) return;
    setCarouselItems((prev) => [...prev, ...picked].slice(0, carouselMax));
  }, [carouselItems.length, carouselMax]);

  const handleRemoveCarouselItem = useCallback((index: number) => {
    setCarouselItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMediaPress = useCallback(() => {
    if (isVideoMode) {
      void handlePickVideo();
      return;
    }
    if (mode === 'carousel') {
      void handleAddCarouselMedia();
      return;
    }
    void handleAddPhotos();
  }, [isVideoMode, mode, handlePickVideo, handleAddPhotos, handleAddCarouselMedia]);

  const handleSubmit = useCallback(async () => {
    if (!activeProfileId) {
      dispatch(showSnack({ message: getSocialProfileRequiredMessage(t, userType), isError: true }));
      return;
    }
    if (!canSubmit) {
      dispatch(showSnack({ message: t('social.mediaRequired'), isError: true }));
      return;
    }

    let files: FileObject[];
    if (isVideoMode && video) {
      files = [video];
    } else if (mode === 'carousel') {
      const photoItems = carouselItems.filter((item) => !item.isVideo);
      const preparedPhotos =
        photoItems.length > 0
          ? await prepareSocialImagesForUpload(photoItems.map((item) => item.file))
          : [];
      let photoIdx = 0;
      files = carouselItems.map((item) => {
        if (item.isVideo) return item.file;
        return preparedPhotos[photoIdx++]!;
      });
    } else {
      files = await prepareSocialImagesForUpload(photos);
    }
    const durationSecs =
      mode === 'carousel'
        ? carouselItems.map((item) => (item.isVideo ? item.durationSec ?? 1 : 0))
        : undefined;
    try {
      const appointmentId = params.appointmentId ? String(params.appointmentId) : undefined;
      const res = await createPost({
        profileId: activeProfileId,
        caption: caption.trim() || undefined,
        type: MODE_TO_TYPE[mode],
        files,
        durationSec: isVideoMode ? videoDurationSec : undefined,
        durationSecs,
        appointmentId,
      }).unwrap();

      if (res?.success) {
        dispatch(showSnack({ message: t('social.postCreated'), isError: false }));
        router.back();
        return;
      }
      dispatch(
        showSnack({
          message: translateSocialApiMessage(res?.message, t, t('social.postFailed')),
          isError: true,
        }),
      );
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'data' in e
          ? (e as { data?: { message?: string } }).data?.message
          : undefined;
      dispatch(
        showSnack({
          message: translateSocialApiMessage(msg, t, t('social.postFailed')),
          isError: true,
        }),
      );
    }
  }, [
    activeProfileId,
    canSubmit,
    isVideoMode,
    video,
    photos,
    carouselItems,
    createPost,
    caption,
    mode,
    videoDurationSec,
    dispatch,
    t,
    params.appointmentId,
    router,
  ]);

  const headerBtnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  if (profilesLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.screenBg }}>
        <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
      </View>
    );
  }

  const hasPhotoMedia = mode === 'photo' && photos.length > 0;
  const hasCarouselMedia = mode === 'carousel' && carouselItems.length > 0;
  const hasVideoMedia = isVideoMode && !!video;
  const showEmptyMedia = !hasPhotoMedia && !hasCarouselMedia && !hasVideoMedia;
  const canAddMorePhotos =
    mode === 'photo' && photos.length < 1;
  const canAddMoreCarousel = mode === 'carousel' && carouselItems.length < carouselMax;

  const scrollBottomPad =
    keyboardHeight > 0 ? keyboardHeight - insets.bottom + 20 : insets.bottom + 24;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.screenBg }}>
        <View className="relative flex-row items-center justify-between w-full px-3 py-2 min-h-[52px]">
          <View className="w-[72px] items-start z-[1]">
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={12}
              className="w-[38px] h-[38px] rounded-full items-center justify-center"
              style={{ backgroundColor: headerBtnBg }}
            >
              <Icon source="close" size={22} color={colors.headerText} />
            </TouchableOpacity>
          </View>

          <Text
            className="absolute left-0 right-0 text-center text-base font-bold"
            style={{ color: colors.headerText }}
            pointerEvents="none"
          >
            {t('social.createPost')}
          </Text>

          <View className="w-[72px] items-end z-[1]">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              className={`px-4 py-2 rounded-full min-w-[68px] items-center justify-center ${!canSubmit || submitting ? 'opacity-45' : ''}`}
              style={{ backgroundColor: SOCIAL_ACCENT }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={SOCIAL_ACCENT_TEXT} style={{ transform: [{ scale: 0.85 }] }} />
              ) : (
                <Text className="font-bold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>{t('social.share')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardDismissExclusionView className="flex-1">
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: scrollBottomPad,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          nestedScrollEnabled
          onScroll={(e) => {
            scrollYRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 10, paddingRight: 4 }}
          >
            {MODES.map(({ key, icon }) => (
              <ModeChip
                key={key}
                icon={icon}
                label={t(`social.mode.${key}`)}
                active={mode === key}
                onPress={() => onModeChange(key)}
              />
            ))}
          </ScrollView>

          <SocialProfilePostAsPicker />

          <Text
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: colors.textTertiary }}
          >
            {t('social.postMediaSection')}
          </Text>

          {showEmptyMedia ? (
            <TouchableOpacity
              onPress={handleMediaPress}
              activeOpacity={0.85}
              className="rounded-2xl items-center justify-center border-2 border-dashed mb-1"
              style={{
                height: MEDIA_PREVIEW_H,
                borderColor: isDark ? colors.borderColor2 : '#d1d5db',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              }}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mb-2"
                style={{
                  backgroundColor: isDark ? SOCIAL_ACCENT_SOFT_DARK : SOCIAL_ACCENT_SOFT,
                }}
              >
                <Icon source={emptyMediaIcon} size={26} color={SOCIAL_ACCENT} />
              </View>
              <Text className="text-[14px] font-bold mb-0.5" style={{ color: colors.headerText }}>
                {t('social.postAddMedia')}
              </Text>
              <Text
                className="text-[12px] text-center px-6 leading-4"
                style={{ color: colors.textSecondary }}
                numberOfLines={2}
              >
                {mediaHint}
              </Text>
            </TouchableOpacity>
          ) : isVideoMode && video ? (
            <TouchableOpacity
              onPress={handlePickVideo}
              activeOpacity={0.9}
              className="rounded-2xl overflow-hidden mb-1 border relative"
              style={{
                height: MEDIA_PREVIEW_H,
                borderColor: colors.borderColor2,
                backgroundColor: colors.cardBg,
              }}
            >
              <SocialLocalMediaThumb
                uri={video.uri}
                isVideo
                width={Dimensions.get('window').width - 40}
                height={MEDIA_PREVIEW_H}
                showPlayBadge={false}
                videoShouldPlay
                resizeMode="cover"
              />
              <View
                pointerEvents="none"
                className="absolute inset-0 items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                >
                  <Icon source="play" size={28} color="#fff" />
                </View>
              </View>
              <View
                pointerEvents="none"
                className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
                style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              >
                <Text className="text-[12px] font-semibold text-white" numberOfLines={1}>
                  {video.name}
                </Text>
                {videoDurationSec != null ? (
                  <Text className="text-[11px] text-white/80 mt-0.5">
                    {videoDurationSec}s / {videoMaxSec}s
                  </Text>
                ) : null}
                <Text className="text-[11px] mt-1 font-medium" style={{ color: SOCIAL_ACCENT }}>
                  {t('social.postChangeMedia')}
                </Text>
              </View>
            </TouchableOpacity>
          ) : mode === 'photo' && photos[0] ? (
            <View className="mb-1 relative">
              <TouchableOpacity
                onPress={handleAddPhotos}
                activeOpacity={0.92}
                className="rounded-2xl overflow-hidden"
                style={{ height: MEDIA_PREVIEW_H }}
              >
                <Image source={{ uri: photos[0].uri }} className="w-full h-full" resizeMode="cover" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRemovePhoto(0)}
                hitSlop={10}
                activeOpacity={0.75}
                className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: MEDIA_DELETE_RED }}
              >
                <Icon source="delete" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : mode === 'carousel' ? (
            <View className="mb-1">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
              >
                {carouselItems.map((item, idx) => (
                  <View key={`${item.file.uri}-${idx}`} className="relative">
                    <SocialLocalMediaThumb
                      uri={item.file.uri}
                      isVideo={item.isVideo}
                      width={THUMB_SIZE}
                      height={THUMB_SIZE}
                      borderRadius={12}
                    />
                    <TouchableOpacity
                      onPress={() => handleRemoveCarouselItem(idx)}
                      hitSlop={8}
                      activeOpacity={0.75}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full items-center justify-center"
                      style={{ backgroundColor: MEDIA_DELETE_RED }}
                    >
                      <Icon source="delete" size={15} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {canAddMoreCarousel && (
                  <TouchableOpacity
                    onPress={handleAddCarouselMedia}
                    className="items-center justify-center rounded-xl border-2 border-dashed"
                    style={{
                      width: THUMB_SIZE,
                      height: THUMB_SIZE,
                      borderColor: isDark ? colors.borderColor2 : '#d1d5db',
                      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.cardBg,
                    }}
                  >
                    <Icon source="image-plus" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </ScrollView>
              <Text className="text-[11px] mt-1.5" style={{ color: colors.textSecondary }}>
                {mediaHint}
              </Text>
            </View>
          ) : null}

          <View onLayout={onCaptionSectionLayout}>
            <View className="flex-row items-center flex-wrap gap-x-2 gap-y-1 mb-2 mt-4">
              <Text
                className="text-[11px] font-semibold uppercase tracking-wide shrink-0"
                style={{ color: colors.textTertiary }}
              >
                {t('social.postCaptionSection')}
              </Text>
              <View className="flex-row items-center gap-1 flex-shrink min-w-0">
                <Icon source="at" size={13} color={colors.textTertiary} />
                <Text
                  className="text-[10px] leading-4 flex-shrink"
                  style={{ color: colors.textSecondary }}
                  numberOfLines={2}
                >
                  {t('social.mentionHint')}
                </Text>
              </View>
            </View>

            <SocialCaptionInput
              value={caption}
              onChangeText={setCaption}
              placeholder={t('social.captionPlaceholder')}
              maxLength={limits.commentMaxLength}
              onFocus={handleCaptionFocus}
              onBlur={handleCaptionBlur}
            />
          </View>
        </ScrollView>
      </KeyboardDismissExclusionView>
    </View>
  );
}
