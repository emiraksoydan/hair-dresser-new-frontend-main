// utils/location-kit.ts
import * as Location from "expo-location";
import { ensureLocationGateWithUI } from "../../components/location/location-gate";
import type { LocationResult } from "../../types";
import i18n from "../../i18n/config";

export async function getCurrentLocationSafe(): Promise<LocationResult> {
    const gate = await ensureLocationGateWithUI();
    if (!gate.ok) {
        return {
            ok: false,
            message: gate.message ?? i18n.t("location.locationNotReady"),
            reason: gate.reason,
        };
    }

    try {
        const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return { ok: false, message: i18n.t("location.invalidLocationInfo") };
        }

        return { ok: true, lat, lon };
    } catch {
        return { ok: false, message: i18n.t("location.unavailable") };
    }
}

export async function reverseGeocodeLine(latitude: number, longitude: number) {
    try {
        const [rev] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (!rev) return "";
        return [rev.name, rev.district, rev.subregion, rev.region, rev.country]
            .filter(Boolean)
            .join(", ");
    } catch {
        return "";
    }
}
