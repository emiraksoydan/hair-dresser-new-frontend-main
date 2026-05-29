// components/location/location-gate.ts
import * as Location from "expo-location";
import { ensureLocationPermissionWithPrompt } from "./permission-ui";
import type { LocationGateResult } from "../../types";
import i18n from "../../i18n/config";

async function ensureServicesEnabled(): Promise<boolean> {
  return await Location.hasServicesEnabledAsync();
}

// Aynı anda 2 yerden çağrılırsa çift alert çıkmasın:
let inflight: Promise<LocationGateResult> | null = null;

// Sonucu kısa süre cache'le — birden fazla hook ardışık ama paralel olmayacak şekilde çağırırsa
// inflight tek başına yetmiyor: ilk çağrı bitince inflight null olur, ikinci çağrı yeni dialog tetikleyebilir.
// Bu cache ile "son 8 saniye içinde verdiğimiz cevabı tekrar ver" diyerek dublike dialog engellenir.
const RESULT_CACHE_MS = 8000;
let cachedResult: LocationGateResult | null = null;
let cachedAt = 0;

/**
 * Cache temizleme — kullanıcı Settings'ten döndüğünde manuel çağrılabilir
 * ki yeni izin durumu yansısın.
 */
export function invalidateLocationGateCache(): void {
  cachedResult = null;
  cachedAt = 0;
}

export async function ensureLocationGateWithUI(): Promise<LocationGateResult> {
  if (inflight) return inflight;

  // Cache hit: son sonuç hâlâ taze ise tekrar dialog göstermeye gerek yok
  if (cachedResult && Date.now() - cachedAt < RESULT_CACHE_MS) {
    return cachedResult;
  }

  inflight = (async () => {
    try {
      const granted = await ensureLocationPermissionWithPrompt();
      if (!granted) {
        return {
          ok: false,
          reason: "permission",
          message: i18n.t("location.permissionDenied"),
        };
      }

      const servicesOk = await ensureServicesEnabled();
      if (!servicesOk) {
        return {
          ok: false,
          reason: "services",
          message: i18n.t("location.servicesDisabled"),
        };
      }

      return { ok: true };
    } catch {
      return {
        ok: false,
        reason: "unknown",
        message: i18n.t("location.gateNotVerified"),
      };
    } finally {
      inflight = null;
    }
  })();

  // Sonuç tamamlandığında cache'e yaz (next caller için)
  inflight.then((res) => {
    cachedResult = res;
    cachedAt = Date.now();
  });

  return inflight;
}
