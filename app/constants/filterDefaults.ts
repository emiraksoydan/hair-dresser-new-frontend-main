/** Backend `FilterConstants.DefaultDistanceKm` ile aynı */
export const DEFAULT_FILTER_RADIUS_KM = 50;

/**
 * GeoBounds pozitif km ister; sınırsız modda backend bu km’yi görünce konum kutusu
 * uygulamaz (Entities.FilterConstants.DiscoveryUnlimitedRadiusSentinelKm ile aynı olmalı).
 */
export const UNLIMITED_DISCOVERY_RADIUS_KM = 20_000;

export const DISTANCE_PRESET_TO_KM = {
  '0': 0,
  '25': 25,
  '50': 50,
  '100': 100,
  unlimited: UNLIMITED_DISCOVERY_RADIUS_KM,
} as const;

export type DistancePresetId = keyof typeof DISTANCE_PRESET_TO_KM;

/** Randevu keşfi — eski preset seti (10/50/100) */
export const APPOINTMENT_DISTANCE_PRESET_TO_KM = {
  '10': 10,
  '50': 50,
  '100': 100,
  unlimited: UNLIMITED_DISCOVERY_RADIUS_KM,
} as const;

export type AppointmentDistancePresetId = keyof typeof APPOINTMENT_DISTANCE_PRESET_TO_KM;

export const DEFAULT_SOCIAL_DISCOVERY_PRESET_ID: DistancePresetId = '50';

export const SOCIAL_DISCOVERY_RADIUS_PRESET_IDS: DistancePresetId[] = ['0', '25', '50', '100', 'unlimited'];

export const DEFAULT_DISTANCE_PRESET_ID: DistancePresetId = '50';

export function distanceKmFromPreset(preset: string | undefined): number {
  if (preset != null && preset in APPOINTMENT_DISTANCE_PRESET_TO_KM) {
    return APPOINTMENT_DISTANCE_PRESET_TO_KM[preset as AppointmentDistancePresetId];
  }
  return DEFAULT_FILTER_RADIUS_KM;
}

export function socialDiscoveryKmFromPreset(preset: string | undefined): number {
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
