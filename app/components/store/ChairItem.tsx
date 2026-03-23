import React from "react";
import { View } from "react-native";
import { Text } from "../common/Text";
import { TextInput, HelperText, IconButton, Icon } from "react-native-paper";
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
    const { colors } = useTheme();
    const chairError = (errors as any)?.chairs?.[index];
    const nameError = (chairError as any)?.name?.message;
    const barberIdError = (chairError as any)?.barberId?.message;

    const disabled = mode === "barber" && barberOptions.length === 0;

    return (
      <View className="flex-row items-center gap-3 mb-3">
        {/* Chair Icon */}
        <Icon size={24} source={"chair-rolling"} color="#c2a523" />

        {/* Mode Dropdown */}
        <View className="flex-1">
          <Controller
            control={control}
            name={`chairs.${index}.mode`}
            render={({ field: { value, onChange } }) => (
              <Dropdown
                data={[
                  { label: t("form.chairNameRequired"), value: "named" },
                  { label: t("form.barberSelectionRequired"), value: "barber" },
                ]}
                labelField="label"
                valueField="value"
                value={value ?? null}
                onChange={(it: any) => onModeChange(it.value)}
                style={{
                  height: 42,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: colors.borderColor2,
                  justifyContent: "center",
                }}
                placeholderStyle={{
                  color: "gray",
                  fontFamily: "CenturyGothic",
                }}
                selectedTextStyle={{
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic",
                }}
                itemTextStyle={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic" }}
                containerStyle={{
                  backgroundColor: colors.cardBg,
                  borderWidth: 0,
                  borderRadius: 10,
                  overflow: "hidden",
                }}
                activeColor="#3a3b3d"
              />
            )}
          />
        </View>

        {/* İsim veya Berber Seçimi */}
        <View className="flex-1">
          {mode === "named" ? (
            <Controller
              control={control}
              name={`chairs.${index}.name`}
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  label={t("form.chairNameRequired")}
                  mode="outlined"
                  dense
                  value={value ?? ""}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  textColor={colors.sectionHeaderText}
                  outlineColor={colors.borderColor}
                  theme={{
                    roundness: 10,
                    colors: { onSurfaceVariant: colors.textSecondary, primary: colors.sectionHeaderText },
                  }}
                  style={{
                    backgroundColor: colors.cardBg,
                    borderWidth: 0,
                    marginTop: -5,
                    fontFamily: 'CenturyGothic',
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
                    disabled
                      ? t("form.maxBarbers")
                      : t("form.barberSelectionRequired")
                  }
                  disable={disabled}
                  style={{
                    height: 42,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    backgroundColor: colors.cardBg,
                    borderWidth: 1,
                    borderColor: colors.borderColor2,
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
                  }}
                  itemTextStyle={{
                    color: colors.sectionHeaderText,
                    fontFamily: "CenturyGothic",
                  }}
                  activeColor="#3a3b3d"
                />
              )}
            />
          )}
        </View>

        {/* Delete Button */}
        <IconButton icon="delete" iconColor="#ef4444" onPress={onRemove} />
      </View>
    );
  },
  (prev, next) => {
    // Custom comparison for optimal re-render prevention
    const prevChairError = (prev.errors as any)?.chairs?.[prev.index];
    const nextChairError = (next.errors as any)?.chairs?.[next.index];
    // Compare barber options content (not just length) so name changes propagate
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
