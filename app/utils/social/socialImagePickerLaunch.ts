import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import i18n from '../../i18n/config';
import { showGlobalAlertError } from '../globalAlert';

/** iOS: HEIC / iCloud varlıkları için uyumlu temsil + ağdan indirme. */
export function socialImagePickerIosOptions(): Partial<ImagePicker.ImagePickerOptions> {
  if (Platform.OS !== 'ios') return {};
  return {
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    // iCloud'daki öğeler — runtime'da desteklenir (SDK 49+)
    ...({ shouldDownloadFromNetwork: true } as Partial<ImagePicker.ImagePickerOptions>),
  };
}

function pickFailureMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();
  if (
    lower.includes('heic') ||
    lower.includes('heif') ||
    lower.includes('representation') ||
    lower.includes('3164')
  ) {
    return String(i18n.t('social.pickMediaHeicHint'));
  }
  return String(i18n.t('social.pickMediaFailed'));
}

/**
 * expo-image-picker sarmalayıcı — iOS HEIC / PHPhotos 3164 hatalarını yakalar.
 * `null` = iptal veya hata (kullanıcıya dialog gösterildi).
 */
export async function launchSocialImageLibrary(
  options: ImagePicker.ImagePickerOptions,
): Promise<ImagePicker.ImagePickerResult | null> {
  try {
    return await ImagePicker.launchImageLibraryAsync({
      ...socialImagePickerIosOptions(),
      ...options,
    });
  } catch (err) {
    showGlobalAlertError(pickFailureMessage(err));
    return null;
  }
}

export async function requestSocialMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status === 'granted') return true;
  showGlobalAlertError(String(i18n.t('social.permissionPhotos')));
  return false;
}
