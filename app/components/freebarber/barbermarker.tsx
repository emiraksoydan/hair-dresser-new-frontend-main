import { Icon } from "react-native-paper";
import React, { useEffect, useRef, useState, memo } from "react";
import { View, Image } from "react-native";
import { Marker } from "react-native-maps";

import { FreeBarGetDto } from "../../types";
import { safeCoord } from "../../utils/location/geo";

interface BarberMarkerProps {
    barber: FreeBarGetDto;
    onPress: (item: FreeBarGetDto) => void;
}

export const BarberMarker = memo(({ barber, onPress }: BarberMarkerProps) => {
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const [imageError, setImageError] = useState(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Güvenlik zamanlayıcısı: onLoad cached image'larda Android'de tetiklenmeyebilir.
    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            if (mountedRef.current) setTracksViewChanges(false);
        }, 800);
        return () => clearTimeout(safetyTimer);
    }, []);

    const c = safeCoord((barber as any).latitude, (barber as any).longitude);
    if (!c) return null;

    const avatarUrl = (barber as any)?.imageList?.[0]?.imageUrl;
    const bg = (barber as any).type == 0 ? "#2563eb" : "#db2777";
    const iconName = (barber as any).type == 0 ? "face-man" : "face-woman";
    const hasImage = avatarUrl && !imageError;

    // Resim yoksa ilk renderdan sonra tracking'i kapat
    useEffect(() => {
        if (!hasImage) {
            const timer = setTimeout(() => {
                if (mountedRef.current) setTracksViewChanges(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [hasImage]);

    return (
        <Marker
            coordinate={{ latitude: c.lat, longitude: c.lon }}
            title={(barber as any).fullName}
            tracksViewChanges={tracksViewChanges}
            onPress={() => onPress(barber)}
            zIndex={tracksViewChanges ? 2 : 1}
        >
            <View
                className="items-center justify-center w-8 h-8 rounded-full"
                style={{
                    elevation: 4,
                    borderWidth: hasImage ? 0 : 1,
                    borderColor: "white",
                    backgroundColor: bg,
                }}
            >
                {hasImage ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        className="w-full h-full rounded-full"
                        resizeMode="cover"
                        onLoad={() => {
                            if (mountedRef.current) {
                                // Resim yüklendi, kısa süre track et ki görünsün sonra kapat
                                setTracksViewChanges(true);
                                setTimeout(() => {
                                    if (mountedRef.current) setTracksViewChanges(false);
                                }, 300);
                            }
                        }}
                        onError={() => {
                            if (mountedRef.current) {
                                setImageError(true);
                            }
                        }}
                    />
                ) : (
                    <Icon source={iconName} color="white" size={20} />
                )}
            </View>
        </Marker>
    );
});
