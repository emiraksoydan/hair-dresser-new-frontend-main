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

export async function ensureLocationGateWithUI(): Promise<LocationGateResult> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const granted = await ensureLocationPermissionWithPrompt();
      if (!granted)
        return {
          ok: false,
          reason: "permission",
          message: i18n.t("location.permissionDenied"),
        };

      const servicesOk = await ensureServicesEnabled();
      if (!servicesOk)
        return {
          ok: false,
          reason: "services",
          message: i18n.t("location.servicesDisabled"),
        };

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

  return inflight;
}
