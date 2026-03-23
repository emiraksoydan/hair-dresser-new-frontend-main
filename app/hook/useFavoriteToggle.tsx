import { useCallback, useState, useEffect } from 'react';
import { useToggleFavoriteMutation, useIsFavoriteQuery } from '../store/api';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { FavoriteTargetType } from '../types';
import { useAlert } from './useAlert';

interface UseFavoriteToggleOptions {
  targetId: string;
  targetType?: FavoriteTargetType;
  appointmentId?: string | null;
  initialIsFavorite?: boolean;
  initialFavoriteCount?: number;
  skipQuery?: boolean;
}

interface UseFavoriteToggleReturn {
  isFavorite: boolean;
  favoriteCount: number;
  isLoading: boolean;
  toggleFavorite: () => Promise<void>;
}

/**
 * Centralized hook for managing favorite state and toggle functionality
 * Handles authentication checks, optimistic updates, and error handling
 */
export const useFavoriteToggle = ({
  targetId,
  targetType,
  appointmentId = null,
  initialIsFavorite = false,
  initialFavoriteCount = 0,
  skipQuery = false,
}: UseFavoriteToggleOptions): UseFavoriteToggleReturn => {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { alert, alertError } = useAlert();
  const [toggleFavoriteMutation, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();

  // Query for favorite status (only if authenticated and not skipped)
  const { data: isFavoriteData } = useIsFavoriteQuery(targetId, {
    skip: !isAuthenticated || skipQuery
  });

  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);

  // Update state when query data changes
  useEffect(() => {
    if (isFavoriteData !== undefined) {
      setIsFavorite(isFavoriteData);
    }
  }, [isFavoriteData]);

  // Update state when initial values change (for props-based updates)
  useEffect(() => {
    if (initialIsFavorite !== undefined) {
      setIsFavorite(initialIsFavorite);
    }
  }, [initialIsFavorite]);

  // Update favorite count when initial value changes
  useEffect(() => {
    if (initialFavoriteCount !== undefined && initialFavoriteCount !== null) {
      setFavoriteCount(initialFavoriteCount);
    }
  }, [initialFavoriteCount]);

  const toggleFavorite = useCallback(async () => {
    if (!isAuthenticated) {
      alert(t('booking.warning'), t('booking.loginRequiredForFavorite'), undefined, 'warning');
      return;
    }

    try {
      const result = await toggleFavoriteMutation({
        targetId,
        targetType,
        appointmentId,
      });
      if ('error' in result) {
        // Favorite toggle hatası - kullanıcıya göster
        alertError(
          t('common.error'),
          (result.error as any)?.data?.message || (result.error as any)?.message || t('appointment.alerts.favoriteFailed')
        );
        return;
      }

      // Update state from response
      if (result?.data?.data) {
        setIsFavorite(result.data.data.isFavorite ?? !isFavorite);
        if (result.data.data.favoriteCount !== undefined) {
          setFavoriteCount(result.data.data.favoriteCount);
        }
      } else {
        // Fallback: toggle isFavorite if response doesn't have data
        setIsFavorite(prev => !prev);
      }
    } catch (error: any) {
      alertError(
        t('common.error'),
        error?.data?.message || error?.message || t('appointment.alerts.favoriteFailed')
      );
    }
  }, [isAuthenticated, targetId, targetType, appointmentId, toggleFavoriteMutation, t, isFavorite, alert, alertError]);

  return {
    isFavorite,
    favoriteCount,
    isLoading: isTogglingFavorite,
    toggleFavorite,
  };
};
