import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SocialBottomSheet } from './SocialBottomSheet';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

export type AppointmentSharePromptPayload = {
  appointmentId: string;
  counterpartyName: string;
  mentions: string;
  caption: string;
  subtitle: string;
  profileId: string;
};

type Props = {
  sheet: ReturnType<typeof useBottomSheet>;
  payload: AppointmentSharePromptPayload | null;
  onCreatePost: () => void;
  onCreateStory: () => void;
  onClose: () => void;
  onSheetClosed: () => void;
};

export const SocialAppointmentSharePromptSheet: React.FC<Props> = ({
  sheet,
  payload,
  onCreatePost,
  onCreateStory,
  onClose,
  onSheetClosed,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <SocialBottomSheet sheet={sheet} onDismiss={onSheetClosed}>
      <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 28 }}>
        <View className="items-center mb-4">
          <View
            className="w-14 h-14 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: `${SOCIAL_ACCENT}22` }}
          >
            <Icon source="share-variant" size={28} color={SOCIAL_ACCENT} />
          </View>
          <Text className="text-lg font-bold text-center" style={{ color: colors.headerText }}>
            {t('social.appointmentShareTitle')}
          </Text>
          {!!payload?.subtitle && (
            <Text className="text-sm text-center mt-2" style={{ color: colors.textSecondary }}>
              {payload.subtitle}
            </Text>
          )}
        </View>

        {!!payload?.caption && (
          <View
            className="rounded-2xl px-3.5 py-3 mb-5 border"
            style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor2 }}
          >
            <Text className="text-xs font-semibold mb-1" style={{ color: colors.textSecondary }}>
              {t('social.appointmentShareCaptionLabel')}
            </Text>
            <Text className="text-sm leading-5" style={{ color: colors.headerText }}>
              {payload.caption}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onCreatePost}
          className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl mb-2.5"
          style={{ backgroundColor: SOCIAL_ACCENT }}
        >
          <Icon source="image-edit-outline" size={20} color={SOCIAL_ACCENT_TEXT} />
          <Text className="font-bold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>
            {t('social.appointmentSharePost')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCreateStory}
          className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl mb-2.5 border"
          style={{ backgroundColor: colors.cardBg, borderColor: colors.borderColor2 }}
        >
          <Icon source="camera-outline" size={20} color={colors.headerText} />
          <Text className="font-bold text-sm" style={{ color: colors.headerText }}>
            {t('social.appointmentShareStory')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} className="py-3 items-center">
          <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
            {t('social.appointmentShareClose')}
          </Text>
        </TouchableOpacity>
      </BottomSheetView>
    </SocialBottomSheet>
  );
};
