import { useEffect } from 'react';
import { useGetSocialLimitsQuery } from '../store/api';
import { DEFAULT_SOCIAL_LIMITS } from '../constants/socialLimits';
import { applySocialLimitsFromApi } from '../utils/social/socialLimitsRuntime';

/** Sunucudaki sosyal medya limitlerini yükler ve runtime cache'e yazar. */
export function useSocialLimits() {
  const { data, isLoading, isError } = useGetSocialLimitsQuery();

  useEffect(() => {
    if (data) applySocialLimitsFromApi(data);
  }, [data]);

  return {
    limits: data ?? DEFAULT_SOCIAL_LIMITS,
    isLoading,
    isError,
  };
}
