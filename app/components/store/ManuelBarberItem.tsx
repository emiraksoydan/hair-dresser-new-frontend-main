import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "../common/Text";
import { TextInput, IconButton, Avatar, Icon } from "react-native-paper";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";

type ManuelBarberItemProps = {
  control: Control<any>;
  index: number;
  barberId: string;
  avatarUri?: string;
  errors: FieldErrors<any>;
  onRemove: () => void;
  onAvatarPress: () => void;
};

export const ManuelBarberItem = React.memo<ManuelBarberItemProps>(
  ({ control, index, barberId, avatarUri, errors, onRemove, onAvatarPress }) => {
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const barberError = (errors as any)?.barbers?.[index];
    const nameError = (barberError as any)?.name?.message;
    const accent = "#c2a523";

    const numLabel = t("form.personnelNumberLabel", { n: index + 1 });

    return (
      <View
        style={{
          marginBottom: 12,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: nameError ? "#b00020" : colors.borderColor,
          backgroundColor: colors.cardBg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={onAvatarPress}
            accessibilityLabel={t("form.addImage")}
            style={{ marginTop: 2 }}
          >
            {avatarUri ? (
              <Avatar.Image size={52} source={{ uri: avatarUri }} />
            ) : (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: isDark
                    ? "rgba(194,165,35,0.14)"
                    : "rgba(194,165,35,0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: isDark
                    ? "rgba(194,165,35,0.35)"
                    : "rgba(194,165,35,0.4)",
                  borderStyle: "dashed",
                }}
              >
                <Icon source="camera-plus-outline" size={26} color={accent} />
              </View>
            )}
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  marginRight: 8,
                  minWidth: 0,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    backgroundColor: isDark
                      ? "rgba(194, 165, 35, 0.12)"
                      : "rgba(194, 165, 35, 0.14)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "CenturyGothic-Bold",
                      fontSize: 11,
                      color: accent,
                    }}
                    numberOfLines={1}
                  >
                    {numLabel}
                  </Text>
                </View>
              </View>
              <IconButton
                icon="delete-outline"
                size={22}
                iconColor="#ef4444"
                onPress={onRemove}
                style={{ margin: 0, marginTop: -4 }}
              />
            </View>

            <Controller
              control={control}
              name={`barbers.${index}.name`}
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  label={t("form.personnelName")}
                  mode="outlined"
                  dense
                  value={value ?? ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  textColor={colors.sectionHeaderText}
                  outlineColor={nameError ? "#b00020" : colors.borderColor}
                  activeOutlineColor={nameError ? "#b00020" : accent}
                  error={!!nameError}
                  theme={{
                    roundness: 10,
                    colors: {
                      onSurfaceVariant: colors.textSecondary,
                      primary: accent,
                    },
                  }}
                  style={{
                    backgroundColor: colors.cardBg,
                    fontFamily: "CenturyGothic",
                  }}
                />
              )}
            />

            {!!nameError && (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "CenturyGothic",
                  color: "#b00020",
                  marginTop: 4,
                }}
              >
                {nameError}
              </Text>
            )}

          </View>
        </View>
      </View>
    );
  },
  (prev, next) => {
    const prevErr = (prev.errors as any)?.barbers?.[prev.index];
    const nextErr = (next.errors as any)?.barbers?.[next.index];
    return (
      prev.index === next.index &&
      prev.barberId === next.barberId &&
      prev.avatarUri === next.avatarUri &&
      JSON.stringify(prevErr) === JSON.stringify(nextErr)
    );
  },
);

ManuelBarberItem.displayName = "ManuelBarberItem";
