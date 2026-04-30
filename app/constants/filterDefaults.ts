/** Backend `FilterConstants.DefaultDistanceKm` ile aynı */
export const DEFAULT_FILTER_RADIUS_KM = 50;

/**
 * GeoBounds pozitif km ister; sınırsız modda backend bu km’yi görünce konum kutusu
 * uygulamaz (Entities.FilterConstants.DiscoveryUnlimitedRadiusSentinelKm ile aynı olmalı).
 */
export const UNLIMITED_DISCOVERY_RADIUS_KM = 20_000;

export const DISTANCE_PRESET_TO_KM = {
  '10': 10,
  '50': 50,
  '100': 100,
  unlimited: UNLIMITED_DISCOVERY_RADIUS_KM,
} as const;

export type DistancePresetId = keyof typeof DISTANCE_PRESET_TO_KM;

export const DEFAULT_DISTANCE_PRESET_ID: DistancePresetId = '50';

export function distanceKmFromPreset(preset: string | undefined): number {
  if (preset != null && preset in DISTANCE_PRESET_TO_KM) {
    return DISTANCE_PRESET_TO_KM[preset as DistancePresetId];
  }
  return DEFAULT_FILTER_RADIUS_KM;
}

/** Backend `FilterConstants.CurrentFilterSchemaVersion` ile aynı */
export const FILTER_CRITERIA_SCHEMA_VERSION = 1;

/** Backend `AvailabilityFilter` enum (sayısal) */
export enum AvailabilityFilter {
  Any = 0,
  Ready = 1,
  NotReady = 2,
}
