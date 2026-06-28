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

    // New Architecture (Fabric) altinda react-native-maps'in legacy interop'u,
    // children arasinda null/false/undefined oldugunda native tarafta nil subview
    // mount edip "object cannot be nil" SIGABRT'ine yol acabiliyor. Falsy cocuklari
    // burada eleyerek haritaya yalnizca gercek React elementleri gondeririz.
    const safeChildren = React.Children.toArray(children).filter(
      (child) => React.isValidElement(child)
    );

    return (
      <MapView
        ref={ref}
        provider={PROVIDER_DEFAULT}
        // userInterfaceStyle sadece Apple Maps tarafinda destekleniyor.
        userInterfaceStyle={isAndroid ? undefined : userInterfaceStyle}
        {...props}
      >
        {safeChildren}
      </MapView>
    );
  }
);

OsmMapView.displayName = "OsmMapView";
