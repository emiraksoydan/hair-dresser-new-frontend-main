import React, { useCallback } from 'react';
import { View, TouchableOpacity, Share, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Icon } from 'react-native-paper';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { SocialBottomSheet } from './SocialBottomSheet';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { buildSocialProfileShareMessage, buildSocialProfileShareUrl } from '../../utils/social/socialProfileShare';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';

type Props = {
  sheet: ReturnType<typeof useBottomSheet>;
  username: string;
};

export const SocialProfileShareSheet: React.FC<Props> = ({ sheet, username }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const shareUrl = buildSocialProfileShareUrl(username);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}`;

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(shareUrl);
    dispatch(showSnack({ message: t('social.linkCopied'), isError: false }));
  }, [shareUrl, dispatch, t]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: buildSocialProfileShareMessage(username, t), url: shareUrl });
    } catch {
      /* cancelled */
    }
  }, [username, shareUrl, t]);

  return (
    <SocialBottomSheet sheet={sheet}>
      <BottomSheetView style={{ padding: 20, paddingBottom: 32, gap: 16 }}>
        <Text className="text-lg font-bold text-center" style={{ color: colors.headerText }}>
          {t('social.shareProfileTitle')}
        </Text>
        <View className="items-center gap-3">
          <Image
            source={{ uri: qrUrl }}
            style={{ width: 180, height: 180, borderRadius: 12, backgroundColor: '#fff' }}
            resizeMode="contain"
          />
          <Text className="text-xs text-center px-4" style={{ color: colors.textSecondary }} numberOfLines={2}>
            {shareUrl}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={handleCopy}
            className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl"
            style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor2 }}
          >
            <Icon source="content-copy" size={18} color={colors.headerText} />
            <Text className="font-semibold text-sm" style={{ color: colors.headerText }}>
              {t('social.copyLink')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl"
            style={{ backgroundColor: SOCIAL_ACCENT }}
          >
            <Icon source="share-variant" size={18} color="#fff" />
            <Text className="font-semibold text-sm" style={{ color: '#fff' }}>
              {t('social.share')}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => sheet.dismiss()} className="py-2 items-center">
          <Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </SocialBottomSheet>
  );
};
