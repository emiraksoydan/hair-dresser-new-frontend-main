import React, { useEffect, useRef, useState } from 'react';
import type { ImageProps as RNImageProps, ImageResizeMode } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { cssInterop } from 'nativewind';

// NativeWind className desteği (RN Image'da otomatikti, expo-image için gerekli)
cssInterop(ExpoImage, { className: 'style' });

type RetryableImageProps = Omit<RNImageProps, 'source'> & {
  /** Uzak görsel adresi. null/boş ise fallback gösterilir. */
  uri?: string | null;
  /** Yükleme başarısız olursa / uri yoksa gösterilecek yerel görsel (require(...) sonucu). */
  fallbackSource: NonNullable<RNImageProps['defaultSource']>;
  /** Maksimum yeniden deneme sayısı (varsayılan 3). */
  maxRetries?: number;
  /** Denemeler arası bekleme (ms, varsayılan 1500). */
  retryDelayMs?: number;
};

/** RN resizeMode → expo-image contentFit eşlemesi. */
const toContentFit = (mode?: ImageResizeMode) => {
  switch (mode) {
    case 'contain':
      return 'contain' as const;
    case 'stretch':
      return 'fill' as const;
    case 'center':
      return 'none' as const;
    case 'cover':
    default:
      return 'cover' as const;
  }
};

/**
 * expo-image tabanlı, otomatik yeniden denemeli görsel bileşeni.
 *
 * expo-image bellek + disk cache (cachePolicy: memory-disk) ve native decode
 * pipeline'ı kullanır; listelerdeki kart görsellerinde RN <Image>'a göre
 * belirgin şekilde daha az bellek ve daha akıcı scroll sağlar.
 *
 * Geçici ağ hatalarında onError ile sınırlı sayıda otomatik yeniden deneme
 * yapar. Her denemede URI'ye cache-bust query param ekleyerek loader'ı yeni
 * istek atmaya zorlar (statik dosya sunucusu bilinmeyen query param'ı yok sayar).
 */
export const RetryableImage: React.FC<RetryableImageProps> = ({
  uri,
  fallbackSource,
  maxRetries = 3,
  retryDelayMs = 1500,
  onError,
  defaultSource,
  resizeMode,
  style,
  ...rest
}) => {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URI değişince retry state'ini sıfırla (carousel item recycling dahil).
  useEffect(() => {
    setAttempt(0);
    setFailed(false);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [uri]);

  const contentFit = toContentFit(resizeMode);

  if (!uri || failed) {
    return (
      <ExpoImage
        source={fallbackSource}
        contentFit={contentFit}
        style={style as any}
        {...(rest as any)}
      />
    );
  }

  const bustedUri =
    attempt > 0 ? `${uri}${uri.includes('?') ? '&' : '?'}_r=${attempt}` : uri;

  return (
    <ExpoImage
      source={{ uri: bustedUri }}
      placeholder={defaultSource ?? fallbackSource}
      placeholderContentFit={contentFit}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      recyclingKey={uri}
      transition={120}
      style={style as any}
      onError={(e: any) => {
        if (attempt < maxRetries) {
          timerRef.current = setTimeout(() => {
            setAttempt((a) => a + 1);
          }, retryDelayMs);
        } else {
          setFailed(true);
        }
        (onError as any)?.(e);
      }}
      {...(rest as any)}
    />
  );
};

RetryableImage.displayName = 'RetryableImage';
