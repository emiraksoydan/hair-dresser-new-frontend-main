import { useGetSettingQuery } from '../store/api';

/** Sosyal boş durum Lottie'leri — kullanıcı `showImageAnimation` ile döngüyü kapatır. */
export function useSocialLottieAnimation() {
  const { data } = useGetSettingQuery();
  const enabled = data?.data?.showImageAnimation ?? true;
  return {
    enabled,
    autoPlay: enabled,
    loop: enabled,
  };
}
