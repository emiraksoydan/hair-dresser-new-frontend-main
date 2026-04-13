/**
 * OsmMapView — Platform-aware MapView wrapper
 * Android: PROVIDER_DEFAULT + OpenStreetMap UrlTile (no API key required)
 * iOS:     Apple Maps (default, no key required)
 */
import React from "react";
import { Platform } from "react-native";
import MapView, {
  MapViewProps,
  PROVIDER_DEFAULT,
  UrlTile,
} from "react-native-maps";

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

type OsmMapViewProps = MapViewProps & {
  children?: React.ReactNode;
};

export const OsmMapView = React.forwardRef<MapView, OsmMapViewProps>(
  ({ children, userInterfaceStyle, ...props }, ref) => {
    const isAndroid = Platform.OS === "android";

    return (
      <MapView
        ref={ref}
        provider={PROVIDER_DEFAULT}
        // userInterfaceStyle sadece Apple Maps destekliyor, Android'de yok
        userInterfaceStyle={isAndroid ? undefined : userInterfaceStyle}
        {...props}
      >
        {isAndroid && (
          <UrlTile
            urlTemplate={OSM_TILE_URL}
            maximumZ={19}
            flipY={false}
            // OSM tile kullanım politikası: User-Agent header ekle
            tileSize={256}
          />
        )}
        {children}
      </MapView>
    );
  }
);

OsmMapView.displayName = "OsmMapView";
