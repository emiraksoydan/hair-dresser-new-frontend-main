import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { jwtDecode } from 'jwt-decode';
import { tokenStore } from '../lib/tokenStore';
import { JwtPayload, UserType } from '../types';
import { API_CONFIG } from '../constants/api';

const BACKGROUND_LOCATION_TASK = 'background-location-update';

// Expo Go background location'ı desteklemez
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Debounce: çok sık API çağrısını önlemek için son güncelleme bilgisi
const MIN_DISTANCE_M = 100;   // En az 100 metre hareket edilmeden update atma
const MIN_INTERVAL_MS = 15_000; // Son update'ten en az 15 saniye geçmeden update atma
let _lastLat: number | null = null;
let _lastLon: number | null = null;
let _lastUpdateAt: number = 0;

function haversineDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function shouldUpdate(lat: number, lon: number): boolean {
  const now = Date.now();
  if (_lastLat === null || _lastLon === null) return true;
  const elapsed = now - _lastUpdateAt;
  if (elapsed < MIN_INTERVAL_MS) return false;
  const dist = haversineDistanceM(_lastLat, _lastLon, lat, lon);
  return dist >= MIN_DISTANCE_M;
}

interface LocationData {
  locations: Location.LocationObject[];
}

// Background location task handler - sadece development/production build'de çalışır
const defineBackgroundLocationTask = () => {
  if (IS_EXPO_GO) {
    // Background location task Expo Go'da desteklenmiyor
    return;
  }

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
      // Background location hatası sessizce atlanır
      return;
    }

    if (data) {
      const { locations } = data as LocationData;

      if (locations && locations.length > 0) {
        const location = locations[locations.length - 1];
        const { latitude, longitude } = location.coords;

        // Token'dan user bilgilerini al
        const token = tokenStore.access;
        if (!token) return;

        try {
          const decoded = jwtDecode<JwtPayload>(token);
          const ut = decoded.userType?.toLowerCase();
          const userType = ut === 'freebarber' ? UserType.FreeBarber : null;
          const userId = decoded.identifier || (decoded as any).sub || (decoded as any).userId;

          // Sadece free barber ise konumu güncelle
          if (userType === UserType.FreeBarber && userId) {
            // Debounce: yeterli mesafe veya zaman geçmediyse atla
            if (!shouldUpdate(latitude, longitude)) return;

            try {
              // API'ye konum güncellemesi gönder
              await fetch(`${API_CONFIG.BASE_URL}/freebarber/update-location`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  id: userId,
                  latitude,
                  longitude,
                }),
              });

              // Başarılı update sonrası son konum ve zamanı kaydet
              _lastLat = latitude;
              _lastLon = longitude;
              _lastUpdateAt = Date.now();
            } catch (error) {
              // Background location update hatası sessizce atlanır
            }
          }
        } catch (error) {
          // Token decode hatası sessizce atlanır
        }
      }
    }
  });
};

// Task'ı tanımla
defineBackgroundLocationTask();

export { BACKGROUND_LOCATION_TASK };
