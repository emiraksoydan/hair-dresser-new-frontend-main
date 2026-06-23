import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGetSocialMyProfilesQuery } from '../store/api';
import type { SocialProfileDto } from '../types/social';
import { useMultiAccount } from './MultiAccountContext';
import { useAuth } from '../hook/useAuth';
import {
  normalizeSocialProfileOwnerType,
  pickPreferredSocialProfile,
  socialActiveProfileStorageKey,
  userTypeToSocialOwnerType,
} from '../utils/social/normalizeSocialProfile';

type ActiveSocialProfileContextValue = {
  profiles: SocialProfileDto[];
  activeProfile: SocialProfileDto | undefined;
  activeProfileId: string | null;
  setActiveProfileId: (id: string) => void;
  isLoading: boolean;
};

const ActiveSocialProfileContext = createContext<ActiveSocialProfileContextValue | null>(null);

export function ActiveSocialProfileProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userType, userId } = useAuth();
  const { currentUserId } = useMultiAccount();
  const resolvedUserId = currentUserId ?? userId;
  const storageKey = socialActiveProfileStorageKey(resolvedUserId);

  const { data: profiles, isLoading: profilesLoading, isFetching, refetch } = useGetSocialMyProfilesQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
  });
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const manualPickRef = useRef(false);
  const prevUserTypeRef = useRef(userType);

  useEffect(() => {
    if (prevUserTypeRef.current !== userType) {
      prevUserTypeRef.current = userType;
      manualPickRef.current = false;
      if (isAuthenticated) void refetch();
    }
  }, [userType, isAuthenticated, refetch]);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    setActiveProfileIdState(null);
    manualPickRef.current = false;

    AsyncStorage.getItem(storageKey)
      .then((id) => {
        if (!cancelled && id) setActiveProfileIdState(id);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated || !profiles?.length) return;

    const valid = activeProfileId && profiles.some((p) => p.id === activeProfileId);
    if (manualPickRef.current) {
      if (!valid) {
        const next = pickPreferredSocialProfile(profiles, userType, null)?.id;
        if (next) {
          setActiveProfileIdState(next);
          AsyncStorage.setItem(storageKey, next).catch(() => {});
        }
      }
      return;
    }

    const preferred = userTypeToSocialOwnerType(userType);
    const active = activeProfileId ? profiles.find((p) => p.id === activeProfileId) : undefined;

    if (
      preferred != null &&
      active &&
      normalizeSocialProfileOwnerType(active.ownerType) !== preferred
    ) {
      const match = profiles.find(
        (p) => normalizeSocialProfileOwnerType(p.ownerType) === preferred,
      );
      if (match && match.id !== activeProfileId) {
        setActiveProfileIdState(match.id);
        AsyncStorage.setItem(storageKey, match.id).catch(() => {});
        return;
      }
    }

    if (!valid) {
      const next = pickPreferredSocialProfile(profiles, userType, null)?.id;
      if (next) {
        setActiveProfileIdState(next);
        AsyncStorage.setItem(storageKey, next).catch(() => {});
      }
    }
  }, [profiles, activeProfileId, hydrated, userType, storageKey]);

  const setActiveProfileId = useCallback(
    (id: string) => {
      manualPickRef.current = true;
      setActiveProfileIdState(id);
      AsyncStorage.setItem(storageKey, id).catch(() => {});
    },
    [storageKey],
  );

  const activeProfile = useMemo<SocialProfileDto | undefined>(() => {
    const list = profiles ?? [];
    if (!list.length) return undefined;
    if (activeProfileId) {
      const found = list.find((p) => p.id === activeProfileId);
      if (found) return found;
    }
    return pickPreferredSocialProfile(list, userType, null);
  }, [profiles, activeProfileId, userType]);

  const value = useMemo<ActiveSocialProfileContextValue>(
    () => ({
      profiles: profiles ?? [],
      activeProfile,
      activeProfileId: activeProfile?.id ?? null,
      setActiveProfileId,
      isLoading: isAuthenticated && (profilesLoading || isFetching || !hydrated),
    }),
    [profiles, activeProfile, setActiveProfileId, profilesLoading, isFetching, hydrated, isAuthenticated],
  );

  return (
    <ActiveSocialProfileContext.Provider value={value}>{children}</ActiveSocialProfileContext.Provider>
  );
}

export function useActiveSocialProfile(): ActiveSocialProfileContextValue {
  const ctx = useContext(ActiveSocialProfileContext);
  if (!ctx) {
    throw new Error('useActiveSocialProfile must be used within ActiveSocialProfileProvider');
  }
  return ctx;
}
