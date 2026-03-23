import React, { useState, memo, useEffect, useRef } from "react";
import { View, Image, ActivityIndicator } from "react-native";
import { Marker } from "react-native-maps";
import { Icon } from "react-native-paper";

interface FreeBarberMarkerProps {
    barberId: string;
    coordinate: { latitude: number; longitude: number };
    title: string;
    imageUrl?: string;
    barberType: number;
    onPress: () => void;
}

export const FreeBarberMarker = memo(({ barberId, coordinate, title, imageUrl, barberType, onPress }: FreeBarberMarkerProps) => {
    const [tracksViewChanges, setTracksViewChanges] = useState(true);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const imageUrlRef = useRef<string | undefined>(imageUrl);
    const mountedRef = useRef(true);

    const bg = barberType == 0 ? "#2563eb" : barberType == 1 ? "#db2777" : "#16a34a";
    const iconName = barberType == 0 ? "face-man" : "face-woman";
    const hasImage = imageUrl && !imageError;

    // Component mount/unmount tracking
    useEffect(() => {
        mountedRef.current = true;
        // Her mount'ta resmi yeniden yükle
        setTracksViewChanges(true);
        setImageLoaded(false);

        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Image URL değiştiğinde tracksViewChanges'i true yap ve error'ı sıfırla
    useEffect(() => {
        if (imageUrl !== imageUrlRef.current) {
            imageUrlRef.current = imageUrl;
            setImageError(false);
            setImageLoaded(false);
            setTracksViewChanges(true);
        }
    }, [imageUrl]);

    // Resim yüklendikten sonra tracking'i kapat (performans için)
    useEffect(() => {
        if (imageLoaded || imageError || !hasImage) {
            const timer = setTimeout(() => {
                if (mountedRef.current) {
                    setTracksViewChanges(false);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [imageLoaded, imageError, hasImage]);

    return (
        <Marker
            key={`freebarber-${barberId}`}
            coordinate={coordinate}
            title={title}
            tracksViewChanges={tracksViewChanges}
            onPress={onPress}
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
                    <>
                        <Image
                            source={{ uri: imageUrl }}
                            className="w-full h-full rounded-full"
                            resizeMode="cover"
                            onLoadStart={() => {
                                if (mountedRef.current) {
                                    setImageLoading(true);
                                    setTracksViewChanges(true);
                                }
                            }}
                            onLoadEnd={() => {
                                if (mountedRef.current) {
                                    setImageLoading(false);
                                    setImageLoaded(true);
                                    // Resim yüklendiğinde bir süre daha track et ki resim görünsün
                                    setTracksViewChanges(true);
                                }
                            }}
                            onError={() => {
                                if (mountedRef.current) {
                                    setImageLoading(false);
                                    setImageError(true);
                                }
                            }}
                        />
                        {imageLoading && (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: bg, borderRadius: 16 }}>
                                <ActivityIndicator size="small" color="white" />
                            </View>
                        )}
                    </>
                ) : (
                    <Icon source={iconName} color="white" size={20} />
                )}
            </View>
        </Marker>
    );
});
