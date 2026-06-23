import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import SearchBar from '../../components/common/SearchBar';
import { Text } from '../../components/common/Text';
import { SocialEmptyStateCard } from '../../components/social/SocialEmptyStateCard';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useBottomSheet } from '../../hook/useBottomSheet';
import {
  useLazyDiscoverSocialPostsQuery,
  useLazySearchSocialProfilesQuery,
} from '../../store/api';
import type { SocialPostDto, SocialProfileSearchResultDto } from '../../types/social';
import { AvailabilityFilter, DEFAULT_FILTER_RADIUS_KM } from '../../constants/filterDefaults';
import { SocialSearchRadiusMenu } from '../../components/social/SocialSearchRadiusMenu';
import { SocialSearchProfileDropdown } from '../../components/social/SocialSearchProfileDropdown';
import { SocialDiscoverMasonryGrid } from '../../components/social/SocialDiscoverMasonryGrid';
import {
  SocialDiscoverFiltersSheet,
  DEFAULT_SOCIAL_DISCOVER_FILTERS,
  countActiveSocialDiscoverFilters,
  type SocialDiscoverFilters,
} from '../../components/social/SocialDiscoverFiltersSheet';
import { normalizeSocialSearchQuery } from '../../utils/social/normalizeSocialSearchQuery';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

const DISCOVER_PAGE = 30;
const PROFILE_SUGGEST_LIMIT = 12;

export default function SocialSearchScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [radiusKm, setRadiusKm] = useState(DEFAULT_FILTER_RADIUS_KM);
  const [discoverFilters, setDiscoverFilters] = useState<SocialDiscoverFilters>(DEFAULT_SOCIAL_DISCOVER_FILTERS);
  const filterSheet = useBottomSheet(['72%']);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationReady, setLocationReady] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<SocialProfileSearchResultDto | null>(null);
  const [searchRowHeight, setSearchRowHeight] = useState(0);
  const [posts, setPosts] = useState<SocialPostDto[]>([]);
  const postsRef = useRef<SocialPostDto[]>([]);
  const loadingMoreRef = useRef(false);

  postsRef.current = posts;

  const searchTerm = normalizeSocialSearchQuery(query);

  const [searchProfiles, { data: profileResults, isFetching: searchingProfiles, isError: profileSearchError }] =
    useLazySearchSocialProfilesQuery();
  const [fetchDiscover, { isFetching: discovering, isError: discoverError }] =
    useLazyDiscoverSocialPostsQuery();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let nextCoords: { latitude: number; longitude: number } | null = null;
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          nextCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        }
        if (!cancelled) {
          setCoords(nextCoords);
          setLocationReady(true);
        }
      } catch {
        if (!cancelled) setLocationReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showProfileDropdown = searchTerm.length >= 1 && !selectedProfile;

  const filterParams = useMemo(() => {
    const params: { availability?: number; serviceIds?: string[] } = {};
    if (discoverFilters.availability !== AvailabilityFilter.Any) {
      params.availability = discoverFilters.availability;
    }
    if (discoverFilters.serviceIds.length > 0) {
      params.serviceIds = discoverFilters.serviceIds;
    }
    return params;
  }, [discoverFilters]);

  const geoParams = useMemo(() => {
    if (!coords || radiusKm === 0) return {};
    return { latitude: coords.latitude, longitude: coords.longitude, radiusKm };
  }, [coords, radiusKm]);

  const hasActiveDiscoverFilters = countActiveSocialDiscoverFilters(discoverFilters) > 0;

  useEffect(() => {
    if (!showProfileDropdown) return;
    const id = setTimeout(() => {
      searchProfiles({ q: searchTerm, ...geoParams, ...filterParams, limit: PROFILE_SUGGEST_LIMIT });
    }, 280);
    return () => clearTimeout(id);
  }, [searchTerm, geoParams, filterParams, searchProfiles, showProfileDropdown]);

  const loadDiscover = useCallback(
    async (reset: boolean) => {
      const canSearch =
        !!selectedProfile || !!searchTerm || (!!coords && radiusKm !== 0) || hasActiveDiscoverFilters;
      if (!canSearch) {
        if (reset) setPosts([]);
        return;
      }

      const current = postsRef.current;
      const before = reset ? undefined : current[current.length - 1]?.createdAt;
      const beforeId = reset ? undefined : current[current.length - 1]?.id;

      const discoverParams = selectedProfile
        ? { profileId: selectedProfile.id, before, beforeId, limit: DISCOVER_PAGE }
        : searchTerm
          ? { q: searchTerm, ...geoParams, ...filterParams, before, beforeId, limit: DISCOVER_PAGE }
          : coords && radiusKm !== 0
            ? {
                latitude: coords.latitude,
                longitude: coords.longitude,
                radiusKm,
                ...filterParams,
                before,
                beforeId,
                limit: DISCOVER_PAGE,
              }
            : hasActiveDiscoverFilters
              ? { ...filterParams, before, beforeId, limit: DISCOVER_PAGE }
              : null;

      if (!discoverParams) {
        if (reset) setPosts([]);
        return;
      }

      try {
        const batch = await fetchDiscover(discoverParams).unwrap();
        setPosts((prev) => {
          if (reset) return batch;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...batch.filter((p) => !seen.has(p.id))];
        });
      } catch {
        if (reset) setPosts([]);
      }
    },
    [selectedProfile, searchTerm, coords, radiusKm, geoParams, filterParams, hasActiveDiscoverFilters, fetchDiscover],
  );

  const loadDiscoverRef = useRef(loadDiscover);
  loadDiscoverRef.current = loadDiscover;

  const discoveryKey = useMemo(
    () =>
      `${searchTerm}|${radiusKm}|${selectedProfile?.id ?? ''}|${coords?.latitude ?? ''}|${coords?.longitude ?? ''}|${discoverFilters.availability}|${discoverFilters.serviceIds.join(',')}`,
    [searchTerm, radiusKm, selectedProfile?.id, coords?.latitude, coords?.longitude, discoverFilters],
  );

  const lastFetchedKeyRef = useRef<string | null>(null);
  const discoverInFlightRef = useRef(false);

  useEffect(() => {
    if (!locationReady) return;
    if (lastFetchedKeyRef.current === discoveryKey) return;
    if (discoverInFlightRef.current) return;

    let cancelled = false;
    const id = setTimeout(() => {
      if (cancelled) return;
      discoverInFlightRef.current = true;
      lastFetchedKeyRef.current = discoveryKey;
      void loadDiscoverRef.current(true).finally(() => {
        discoverInFlightRef.current = false;
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [locationReady, discoveryKey]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || discovering || posts.length === 0) return;
    loadingMoreRef.current = true;
    try {
      await loadDiscover(false);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [discovering, posts.length, loadDiscover]);

  const handlePickProfile = useCallback((profile: SocialProfileSearchResultDto) => {
    setSelectedProfile(profile);
    setQuery('');
  }, []);

  const clearProfileFilter = useCallback(() => {
    setSelectedProfile(null);
  }, []);

  const emptyState = useMemo(() => {
    if (!locationReady || discovering) return null;
    if (!searchTerm && !coords && !selectedProfile && !hasActiveDiscoverFilters) {
      return (
        <SocialEmptyStateCard
          animationSource={require('../../../assets/animations/empty.json')}
          message={t('social.searchNeedInput')}
          animationSize={130}
          animationKey="social-search-hint"
        />
      );
    }
    if (posts.length === 0) {
      const hasProfileHint = searchTerm.length > 0 && (profileResults?.length ?? 0) > 0;
      return (
        <SocialEmptyStateCard
          animationSource={
            discoverError || profileSearchError
              ? require('../../../assets/animations/error.json')
              : require('../../../assets/animations/empty.json')
          }
          message={
            discoverError || profileSearchError
              ? t('social.searchError')
              : hasProfileHint
                ? t('social.searchPostsEmpty')
                : t('social.searchEmpty')
          }
          animationSize={130}
          animationKey="social-search-empty"
        />
      );
    }
    return null;
  }, [
    locationReady,
    discovering,
    searchTerm,
    coords,
    hasActiveDiscoverFilters,
    selectedProfile,
    posts.length,
    discoverError,
    profileSearchError,
    profileResults?.length,
    t,
  ]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.screenBg }}>
        <View className="px-3.5 pt-4 pb-2">
          <View
            className="flex-row items-center gap-2"
            onLayout={(e) => setSearchRowHeight(e.nativeEvent.layout.height)}
          >
            <View className="flex-1 min-w-0">
              <SearchBar
                compact
                showButtons={false}
                searchQuery={query}
                setSearchQuery={(text) => {
                  setQuery(text);
                  if (selectedProfile) setSelectedProfile(null);
                }}
                placeholder={t('social.searchPlaceholder')}
              />
            </View>
            <TouchableOpacity
              onPress={() => filterSheet.open()}
              activeOpacity={0.82}
              className="h-12 w-12 rounded-xl items-center justify-center border"
              style={{
                backgroundColor: hasActiveDiscoverFilters ? SOCIAL_ACCENT : colors.cardBg,
                borderColor: hasActiveDiscoverFilters ? SOCIAL_ACCENT : colors.borderColor2,
              }}
            >
              <Icon
                source="filter-variant"
                size={20}
                color={hasActiveDiscoverFilters ? SOCIAL_ACCENT_TEXT : colors.headerText}
              />
              {hasActiveDiscoverFilters ? (
                <View
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.screenBg }}
                >
                  <Text className="text-[9px] font-bold" style={{ color: SOCIAL_ACCENT }}>
                    {countActiveSocialDiscoverFilters(discoverFilters)}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <SocialSearchRadiusMenu valueKm={radiusKm} onChange={setRadiusKm} disabled={discovering} />
          </View>

          {selectedProfile && (
            <View className="flex-row items-center mt-2 gap-1.5">
              <View
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor2 }}
              >
                <Text className="text-xs font-semibold" style={{ color: colors.headerText }}>
                  @{selectedProfile.username}
                  {selectedProfile.ownerNumber ? ` · #${selectedProfile.ownerNumber}` : ''}
                </Text>
                <TouchableOpacity onPress={clearProfileFilter} hitSlop={8}>
                  <Icon source="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {posts.length > 0 ? (
        <View className="flex-1">
          <SocialDiscoverMasonryGrid
            posts={posts}
            loading={discovering && posts.length === 0}
            loadingMore={discovering && posts.length > 0}
            onEndReached={handleLoadMore}
          />
        </View>
      ) : (
        <View className="flex-1">
          {!locationReady || discovering ? (
            <View className="flex-1 items-center justify-center py-16">
              <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
            </View>
          ) : (
            emptyState
          )}
        </View>
      )}

      {showProfileDropdown && searchRowHeight > 0 && (
        <View
          pointerEvents="box-none"
          className="absolute inset-x-0 px-3.5"
          style={{ top: insets.top + 16 + searchRowHeight, zIndex: 200, elevation: 200 }}
        >
          <SocialSearchProfileDropdown
            visible
            profiles={profileResults ?? []}
            searching={searchingProfiles}
            emptyMessage={t('social.searchProfilesEmpty')}
            onPick={handlePickProfile}
          />
        </View>
      )}

      <SocialDiscoverFiltersSheet
        sheet={filterSheet}
        value={discoverFilters}
        onApply={setDiscoverFilters}
      />
    </View>
  );
}
