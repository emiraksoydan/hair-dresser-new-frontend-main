import React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Icon } from "react-native-paper";
import { Text } from "./Text";

export type OutlinedImagePickFieldColors = {
  cardBg: string;
  sectionHeaderText: string;
  textSecondary: string;
};

type Props = {
  label: string;
  valueText: string;
  onPress: () => void;
  borderColor: string;
  colors: OutlinedImagePickFieldColors;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
};

/**
 * react-native-paper TextInput + sağ ikon yerine: tüm kutu tek dokunma alanı.
 * Picker çağrısı parent'ta (ör. handlePickImage) kalır.
 */
export const OutlinedImagePickField: React.FC<Props> = ({
  label,
  valueText,
  onPress,
  borderColor,
  colors,
  disabled,
  loading,
  error,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          borderRadius: 10,
          borderWidth: 1,
          borderColor,
          backgroundColor: colors.cardBg,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 10,
          minHeight: 56,
          justifyContent: "center",
          opacity: disabled ? 0.6 : 1,
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: "CenturyGothic",
          fontSize: 12,
          lineHeight: 16,
          color: error ? "#b00020" : colors.textSecondary,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: "CenturyGothic",
            fontSize: 14,
            color: colors.sectionHeaderText,
          }}
        >
          {valueText}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#888" />
        ) : (
          <Icon source="image" size={22} color={colors.sectionHeaderText} />
        )}
      </View>
    </Pressable>
  );
};
