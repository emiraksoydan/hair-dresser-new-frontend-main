import React from "react";
import { View } from "react-native";
import { TextInput } from "react-native-paper";
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
    const { colors } = useTheme();

    return (
      <View>
        <Text
          style={{
            fontFamily: "CenturyGothic-Bold",
            fontSize: 12,
            letterSpacing: 0.2,
            color: colors.textSecondary,
            marginBottom: 6,
          }}
        >
          {caption}
        </Text>
        <TextInput
          mode="outlined"
          dense
          placeholder={placeholder}
          value={value ?? ""}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error}
          textColor={colors.sectionHeaderText}
          placeholderTextColor={colors.textSecondary}
          left={<TextInput.Icon icon="tag-outline" color={ACCENT} />}
          outlineColor={error ? "#b00020" : colors.borderColor2}
          activeOutlineColor={error ? "#b00020" : ACCENT}
          style={{
            backgroundColor: colors.cardBg,
            fontFamily: "CenturyGothic",
            fontSize: 16,
          }}
          contentStyle={{
            paddingVertical: 8,
          }}
          theme={{
            roundness: 12,
            colors: {
              onSurfaceVariant: colors.textSecondary,
              error: "#b00020",
              primary: ACCENT,
            },
          }}
        />
      </View>
    );
  },
);

ChairNamePlateField.displayName = "ChairNamePlateField";
