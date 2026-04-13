import React from "react";
import { View } from "react-native";
import { Text } from "../common/Text";
import { HelperText, Icon, IconButton } from "react-native-paper";
import { Controller, Control, FieldErrors } from "react-hook-form";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { PersonnelSelectList } from "./PersonnelSelectList";
import { ChairNamePlateField } from "./ChairNamePlateField";
import { ChairModeSegmentedControl } from "./ChairModeSegmentedControl";

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
    const chairError = (errors as any)?.chairs?.[index];
    const nameError = (chairError as any)?.name?.message;
    const barberIdError = (chairError as any)?.barberId?.message;
    const accent = "#c2a523";

    const disabled = mode === "barber" && barberOptions.length === 0;

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
            fontSize: 13,
            fontFamily: "CenturyGothic-Bold",
            color: colors.sectionHeaderText,
            marginBottom: 10,
          }}
        >
          {t("form.chairSetupTitle")}
        </Text>

        <ChairModeSegmentedControl mode={mode} onModeChange={onModeChange} />

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
              <ChairNamePlateField
                value={value ?? ""}
                onChange={onChange}
                onBlur={onBlur}
                error={!!nameError}
                caption={t("form.chairNameFieldLabel")}
                placeholder={t("form.chairNamePlaceholder")}
              />
            )}
          />
        ) : (
          <Controller
            control={control}
            name={`chairs.${index}.barberId`}
            render={({ field: { value, onChange } }) => (
              <PersonnelSelectList
                options={barberOptions}
                value={value ?? undefined}
                onChange={onChange}
                disabled={disabled}
                emptyHint={
                  disabled ? t("form.addPersonnelForChairHint") : t("form.selectPersonnel")
                }
                hasError={!!barberIdError}
                hint={t("form.selectPersonnelListHint")}
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
