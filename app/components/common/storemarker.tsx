import { Icon } from "react-native-paper";
import React, { useState, memo, useEffect, useRef } from "react";
import { View, Image } from "react-native";
import { Marker } from "react-native-maps";

interface StoreMarkerProps {
    storeId: string;
    coordinate: { latitude: number; longitude: number };
    title: string;
    description?: string;
    imageUrl?: string;
    storeType: number;
    onPress: () => void;
}

const prefetchedMarkerImages = new Set<string>();

export const StoreMarker = memo(({ storeId, coordinate, title, description, imageUrl, storeType, onPress }: StoreMarkerProps) => {
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const [imageReady, setImageReady] = useState(() => !!imageUrl && prefetchedMarkerImages.has(imageUrl));
    const imageUrlRef = useRef<string | undefined>(undefined);
    const mountedRef = useRef(true);

    const bg = storeType == 0 ? "#2563eb" : storeType == 1 ? "#db2777" : "#16a34a";
    const iconName = storeType == 0 ? "face-man" : "face-woman";

    useEffect(() => {
        imageUrlRef.current = imageUrl;

        if (!imageUrl) {
            setImageReady(false);
            return;
        }

        if (prefetchedMarkerImages.has(imageUrl)) {
            setImageReady(true);
            return;
        }

        setImageReady(false);

        let cancelled = false;
        Image.prefetch(imageUrl)
            .then((ok) => {
                if (cancelled || !mountedRef.current || imageUrlRef.current !== imageUrl || !ok) return;
                prefetchedMarkerImages.add(imageUrl);
                setImageReady(true);
                setTracksViewChanges(true);
                setTimeout(() => {
                    if (mountedRef.current && imageUrlRef.current === imageUrl) {
                        setTracksViewChanges(false);
                    }
                }, 500);
            })
            .catch(() => {
                if (!cancelled && mountedRef.current && imageUrlRef.current === imageUrl) {
                    setImageReady(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [imageUrl]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Güvenlik zamanlayıcısı: onLoad cached image'larda Android'de tetiklenmeyebilir.
    // En fazla 800ms sonra her durumda tracking'i kapat.
    useEffect(() => {
        const safetyTimer = setTimeout(() => {
            if (mountedRef.current) setTracksViewChanges(false);
        }, 800);
        return () => clearTimeout(safetyTimer);
    }, []);

    return (
        <Marker
            key={`store-${storeId}`}
            coordinate={coordinate}
            title={title}
            description={description}
            tracksViewChanges={tracksViewChanges}
            onPress={onPress}
        >
            <View
                className="items-center justify-center w-9 h-9 rounded-full"
                style={{
                    elevation: 4,
                    borderWidth: 1,
                    borderColor: "white",
                    backgroundColor: bg,
                    overflow: "hidden",
                }}
            >
                <Icon source={iconName} color="white" size={20} />
                {imageUrl && imageReady && (
                    <Image
                        source={{ uri: imageUrl }}
                        className="absolute inset-0 w-full h-full rounded-full"
                        resizeMode="cover"
                    />
                )}
            </View>
        </Marker>
    );
});
