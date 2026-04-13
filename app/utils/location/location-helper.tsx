// utils/location-kit.ts
import * as Location from "expo-location";
import { ensureLocationGateWithUI } from "../../components/location/location-gate";
import type { LocationResult } from "../../types";

export async function getCurrentLocationSafe(): Promise<LocationResult> {
    const gate = await ensureLocationGateWithUI();
    if (!gate.ok) {
        return {
            ok: false,
            message: gate.message ?? "Konum hazır değil.",
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
            return { ok: false, message: "Geçersiz konum bilgisi alındı." };
        }

        return { ok: true, lat, lon };
    } catch {
        return { ok: false, message: "Konum servisi kullanılamıyor. Lütfen daha sonra tekrar deneyin." };
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
