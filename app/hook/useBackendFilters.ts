/**
 * Backend Filter Hook
 * Uses existing backend filtering instead of client-side filtering
 * Integrates with existing FilterRequestDto structure
 * 
 * IMPORTANT: Filter values are stored as language-independent keys (e.g., "all", "store", "freeBarber")
 * Translation happens only in the UI layer (FilterDrawer component)
 */

import { useState, useCallback, useMemo } from 'react';
import { FilterRequestDto } from '../types';

export type PriceSortType = 'none' | 'asc' | 'desc';

// Language-independent filter value keys
export const USER_TYPE_KEYS = {
  ALL: 'all',
  FREE_BARBER: 'freeBarber',
  STORE: 'store',
} as const;

// Backend expects these exact Turkish string values for UserType field
const USER_TYPE_BACKEND_MAP: Record<string, string> = {
  [USER_TYPE_KEYS.STORE]: 'Dükkan',
  [USER_TYPE_KEYS.FREE_BARBER]: 'Serbest Berber',
  [USER_TYPE_KEYS.ALL]: 'Hepsi',
} as const;

export const MAIN_CATEGORY_KEYS = {
  ALL: 'all',
} as const;

// Status filter keys - unified for both Store (open/closed) and FreeBarber (available/unavailable)
export const STATUS_KEYS = {
  ALL: 'all',
  AVAILABLE: 'available', // FreeBarber: müsait, Store: açık
  UNAVAILABLE: 'unavailable', // FreeBarber: meşgul, Store: kapalı
} as const;

export interface BackendFilterCriteria {
  searchQuery?: string;
  userType?: string; // "all", "freeBarber", "store" - language independent keys
  mainCategory?: string; // BarberType as string or "all"
  mainHeadings?: string[]; // Ana başlıklar (çoklu)
  subHeadings?: string[]; // Alt başlıklar (çoklu)
  serviceIds?: string[];
  priceSort?: PriceSortType;
  minPrice?: string;
  maxPrice?: string;
  pricingType?: string; // "all", "rent", "percent"
  status?: string; // "all", "available", "unavailable" - unified status filter
  minRating?: number;
  favoritesOnly?: boolean;
}

export interface UseBackendFiltersOptions {
  defaultCriteria?: Partial<BackendFilterCriteria>;
  onFilterChange?: (criteria: BackendFilterCriteria, filterDto: FilterRequestDto) => void;
}

export const useBackendFilters = (options: UseBackendFiltersOptions = {}) => {
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | undefined>(undefined);
  const [criteria, setCriteria] = useState<BackendFilterCriteria>(() => ({
    searchQuery: '',
    userType: USER_TYPE_KEYS.ALL, // Language-independent key
    mainCategory: MAIN_CATEGORY_KEYS.ALL, // Language-independent key
    mainHeadings: [],
    subHeadings: [],
    serviceIds: [],
    priceSort: 'none',
    minPrice: '',
    maxPrice: '',
    pricingType: 'all',
    status: STATUS_KEYS.ALL, // Unified status filter
    minRating: 0,
    favoritesOnly: false,
    ...options.defaultCriteria,
  }));

  // Convert frontend criteria to backend FilterRequestDto
  const toFilterRequestDto = useCallback((
    criteria: BackendFilterCriteria,
    location?: { latitude: number; longitude: number },
    currentUserId?: string,
    t?: (key: string) => string
  ): FilterRequestDto => {
    // ✅ Category name'i BarberType enum'a dönüştür
    let mainCategoryEnum: number | undefined = undefined;
    if (criteria.mainCategory && criteria.mainCategory !== MAIN_CATEGORY_KEYS.ALL) {
      const { categoryNameToEnum } = require('../constants/business');
      mainCategoryEnum = categoryNameToEnum(criteria.mainCategory, t);
    }

    // Convert language-independent userType key to backend Turkish value
    const backendUserType = criteria.userType ? USER_TYPE_BACKEND_MAP[criteria.userType] : undefined;

    // Status filter: backend uses isAvailable for FreeBarber, isOpenNow for Store
    // Since we don't know which endpoint will be called here, we set both
    const statusValue = criteria.status === STATUS_KEYS.ALL
      ? undefined
      : criteria.status === STATUS_KEYS.AVAILABLE;

    const dto: FilterRequestDto = {
      latitude: location?.latitude,
      longitude: location?.longitude,
      distanceKm: 10.0,
      searchQuery: criteria.searchQuery || undefined,
      userType: backendUserType,
      mainCategory: mainCategoryEnum,
      serviceIds: criteria.serviceIds?.length ? criteria.serviceIds : undefined,
      priceSort: criteria.priceSort === 'none' ? undefined : criteria.priceSort,
      minPrice: criteria.minPrice ? parseFloat(criteria.minPrice) : undefined,
      maxPrice: criteria.maxPrice ? parseFloat(criteria.maxPrice) : undefined,
      pricingType: criteria.pricingType === 'all' ? undefined : criteria.pricingType,
      isAvailable: statusValue,
      isOpenNow: statusValue,
      minRating: criteria.minRating && criteria.minRating > 0 ? criteria.minRating : undefined,
      favoritesOnly: criteria.favoritesOnly || undefined,
      currentUserId: currentUserId || undefined,
    };

    // Remove undefined fields to keep the payload clean
    return Object.fromEntries(
      Object.entries(dto).filter(([_, v]) => v !== undefined)
    ) as FilterRequestDto;
  }, []);

  const updateCriteria = useCallback((updates: Partial<BackendFilterCriteria>, t?: (key: string) => string) => {
    setCriteria(prev => {
      const newCriteria = { ...prev, ...updates };

      // Convert to FilterRequestDto and call change handler
      if (options.onFilterChange) {
        const filterDto = toFilterRequestDto(newCriteria, undefined, undefined, t);
        options.onFilterChange(newCriteria, filterDto);
      }

      return newCriteria;
    });
  }, [options.onFilterChange, toFilterRequestDto]);

  const clearFilters = useCallback((t?: (key: string) => string) => {
    const defaultCriteria: BackendFilterCriteria = {
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
  }, [options.defaultCriteria, options.onFilterChange, toFilterRequestDto]);

  // Get active filter count for UI badges
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

    return count;
  }, [criteria]);

  const hasActiveFilters = useMemo(() => activeFilterCount > 0, [activeFilterCount]);

  // Check if search is active (separate from filters)
  const hasActiveSearch = useMemo(() =>
    !!(criteria.searchQuery && criteria.searchQuery.trim())
    , [criteria.searchQuery]);

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];

    // Validate price range
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

    // Validate rating
    if (criteria.minRating && (criteria.minRating < 0 || criteria.minRating > 5)) {
      errors.push('Rating must be between 0 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [criteria]);

  // Helper to create FilterRequestDto for API calls
  const createFilterRequestDto = useCallback((
    location?: { latitude: number; longitude: number },
    currentUserId?: string,
    t?: (key: string) => string
  ): FilterRequestDto => {
    return toFilterRequestDto(criteria, location, currentUserId, t);
  }, [criteria, toFilterRequestDto]);

  // Kayıtlı filtreyi yükler — filterCriteriaJson'u parse edip criteria'ya uygular
  const loadFromSaved = useCallback((filterCriteriaJson: string, filterId?: string) => {
    try {
      const parsed: BackendFilterCriteria = JSON.parse(filterCriteriaJson);
      setCriteria(prev => ({ ...prev, ...parsed }));
      setActiveSavedFilterId(filterId);
    } catch {
      // Bozuk JSON ise sessizce geç
    }
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
