import { useCallback, useState, useEffect, useMemo } from 'react';
import { useToggleFavoriteMutation, useIsFavoriteQuery, useGetAllBlockedUserIdsQuery } from '../store/api';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { FavoriteTargetType } from '../types';
import { useAlert } from './useAlert';
import { useActionGuard } from './useActionGuard';

interface UseFavoriteToggleOptions {
  targetId: string;
  targetType?: FavoriteTargetType;
  appointmentId?: string | null;
  initialIsFavorite?: boolean;
  initialFavoriteCount?: number;
  skipQuery?: boolean;
  /** Profil sahibinin UserId — engel varsa favori kapalı (liste tek istekle cache paylaşır) */
  counterpartyUserId?: string | null;
}

interface UseFavoriteToggleReturn {
  isFavorite: boolean;
  favoriteCount: number;
  isLoading: boolean;
  favoriteDisabled: boolean;
  toggleFavorite: () => Promise<void | undefined>;
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
  counterpartyUserId = null,
}: UseFavoriteToggleOptions): UseFavoriteToggleReturn => {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { alert, alertError } = useAlert();
  const guard = useActionGuard();
  const [toggleFavoriteMutation, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();

  const { data: blockedUserIds = [] } = useGetAllBlockedUserIdsQuery(undefined, {
    skip: !isAuthenticated || !counterpartyUserId,
  });

  const favoriteDisabled = useMemo(() => {
    if (!counterpartyUserId) return false;
    return blockedUserIds.includes(counterpartyUserId);
  }, [counterpartyUserId, blockedUserIds]);

  // Query for favorite status (only if authenticated and not skipped)
  const { data: isFavoriteData } = useIsFavoriteQuery(targetId, {
    skip: !isAuthenticated || skipQuery
  });

  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);

  // Kalp durumu: skipQuery ise props; değilse önce API (isFavorite), yoksa props — iki effect'in birbirini ezmesi engellenir
  useEffect(() => {
    if (skipQuery) {
      if (initialIsFavorite !== undefined) setIsFavorite(initialIsFavorite);
      return;
    }
    if (isFavoriteData !== undefined) {
      setIsFavorite(isFavoriteData);
    } else if (initialIsFavorite !== undefined) {
      setIsFavorite(initialIsFavorite);
    }
  }, [skipQuery, initialIsFavorite, isFavoriteData]);

  // Update favorite count when initial value changes
  useEffect(() => {
    if (initialFavoriteCount !== undefined && initialFavoriteCount !== null) {
      setFavoriteCount(initialFavoriteCount);
    }
  }, [initialFavoriteCount]);

  const toggleFavorite = useCallback(() => guard(async () => {
    if (!isAuthenticated) {
      alert(t('booking.warning'), t('booking.loginRequiredForFavorite'), undefined, 'warning');
      return;
    }
    if (favoriteDisabled) {
      alertError(t('common.error'), t('favorites.cannotFavoriteBlocked'));
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
  }), [guard, isAuthenticated, targetId, targetType, appointmentId, toggleFavoriteMutation, t, isFavorite, alert, alertError, favoriteDisabled]);

  return {
    isFavorite,
    favoriteCount,
    isLoading: isTogglingFavorite,
    favoriteDisabled,
    toggleFavorite,
  };
};
