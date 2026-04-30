import React from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Text } from "./Text";
import { UploadLimits, formatLimitMb } from "../../constants/uploadLimits";
import { useTheme } from "../../hook/useTheme";

type Props = {
    /** Default {@link UploadLimits.IMAGE_BYTES}. Backend farklı bir limit uyguluyorsa override edin. */
    maxBytes?: number;
    /** Ekstra üst boşluk (form layout'una göre ayarlanabilir). */
    className?: string;
    /** Hizalama. Default "left". */
    align?: "left" | "center" | "right";
};

/**
 * Upload butonlarının altına küçük, nötr renkte helper metni:
 *   "Maks. 10 MB — JPG, PNG, WebP, HEIC"
 *
 * i18n key: common.maxImageSizeHint. Backend `UploadFileValidator.cs` ile
 * senkron; istemci tarafı ayrıca `pick-document.tsx` içinde size guard uygular.
 */
export const ImageUploadHint: React.FC<Props> = ({
    maxBytes = UploadLimits.IMAGE_BYTES,
    className = "mt-1",
    align = "left",
}) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const size = formatLimitMb(maxBytes);
    const textAlign =
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
    return (
        <View className={className}>
            <Text
                className={`text-[11px] font-century-gothic ${textAlign}`}
                style={{ color: colors.sectionHeaderText, opacity: 0.6 }}
            >
                {t("common.maxImageSizeHint", { size })}
            </Text>
        </View>
    );
};
