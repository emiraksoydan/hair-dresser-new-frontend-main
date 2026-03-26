import React, { memo } from "react";
import { Image, StyleProp, View, ViewStyle } from "react-native";
import { Icon } from "react-native-paper";
import { useGetImagesByOwnerQuery } from "../../store/api";
import { ImageOwnerType } from "../../types";
import { useTheme } from "../../hook/useTheme";

type Props = {
    ownerId?: string | null;
    ownerType?: ImageOwnerType | null;
    fallbackUrl?: string | null;
    preferServer?: boolean;
    imageClassName: string;
    resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
    iconSource: string;
    iconSize?: number;
    iconColor?: string;
    iconContainerClassName?: string;
    /** Sarı/turuncu halka veya dış boşluk için dış View */
    wrapperStyle?: StyleProp<ViewStyle>;
};

const OwnerAvatarInner: React.FC<Props> = ({
    ownerId,
    ownerType,
    fallbackUrl,
    preferServer = false,
    imageClassName,
    resizeMode = "cover",
    iconSource,
    iconSize = 24,
    iconColor = "#6b7280",
    iconContainerClassName,
    wrapperStyle,
}) => {
    const { colors } = useTheme();

    // fallbackUrl boş string veya null/undefined ise fetch yap
    const hasValidFallback = fallbackUrl && fallbackUrl.trim().length > 0;
    const shouldFetch =
        !!ownerId && ownerType != null && (preferServer || !hasValidFallback);

    const { data: images } = useGetImagesByOwnerQuery(
        { ownerId: ownerId ?? "", ownerType: ownerType as ImageOwnerType },
        { skip: !shouldFetch }
    );

    // Önce API'den gelen image'ı kullan, yoksa fallbackUrl'i kullan (eğer geçerliyse)
    const apiImageUrl = images?.[0]?.imageUrl;
    const validFallbackUrl = fallbackUrl && fallbackUrl.trim().length > 0 ? fallbackUrl : null;
    const resolvedUrl = apiImageUrl || validFallbackUrl || null;

    const inner =
        resolvedUrl ? (
            <Image
                source={{ uri: resolvedUrl }}
                className={imageClassName}
                resizeMode={resizeMode}
            />
        ) : (
            <View
                className={`${imageClassName} ${iconContainerClassName ?? ""} items-center justify-center`}
                style={
                    !iconContainerClassName
                        ? { backgroundColor: colors.cardBg2 }
                        : undefined
                }
            >
                <Icon source={iconSource} size={iconSize} color={iconColor} />
            </View>
        );

    if (wrapperStyle) {
        return <View style={wrapperStyle}>{inner}</View>;
    }

    return inner;
};

export const OwnerAvatar = memo(OwnerAvatarInner);
