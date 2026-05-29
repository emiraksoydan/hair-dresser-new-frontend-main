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

const prefetchedMarkerImages = new Set<string>();

export const BarberMarker = memo(({ barber, onPress }: BarberMarkerProps) => {
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const [imageReady, setImageReady] = useState(() => {
        const initialUrl = (barber as any)?.imageList?.[0]?.imageUrl;
        return !!initialUrl && prefetchedMarkerImages.has(initialUrl);
    });
    const mountedRef = useRef(true);
    const imageUrlRef = useRef<string | undefined>(undefined);

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
    const avatarUrl = (barber as any)?.imageList?.[0]?.imageUrl;
    const bg = (barber as any).type == 0 ? "#2563eb" : "#db2777";
    const iconName = (barber as any).type == 0 ? "face-man" : "face-woman";

    useEffect(() => {
        imageUrlRef.current = avatarUrl;

        if (!avatarUrl) {
            setImageReady(false);
            return;
        }

        if (prefetchedMarkerImages.has(avatarUrl)) {
            setImageReady(true);
            return;
        }

        setImageReady(false);

        let cancelled = false;
        Image.prefetch(avatarUrl)
            .then((ok) => {
                if (cancelled || !mountedRef.current || imageUrlRef.current !== avatarUrl || !ok) return;
                prefetchedMarkerImages.add(avatarUrl);
                setImageReady(true);
                setTracksViewChanges(true);
                setTimeout(() => {
                    if (mountedRef.current && imageUrlRef.current === avatarUrl) {
                        setTracksViewChanges(false);
                    }
                }, 500);
            })
            .catch(() => {
                if (!cancelled && mountedRef.current && imageUrlRef.current === avatarUrl) {
                    setImageReady(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [avatarUrl]);

    if (!c) return null;

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
                    borderWidth: 1,
                    borderColor: "white",
                    backgroundColor: bg,
                    overflow: "hidden",
                }}
            >
                <Icon source={iconName} color="white" size={20} />
                {avatarUrl && imageReady && (
                    <Image
                        source={{ uri: avatarUrl }}
                        className="absolute inset-0 w-full h-full rounded-full"
                        resizeMode="cover"
                    />
                )}
            </View>
        </Marker>
    );
});
