import React from "react";
import { View } from "react-native";
import { TextInput, Icon } from "react-native-paper";
import { Text } from "../common/Text";
import { useTheme } from "../../hook/useTheme";

const ACCENT = "#c2a523";

type Props = {
  value: string;
  onChange: (text: string) => void;
  onBlur?: () => void;
  error?: boolean;
  /** Küçük üst etiket (ör. "Koltuk adı") */
  caption: string;
  placeholder?: string;
};

/**
 * Koltuk adı için düz metin kutusu yerine: sol şerit + ikon + plaka hissi.
 */
export const ChairNamePlateField = React.memo<Props>(
  ({ value, onChange, onBlur, error, caption, placeholder }) => {
    const { colors, isDark } = useTheme();
    const borderColor = error ? "#b00020" : colors.borderColor2;
    const bg = isDark ? "rgba(194, 165, 35, 0.07)" : "rgba(194, 165, 35, 0.09)";

    return (
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: bg,
          overflow: "hidden",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "stretch", minHeight: 56 }}>
          <View
            style={{
              width: 5,
              backgroundColor: ACCENT,
            }}
          />
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 12,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(194, 165, 35, 0.18)" : "rgba(194, 165, 35, 0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon source="tag-outline" size={24} color={ACCENT} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 11,
                  letterSpacing: 0.3,
                  color: colors.textSecondary,
                  marginBottom: 2,
                  textTransform: "uppercase",
                }}
              >
                {caption}
              </Text>
              <TextInput
                mode="flat"
                dense
                placeholder={placeholder}
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                error={error}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                textColor={colors.sectionHeaderText}
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: "transparent",
                  fontFamily: "CenturyGothic",
                  fontSize: 16,
                  minHeight: 28,
                  paddingHorizontal: 0,
                  marginTop: -4,
                }}
                theme={{
                  colors: {
                    onSurfaceVariant: colors.textSecondary,
                    error: "#b00020",
                  },
                }}
              />
            </View>
          </View>
        </View>
      </View>
    );
  },
);

ChairNamePlateField.displayName = "ChairNamePlateField";
