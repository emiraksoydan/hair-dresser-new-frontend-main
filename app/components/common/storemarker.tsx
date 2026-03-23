import React, { useState, memo, useEffect, useRef } from "react";
import { View, Image } from "react-native";
import { Marker } from "react-native-maps";
import { Icon } from "react-native-paper";

interface StoreMarkerProps {
    storeId: string;
    coordinate: { latitude: number; longitude: number };
    title: string;
    description?: string;
    imageUrl?: string;
    storeType: number;
    onPress: () => void;
}

export const StoreMarker = memo(({ storeId, coordinate, title, description, imageUrl, storeType, onPress }: StoreMarkerProps) => {
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const [imageError, setImageError] = useState(false);
    const imageUrlRef = useRef<string | undefined>(imageUrl);
    const mountedRef = useRef(true);

    const bg = storeType == 0 ? "#2563eb" : storeType == 1 ? "#db2777" : "#16a34a";
    const iconName = storeType == 0 ? "face-man" : "face-woman";
    const hasImage = imageUrl && !imageError;

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Image URL değiştiğinde error'ı sıfırla ve tracking'i aç
    useEffect(() => {
        if (imageUrl !== imageUrlRef.current) {
            imageUrlRef.current = imageUrl;
            setImageError(false);
            setTracksViewChanges(true);
        }
    }, [imageUrl]);

    // Resim yoksa veya hata varsa tracking'i kapat
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
                    borderWidth: hasImage ? 0 : 1,
                    borderColor: "white",
                    backgroundColor: bg,
                }}
            >
                {hasImage ? (
                    <Image
                        source={{ uri: imageUrl }}
                        className="w-full h-full rounded-full"
                        resizeMode="cover"
                        onLoad={() => {
                            if (mountedRef.current) {
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
