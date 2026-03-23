/**
 * Location-related types
 */

export type LocationStatus = "unknown" | "granted" | "denied";

export type LocationGateReason = "permission" | "services" | "unknown";

export type LocationGateResult =
  | { ok: true }
  | { ok: false; reason: LocationGateReason; message?: string };

export type LocationResult =
  | { ok: true; lat: number; lon: number }
  | { ok: false; message: string; reason?: LocationGateReason };

export type LocationStatusHelper = "idle" | "loading" | "ok" | "error";

export type HasLocation = {
  location: {
    latitude: number;
    longitude: number;
    addressDescription?: string;
  };
};

export type UseNearbyControlParams = {
  enabled: boolean;
  moveThresholdM?: number;
  staleMs?: number;
  hardRefreshMs?: number;
  onFetch: (lat: number, lon: number) => Promise<void>;
  /** Arka plan konum takibini başlatır. Sadece useTrackFreeBarberLocation'da true olmalı. */
  enableBackgroundTracking?: boolean;
};

export type NearbyRequest = {
  lat: number;
  lon: number;
  radiusKm?: number;
};

export type UpdateLocationDto = {
  id: string;
  latitude: number;
  longitude: number;
};

