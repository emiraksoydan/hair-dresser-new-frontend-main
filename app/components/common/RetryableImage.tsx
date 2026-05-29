import React, { useEffect, useRef, useState } from 'react';
import { Image, type ImageProps } from 'react-native';

type RetryableImageProps = Omit<ImageProps, 'source'> & {
  /** Uzak görsel adresi. null/boş ise fallback gösterilir. */
  uri?: string | null;
  /** Yükleme başarısız olursa / uri yoksa gösterilecek yerel görsel (require(...) sonucu). */
  fallbackSource: NonNullable<ImageProps['defaultSource']>;
  /** Maksimum yeniden deneme sayısı (varsayılan 3). */
  maxRetries?: number;
  /** Denemeler arası bekleme (ms, varsayılan 1500). */
  retryDelayMs?: number;
};

/**
 * RN'in yerleşik <Image> bileşeni başarısız bir uzak yüklemeyi bellekte
 * "başarısız" olarak önbelleğe alır ve aynı URI için BİR DAHA denemez.
 * Bu yüzden geçici ağ hatalarında kart görselleri gelmez; refresh URI'yi
 * değiştirmediği için düzelmez, yalnızca uygulama yeniden açılınca düzelir.
 *
 * Bu sarmalayıcı onError ile sınırlı sayıda otomatik yeniden deneme yapar.
 * Her denemede URI'ye cache-bust query param ekleyerek loader'ı yeni istek
 * atmaya zorlar (statik dosya sunucusu bilinmeyen query param'ı yok sayar).
 *
 * Başarılı yükleme durumunda (attempt=0) davranış normal <Image> ile birebir
 * aynıdır — URI olduğu gibi kullanılır, hiçbir ek istek yapılmaz.
 */
export const RetryableImage: React.FC<RetryableImageProps> = ({
  uri,
  fallbackSource,
  maxRetries = 3,
  retryDelayMs = 1500,
  onError,
  defaultSource,
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

  if (!uri || failed) {
    return <Image source={fallbackSource} {...rest} />;
  }

  const bustedUri =
    attempt > 0 ? `${uri}${uri.includes('?') ? '&' : '?'}_r=${attempt}` : uri;

  return (
    <Image
      source={{ uri: bustedUri }}
      defaultSource={defaultSource ?? fallbackSource}
      onError={(e) => {
        if (attempt < maxRetries) {
          timerRef.current = setTimeout(() => {
            setAttempt((a) => a + 1);
          }, retryDelayMs);
        } else {
          setFailed(true);
        }
        onError?.(e);
      }}
      {...rest}
    />
  );
};

RetryableImage.displayName = 'RetryableImage';
