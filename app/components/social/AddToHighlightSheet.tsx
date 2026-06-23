import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { SocialBottomModal } from './SocialBottomModal';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import {
  useAddStoriesToSocialHighlightMutation,
  useCreateSocialStoryHighlightMutation,
  useGetSocialStoryHighlightsQuery,
} from '../../store/api';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import type { SocialStoryHighlightDto } from '../../types/social';
import { PANEL_FLAT_LIST_PERF } from '../../constants/panelFlatListPerf';

type Props = {
  visible: boolean;
  profileId: string;
  storyId: string;
  onClose: () => void;
};

const SHEET_HEIGHT_RATIO = 0.55;
const SHEET_HEADER_APPROX = 56;

export const AddToHighlightSheet: React.FC<Props> = ({ visible, profileId, storyId, onClose }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const { height: windowHeight } = useWindowDimensions();
  const { data: highlights } = useGetSocialStoryHighlightsQuery(profileId, { skip: !visible });
  const [addToHighlight, { isLoading: adding }] = useAddStoriesToSocialHighlightMutation();
  const [createHighlight, { isLoading: creating }] = useCreateSocialStoryHighlightMutation();
  const [newTitle, setNewTitle] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const busy = adding || creating;
  const listMaxHeight = Math.max(120, Math.round(windowHeight * SHEET_HEIGHT_RATIO - SHEET_HEADER_APPROX));

  const handleAdd = useCallback(
    async (highlightId: string) => {
      try {
        const res = await addToHighlight({ highlightId, storyIds: [storyId] }).unwrap();
        if (res?.success) {
          dispatch(showSnack({ message: t('social.addedToHighlight'), isError: false }));
          onClose();
        }
      } catch {
        dispatch(showSnack({ message: t('social.highlightFailed'), isError: true }));
      }
    },
    [addToHighlight, storyId, dispatch, t, onClose],
  );

  const handleCreate = useCallback(async () => {
    const title = newTitle.trim();
    if (title.length < 1) return;
    try {
      const res = await createHighlight({ profileId, title, storyIds: [storyId] }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.highlightCreated'), isError: false }));
        setNewTitle('');
        setShowNewForm(false);
        onClose();
      }
    } catch {
      dispatch(showSnack({ message: t('social.highlightFailed'), isError: true }));
    }
  }, [newTitle, createHighlight, profileId, storyId, dispatch, t, onClose]);

  const listHeader = useMemo(
    () => (
      <View className="gap-2.5 pb-2.5">
        <TouchableOpacity
          onPress={() => setShowNewForm((v) => !v)}
          className="flex-row items-center gap-3 p-3 rounded-xl border"
          style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor2 }}
        >
          <View
            className="w-11 h-11 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
          >
            <Icon source="plus" size={22} color={colors.headerText} />
          </View>
          <Text className="font-semibold" style={{ color: colors.headerText }}>
            {t('social.newHighlight')}
          </Text>
        </TouchableOpacity>

        {showNewForm && (
          <View className="gap-2.5">
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder={t('social.highlightTitlePlaceholder')}
              placeholderTextColor={colors.textSecondary}
              maxLength={64}
              className="border rounded-[10px] px-3 py-2.5"
              style={{
                borderColor: colors.borderColor2,
                color: colors.headerText,
                backgroundColor: colors.cardBg,
              }}
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={busy || newTitle.trim().length < 1}
              className="py-3 rounded-[10px] items-center"
              style={{
                backgroundColor: SOCIAL_ACCENT,
                opacity: busy || newTitle.trim().length < 1 ? 0.6 : 1,
              }}
            >
              {creating ? (
                <ActivityIndicator color={SOCIAL_ACCENT_TEXT} />
              ) : (
                <Text className="font-bold" style={{ color: SOCIAL_ACCENT_TEXT }}>
                  {t('social.createHighlight')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    ),
    [
      colors,
      isDark,
      t,
      showNewForm,
      newTitle,
      busy,
      creating,
      handleCreate,
    ],
  );

  const renderHighlightItem = useCallback(
    ({ item: h }: { item: SocialStoryHighlightDto }) => (
      <TouchableOpacity
        onPress={() => handleAdd(h.id)}
        disabled={busy}
        className="flex-row items-center gap-3 p-3 rounded-xl border"
        style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor2 }}
      >
        <View
          className="w-11 h-11 rounded-full overflow-hidden items-center justify-center"
          style={{ backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
        >
          {h.coverUrl ? (
            <Image source={{ uri: h.coverUrl }} className="w-11 h-11" />
          ) : (
            <Icon source="image-outline" size={20} color={colors.headerText} />
          )}
        </View>
        <View className="flex-1">
          <Text className="font-semibold" style={{ color: colors.headerText }}>
            {h.title}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {t('social.highlightItemCount', { count: h.itemCount })}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [busy, colors, isDark, handleAdd, t],
  );

  const keyExtractor = useCallback((item: SocialStoryHighlightDto) => item.id, []);

  const itemSeparator = useCallback(() => <View className="h-2.5" />, []);

  return (
    <SocialBottomModal
      visible={visible}
      onClose={onClose}
      title={t('social.addToHighlight')}
      surface="screen"
      maxHeight="55%"
    >
      <FlatList
        data={highlights ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderHighlightItem}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={itemSeparator}
        style={{ maxHeight: listMaxHeight }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...PANEL_FLAT_LIST_PERF}
      />
    </SocialBottomModal>
  );
};
