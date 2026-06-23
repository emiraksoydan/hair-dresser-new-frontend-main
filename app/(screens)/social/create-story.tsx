import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT, SOCIAL_PAIR_BLUE, SOCIAL_PAIR_ORANGE } from '../../constants/socialTheme';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Carousel from 'react-native-reanimated-carousel';
import type { ICarouselInstance } from 'react-native-reanimated-carousel';
import { Text } from '../../components/common/Text';
import { CarouselPaginationDots } from '../../components/common/CarouselPaginationDots';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAuth } from '../../hook/useAuth';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { getSocialProfileRequiredMessage } from '../../utils/social/socialNoProfileMessage';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useCreateSocialStoryMutation } from '../../store/api';
import { useSocialLimits } from '../../hook/useSocialLimits';
import {
  pickStoryPhotos,
  pickStoryVideo,
  prepareSocialImagesForUpload,
  type StoryItemPick,
} from '../../utils/social/pickSocialMedia';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type UploadProgress = { done: number; total: number };

type MediaOptionProps = {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  onPress: () => void;
  disabled?: boolean;
};

function MediaOption({ icon, title, subtitle, accent, onPress, disabled }: MediaOptionProps) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.82}
      className="flex-row items-center rounded-2xl px-4 py-4 mb-3 border"
      style={{
        backgroundColor: colors.cardBg,
        borderColor: isDark ? colors.borderColor2 : accent + '33',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center mr-3.5"
        style={{ backgroundColor: accent + (isDark ? '28' : '18') }}
      >
        <Icon source={icon} size={26} color={accent} />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-[15px] font-bold" style={{ color: colors.headerText }}>
          {title}
        </Text>
        <Text className="text-[12px] mt-0.5" style={{ color: colors.textSecondary }}>
          {subtitle}
        </Text>
      </View>
      <Icon source="chevron-right" size={22} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function CreateStoryScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { userType } = useAuth();
  const router = useSafeNavigation();
  const params = useLocalSearchParams<{ profileId?: string; appointmentId?: string }>();
  const dispatch = useAppDispatch();
  const { activeProfileId: profileIdFromHook, setActiveProfileId, profiles } = useActiveSocialProfile();
  const profileId = profileIdFromHook;

  useEffect(() => {
    const fromRoute = params.profileId ? String(params.profileId) : '';
    if (fromRoute && profiles.some((p) => p.id === fromRoute)) {
      setActiveProfileId(fromRoute);
    }
  }, [params.profileId, profiles, setActiveProfileId]);

  const [createStory] = useCreateSocialStoryMutation();
  const { limits } = useSocialLimits();

  const [items, setItems] = useState<StoryItemPick[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const carouselRef = useRef<ICarouselInstance>(null);

  const hasItems = items.length > 0;
  const isUploading = progress !== null;
  const pickerDisabled = isUploading;

  const addPhotos = useCallback(async () => {
    const picked = await pickStoryPhotos();
    if (!picked) return;
    const startIdx = items.length;
    setItems((prev) => [...prev, ...picked]);
    setCurrentIndex(startIdx);
    setTimeout(() => {
      carouselRef.current?.scrollTo({ index: startIdx, animated: true });
    }, 100);
  }, [items.length]);

  const addVideo = useCallback(async () => {
    const picked = await pickStoryVideo();
    if (!picked) return;
    const startIdx = items.length;
    setItems((prev) => [...prev, picked]);
    setCurrentIndex(startIdx);
    setTimeout(() => {
      carouselRef.current?.scrollTo({ index: startIdx, animated: true });
    }, 100);
  }, [items.length]);

  const handleRemoveCurrent = useCallback(() => {
    if (items.length === 0) return;
    const idx = currentIndex;
    const newLength = items.length - 1;
    const newIndex = newLength === 0 ? 0 : Math.min(idx, newLength - 1);
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setCurrentIndex(newIndex);
    if (newLength > 0 && newIndex !== idx) {
      setTimeout(() => {
        carouselRef.current?.scrollTo({ index: newIndex, animated: false });
      }, 50);
    }
  }, [items.length, currentIndex]);

  const handleShare = useCallback(async () => {
    if (!profileId) {
      dispatch(showSnack({ message: getSocialProfileRequiredMessage(t, userType), isError: true }));
      return;
    }
    if (items.length === 0) {
      dispatch(showSnack({ message: t('social.storyMediaRequired'), isError: true }));
      return;
    }
    if (progress !== null) return;

    const snapshot = [...items];
    const total = snapshot.length;
    let failedCount = 0;

    setProgress({ done: 0, total });

    const photoItems = snapshot.filter((x) => !x.isVideo);
    const preparedPhotos =
      photoItems.length > 0
        ? await prepareSocialImagesForUpload(photoItems.map((x) => x.file))
        : [];
    let photoIdx = 0;
    const preparedSnapshot = snapshot.map((item) => {
      if (item.isVideo) return item;
      return { ...item, file: preparedPhotos[photoIdx++]! };
    });

    const appointmentId = params.appointmentId ? String(params.appointmentId) : undefined;
    let appointmentLinked = false;

    for (let i = 0; i < total; i++) {
      const item = preparedSnapshot[i]!;
      try {
        const res = await createStory({
          profileId,
          file: item.file,
          durationSec: item.durationSec,
          appointmentId: appointmentId && !appointmentLinked ? appointmentId : undefined,
        }).unwrap();
        if (!res?.success) {
          failedCount++;
        } else if (appointmentId && !appointmentLinked) {
          appointmentLinked = true;
        }
      } catch {
        failedCount++;
      }
      setProgress({ done: i + 1, total });
    }

    setProgress(null);

    const succeeded = total - failedCount;
    if (failedCount === 0) {
      dispatch(showSnack({ message: t('social.storyCreated'), isError: false }));
    } else if (succeeded > 0) {
      dispatch(
        showSnack({
          message: t('social.storiesPartialSuccess', { success: succeeded, total }),
          isError: false,
        }),
      );
    } else {
      dispatch(showSnack({ message: t('social.storyFailed'), isError: true }));
    }

    router.back();
  }, [profileId, items, progress, createStory, dispatch, t, router, params.appointmentId]);

  const renderItem = useCallback(
    ({ item, index }: { item: StoryItemPick; index: number }) => (
      <View className="bg-black items-center justify-center" style={{ width: SCREEN_W, height: SCREEN_H }}>
        {item.isVideo ? (
          <Video
            source={{ uri: item.file.uri }}
            style={{ width: SCREEN_W, height: SCREEN_H }}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay={index === currentIndex}
            isMuted={false}
          />
        ) : (
          <Image
            source={{ uri: item.file.uri }}
            style={{ width: SCREEN_W, height: SCREEN_H }}
            resizeMode="contain"
          />
        )}
      </View>
    ),
    [currentIndex],
  );

  const headerTextColor = '#ffffff';
  const headerBtnBg = 'rgba(0,0,0,0.5)';
  const pickerHeaderBtnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      {!hasItems ? (
        <>
          <SafeAreaView edges={['top']} style={{ backgroundColor: colors.screenBg }}>
            <View className="relative flex-row items-center justify-between w-full px-3 py-2 min-h-[52px]">
              <View className="w-[72px] items-start z-[1]">
                <TouchableOpacity
                  onPress={() => router.back()}
                  hitSlop={12}
                  className="w-[38px] h-[38px] rounded-full items-center justify-center"
                  style={{ backgroundColor: pickerHeaderBtnBg }}
                >
                  <Icon source="close" size={22} color={colors.headerText} />
                </TouchableOpacity>
              </View>

              <Text
                className="absolute left-0 right-0 text-center text-base font-bold"
                style={{ color: colors.headerText }}
                pointerEvents="none"
              >
                {t('social.createStory')}
              </Text>

              <View className="w-[72px] items-end z-[1]">
                <View className=" px-4 py-2 rounded-full opacity-45" style={{ backgroundColor: SOCIAL_ACCENT }}>
                  <Text className="font-bold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>{t('social.share')}</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="items-center pt-6 pb-8">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: isDark ? 'rgba(250, 204, 21,0.15)' : 'rgba(250, 204, 21,0.1)' }}
              >
                <Icon source="camera-plus-outline" size={40} color={SOCIAL_ACCENT} />
              </View>
              <Text className="text-xl font-bold text-center" style={{ color: colors.headerText }}>
                {t('social.storyPickerTitle')}
              </Text>
              <Text
                className="text-sm text-center mt-2 px-4 leading-5"
                style={{ color: colors.textSecondary }}
              >
                {t('social.storyPickerSubtitle', {
                  sec: limits.storyVideoMaxDurationSec,
                  postMax: limits.postVideoMaxDurationSec,
                })}
              </Text>
            </View>

            <MediaOption
              icon="image-multiple-outline"
              title={t('social.storyPhoto')}
              subtitle={t('social.storyPhotoHint')}
              accent={SOCIAL_PAIR_BLUE}
              onPress={addPhotos}
              disabled={pickerDisabled}
            />
            <MediaOption
              icon="video-outline"
              title={t('social.storyVideo')}
              subtitle={t('social.storyVideoHint', {
                max: limits.storyVideoMaxDurationSec,
                postMax: limits.postVideoMaxDurationSec,
              })}
              accent={SOCIAL_PAIR_ORANGE}
              onPress={addVideo}
              disabled={pickerDisabled}
            />

            <View
              className="rounded-xl px-4 py-3 mt-2 flex-row items-start gap-2.5"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <Icon source="information-outline" size={18} color={colors.textTertiary} />
              <Text className="flex-1 text-xs leading-5" style={{ color: colors.textSecondary }}>
                {t('social.storyPickerInfo')}
              </Text>
            </View>
          </ScrollView>
        </>
      ) : (
        <>
          <Carousel
            ref={carouselRef}
            loop={false}
            width={SCREEN_W}
            height={SCREEN_H}
            data={items}
            scrollAnimationDuration={280}
            onSnapToItem={(index) => setCurrentIndex(index)}
            renderItem={renderItem}
            enabled={!isUploading}
          />

          <View className="absolute inset-0 bg-black/30" pointerEvents="none" />

          <LinearGradient
            colors={['rgba(0,0,0,0.78)', 'rgba(0,0,0,0.25)', 'transparent']}
            locations={[0, 0.45, 1]}
            className="absolute top-0 left-0 right-0 h-48"
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
            locations={[0, 0.35, 1]}
            className="absolute bottom-0 left-0 right-0 h-64"
            pointerEvents="none"
          />

          <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
            <View className="px-4 pt-2">
              <View className="relative flex-row items-center justify-between w-full min-h-[52px]">
                <View className="z-[1]">
                  <TouchableOpacity
                    onPress={() => router.back()}
                    hitSlop={12}
                    className="w-[38px] h-[38px] rounded-full items-center justify-center"
                    style={{ backgroundColor: headerBtnBg }}
                  >
                    <Icon source="close" size={22} color={headerTextColor} />
                  </TouchableOpacity>
                </View>

                <Text
                  className="absolute left-0 right-0 text-center text-base font-bold"
                  style={{ color: headerTextColor }}
                  pointerEvents="none"
                >
                  {t('social.createStory')}
                </Text>

                <View className="flex-row items-center justify-end gap-2 z-[1]">
                  {!isUploading && (
                    <TouchableOpacity
                      onPress={handleRemoveCurrent}
                      hitSlop={12}
                      className="w-[38px] h-[38px] rounded-full items-center justify-center"
                      style={{ backgroundColor: headerBtnBg }}
                    >
                      <Icon source="trash-can-outline" size={20} color={headerTextColor} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={handleShare}
                    disabled={isUploading}
                    className={`px-4 py-2 rounded-full min-w-[72px] items-center justify-center ${isUploading ? 'opacity-80' : ''}`}
                    style={{ backgroundColor: SOCIAL_ACCENT }}
                  >
                    {isUploading ? (
                      <View className="flex-row items-center gap-1">
                        <ActivityIndicator size="small" color={SOCIAL_ACCENT_TEXT} style={{ transform: [{ scale: 0.8 }] }} />
                        <Text className="font-bold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>
                          {progress!.done}/{progress!.total}
                        </Text>
                      </View>
                    ) : (
                      <Text className="font-bold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>{t('social.share')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </SafeAreaView>

          <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <CarouselPaginationDots
              count={items.length}
              activeIndex={currentIndex}
              variant="onMedia"
              className="mb-3"
            />

            {!isUploading && (
              <View className="flex-row items-center justify-center gap-2.5">
                <TouchableOpacity
                  onPress={addPhotos}
                  activeOpacity={0.85}
                  className="flex-row items-center gap-1.5 rounded-3xl py-2.5 px-4 bg-black/45 border border-white/20"
                >
                  <Icon source="image-plus" size={18} color="#fff" />
                  <Text className="text-white font-semibold text-sm">{t('social.storyPhoto')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addVideo}
                  activeOpacity={0.85}
                  className="flex-row items-center gap-1.5 rounded-3xl py-2.5 px-4 bg-black/45 border border-white/20"
                >
                  <Icon source="video-outline" size={18} color="#fff" />
                  <Text className="text-white font-semibold text-sm">{t('social.storyVideo')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>
        </>
      )}
    </View>
  );
}
