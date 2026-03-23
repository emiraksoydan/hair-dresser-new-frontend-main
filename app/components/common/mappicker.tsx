import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import MapView, { MapPressEvent, Marker } from "react-native-maps";
import { IST } from "../../constants";
import { useLanguage } from "../../hook/useLanguage";


export const MapPicker = ({
    lat, lng,
    address,
    onChange,
}: {
    lat?: number;
    lng?: number;
    address?: string;
    onChange: (lat: number, lng: number) => void;
}) => {
    const { t } = useLanguage();
    const mapRef = useRef<MapView>(null);
    const [coord, setCoord] = useState(
        lat != null && lng != null ? { latitude: lat, longitude: lng } : IST
    );
    useEffect(() => {
        if (lat == null || lng == null) return;
        const next = { latitude: lat, longitude: lng };
        setCoord(next);
        mapRef.current?.animateCamera({ center: next, zoom: 16 }, { duration: 350 });
    }, [lat, lng]);
    const handlePress = useCallback((e: MapPressEvent) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        const next = { latitude, longitude };
        setCoord(next);
        onChange(latitude, longitude);
        mapRef.current?.animateCamera({ center: next }, { duration: 250 });
    }, [onChange]);

    return (
        <View style={{ height: 220, borderRadius: 12, overflow: 'hidden', marginTop: 12 }}>
            <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                initialRegion={{
                    latitude: coord.latitude,
                    longitude: coord.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                onPress={handlePress}
            >
                <Marker
                    coordinate={coord}
                    draggable
                    onDragEnd={(e) => {
                        const { latitude, longitude } = e.nativeEvent.coordinate;
                        const next = { latitude, longitude };
                        setCoord(next);
                        onChange(latitude, longitude);
                    }}
                    title={t('labels.storeDefaultName')}
                    description={address || t('location.dragLocation')}
                />
            </MapView>
        </View>
    );
}
