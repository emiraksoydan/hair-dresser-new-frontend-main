// components/location/location-gate.ts
import * as Location from "expo-location";
import { Alert, Linking, Platform } from "react-native";
import { ensureLocationPermissionWithPrompt } from "./permission-ui";
import type { LocationGateResult } from "../../types";
import i18n from "../../i18n/config";

function openSettings() {
  Linking.openSettings();
}

async function ensureServicesEnabledWithPrompt(): Promise<boolean> {
  const enabled = await Location.hasServicesEnabledAsync();
  if (enabled) return true;

  return await new Promise<boolean>((resolve) => {
    Alert.alert(
      i18n.t("location.locationClosed"),
      i18n.t("location.locationClosedMessage"),
      [
        {
          text: i18n.t("location.cancel"),
          style: "cancel",
          onPress: () => resolve(false),
        },
        ...(Platform.OS === "android"
          ? [
              {
                text: i18n.t("location.openLocation"),
                onPress: async () => {
                  try {
                    await Location.enableNetworkProviderAsync();
                  } catch {}
                  const after = await Location.hasServicesEnabledAsync();
                  resolve(after);
                },
              },
            ]
          : []),
        {
          text: i18n.t("location.settings"),
          onPress: () => {
            openSettings();
            resolve(false);
          },
        },
      ],
    );
  });
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

      const servicesOk = await ensureServicesEnabledWithPrompt();
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
