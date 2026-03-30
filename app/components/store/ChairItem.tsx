import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "../common/Text";
import { HelperText, Icon, IconButton, TextInput } from "react-native-paper";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { Dropdown } from "react-native-element-dropdown";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";

type ChairItemProps = {
  control: Control<any>;
  index: number;
  chairId: string;
  mode: "named" | "barber";
  barberOptions: Array<{ label: string; value: string }>;
  errors: FieldErrors<any>;
  onRemove: () => void;
  onModeChange: (mode: "named" | "barber") => void;
};

export const ChairItem = React.memo<ChairItemProps>(
  ({
    control,
    index,
    chairId,
    mode,
    barberOptions,
    errors,
    onRemove,
    onModeChange,
  }) => {
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const dropdownItemActiveBg = isDark
      ? "rgba(194, 165, 35, 0.22)"
      : "rgba(139, 115, 85, 0.16)";
    const chairError = (errors as any)?.chairs?.[index];
    const nameError = (chairError as any)?.name?.message;
    const barberIdError = (chairError as any)?.barberId?.message;
    const accent = "#c2a523";

    const disabled = mode === "barber" && barberOptions.length === 0;

    const pillBase = (active: boolean) => ({
      flex: 1,
      paddingVertical: 11,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: active ? accent : colors.borderColor2,
      backgroundColor: active
        ? isDark
          ? "rgba(194, 165, 35, 0.14)"
          : "rgba(194, 165, 35, 0.1)"
        : colors.cardBg,
    });

    return (
      <View
        style={{
          marginBottom: 14,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.borderColor,
          backgroundColor: colors.cardBg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: isDark ? "rgba(194, 165, 35, 0.12)" : "rgba(194, 165, 35, 0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={22} source="chair-rolling" color={accent} />
          </View>
          <Text
            style={{
              flex: 1,
              marginLeft: 10,
              fontFamily: "CenturyGothic-Bold",
              fontSize: 16,
              color: colors.sectionHeaderText,
            }}
          >
            {t("form.chairNumberLabel", { n: index + 1 })}
          </Text>
          <IconButton
            icon="delete-outline"
            size={22}
            iconColor="#ef4444"
            onPress={onRemove}
            style={{ margin: 0 }}
          />
        </View>

        <Text
          style={{
            fontSize: 12,
            fontFamily: "CenturyGothic",
            color: colors.textSecondary,
            marginBottom: 8,
          }}
        >
          {t("form.chairAssignmentType")}
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "named" }}
            onPress={() => onModeChange("named")}
            style={({ pressed }) => ({
              ...pillBase(mode === "named"),
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text
              style={{
                textAlign: "center",
                fontFamily: "CenturyGothic",
                fontSize: 13,
                color: colors.sectionHeaderText,
              }}
            >
              {t("form.namedChair")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "barber" }}
            onPress={() => onModeChange("barber")}
            style={({ pressed }) => ({
              ...pillBase(mode === "barber"),
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text
              style={{
                textAlign: "center",
                fontFamily: "CenturyGothic",
                fontSize: 13,
                color: colors.sectionHeaderText,
              }}
            >
              {t("form.barberChair")}
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            fontSize: 12,
            fontFamily: "CenturyGothic",
            color: colors.textSecondary,
            marginBottom: 12,
            lineHeight: 17,
          }}
        >
          {mode === "named" ? t("form.chairModeNamedHint") : t("form.chairModeBarberHint")}
        </Text>

        {mode === "named" ? (
          <Controller
            control={control}
            name={`chairs.${index}.name`}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextInput
                label={t("form.chairNameFieldLabel")}
                mode="outlined"
                dense
                value={value ?? ""}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!nameError}
                textColor={colors.sectionHeaderText}
                outlineColor={nameError ? "#b00020" : colors.borderColor}
                theme={{
                  roundness: 10,
                  colors: { onSurfaceVariant: colors.textSecondary, primary: colors.sectionHeaderText },
                }}
                style={{
                  backgroundColor: colors.cardBg,
                  borderWidth: 0,
                  fontFamily: "CenturyGothic",
                }}
              />
            )}
          />
        ) : (
          <Controller
            control={control}
            name={`chairs.${index}.barberId`}
            render={({ field: { value, onChange } }) => (
              <Dropdown
                data={barberOptions}
                labelField="label"
                valueField="value"
                value={value ?? null}
                onChange={(item: any) => onChange(item.value)}
                placeholder={
                  disabled ? t("form.maxBarbers") : t("form.selectBarber")
                }
                disable={disabled}
                style={{
                  minHeight: 50,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: barberIdError ? "#b00020" : colors.borderColor2,
                  justifyContent: "center",
                }}
                containerStyle={{
                  backgroundColor: colors.cardBg,
                  borderWidth: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
                placeholderStyle={{
                  color: colors.textSecondary,
                  fontFamily: "CenturyGothic",
                }}
                selectedTextStyle={{
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic",
                  fontSize: 14,
                  flexShrink: 1,
                }}
                itemTextStyle={{
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic",
                  fontSize: 14,
                }}
                activeColor={dropdownItemActiveBg}
              />
            )}
          />
        )}

        {(nameError || barberIdError) && (
          <HelperText type="error" visible style={{ fontFamily: "CenturyGothic" }}>
            {(nameError || barberIdError) as string}
          </HelperText>
        )}
      </View>
    );
  },
  (prev, next) => {
    const prevChairError = (prev.errors as any)?.chairs?.[prev.index];
    const nextChairError = (next.errors as any)?.chairs?.[next.index];
    const optionsSame =
      prev.barberOptions.length === next.barberOptions.length &&
      prev.barberOptions.every(
        (opt, i) =>
          opt.value === next.barberOptions[i]?.value &&
          opt.label === next.barberOptions[i]?.label,
      );
    return (
      prev.index === next.index &&
      prev.chairId === next.chairId &&
      prev.mode === next.mode &&
      optionsSame &&
      JSON.stringify(prevChairError) === JSON.stringify(nextChairError)
    );
  },
);

ChairItem.displayName = "ChairItem";
