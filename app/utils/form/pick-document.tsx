import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { FileObject } from "../../types";
import { FieldValues, Path, UseFormSetValue } from 'react-hook-form';

/** Galeri yükleri ile aynı; çok büyümeden web/API uyumu için yeterli */
const JPEG_UPLOAD_QUALITY = 0.8;

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

export const handlePickImage = async (): Promise<FileObject | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: JPEG_UPLOAD_QUALITY,
    });
    if (!result.canceled) {
        const file = result.assets[0];
        const normalized = normalizeImageFile(file.uri, file.fileName, file.mimeType);
        return ensureJpegForUpload(normalized);
    }
    return null;
};

/** type "image" gibi AssetType değerlerini geçerli MIME type'a çevirir.
 *  Tüm FormData file append işlemlerinde kullanılmalıdır. */
export const resolveMimeType = (type: string | undefined, fileName: string | undefined): string => {
  if (type && type.includes('/')) return type;
  return getMimeFromExt(fileName ?? '');
};

export const truncateFileName = (name: string, max = 40) =>
    name.length > max ? name.slice(0, max - 3) + "..." : name;

/**
 * Pick multiple images from gallery
 */
export const handlePickMultipleImages = async (maxImages: number = 3): Promise<FileObject[]> => {
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxImages,
        quality: JPEG_UPLOAD_QUALITY,
    });

    if (!result.canceled && result.assets) {
        const normalized = result.assets.map((file, index) =>
            normalizeImageFile(file.uri, file.fileName, file.mimeType, index),
        );
        return Promise.all(normalized.map((f) => ensureJpegForUpload(f)));
    }
    return [];
};
