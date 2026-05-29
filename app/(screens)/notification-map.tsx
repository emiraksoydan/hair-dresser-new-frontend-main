import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, TouchableOpacity, StatusBar, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Icon } from "react-native-paper";
import { Marker } from "react-native-maps";
import type MapViewType from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OsmMapView } from "../components/common/OsmMapView";
import { Text } from "../components/common/Text";
import { useTheme } from "../hook/useTheme";
import { useSafeNavigation } from "../hook/useSafeNavigation";
import { useLanguage } from "../hook/useLanguage";
import { useGetFreeBarberForUsersQuery, useGetStoreForUsersQuery } from "../store/api";
import { getCurrentLocationSafe } from "../utils/location/location-helper";
import { COLORS } from "../constants/colors";

/**
 * Bildirim sheet'inden açılan generic harita ekranı.
 *
 * Desteklenen hedef tipleri:
 *   - "store"      → Statik konum (payload'dan gelir, sabit). 30sn'de bir refetch
 *                    yine de yapılır ki dükkan adresi güncellendiyse yansır.
 *   - "freebarber" → CANLI konum: useTrackFreeBarberLocation hook'u FB tarafında
 *                    her 30sn / 100m hareket'te backend'e push eder. Burada 10sn'de
 *                    bir polling ile güncel konumu çekiyoruz (refetchInterval).
 *   - "customer"   → Şu an persist edilmiyor. Param ile lat/lng gelirse gösteririz
 *                    (snapshot). Aksi halde "henüz desteklenmiyor" mesajı.
 *
 * NOT: Customer canlı konumu için Appointment entity'sine RequestLatitude /
 * RequestLongitude alanlarının eklenmesi + push edilmesi gerekir. Şimdilik
 * notification payload'ında customer.latitude/longitude varsa kullanılır.
 */

type TargetType = "store" | "freebarber" | "customer";

const FB_LIVE_REFETCH_MS = 10_000; // FreeBarber için 10sn polling — "live" hissi
const STORE_REFETCH_MS = 30_000;    // Store için 30sn refresh — adres değişimi nadir

const GOLD = COLORS.UI.ACCENT_GOLD;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function NotificationMapScreen() {
  const router = useSafeNavigation();
  const { isDark, colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapViewType | null>(null);

  const params = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
    targetName?: string;
    lat?: string;
    lng?: string;
  }>();

  const targetType = (params.targetType as TargetType | undefined) ?? "store";
  const targetId = params.targetId ?? "";
  const targetName = params.targetName ?? "";
  const initialLat = params.lat ? parseFloat(params.lat) : undefined;
  const initialLng = params.lng ? parseFloat(params.lng) : undefined;

  // Live data: FreeBarber (10sn polling)
  const fbQuery = useGetFreeBarberForUsersQuery(targetId, {
    skip: targetType !== "freebarber" || !targetId,
    pollingInterval: FB_LIVE_REFETCH_MS,
    refetchOnMountOrArgChange: true,
  });

  // Live data: Store (30sn refetch)
  const storeQuery = useGetStoreForUsersQuery(targetId, {
    skip: targetType !== "store" || !targetId,
    pollingInterval: STORE_REFETCH_MS,
    refetchOnMountOrArgChange: true,
  });

  // Hedef koordinatları seçer: live data > param > fallback
  const targetCoords = useMemo<{ lat: number; lng: number } | null>(() => {
    if (targetType === "freebarber" && fbQuery.data) {
      const lat = (fbQuery.data as any)?.latitude;
      const lng = (fbQuery.data as any)?.longitude;
      if (typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0)) {
        return { lat, lng };
      }
    }
    if (targetType === "store" && storeQuery.data) {
      const lat = (storeQuery.data as any)?.latitude;
      const lng = (storeQuery.data as any)?.longitude;
      if (typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0)) {
        return { lat, lng };
      }
    }
    if (typeof initialLat === "number" && typeof initialLng === "number" && !Number.isNaN(initialLat) && !Number.isNaN(initialLng)) {
      return { lat: initialLat, lng: initialLng };
    }
    return null;
  }, [targetType, fbQuery.data, storeQuery.data, initialLat, initialLng]);

  // Kullanıcının kendi konumu (statik — açılışta bir kez alınır)
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getCurrentLocationSafe();
      if (!cancelled && r.ok) setMyCoords({ lat: r.lat, lng: r.lon });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Harita ilk hedef konumu aldığında merkezler
  const initialRegion = useMemo(() => {
    if (targetCoords) {
      return {
        latitude: targetCoords.lat,
        longitude: targetCoords.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return undefined;
  }, [targetCoords]);

  // Hedef konum değiştiğinde haritayı ÜZERİNE getir (FB hareket ederse takip etsin)
  useEffect(() => {
    if (!mapRef.current || !targetCoords) return;
    mapRef.current.animateToRegion(
      {
        latitude: targetCoords.lat,
        longitude: targetCoords.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      500,
    );
  }, [targetCoords?.lat, targetCoords?.lng]);

  const distanceKm = useMemo(() => {
    if (!myCoords || !targetCoords) return null;
    return haversineKm(myCoords.lat, myCoords.lng, targetCoords.lat, targetCoords.lng);
  }, [myCoords, targetCoords]);

  const isLive = targetType === "freebarber";
  const isLoadingTarget =
    (targetType === "freebarber" && fbQuery.isLoading && !fbQuery.data) ||
    (targetType === "store" && storeQuery.isLoading && !storeQuery.data);

  const headerLabel = useMemo(() => {
    switch (targetType) {
      case "freebarber":
        return t("notification.mapFreeBarberLive");
      case "store":
        return t("notification.mapStore");
      case "customer":
        return t("notification.mapCustomer");
      default:
        return t("notification.mapTitle");
    }
  }, [targetType, t]);

  const handleClose = useCallback(() => {
    if (router.canGoBack?.()) router.back();
    else router.replace?.("/" as any);
  }, [router]);

  const recenter = useCallback(() => {
    if (!mapRef.current || !targetCoords) return;
    mapRef.current.animateToRegion(
      {
        latitude: targetCoords.lat,
        longitude: targetCoords.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      450,
    );
  }, [targetCoords]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Üst başlık şeridi — safe area dahil */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 12,
          backgroundColor: colors.sheetBg,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            padding: 8,
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
          }}
        >
          <Icon source="chevron-left" size={24} color={isDark ? "#e5e7eb" : "#0f172a"} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{ color: colors.sectionHeaderText, fontSize: 16, fontFamily: "CenturyGothic-Bold" }}
            numberOfLines={1}
          >
            {targetName || headerLabel}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            {isLive && (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#22c55e",
                }}
              />
            )}
            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
              {headerLabel}
              {distanceKm != null ? ` • ${distanceKm.toFixed(1)} km` : ""}
            </Text>
          </View>
        </View>
        {targetCoords && (
          <TouchableOpacity
            onPress={recenter}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              padding: 8,
              borderRadius: 999,
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : "rgba(245, 158, 11, 0.14)",
            }}
          >
            <Icon source="crosshairs-gps" size={20} color={GOLD} />
          </TouchableOpacity>
        )}
      </View>

      {/* Harita */}
      <View style={{ flex: 1 }}>
        {isLoadingTarget && !targetCoords ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={GOLD} />
            <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
              {t("common.loading")}
            </Text>
          </View>
        ) : !targetCoords ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Icon source="map-marker-off-outline" size={56} color={colors.textSecondary} />
            <Text
              style={{
                color: colors.sectionHeaderText,
                marginTop: 16,
                fontSize: 16,
                fontFamily: "CenturyGothic-Bold",
                textAlign: "center",
              }}
            >
              {targetType === "customer"
                ? t("notification.mapCustomerNotAvailable")
                : t("notification.mapNoLocation")}
            </Text>
            {targetType === "customer" && (
              <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: "center", fontSize: 13 }}>
                Müşterinin canlı konumu için randevu sistemine ek alanlar gerekir. Şimdilik bu özellik dükkan ve serbest berber için aktiftir.
              </Text>
            )}
          </View>
        ) : (
          <OsmMapView
            ref={mapRef as any}
            style={{ flex: 1 }}
            initialRegion={initialRegion as any}
            showsUserLocation
            showsMyLocationButton={Platform.OS === "android"}
            userInterfaceStyle={isDark ? "dark" : "light"}
          >
            {/* Hedef marker */}
            <Marker
              coordinate={{ latitude: targetCoords.lat, longitude: targetCoords.lng }}
              title={targetName || headerLabel}
              description={isLive ? "Canlı konum • 10sn'de bir güncellenir" : undefined}
              pinColor={isLive ? "#22c55e" : "#f05e23"}
            />
          </OsmMapView>
        )}
      </View>

      {/* Alt bilgi şeridi kaldırıldı (kullanıcı isteği — koordinat ve "statik konum"
          metinleri ekrandan çıkarıldı). FreeBarber CANLI modda küçük bir spinner
          sağ üstte göstereceğiz. */}
      {targetCoords && isLive && (fbQuery.isFetching || fbQuery.isLoading) && (
        <View
          style={{
            position: "absolute",
            top: insets.top + 88,
            right: 16,
            backgroundColor: colors.sheetBg,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)",
          }}
        >
          <ActivityIndicator size="small" color={GOLD} />
        </View>
      )}
    </View>
  );
}
