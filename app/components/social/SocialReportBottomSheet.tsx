import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  InputAccessoryView,
  StyleSheet,
} from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Text } from '../common/Text';
import { useCreateComplaintMutation } from '../../store/api';
import { useLanguage } from '../../hook/useLanguage';
import { useAlert } from '../../hook/useAlert';
import { useTheme } from '../../hook/useTheme';
import { useActionGuard } from '../../hook/useActionGuard';
import { DEFAULT_AVATAR } from '../../constants/images';

const REASON_INPUT_ACCESSORY_ID = 'social-report-reason-input';

type Props = {
  targetUserId: string;
  targetName: string;
  targetImage?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export const SocialReportBottomSheet: React.FC<Props> = ({
  targetUserId,
  targetName,
  targetImage,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const guard = useActionGuard();
  const [reason, setReason] = useState('');
  const reasonInputRef = useRef<TextInput>(null);
  const [createComplaint, { isLoading }] = useCreateComplaintMutation();

  const handleSubmit = () =>
    guard(async () => {
      if (!reason.trim()) {
        showError(t('complaint.reasonRequired'));
        return;
      }

      try {
        await createComplaint({
          complaintToUserId: targetUserId,
          complaintReason: reason.trim(),
        }).unwrap();

        showSuccess(t('complaint.createSuccess'));
        onSuccess?.();
        onClose();
      } catch (error: any) {
        showError(error?.data?.message || t('complaint.createError'));
      }
    });

  const labelStyle = {
    color: SOCIAL_ACCENT,
    fontFamily: 'CenturyGothic-Bold' as const,
    fontSize: 15,
    marginBottom: 10,
    letterSpacing: 0.15,
  };

  const keyboardDismissMode =
    Platform.OS === 'ios' ? ('interactive' as const) : ('on-drag' as const);

  return (
    <BottomSheetView style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={keyboardDismissMode}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          flexGrow: 1,
        }}
      >
        <View
          style={{
            paddingBottom: 14,
            marginBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderColor,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              fontFamily: 'CenturyGothic-Bold',
              fontSize: 20,
              color: colors.sectionHeaderText,
            }}
          >
            {t('social.reportTitle')}
          </Text>
        </View>

        <View
          className="flex-row items-center mb-4 rounded-xl p-3"
          style={{ backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor }}
        >
          <Image
            source={{ uri: targetImage || DEFAULT_AVATAR }}
            style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'CenturyGothic-Bold', fontSize: 16, color: colors.headerText }}>
              {targetName}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
              {t('social.reportSubtitle')}
            </Text>
          </View>
        </View>

        <Text style={labelStyle}>{t('complaint.reason')} *</Text>
        <TextInput
          ref={reasonInputRef}
          value={reason}
          onChangeText={setReason}
          placeholder={t('complaint.reasonPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          inputAccessoryViewID={Platform.OS === 'ios' ? REASON_INPUT_ACCESSORY_ID : undefined}
          style={{
            minHeight: 120,
            borderWidth: 1,
            borderColor: colors.borderColor,
            borderRadius: 12,
            padding: 14,
            color: colors.headerText,
            backgroundColor: colors.cardBg,
            fontFamily: 'CenturyGothic',
            fontSize: 15,
          }}
        />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.borderColor,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.headerText, fontFamily: 'CenturyGothic-Bold' }}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: SOCIAL_ACCENT,
              alignItems: 'center',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color={SOCIAL_ACCENT_TEXT} />
            ) : (
              <Text style={{ color: SOCIAL_ACCENT_TEXT, fontFamily: 'CenturyGothic-Bold' }}>
                {t('social.reportSubmit')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={REASON_INPUT_ACCESSORY_ID}>
          <View style={[styles.accessoryBar, { backgroundColor: colors.cardBg, borderTopColor: colors.borderColor }]}>
            <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.accessoryBtn}>
              <Text style={{ color: SOCIAL_ACCENT, fontFamily: 'CenturyGothic-Bold' }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </BottomSheetView>
  );
};

const styles = StyleSheet.create({
  accessoryBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accessoryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
