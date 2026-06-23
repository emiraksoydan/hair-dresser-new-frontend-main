import React, { useCallback, useMemo, useState } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { View, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList, type DimensionValue, KeyboardAvoidingView, Platform } from 'react-native';
import {
  SOCIAL_ACCENT,
  SOCIAL_ACCENT_TEXT,
  SOCIAL_PAIR_BLUE,
  SOCIAL_PAIR_ORANGE,
} from '../../constants/socialTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Divider, Icon, TextInput as PaperTextInput } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/common/Text';
import { LottieViewComponent } from '../../components/common/lottieview';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAuth } from '../../hook/useAuth';
import { useSocialLimits } from '../../hook/useSocialLimits';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import {
  useCreateSocialStoryHighlightMutation,
  useCreateSocialStoryMutation,
  useGetSocialProfileStoriesQuery,
} from '../../store/api';
import {
  pickStoryPhotos,
  pickStoryVideo,
  prepareSocialImagesForUpload,
  type StoryItemPick,
} from '../../utils/social/pickSocialMedia';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import { KeyboardDismissExclusionView } from '../../components/common/KeyboardDismissExclusionView';
import { useKeyboardBottomPadding } from '../../hook/useKeyboardBottomPadding';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { useSocialLottieAnimation } from '../../hook/useSocialLottieAnimation';
import { SocialLocalMediaThumb } from '../../components/social/SocialLocalMediaThumb';
import { SocialEmptyStateCard } from '../../components/social/SocialEmptyStateCard';
import { UserType } from '../../types';
import { exitSocialMode } from '../../utils/social/exitSocialMode';
import {
  getSocialNoProfilePanelMessage,
  getSocialProfileRequiredMessage,
} from '../../utils/social/socialNoProfileMessage';

const MEDIA_DELETE_RED = '#ef4444';

type MediaOptionProps = {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  onPress: () => void;
  disabled?: boolean;
  showDivider?: boolean;
};

function MediaOption({ icon, title, subtitle, accent, onPress, disabled, showDivider }: MediaOptionProps) {
  const { colors, isDark } = useTheme();

  return (
    <>
      {showDivider ? <Divider style={{ backgroundColor: colors.borderColor2 }} /> : null}
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.82}
        className="flex-row items-center py-3.5"
        style={{ opacity: disabled ? 0.5 : 1 }}
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
    </>
  );
}

type UploadProgress = { done: number; total: number };

export default function CreateHighlightScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { userType } = useAuth();
    const router = useSafeNavigation();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ profileId?: string; storyId?: string }>();
  const { activeProfileId } = useActiveSocialProfile();
  const profileId = String(params.profileId ?? activeProfileId ?? '');
  const preselectStoryId = params.storyId ? String(params.storyId) : '';

  const { limits } = useSocialLimits();
  const { autoPlay: lottieAutoPlay, loop: lottieLoop } = useSocialLottieAnimation();
  const { data: stories, isLoading } = useGetSocialProfileStoriesQuery(profileId, { skip: !profileId });
  const [createHighlight, { isLoading: savingHighlight }] = useCreateSocialStoryHighlightMutation();
  const [createStory] = useCreateSocialStoryMutation();

  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() =>
    preselectStoryId ? new Set([preselectStoryId]) : new Set(),
  );
  const [pendingMedia, setPendingMedia] = useState<StoryItemPick[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const ownStories = useMemo(() => (stories ?? []).filter((s) => s.isOwnStory), [stories]);

  const isBusy = savingHighlight || uploadProgress !== null;
  const pickerDisabled = isBusy;

  const cardStyle = useMemo(
    () => ({ backgroundColor: colors.cardBg, marginBottom: 16, borderColor: colors.borderColor2 }),
    [colors.cardBg, colors.borderColor2],
  );

  const addPhotos = useCallback(async () => {
    const picked = await pickStoryPhotos();
    if (!picked?.length) return;
    setPendingMedia((prev) => [...prev, ...picked]);
  }, []);

  const addVideo = useCallback(async () => {
    const picked = await pickStoryVideo();
    if (!picked) return;
    setPendingMedia((prev) => [...prev, picked]);
  }, []);

  const removePending = useCallback((index: number) => {
    setPendingMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggle = (id: string) => {
    if (isBusy) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    const trimmed = title.trim();
    if (trimmed.length < 1) {
      dispatch(showSnack({ message: t('social.highlightTitleRequired'), isError: true }));
      return;
    }
    if (!profileId) {
      dispatch(showSnack({ message: getSocialProfileRequiredMessage(t, userType), isError: true }));
      return;
    }

    try {
      const newStoryIds: string[] = [];
      const snapshot = [...pendingMedia];

      if (snapshot.length > 0) {
        setUploadProgress({ done: 0, total: snapshot.length });

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

        for (let i = 0; i < preparedSnapshot.length; i++) {
          const item = preparedSnapshot[i]!;
          try {
            const res = await createStory({
              profileId,
              file: item.file,
              durationSec: item.durationSec,
            }).unwrap();
            if (res?.success && res.data) newStoryIds.push(res.data);
          } catch {
            /* continue with other items */
          }
          setUploadProgress({ done: i + 1, total: snapshot.length });
        }

        setUploadProgress(null);

        if (newStoryIds.length === 0 && snapshot.length > 0) {
          dispatch(showSnack({ message: t('social.storyFailed'), isError: true }));
          return;
        }
      }

      const storyIds = [...Array.from(selected), ...newStoryIds];
      if (storyIds.length === 0) {
        dispatch(showSnack({ message: t('social.highlightStoriesRequired'), isError: true }));
        return;
      }
      if (storyIds.length > limits.highlightMaxItemsPerHighlight) {
        dispatch(
          showSnack({
            message: t('social.highlightItemsLimit', { max: limits.highlightMaxItemsPerHighlight }),
            isError: true,
          }),
        );
        return;
      }
      const res = await createHighlight({
        profileId,
        title: trimmed,
        storyIds,
      }).unwrap();

      if (res?.success) {
        dispatch(showSnack({ message: t('social.highlightCreated'), isError: false }));
        router.back();
      } else {
        dispatch(
          showSnack({
            message: translateSocialApiMessage(res?.message, t, t('social.highlightFailed')),
            isError: true,
          }),
        );
      }
    } catch (e: unknown) {
      setUploadProgress(null);
      const msg =
        e && typeof e === 'object' && 'data' in e
          ? (e as { data?: { message?: string } }).data?.message
          : undefined;
      dispatch(
        showSnack({
          message: translateSocialApiMessage(msg, t, t('social.highlightFailed')),
          isError: true,
        }),
      );
    }
  };

  const saveLabel =
    uploadProgress !== null
      ? t('social.highlightUploading', {
          done: uploadProgress.done,
          total: uploadProgress.total,
        })
      : t('profile.save');

  const { scrollBottomPadding } = useKeyboardBottomPadding(32);

  if (!profileId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={['top']}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderColor2,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
            <Icon source="arrow-left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text
            style={{ flex: 1, marginLeft: 8, fontSize: 17, fontWeight: '700', color: colors.headerText }}
          >
            {t('social.createHighlight')}
          </Text>
        </View>
        <SocialEmptyStateCard
          title={t('social.noProfilePanelTitle')}
          message={getSocialNoProfilePanelMessage(t, userType)}
          animationKey="social-highlight-no-profile"
          actionLabel={
            userType === UserType.FreeBarber || userType === UserType.BarberStore
              ? t('social.noProfilePanelActionBusiness')
              : t('social.noProfilePanelAction')
          }
          onAction={() => exitSocialMode(userType)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor2,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} disabled={isBusy} hitSlop={12} style={{ padding: 4 }}>
          <Icon source="arrow-left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text
          style={{ flex: 1, marginLeft: 8, fontSize: 17, fontWeight: '700', color: colors.headerText }}
        >
          {t('social.createHighlight')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isBusy}
          hitSlop={12}
          className="rounded-full px-4 py-2"
          style={{ backgroundColor: isBusy ? colors.borderColor2 : SOCIAL_ACCENT, minWidth: 72, alignItems: 'center' }}
        >
          {isBusy ? (
            <ActivityIndicator color={SOCIAL_ACCENT_TEXT} size="small" />
          ) : (
            <Text className="font-bold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>
              {saveLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <KeyboardDismissExclusionView className="flex-1">
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: scrollBottomPadding }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            nestedScrollEnabled
          >
        <PaperTextInput
          mode="outlined"
          label={t('social.highlightTitle')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('social.highlightTitlePlaceholder')}
          maxLength={64}
          editable={!isBusy}
          outlineColor={colors.borderColor2}
          activeOutlineColor={SOCIAL_ACCENT}
          textColor={colors.headerText}
          style={{ backgroundColor: colors.cardBg, borderRadius: 12, marginBottom: 16 }}
          outlineStyle={{ borderRadius: 12 }}
        />

        <Card mode="outlined" style={cardStyle}>
          <Card.Title
            title={t('social.highlightAddMedia')}
            style={{ marginTop: 12 }}
            titleStyle={{ color: colors.headerText, fontWeight: '700', fontSize: 15 }}
            subtitle={t('social.highlightAddMediaHint')}
            subtitleStyle={{ color: colors.textSecondary, fontSize: 12 }}
            subtitleNumberOfLines={3}
          />
          <Card.Content style={{ paddingTop: 0 }}>
            <MediaOption
              icon="image-multiple"
              title={t('social.storyPhoto')}
              subtitle={t('social.storyPhotoHint')}
              accent={SOCIAL_PAIR_BLUE}
              onPress={addPhotos}
              disabled={pickerDisabled}
            />
            <MediaOption
              icon="video"
              title={t('social.storyVideo')}
              subtitle={t('social.storyVideoHint', {
                max: limits.storyVideoMaxDurationSec,
                postMax: limits.postVideoMaxDurationSec,
              })}
              accent={SOCIAL_PAIR_ORANGE}
              onPress={addVideo}
              disabled={pickerDisabled}
              showDivider
            />

            {pendingMedia.length > 0 ? (
              <View className="mt-4">
                <Divider style={{ backgroundColor: colors.borderColor2, marginBottom: 12 }} />
                <Text className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
                  {t('social.highlightPendingMedia', { count: pendingMedia.length })}
                </Text>
                <FlatList
                  horizontal
                  data={pendingMedia}
                  keyExtractor={(_, i) => `pending-${i}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingTop: 8, paddingRight: 8 }}
                  renderItem={({ item, index }) => (
                    <View style={{ position: 'relative' }}>
                      <View
                        style={{
                          width: 72,
                          height: 96,
                          borderRadius: 10,
                          overflow: 'hidden',
                          backgroundColor: isDark ? '#374151' : '#e5e7eb',
                          borderWidth: 1,
                          borderColor: SOCIAL_ACCENT,
                        }}
                      >
                        <SocialLocalMediaThumb
                          uri={item.file.uri}
                          isVideo={item.isVideo}
                          width={72}
                          height={96}
                          borderRadius={10}
                          videoShouldPlay={item.isVideo}
                        />
                      </View>
                      {!isBusy ? (
                        <TouchableOpacity
                          onPress={() => removePending(index)}
                          hitSlop={8}
                          activeOpacity={0.75}
                          className="absolute w-7 h-7 rounded-full items-center justify-center"
                          style={{ top: -8, right: -8, backgroundColor: MEDIA_DELETE_RED }}
                        >
                          <Icon source="delete" size={15} color="#fff" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                />
              </View>
            ) : null}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={{ ...cardStyle, marginBottom: 0 }}>
          <Card.Title
            title={t('social.highlightExistingStories')}
            titleStyle={{ color: colors.headerText, fontWeight: '700', fontSize: 15 }}
            subtitle={t('social.selectStoriesForHighlight')}
            subtitleStyle={{ color: colors.textSecondary, fontSize: 12 }}
          />
          <Card.Content style={{ paddingTop: 0 }}>
            {isLoading ? (
              <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginTop: 16, marginBottom: 8 }} />
            ) : ownStories.length === 0 ? (
              <LottieViewComponent
                message={t('social.noActiveStoriesHighlight')}
                animationSize={100}
                autoPlay={lottieAutoPlay}
                loop={lottieLoop}
                style={{ minHeight: 140, maxHeight: 200 }}
              />
            ) : (
              <View style={{ gap: 10 }}>
                {ownStories.map((story) => {
                  const checked = selected.has(story.id);
                  const thumb = story.thumbnailUrl ?? story.mediaUrl;
                  return (
                    <Card
                      key={story.id}
                      mode="outlined"
                      onPress={() => toggle(story.id)}
                      disabled={isBusy}
                      style={{
                        backgroundColor: colors.cardBg,
                        borderColor: checked ? SOCIAL_ACCENT : colors.borderColor2,
                        borderWidth: checked ? 1.5 : 1,
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                        <View
                          style={{
                            width: 52,
                            height: 68,
                            borderRadius: 8,
                            backgroundColor: isDark ? '#374151' : '#e5e7eb',
                            overflow: 'hidden',
                          }}
                        >
                          {thumb ? (
                            <Image source={{ uri: thumb }} style={{ width: 52, height: 68 }} resizeMode="cover" />
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.headerText, fontWeight: '600', fontSize: 14 }}>
                            {story.durationSec ? t('social.storyVideo') : t('social.storyPhoto')}
                          </Text>
                        </View>
                        <Icon
                          source={checked ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                          size={26}
                          color={checked ? SOCIAL_ACCENT : colors.textTertiary}
                        />
                      </Card.Content>
                    </Card>
                  );
                })}
              </View>
            )}
          </Card.Content>
        </Card>
          </ScrollView>
        </KeyboardDismissExclusionView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
