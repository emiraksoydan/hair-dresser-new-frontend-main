/**
 * OsmMapView — Platform-aware MapView wrapper
 * Android: Google Maps (PROVIDER_DEFAULT)
 * iOS:     Apple Maps (PROVIDER_DEFAULT)
 */
import React from "react";
import { Platform } from "react-native";
import MapView, { MapViewProps, PROVIDER_DEFAULT } from "react-native-maps";

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
        // userInterfaceStyle sadece Apple Maps tarafinda destekleniyor.
        userInterfaceStyle={isAndroid ? undefined : userInterfaceStyle}
        {...props}
      >
        {children}
      </MapView>
    );
  }
);

OsmMapView.displayName = "OsmMapView";
