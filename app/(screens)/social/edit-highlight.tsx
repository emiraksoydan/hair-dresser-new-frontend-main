import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Icon, TextInput as PaperTextInput } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { useAlert } from '../../hook/useAlert';
import {
  useAddStoriesToSocialHighlightMutation,
  useDeleteSocialStoryHighlightMutation,
  useGetSocialProfileStoriesQuery,
  useGetSocialStoryHighlightDetailQuery,
  useGetSocialStoryHighlightsQuery,
  useRemoveSocialStoryHighlightItemMutation,
  useUpdateSocialStoryHighlightMutation,
} from '../../store/api';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import { KeyboardDismissExclusionView } from '../../components/common/KeyboardDismissExclusionView';
import { useKeyboardBottomPadding } from '../../hook/useKeyboardBottomPadding';

type SectionHeaderProps = {
  icon: string;
  title: string;
  subtitle?: string;
  colors: ReturnType<typeof useTheme>['colors'];
};

function HighlightSectionHeader({ icon, title, subtitle, colors }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: subtitle ? 8 : 12 }}>
      <View style={{ marginTop: 1 }}>
        <Icon source={icon} size={22} color={SOCIAL_ACCENT} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.headerText, fontWeight: '700', fontSize: 15 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ marginTop: 4, color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function EditHighlightScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { goBack } = useSafeNavigation();
  const { confirm } = useAlert();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ highlightId?: string }>();
  const highlightId = String(params.highlightId ?? '');

  const { data: detail, isLoading, refetch } = useGetSocialStoryHighlightDetailQuery(highlightId, {
    skip: !highlightId,
  });
  const { data: allHighlights } = useGetSocialStoryHighlightsQuery(detail?.profileId ?? '', {
    skip: !detail?.profileId,
  });
  const { data: stories, isLoading: storiesLoading } = useGetSocialProfileStoriesQuery(
    detail?.profileId ?? '',
    { skip: !detail?.profileId },
  );
  const [updateHighlight, { isLoading: saving }] = useUpdateSocialStoryHighlightMutation();
  const [addStories, { isLoading: adding }] = useAddStoriesToSocialHighlightMutation();
  const [removeItem, { isLoading: removing }] = useRemoveSocialStoryHighlightItemMutation();
  const [deleteHighlight, { isLoading: deleting }] = useDeleteSocialStoryHighlightMutation();

  const [title, setTitle] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const { scrollBottomPadding } = useKeyboardBottomPadding(32);

  useEffect(() => {
    if (detail?.title) setTitle(detail.title);
    if (detail?.sortOrder != null) setSortOrder(detail.sortOrder);
  }, [detail?.title, detail?.sortOrder]);

  const cardStyle = useMemo(
    () => ({ backgroundColor: colors.cardBg, marginBottom: 16, borderColor: colors.borderColor2 }),
    [colors.cardBg, colors.borderColor2],
  );

  const profileRankHint = useMemo(() => {
    const list = [...(allHighlights ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    if (list.length <= 1) return null;
    const rank = list.findIndex((h) => h.id === highlightId) + 1;
    if (rank <= 0) return null;
    return t('social.highlightSortOrderRank', { rank, total: list.length });
  }, [allHighlights, highlightId, t]);

  const existingStoryIds = useMemo(
    () => new Set((detail?.items ?? []).map((i) => i.sourceStoryId).filter(Boolean) as string[]),
    [detail?.items],
  );

  const addableStories = useMemo(
    () => (stories ?? []).filter((s) => s.isOwnStory && !existingStoryIds.has(s.id)),
    [stories, existingStoryIds],
  );

  const toggleAdd = useCallback((id: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (trimmed.length < 1) {
      dispatch(showSnack({ message: t('social.highlightTitleRequired'), isError: true }));
      return;
    }
    const titleChanged = trimmed !== detail?.title;
    const sortChanged = sortOrder !== detail?.sortOrder;
    if (!titleChanged && !sortChanged) {
      goBack();
      return;
    }
    try {
      const res = await updateHighlight({
        highlightId,
        ...(titleChanged ? { title: trimmed } : {}),
        ...(sortChanged ? { sortOrder } : {}),
      }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.highlightUpdated'), isError: false }));
        goBack();
      }
    } catch {
      dispatch(showSnack({ message: t('social.highlightFailed'), isError: true }));
    }
  }, [title, sortOrder, detail?.title, detail?.sortOrder, highlightId, updateHighlight, dispatch, t, goBack]);

  const handleAddStories = useCallback(async () => {
    if (selectedToAdd.size === 0) return;
    try {
      const res = await addStories({
        highlightId,
        storyIds: Array.from(selectedToAdd),
      }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.highlightStoriesAdded'), isError: false }));
        setSelectedToAdd(new Set());
        refetch();
      }
    } catch {
      dispatch(showSnack({ message: t('social.highlightFailed'), isError: true }));
    }
  }, [selectedToAdd, addStories, highlightId, dispatch, t, refetch]);

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      confirm(
        t('social.removeHighlightItemTitle'),
        t('social.removeHighlightItemMessage'),
        async () => {
          try {
            const res = await removeItem({ highlightId, itemId }).unwrap();
            if (res?.success) {
              dispatch(showSnack({ message: t('social.highlightItemRemoved'), isError: false }));
              refetch();
            }
          } catch {
            dispatch(showSnack({ message: t('social.highlightFailed'), isError: true }));
          }
        },
        undefined,
        t('social.remove'),
        t('common.cancel'),
      );
    },
    [confirm, removeItem, highlightId, dispatch, t, refetch],
  );

  const handleDeleteHighlight = useCallback(() => {
    confirm(
      t('social.deleteHighlightTitle'),
      t('social.deleteHighlightMessage'),
      async () => {
        try {
          const res = await deleteHighlight(highlightId).unwrap();
          if (res?.success) {
            dispatch(showSnack({ message: t('social.highlightDeleted'), isError: false }));
            goBack();
          }
        } catch {
          dispatch(showSnack({ message: t('social.highlightFailed'), isError: true }));
        }
      },
      undefined,
      t('social.delete'),
      t('common.cancel'),
    );
  }, [confirm, deleteHighlight, highlightId, dispatch, t, goBack]);

  if (isLoading || !detail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
      </View>
    );
  }

  const busy = saving || removing || deleting || adding;
  const coverUrl =
    detail.coverUrl ??
    detail.items[0]?.thumbnailUrl ??
    detail.items[0]?.mediaUrl ??
    null;

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
        <TouchableOpacity onPress={goBack} hitSlop={12} style={{ padding: 4 }}>
          <Icon source="arrow-left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={{ flex: 1, marginLeft: 8, fontSize: 17, fontWeight: '700', color: colors.headerText }}>
          {t('social.editHighlight')}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={busy} hitSlop={12}>
          {saving ? (
            <ActivityIndicator color={SOCIAL_ACCENT} />
          ) : (
            <Text style={{ color: SOCIAL_ACCENT, fontWeight: '700', fontSize: 15 }}>{t('profile.save')}</Text>
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
        <Card mode="outlined" style={{ ...cardStyle, alignItems: 'center' }}>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 8 }}>
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                borderWidth: 2,
                borderColor: SOCIAL_ACCENT,
                padding: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 40,
                  backgroundColor: isDark ? '#374151' : '#e5e7eb',
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={{ width: 82, height: 82 }} />
                ) : (
                  <Icon source="image-outline" size={32} color={colors.textSecondary} />
                )}
              </View>
            </View>
            <Text
              style={{
                marginTop: 12,
                fontSize: 13,
                fontWeight: '600',
                color: colors.headerText,
                textAlign: 'center',
              }}
            >
              {t('social.highlightCoverPreview')}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }}>
              {t('social.highlightCoverPreviewHint')}
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={cardStyle}>
          <HighlightSectionHeader icon="format-title" title={t('social.highlightTitle')} colors={colors} />
          <Card.Content style={{ paddingTop: 0, paddingHorizontal: 16 }}>
            <PaperTextInput
              mode="outlined"
              value={title}
              onChangeText={setTitle}
              placeholder={t('social.highlightTitlePlaceholder')}
              maxLength={64}
              editable={!busy}
              outlineColor={colors.borderColor2}
              activeOutlineColor={SOCIAL_ACCENT}
              textColor={colors.headerText}
              style={{ backgroundColor: colors.cardBg }}
              outlineStyle={{ borderRadius: 10 }}
            />
          </Card.Content>
        </Card>

        <Card mode="outlined" style={cardStyle}>
          <HighlightSectionHeader
            icon="sort"
            title={t('social.highlightSortOrder')}
            subtitle={t('social.highlightSortOrderHint')}
            colors={colors}
          />
          <Card.Content style={{ paddingTop: 0, paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <TouchableOpacity
                onPress={() => setSortOrder((v) => Math.max(0, v - 1))}
                disabled={busy || sortOrder <= 0}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: sortOrder <= 0 ? 0.4 : 1,
                }}
              >
                <Icon source="minus" size={22} color={colors.headerText} />
              </TouchableOpacity>
              <Text
                style={{ fontSize: 22, fontWeight: '700', color: colors.headerText, minWidth: 40, textAlign: 'center' }}
              >
                {sortOrder}
              </Text>
              <TouchableOpacity
                onPress={() => setSortOrder((v) => v + 1)}
                disabled={busy}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isDark ? '#374151' : '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon source="plus" size={22} color={colors.headerText} />
              </TouchableOpacity>
            </View>
            {profileRankHint ? (
              <Text style={{ marginTop: 12, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
                {profileRankHint}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={cardStyle}>
          <HighlightSectionHeader icon="book-open-page-variant" title={t('social.highlightItems')} subtitle={t('social.highlightItemsHint')} colors={colors} />
          <Card.Content style={{ paddingTop: 0, paddingHorizontal: 16 }}>
            {detail.items.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18, paddingBottom: 4 }}>
                {t('social.highlightItemsEmpty')}
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {detail.items.map((item) => {
                  const thumb = item.thumbnailUrl ?? item.mediaUrl;
                  return (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#374151' : '#e5e7eb',
                          overflow: 'hidden',
                        }}
                      >
                        {thumb ? <Image source={{ uri: thumb }} style={{ width: 48, height: 48 }} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.headerText, fontWeight: '600', fontSize: 14 }}>
                          {item.durationSec ? t('social.storyVideo') : t('social.storyPhoto')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveItem(item.id)}
                        disabled={busy}
                        hitSlop={8}
                        accessibilityLabel={t('social.remove')}
                      >
                        <Icon source="trash-can-outline" size={22} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={{ ...cardStyle, marginBottom: 20 }}>
          <HighlightSectionHeader icon="plus-circle-outline" title={t('social.addStoriesToHighlight')} colors={colors} />
          <Card.Content style={{ paddingTop: 0, paddingHorizontal: 16 }}>
            {storiesLoading ? (
              <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginVertical: 12 }} />
            ) : addableStories.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18, paddingBottom: 4 }}>
                {t('social.noActiveStories')}
              </Text>
            ) : (
              <>
                <View style={{ gap: 8, marginBottom: 12 }}>
                  {addableStories.map((story) => {
                    const checked = selectedToAdd.has(story.id);
                    const thumb = story.thumbnailUrl ?? story.mediaUrl;
                    return (
                      <TouchableOpacity
                        key={story.id}
                        onPress={() => toggleAdd(story.id)}
                        disabled={busy}
                        activeOpacity={0.85}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          padding: 10,
                          borderRadius: 12,
                          backgroundColor: checked ? `${SOCIAL_ACCENT}18` : isDark ? '#1f2937' : '#f9fafb',
                          borderWidth: 1.5,
                          borderColor: checked ? SOCIAL_ACCENT : 'transparent',
                          opacity: busy ? 0.6 : 1,
                        }}
                      >
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 8,
                            backgroundColor: isDark ? '#374151' : '#e5e7eb',
                            overflow: 'hidden',
                          }}
                        >
                          {thumb ? <Image source={{ uri: thumb }} style={{ width: 48, height: 48 }} /> : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.headerText, fontWeight: '600', fontSize: 14 }}>
                            {story.durationSec ? t('social.storyVideo') : t('social.storyPhoto')}
                          </Text>
                        </View>
                        <Icon
                          source={checked ? 'check-circle' : 'circle-outline'}
                          size={24}
                          color={checked ? SOCIAL_ACCENT : colors.textTertiary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {selectedToAdd.size > 0 && (
                  <TouchableOpacity
                    onPress={handleAddStories}
                    disabled={busy}
                    style={{
                      paddingVertical: 13,
                      borderRadius: 12,
                      backgroundColor: SOCIAL_ACCENT,
                      alignItems: 'center',
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {adding ? (
                      <ActivityIndicator color={SOCIAL_ACCENT_TEXT} />
                    ) : (
                      <Text style={{ color: SOCIAL_ACCENT_TEXT, fontWeight: '700' }}>
                        {t('social.addSelectedStories', { count: selectedToAdd.size })}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        <TouchableOpacity
          onPress={handleDeleteHighlight}
          disabled={busy}
          style={{
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: '#ef4444',
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#ef4444', fontWeight: '700' }}>{t('social.deleteHighlight')}</Text>
        </TouchableOpacity>
          </ScrollView>
        </KeyboardDismissExclusionView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
