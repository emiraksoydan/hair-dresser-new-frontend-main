import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "../common/Text";
import { TextInput, IconButton, Avatar } from "react-native-paper";
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

/**
 * Optimized Manuel Barber Item Component
 * - Memoized to prevent unnecessary re-renders
 * - Field-level isolation for better performance
 * - Only re-renders when its own data changes
 */
export const ManuelBarberItem = React.memo<ManuelBarberItemProps>(
  ({
    control,
    index,
    barberId,
    avatarUri,
    errors,
    onRemove,
    onAvatarPress,
  }) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const barberError = (errors as any)?.barbers?.[index];
    const nameError = (barberError as any)?.name?.message;

    return (
      <View className="flex-row items-center gap-3 mb-2">
        {/* Avatar */}
        <TouchableOpacity activeOpacity={0.85} onPress={onAvatarPress}>
          {avatarUri ? (
            <Avatar.Image size={40} source={{ uri: avatarUri }} />
          ) : (
            <Avatar.Icon size={40} icon="account-circle" />
          )}
        </TouchableOpacity>

        {/* Berber İsmi */}
        <Controller
          control={control}
          name={`barbers.${index}.name`}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              label={t("form.barberName")}
              mode="outlined"
              dense
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              textColor={colors.sectionHeaderText}
              outlineColor={nameError ? "#b00020" : colors.borderColor}
              error={!!nameError}
              theme={{
                roundness: 10,
                colors: {
                  onSurfaceVariant: colors.textSecondary,
                  primary: colors.tagline,
                },
              }}
              style={{
                backgroundColor: colors.cardBg,
                borderWidth: 0,
                flex: 1,
                fontFamily: "CenturyGothic",
              }}
            />
          )}
        />

        {/* Delete Button */}
        <IconButton icon="delete" iconColor="#ef4444" onPress={onRemove} />
      </View>
    );
  },
  (prev, next) => {
    // Custom comparison for optimal re-render prevention
    const prevBarberError = (prev.errors as any)?.barbers?.[prev.index];
    const nextBarberError = (next.errors as any)?.barbers?.[next.index];
    return (
      prev.index === next.index &&
      prev.barberId === next.barberId &&
      prev.avatarUri === next.avatarUri &&
      JSON.stringify(prevBarberError) === JSON.stringify(nextBarberError)
    );
  },
);

ManuelBarberItem.displayName = "ManuelBarberItem";
