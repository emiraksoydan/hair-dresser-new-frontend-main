import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { FileObject } from "../../types";
import { FieldValues, Path, UseFormSetValue } from 'react-hook-form';
import { UploadLimits, formatLimitMb } from '../../constants/uploadLimits';
import i18n from '../../i18n/config';

/** Galeri yükleri ile aynı; çok büyümeden web/API uyumu için yeterli */
const JPEG_UPLOAD_QUALITY = 0.8;

export type PickImageOptions = {
    /** Varsayılan: {@link UploadLimits.IMAGE_BYTES}. Aşan dosya reddedilir. */
    maxBytes?: number;
    /**
     * Aşım durumunda gösterilecek özel handler. Verilmezse varsayılan
     * `Alert.alert` ile i18n çevirisi kullanılarak kullanıcı bilgilendirilir.
     * (Helper'ı çağıran component'ler için backward-compat: mevcut callerlar
     * hiç değişiklik yapmadan faydalanır.)
     */
    onOversize?: (info: { megabytes: number; fileName?: string | null }) => void;
};

/** Varsayılan "dosya çok büyük" alerti — i18n key: common.imageTooLarge. */
function defaultNotifyOversize(megabytes: number) {
    const title = i18n.t('common.error') || 'Hata';
    const message =
        i18n.t('common.imageTooLarge', { size: megabytes }) ||
        `Bu görsel yüklenemez. Maksimum boyut: ${megabytes} MB.`;
    Alert.alert(String(title), String(message));
}

const HEIC_MIMES = new Set(['image/heic', 'image/heif']);

/** Dosya uzantısından MIME type türetir */
const getMimeFromExt = (name: string): string => {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.gif$/i.test(name)) return 'image/gif';
  if (/\.webp$/i.test(name)) return 'image/webp';
  return 'image/jpeg';
};

function isHeicLike(uri: string, fileName?: string | null, mimeType?: string | null): boolean {
  const m = mimeType?.toLowerCase() ?? '';
  if (HEIC_MIMES.has(m)) return true;
  const u = uri.toLowerCase();
  if (u.includes('.heic') || u.includes('.heif')) return true;
  if (fileName && /\.(heic|heif)$/i.test(fileName)) return true;
  return false;
}

/** HEIC/HEIF → gerçek JPEG (iOS/Android). PNG/JPEG/WebP dokunulmaz — daha az CPU, yeterli uyumluluk. */
export async function ensureJpegForUpload(file: FileObject): Promise<FileObject> {
  if (!isHeicLike(file.uri, file.name, file.type)) return file;
  try {
    const out = await ImageManipulator.manipulateAsync(file.uri, [], {
      compress: JPEG_UPLOAD_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const base =
      (file.name ?? 'photo')
        .replace(/\.(heic|heif)$/i, '')
        .replace(/\.[^/.]+$/, '') || 'photo';
    return { uri: out.uri, name: `${base}.jpg`, type: 'image/jpeg' };
  } catch {
    return file;
  }
}

/** Asset mimeType + dosya adından FileObject; Expo'da `type` alanı 'image' gibi AssetType olabilir — mime için mimeType kullanın. */
export const normalizeImageFile = (
  uri: string,
  fileName: string | null | undefined,
  mimeType: string | undefined,
  index?: number,
): FileObject => {
  const rawName = fileName ?? `photo${index !== undefined ? `_${index}` : ''}.jpg`;
  const extHeic = /\.(heic|heif)$/i.test(rawName);
  const uriHeic = uri.toLowerCase().includes('.heic') || uri.toLowerCase().includes('.heif');
  const resolvedType =
    mimeType && mimeType.includes('/')
      ? mimeType
      : extHeic || uriHeic
        ? 'image/heic'
        : getMimeFromExt(rawName);
  return { uri, name: rawName, type: resolvedType };
};

export async function pickImageAndSet<TFieldValues extends FieldValues>(
    setValue: UseFormSetValue<TFieldValues>,
    name: Path<TFieldValues>
) {
    const file = await handlePickImage();
    if (file) {
        setValue(name, file as any, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }
}

export const handlePickImage = async (options?: PickImageOptions): Promise<FileObject | null> => {
    const maxBytes = options?.maxBytes ?? UploadLimits.IMAGE_BYTES;
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: JPEG_UPLOAD_QUALITY,
    });
    if (result.canceled) return null;
    const file = result.assets[0];

    // Boyut kontrolü: expo-image-picker Asset.fileSize iOS'ta genelde dolu,
    // Android'de bazı cihazlarda undefined olabilir. Undefined ise server-side
    // validasyona güveniyoruz; tanımlıysa client-side reject ederek yükleme
    // bekletmeyi ve fazladan trafik tüketimini önlüyoruz.
    if (typeof file.fileSize === 'number' && file.fileSize > maxBytes) {
        const mb = formatLimitMb(maxBytes);
        if (options?.onOversize) {
            options.onOversize({ megabytes: mb, fileName: file.fileName });
        } else {
            defaultNotifyOversize(mb);
        }
        return null;
    }

    const normalized = normalizeImageFile(file.uri, file.fileName, file.mimeType);
    return ensureJpegForUpload(normalized);
};

/** type "image" gibi AssetType değerlerini geçerli MIME type'a çevirir.
 *  Tüm FormData file append işlemlerinde kullanılmalıdır. */
export const resolveMimeType = (type: string | undefined, fileName: string | undefined): string => {
  if (type && type.includes('/')) return type;
  return getMimeFromExt(fileName ?? '');
};

export const truncateFileName = (name: string, max = 28) =>
    name.length > max ? name.slice(0, max - 3) + "..." : name;

/**
 * Pick multiple images from gallery.
 *
 * Boyut aşımı: aşan asset'ler diziden elenir. Eğer hiç geçerli kalmadıysa
 * oversize bildirimi verilir; bazıları geçerliyse yalnızca geçerliler dönülür
 * ve eleme sessiz yapılır (çok dosya seçen kullanıcıyı sürekli alertle
 * rahatsız etmemek için). Caller isterse `onOversize` ile custom davranış
 * yapabilir.
 */
export const handlePickMultipleImages = async (
    maxImages: number = 3,
    options?: PickImageOptions,
): Promise<FileObject[]> => {
    const maxBytes = options?.maxBytes ?? UploadLimits.IMAGE_BYTES;
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxImages,
        quality: JPEG_UPLOAD_QUALITY,
    });

    if (result.canceled || !result.assets) return [];

    let oversizeCount = 0;
    const accepted = result.assets.filter((file) => {
        if (typeof file.fileSize === 'number' && file.fileSize > maxBytes) {
            oversizeCount += 1;
            return false;
        }
        return true;
    });

    if (oversizeCount > 0 && accepted.length === 0) {
        const mb = formatLimitMb(maxBytes);
        if (options?.onOversize) {
            options.onOversize({ megabytes: mb });
        } else {
            defaultNotifyOversize(mb);
        }
    }

    const normalized = accepted.map((file, index) =>
        normalizeImageFile(file.uri, file.fileName, file.mimeType, index),
    );
    return Promise.all(normalized.map((f) => ensureJpegForUpload(f)));
};
