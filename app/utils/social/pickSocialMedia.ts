import * as ImagePicker from 'expo-image-picker';

import type { FileObject } from '../../types';

import { UploadLimits, formatLimitMb } from '../../constants/uploadLimits';

import { ensureJpegForUpload, normalizeImageFile } from '../form/pick-document';

import i18n from '../../i18n/config';

import { showGlobalAlertError } from '../globalAlert';

import { DEFAULT_SOCIAL_LIMITS } from '../../constants/socialLimits';

import { getSocialLimits } from './socialLimitsRuntime';

import {

  launchSocialImageLibrary,

  requestSocialMediaLibraryPermission,

} from './socialImagePickerLaunch';



export { DEFAULT_SOCIAL_LIMITS, getSocialLimits };



/** @deprecated getSocialLimits().storyVideoMaxDurationSec kullanın */

export const MAX_SOCIAL_STORY_SEC = DEFAULT_SOCIAL_LIMITS.storyVideoMaxDurationSec;

/** @deprecated getSocialLimits().postVideoMaxDurationSec kullanın */

export const MAX_SOCIAL_VIDEO_SEC = DEFAULT_SOCIAL_LIMITS.postVideoMaxDurationSec;



export type SocialMediaPick =

  | { kind: 'photos'; files: FileObject[] }

  | { kind: 'video'; file: FileObject; durationSec: number };



function oversizeAlert(bytes: number) {
  showGlobalAlertError(String(i18n.t('common.imageTooLarge', { size: formatLimitMb(bytes) })));
}



/** Galeri URI'sini hemen döner; JPEG/HEIC sıkıştırma yükleme anında yapılır. */

function assetToPreviewFile(

  asset: ImagePicker.ImagePickerAsset,

  index: number,

): FileObject | null {

  if (typeof asset.fileSize === 'number' && asset.fileSize > UploadLimits.IMAGE_BYTES) {

    oversizeAlert(UploadLimits.IMAGE_BYTES);

    return null;

  }

  return normalizeImageFile(asset.uri, asset.fileName, asset.mimeType, index);

}



/** Paylaşım öncesi görselleri paralel hazırla (HEIC→JPEG, 4MB altı). */

export async function prepareSocialImagesForUpload(files: FileObject[]): Promise<FileObject[]> {

  return Promise.all(files.map((f) => ensureJpegForUpload(f)));

}



/** Profil avatar / kapak — HEIC uyumlu seçim + JPEG hazırlığı. */

export async function pickSocialProfileImage(options?: {

  allowsEditing?: boolean;

  aspect?: [number, number];

}): Promise<FileObject | null> {

  if (!(await requestSocialMediaLibraryPermission())) return null;



  const result = await launchSocialImageLibrary({

    mediaTypes: ImagePicker.MediaTypeOptions.Images,

    allowsEditing: options?.allowsEditing ?? true,

    aspect: options?.aspect ?? [1, 1],

    quality: 0.85,

  });

  if (!result || result.canceled || !result.assets[0]) return null;



  const asset = result.assets[0];

  const normalized = normalizeImageFile(asset.uri, asset.fileName, asset.mimeType);

  return ensureJpegForUpload(normalized);

}



/** Tek foto veya carousel için galeriden görsel seç (mevcut + yeni ≤ maxTotal). */

export async function pickSocialPhotos(

  currentCount: number,

  maxTotal?: number,

): Promise<FileObject[] | null> {

  const limits = getSocialLimits();

  const cap = maxTotal ?? limits.postCarouselMaxImages;

  const remaining = cap - currentCount;

  if (remaining <= 0) return null;



  if (!(await requestSocialMediaLibraryPermission())) return null;



  const result = await launchSocialImageLibrary({

    mediaTypes: ImagePicker.MediaTypeOptions.Images,

    allowsMultipleSelection: remaining > 1,

    selectionLimit: remaining,

    quality: 0.85,

  });

  if (!result || result.canceled || !result.assets?.length) return null;



  const out: FileObject[] = [];

  for (let i = 0; i < result.assets.length; i++) {

    const file = assetToPreviewFile(result.assets[i]!, i);

    if (file) out.push(file);

  }

  return out.length ? out : null;

}



/** Video veya reel için tek video seç. */

export async function pickSocialVideo(): Promise<SocialMediaPick | null> {

  const maxSec = getSocialLimits().postVideoMaxDurationSec;



  if (!(await requestSocialMediaLibraryPermission())) return null;



  const result = await launchSocialImageLibrary({

    mediaTypes: ImagePicker.MediaTypeOptions.Videos,

    allowsEditing: false,

    videoMaxDuration: maxSec,

    quality: 0.8,

  });

  if (!result || result.canceled || !result.assets?.[0]) return null;



  const asset = result.assets[0];

  const durationMs = asset.duration ?? 0;

  const durationSec = durationMs > 0 ? Math.round(durationMs / 1000) : 0;



  if (durationSec > maxSec) {
    showGlobalAlertError(String(i18n.t('social.videoTooLong', { max: maxSec })));
    return null;
  }



  if (typeof asset.fileSize === 'number' && asset.fileSize > UploadLimits.VIDEO_BYTES) {

    oversizeAlert(UploadLimits.VIDEO_BYTES);

    return null;

  }



  const name = asset.fileName ?? `video_${Date.now()}.mp4`;

  const type = asset.mimeType?.includes('/') ? asset.mimeType : 'video/mp4';



  return {

    kind: 'video',

    file: { uri: asset.uri, name, type },

    durationSec: durationSec > 0 ? durationSec : 1,

  };

}



export type StoryItemPick = {

  file: FileObject;

  durationSec?: number;

  isVideo: boolean;

};



/** Hikaye için çoklu fotoğraf seç. `remaining` verilmezse galeriden sınırsız çoklu seçim. */

export async function pickStoryPhotos(remaining?: number): Promise<StoryItemPick[] | null> {

  if (!(await requestSocialMediaLibraryPermission())) return null;



  const capped = remaining != null && remaining > 0;

  const multi = !capped || remaining > 1;



  const result = await launchSocialImageLibrary({

    mediaTypes: ImagePicker.MediaTypeOptions.Images,

    allowsMultipleSelection: multi,

    ...(capped ? { selectionLimit: remaining } : {}),

    allowsEditing: capped && remaining === 1,

    quality: 0.85,

  });

  if (!result || result.canceled || !result.assets?.length) return null;



  const out: StoryItemPick[] = [];

  for (let i = 0; i < result.assets.length; i++) {

    const file = assetToPreviewFile(result.assets[i]!, i);

    if (file) out.push({ file, isVideo: false });

  }

  return out.length ? out : null;

}



/** Hikaye için tek video seç. */

export async function pickStoryVideo(): Promise<StoryItemPick | null> {

  const maxSec = getSocialLimits().storyVideoMaxDurationSec;



  if (!(await requestSocialMediaLibraryPermission())) return null;



  const result = await launchSocialImageLibrary({

    mediaTypes: ImagePicker.MediaTypeOptions.Videos,

    allowsEditing: false,

    videoMaxDuration: maxSec,

    quality: 0.8,

  });

  if (!result || result.canceled || !result.assets?.[0]) return null;



  const asset = result.assets[0];

  const durationMs = asset.duration ?? 0;

  const durationSec = durationMs > 0 ? Math.round(durationMs / 1000) : 0;



  if (durationSec > maxSec) {
    showGlobalAlertError(String(i18n.t('social.storyTooLong', { max: maxSec })));
    return null;
  }

  if (typeof asset.fileSize === 'number' && asset.fileSize > UploadLimits.VIDEO_BYTES) {

    oversizeAlert(UploadLimits.VIDEO_BYTES);

    return null;

  }



  const name = asset.fileName ?? `story_${Date.now()}.mp4`;

  const type = asset.mimeType?.includes('/') ? asset.mimeType : 'video/mp4';

  return {

    file: { uri: asset.uri, name, type },

    durationSec: durationSec > 0 ? durationSec : 1,

    isVideo: true,

  };

}



/** Hikaye için fotoğraf veya kısa video. */

export async function pickSocialStoryMedia(): Promise<SocialMediaPick | null> {

  const maxSec = getSocialLimits().storyVideoMaxDurationSec;



  if (!(await requestSocialMediaLibraryPermission())) return null;



  const result = await launchSocialImageLibrary({

    mediaTypes: ImagePicker.MediaTypeOptions.All,

    allowsEditing: false,

    videoMaxDuration: maxSec,

    quality: 0.85,

  });

  if (!result || result.canceled || !result.assets?.[0]) return null;



  const asset = result.assets[0];

  const isVideo = asset.type === 'video' || (asset.mimeType?.startsWith('video/') ?? false);



  if (isVideo) {

    const durationMs = asset.duration ?? 0;

    const durationSec = durationMs > 0 ? Math.round(durationMs / 1000) : 0;

    if (durationSec > maxSec) {
      showGlobalAlertError(String(i18n.t('social.storyTooLong', { max: maxSec })));
      return null;
    }

    if (typeof asset.fileSize === 'number' && asset.fileSize > UploadLimits.VIDEO_BYTES) {

      oversizeAlert(UploadLimits.VIDEO_BYTES);

      return null;

    }

    const name = asset.fileName ?? `story_${Date.now()}.mp4`;

    const type = asset.mimeType?.includes('/') ? asset.mimeType : 'video/mp4';

    return {

      kind: 'video',

      file: { uri: asset.uri, name, type },

      durationSec: durationSec > 0 ? durationSec : 1,

    };

  }



  const file = assetToPreviewFile(asset, 0);

  if (!file) return null;

  return { kind: 'photos', files: [file] };

}

/** Carousel gönderi için fotoğraf + video karışık çoklu seçim. */
export async function pickCarouselMedia(remaining: number): Promise<StoryItemPick[] | null> {
  const maxSec = getSocialLimits().postVideoMaxDurationSec;

  if (!(await requestSocialMediaLibraryPermission())) return null;
  if (remaining <= 0) return null;

  const result = await launchSocialImageLibrary({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: remaining > 1,
    selectionLimit: remaining,
    allowsEditing: false,
    videoMaxDuration: maxSec,
    quality: 0.85,
  });
  if (!result || result.canceled || !result.assets?.length) return null;

  const out: StoryItemPick[] = [];
  for (let i = 0; i < result.assets.length; i++) {
    const asset = result.assets[i]!;
    const isVideo = asset.type === 'video' || (asset.mimeType?.startsWith('video/') ?? false);

    if (isVideo) {
      const durationMs = asset.duration ?? 0;
      const durationSec = durationMs > 0 ? Math.round(durationMs / 1000) : 0;
      if (durationSec > maxSec) {
        showGlobalAlertError(String(i18n.t('social.videoTooLong', { max: maxSec })));
        continue;
      }
      if (typeof asset.fileSize === 'number' && asset.fileSize > UploadLimits.VIDEO_BYTES) {
        oversizeAlert(UploadLimits.VIDEO_BYTES);
        continue;
      }
      const name = asset.fileName ?? `carousel_${Date.now()}_${i}.mp4`;
      const type = asset.mimeType?.includes('/') ? asset.mimeType : 'video/mp4';
      out.push({
        file: { uri: asset.uri, name, type },
        durationSec: durationSec > 0 ? durationSec : 1,
        isVideo: true,
      });
    } else {
      const file = assetToPreviewFile(asset, i);
      if (file) out.push({ file, isVideo: false });
    }
  }

  return out.length ? out : null;
}

