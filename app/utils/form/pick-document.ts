import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';
import { FileObject } from "../../types";
import { FieldValues, Path, UseFormSetValue } from 'react-hook-form';
import { UploadLimits, formatLimitMb } from '../../constants/uploadLimits';
import i18n from '../../i18n/config';

/** Galeri yükleri ile aynı; çok büyümeden web/API uyumu için yeterli */
const JPEG_UPLOAD_QUALITY = 0.8;

/**
 * Backend (Azure Content Safety) görsel limiti: 4 MB. Bu eşik o limit altında
 * kalmak için "ısı koruyucu" değer — 3.5 MB üzeri görseller resize + recompress.
 * Modern telefonlardan çekilen JPEG'ler 5-8 MB civarında olabiliyor.
 */
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
/** Resize sırasında uygulanacak kademeli kalite seviyeleri (büyükse daha agresif sıkıştır) */
const COMPRESSION_LEVELS = [0.8, 0.65, 0.5, 0.35];
/** Çok büyük (>8MP) görsellerde önce maks genişliğe küçült — sonra recompress */
const MAX_DIMENSION = 2048;

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
    const title = i18n.t('common.error');
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

/**
 * Verilen dosyanın MEVCUT bayt boyutunu döner. expo-image-picker bazen fileSize
 * vermez (Android'de undefined olabilir); bu durumda fetch+blob ile öğrenmeye çalışırız.
 * Hata olursa null döner.
 */
async function getFileSizeBytes(uri: string): Promise<number | null> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return blob.size;
  } catch {
    return null;
  }
}

/**
 * Görseli kademeli olarak küçültür/sıkıştırır:
 *   1. Çok büyük (>MAX_DIMENSION) ise önce resize et
 *   2. Sonra COMPRESSION_LEVELS sırasıyla sıkıştır, MAX_UPLOAD_BYTES altına gelince dur
 *   3. Hâlâ büyükse en agresif seviyeyi kullan + ek resize
 *
 * Backend Azure Content Safety 4MB sınırını aşmamak için tüm yüklemelerde devreye girer.
 */
async function compressBelowLimit(
  uri: string,
  originalName: string | null | undefined,
): Promise<{ uri: string; bytes: number } | null> {
  let workingUri = uri;

  // Adım 1: çok büyük çözünürlüğü düşür
  try {
    const resized = await ImageManipulator.manipulateAsync(
      workingUri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: COMPRESSION_LEVELS[0], format: ImageManipulator.SaveFormat.JPEG },
    );
    workingUri = resized.uri;
  } catch (err) {
    // Resize başarısızsa orijinalle devam — sonraki kademede compress denenecek
  }

  // Adım 2: hâlâ limiti aşıyorsa kademeli sıkıştır
  for (const quality of COMPRESSION_LEVELS) {
    try {
      const out = await ImageManipulator.manipulateAsync(workingUri, [], {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const size = await getFileSizeBytes(out.uri);
      if (size != null && size <= MAX_UPLOAD_BYTES) {
        return { uri: out.uri, bytes: size };
      }
      workingUri = out.uri;
    } catch {
      // Bu kademede patladıysa sonraki kademeyi dene
    }
  }

  // Adım 3: son çare — daha agresif resize (1280px) + en düşük kalite
  try {
    const final = await ImageManipulator.manipulateAsync(
      workingUri,
      [{ resize: { width: 1280 } }],
      { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG },
    );
    const finalSize = await getFileSizeBytes(final.uri);
    return { uri: final.uri, bytes: finalSize ?? 0 };
  } catch {
    return null;
  }
}

/**
 * HEIC/HEIF → JPEG dönüşümü + 4MB limit altına compression.
 *
 * Önceki davranış: Sadece HEIC dönüşümü yapıyordu, PNG/JPEG dokunulmuyordu.
 * Yeni davranış: TÜM görseller 4MB altına çekilir (Azure Content Safety sınırı).
 * Modern telefon JPEG'leri 5-8MB olabildiği için kritik.
 */
export async function ensureJpegForUpload(file: FileObject): Promise<FileObject> {
  // Önce mevcut boyutu öğren — küçükse hiç dokunma (CPU/disk tasarrufu)
  const currentSize = await getFileSizeBytes(file.uri);
  const needsHeicConvert = isHeicLike(file.uri, file.name, file.type);
  const tooLarge = currentSize != null && currentSize > MAX_UPLOAD_BYTES;

  if (!needsHeicConvert && !tooLarge) {
    return file; // Zaten uygun
  }

  try {
    const result = await compressBelowLimit(file.uri, file.name);
    if (!result) return file; // Compression patladıysa orijinali bırak (server-side reject olacak)

    const base =
      (file.name ?? 'photo')
        .replace(/\.(heic|heif)$/i, '')
        .replace(/\.[^/.]+$/, '') || 'photo';
    return { uri: result.uri, name: `${base}.jpg`, type: 'image/jpeg' };
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
