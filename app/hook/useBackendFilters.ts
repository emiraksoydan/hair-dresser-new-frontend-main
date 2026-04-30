/**
 * Backend Filter Hook
 * Uses existing backend filtering instead of client-side filtering
 * Integrates with existing FilterRequestDto structure
 *
 * IMPORTANT: Filter values are stored as language-independent keys (e.g., "all", "store", "freeBarber")
 * Translation happens only in the UI layer (FilterDrawer component)
 *
 * Kayıtlı filtre JSON: { schemaVersion, criteria } (FILTER_CRITERIA_SCHEMA_VERSION)
 */

import { useState, useCallback, useMemo } from 'react';
import { FilterRequestDto } from '../types';
import {
  AvailabilityFilter,
  DEFAULT_DISTANCE_PRESET_ID,
  distanceKmFromPreset,
  FILTER_CRITERIA_SCHEMA_VERSION,
} from '../constants/filterDefaults';

export type PriceSortType = 'none' | 'asc' | 'desc';

// Language-independent filter value keys
export const USER_TYPE_KEYS = {
  ALL: 'all',
  FREE_BARBER: 'freeBarber',
  STORE: 'store',
} as const;

export const MAIN_CATEGORY_KEYS = {
  ALL: 'all',
} as const;

export const STATUS_KEYS = {
  ALL: 'all',
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
} as const;

export interface BackendFilterCriteria {
  /** Keşif yarıçapı: '10' | '50' | '100' | 'unlimited' */
  distancePreset?: string;
  searchQuery?: string;
  userType?: string;
  mainCategory?: string;
  mainHeadings?: string[];
  subHeadings?: string[];
  serviceIds?: string[];
  priceSort?: PriceSortType;
  minPrice?: string;
  maxPrice?: string;
  pricingType?: string;
  status?: string;
  minRating?: number;
  favoritesOnly?: boolean;
}

export interface UseBackendFiltersOptions {
  defaultCriteria?: Partial<BackendFilterCriteria>;
  onFilterChange?: (criteria: BackendFilterCriteria, filterDto: FilterRequestDto) => void;
}

/** Sunucuya gidecek sarmalanmış kayıtlı filtre gövdesi */
export function wrapFilterCriteriaForSave(criteria: BackendFilterCriteria): string {
  return JSON.stringify({
    schemaVersion: FILTER_CRITERIA_SCHEMA_VERSION,
    criteria,
  });
}

/** Kayıtlı filtreyi criteria'ya çöz — eski düz JSON ile uyumlu */
export function parseSavedFilterCriteriaJson(
  json: string,
): Partial<BackendFilterCriteria> | null {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      if (
        'criteria' in parsed &&
        typeof parsed.criteria === 'object' &&
        parsed.criteria !== null
      ) {
        const v = (parsed as { schemaVersion?: number }).schemaVersion;
        if (v === undefined || v === FILTER_CRITERIA_SCHEMA_VERSION) {
          return parsed.criteria as Partial<BackendFilterCriteria>;
        }
      }
      if (!('schemaVersion' in parsed)) {
        return parsed as Partial<BackendFilterCriteria>;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export const useBackendFilters = (options: UseBackendFiltersOptions = {}) => {
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | undefined>(undefined);
  const [criteria, setCriteria] = useState<BackendFilterCriteria>(() => ({
    distancePreset: DEFAULT_DISTANCE_PRESET_ID,
    searchQuery: '',
    userType: USER_TYPE_KEYS.ALL,
    mainCategory: MAIN_CATEGORY_KEYS.ALL,
    mainHeadings: [],
    subHeadings: [],
    serviceIds: [],
    priceSort: 'none',
    minPrice: '',
    maxPrice: '',
    pricingType: 'all',
    status: STATUS_KEYS.ALL,
    minRating: 0,
    favoritesOnly: false,
    ...options.defaultCriteria,
  }));

  const toFilterRequestDto = useCallback(
    (
      c: BackendFilterCriteria,
      location?: { latitude: number; longitude: number },
      currentUserId?: string,
      t?: (key: string) => string,
    ): FilterRequestDto => {
      let mainCategoryEnum: number | undefined = undefined;
      if (c.mainCategory && c.mainCategory !== MAIN_CATEGORY_KEYS.ALL) {
        const { categoryNameToEnum } = require('../constants/business');
        mainCategoryEnum = categoryNameToEnum(c.mainCategory, t);
      }

      let availability: number | undefined;
      if (c.status === STATUS_KEYS.AVAILABLE) availability = AvailabilityFilter.Ready;
      else if (c.status === STATUS_KEYS.UNAVAILABLE) availability = AvailabilityFilter.NotReady;

      const dto: FilterRequestDto = {
        latitude: location?.latitude,
        longitude: location?.longitude,
        distanceKm: distanceKmFromPreset(c.distancePreset),
        searchQuery: c.searchQuery || undefined,
        mainCategory: mainCategoryEnum,
        serviceIds: c.serviceIds?.length ? c.serviceIds : undefined,
        priceSort: c.priceSort === 'none' ? undefined : c.priceSort,
        minPrice: c.minPrice ? parseFloat(c.minPrice) : undefined,
        maxPrice: c.maxPrice ? parseFloat(c.maxPrice) : undefined,
        pricingType: c.pricingType === 'all' ? undefined : c.pricingType,
        availability,
        minRating: c.minRating && c.minRating > 0 ? c.minRating : undefined,
        favoritesOnly: c.favoritesOnly || undefined,
        currentUserId: currentUserId || undefined,
      };

      return Object.fromEntries(
        Object.entries(dto).filter(([_, v]) => v !== undefined),
      ) as FilterRequestDto;
    },
    [],
  );

  const updateCriteria = useCallback(
    (updates: Partial<BackendFilterCriteria>, t?: (key: string) => string) => {
      setCriteria((prev) => {
        const newCriteria = { ...prev, ...updates };

        if (options.onFilterChange) {
          const filterDto = toFilterRequestDto(newCriteria, undefined, undefined, t);
          options.onFilterChange(newCriteria, filterDto);
        }

        return newCriteria;
      });
    },
    [options.onFilterChange, toFilterRequestDto],
  );

  const clearFilters = useCallback(
    (t?: (key: string) => string) => {
      const defaultCriteria: BackendFilterCriteria = {
        distancePreset: DEFAULT_DISTANCE_PRESET_ID,
        searchQuery: '',
        userType: USER_TYPE_KEYS.ALL,
        mainCategory: MAIN_CATEGORY_KEYS.ALL,
        mainHeadings: [],
        subHeadings: [],
        serviceIds: [],
        priceSort: 'none',
        minPrice: '',
        maxPrice: '',
        pricingType: 'all',
        status: STATUS_KEYS.ALL,
        minRating: 0,
        favoritesOnly: false,
        ...options.defaultCriteria,
      };

      setCriteria(defaultCriteria);
      setActiveSavedFilterId(undefined);

      if (options.onFilterChange) {
        const filterDto = toFilterRequestDto(defaultCriteria, undefined, undefined, t);
        options.onFilterChange(defaultCriteria, filterDto);
      }
    },
    [options.defaultCriteria, options.onFilterChange, toFilterRequestDto],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (criteria.userType && criteria.userType !== USER_TYPE_KEYS.ALL) count++;
    if (criteria.mainCategory && criteria.mainCategory !== MAIN_CATEGORY_KEYS.ALL) count++;
    if (criteria.mainHeadings && criteria.mainHeadings.length > 0) count++;
    if (criteria.subHeadings && criteria.subHeadings.length > 0) count++;
    if (criteria.serviceIds && criteria.serviceIds.length > 0) count++;
    if (criteria.minPrice && criteria.minPrice !== '') count++;
    if (criteria.maxPrice && criteria.maxPrice !== '') count++;
    if (criteria.pricingType && criteria.pricingType !== 'all') count++;
    if (criteria.status && criteria.status !== STATUS_KEYS.ALL) count++;
    if (criteria.minRating && criteria.minRating > 0) count++;
    if (criteria.favoritesOnly) count++;
    if (criteria.priceSort && criteria.priceSort !== 'none') count++;
    if (
      criteria.distancePreset &&
      criteria.distancePreset !== DEFAULT_DISTANCE_PRESET_ID
    )
      count++;

    return count;
  }, [criteria]);

  const hasActiveFilters = useMemo(() => activeFilterCount > 0, [activeFilterCount]);

  const hasActiveSearch = useMemo(
    () => !!(criteria.searchQuery && criteria.searchQuery.trim()),
    [criteria.searchQuery],
  );

  const validation = useMemo(() => {
    const errors: string[] = [];

    if (criteria.minPrice && criteria.maxPrice) {
      const minPrice = parseFloat(criteria.minPrice);
      const maxPrice = parseFloat(criteria.maxPrice);

      if (isNaN(minPrice) || minPrice < 0) {
        errors.push('Minimum price must be a valid positive number');
      }

      if (isNaN(maxPrice) || maxPrice < 0) {
        errors.push('Maximum price must be a valid positive number');
      }

      if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice > maxPrice) {
        errors.push('Minimum price cannot be greater than maximum price');
      }
    }

    if (criteria.minRating && (criteria.minRating < 0 || criteria.minRating > 5)) {
      errors.push('Rating must be between 0 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [criteria]);

  const createFilterRequestDto = useCallback(
    (
      location?: { latitude: number; longitude: number },
      currentUserId?: string,
      t?: (key: string) => string,
    ): FilterRequestDto => {
      return toFilterRequestDto(criteria, location, currentUserId, t);
    },
    [criteria, toFilterRequestDto],
  );

  const loadFromSaved = useCallback((filterCriteriaJson: string, filterId?: string) => {
    const merged = parseSavedFilterCriteriaJson(filterCriteriaJson);
    if (merged) {
      setCriteria((prev) => ({
        ...prev,
        ...merged,
        distancePreset: merged.distancePreset ?? DEFAULT_DISTANCE_PRESET_ID,
      }));
    }
    setActiveSavedFilterId(filterId);
  }, []);

  return {
    criteria,
    updateCriteria,
    clearFilters,
    loadFromSaved,
    activeSavedFilterId,
    activeFilterCount,
    hasActiveFilters,
    hasActiveSearch,
    validation,
    createFilterRequestDto,
    toFilterRequestDto,
  };
};
