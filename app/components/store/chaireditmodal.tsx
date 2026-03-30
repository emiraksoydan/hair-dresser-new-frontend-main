import React, { useEffect } from "react";
import { View, Pressable } from "react-native";
import { Text } from "../common/Text";
import { Dialog, HelperText, Portal, TextInput } from "react-native-paper";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { Button } from "../common/Button";
import { useForm, Controller } from "react-hook-form";
import { ChairFormInitial } from "../../types";
import {
  useAddStoreChairMutation,
  useUpdateStoreChairMutation,
} from "../../store/api";
import { getErrorMessage } from "../../utils/errorHandler";
import { MESSAGES } from "../../constants/messages";
import { Dropdown } from "react-native-element-dropdown";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

type ChairModalBarber = {
  id: string;
  name: string;
};

type Props = {
  visible: boolean;
  title?: string;
  initialValues?: Partial<ChairFormInitial>;
  barbers: ChairModalBarber[];
  onClose: () => void;
  storeId: string;
};

export const ChairEditModal: React.FC<Props> = ({
  visible,
  title = "Koltuk",
  initialValues,
  barbers,
  onClose,
  storeId,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ChairFormInitial>({
    defaultValues: {
      id: initialValues?.id,
      name: initialValues?.name ?? "",
      barberId: initialValues?.barberId ?? undefined,
      mode: initialValues?.barberId ? "barber" : "named",
    },
  });

  const mode = watch("mode");
  const [addChair, { isLoading: isAdding }] = useAddStoreChairMutation();
  const [updateChair, { isLoading: isUpdating }] =
    useUpdateStoreChairMutation();

  const barberOptions = barbers.map((b) => ({ label: b.name, value: b.id }));
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const accent = "#c2a523";
  const dispatch = useAppDispatch();
  const guard = useActionGuard();

  // Modal açıldığında initial değerleri tekrar yükle
  useEffect(() => {
    if (visible) {
      const startMode: "named" | "barber" = initialValues?.barberId
        ? "barber"
        : "named";

      reset({
        id: initialValues?.id ?? undefined,
        name: initialValues?.name ?? undefined,
        barberId: initialValues?.barberId ?? undefined,
        mode: startMode,
      });
    }
  }, [visible, initialValues, reset]);

  const handleModeChange = (nextMode: "named" | "barber") => {
    setValue("mode", nextMode, { shouldDirty: true });
    if (nextMode === "named") {
      setValue("barberId", undefined, { shouldDirty: true });
    } else {
      setValue("name", undefined, { shouldDirty: true });
    }
  };

  const submit = (values: ChairFormInitial) => guard(async () => {
    if (!storeId || !storeId.trim()) {
      dispatch(showSnack({ message: t("errors.storeNotFound") || "Dükkan bulunamadı", isError: true }));
      return;
    }
    const payloadName = values.mode === "named" ? (values.name ?? null) : null;
    const payloadBarberId =
      values.mode === "barber" ? (values.barberId ?? null) : null;
    const isCreate = !values.id;

    let result: { message: string; success: boolean } | undefined;
    if (isCreate) {
      const addResult = await addChair({
        dto: {
          id: undefined,
          storeId: storeId,
          name: payloadName ?? undefined,
          barberId: payloadBarberId ?? undefined,
        },
      });
      if ("error" in addResult) {
        dispatch(
          showSnack({
            message:
              getErrorMessage(addResult.error) ||
              MESSAGES.FORM.OPERATION_FAILED,
            isError: true,
          }),
        );
        return;
      }
      result = addResult.data;
    } else {
      const updateResult = await updateChair({
        dto: {
          id: values.id!,
          name: payloadName ?? undefined,
          barberId: payloadBarberId ?? undefined,
        },
      });
      if ("error" in updateResult) {
        dispatch(
          showSnack({
            message:
              getErrorMessage(updateResult.error) ||
              MESSAGES.FORM.OPERATION_FAILED,
            isError: true,
          }),
        );
        return;
      }
      result = updateResult.data;
    }

    dispatch(
      showSnack({
        message: result?.message ?? MESSAGES.FORM.OPERATION_SUCCESS,
        isError: !result?.success,
      }),
    );
    onClose();
  });

  return (
    <Portal>
      <Dialog
        dismissable={false}
        dismissableBackButton={false}
        visible={visible}
        onDismiss={onClose}
        style={{ backgroundColor: colors.cardBg }}
      >
        <Dialog.Title
          style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold" }}
        >
          {title}
        </Dialog.Title>
        <Dialog.Content style={{ paddingBottom: 0, marginBottom: 0 }}>
          <Text
            style={{
              fontFamily: "CenturyGothic",
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 8,
            }}
          >
            {t("form.chairAssignmentType")}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
            <Pressable
              onPress={() => handleModeChange("named")}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 11,
                paddingHorizontal: 8,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: mode === "named" ? accent : colors.borderColor2,
                backgroundColor:
                  mode === "named"
                    ? isDark
                      ? "rgba(194, 165, 35, 0.14)"
                      : "rgba(194, 165, 35, 0.1)"
                    : colors.cardBg,
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
                {t("form.assignByDisplayName")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleModeChange("barber")}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 11,
                paddingHorizontal: 8,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: mode === "barber" ? accent : colors.borderColor2,
                backgroundColor:
                  mode === "barber"
                    ? isDark
                      ? "rgba(194, 165, 35, 0.14)"
                      : "rgba(194, 165, 35, 0.1)"
                    : colors.cardBg,
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
                {t("form.assignToBarber")}
              </Text>
            </Pressable>
          </View>

          <Text
            style={{
              fontFamily: "CenturyGothic",
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 12,
              lineHeight: 17,
            }}
          >
            {mode === "named" ? t("form.chairModeNamedHint") : t("form.chairModeBarberHint")}
          </Text>

          <View className="gap-3 mt-0">
            {mode === "named" && (
              <Controller
                control={control}
                name="name"
                rules={
                  mode === "named"
                    ? { required: t("form.chairNameRequired") }
                    : undefined
                }
                render={({ field: { value, onChange, onBlur } }) => (
                  <>
                    <TextInput
                      label={t("form.chairNameFieldLabel")}
                      mode="outlined"
                      dense
                      value={value ?? ""}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      textColor={colors.sectionHeaderText}
                      outlineColor={errors.name ? "#b00020" : colors.borderColor2}
                      theme={{
                        roundness: 10,
                        colors: { onSurfaceVariant: colors.textSecondary, primary: colors.sectionHeaderText },
                      }}
                      style={{ backgroundColor: colors.cardBg, borderWidth: 0 }}
                    />
                    <HelperText type="error" visible={!!errors.name}>
                      {errors.name?.message as string}
                    </HelperText>
                  </>
                )}
              />
            )}
            {mode === "barber" && (
              <Controller
                control={control}
                name="barberId"
                rules={
                  mode === "barber"
                    ? { required: t("form.barberSelectionRequired") }
                    : undefined
                }
                render={({ field: { value, onChange } }) => (
                  <>
                    <Dropdown
                      data={barberOptions}
                      labelField="label"
                      valueField="value"
                      placeholder={t("form.selectBarber")}
                      value={value ?? undefined}
                      onChange={(item: { label: string; value: string }) => {
                        onChange(item.value);
                      }}
                      style={{
                        height: 42,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        backgroundColor: colors.cardBg,
                        borderWidth: 1,
                        borderColor: colors.borderColor2,
                        justifyContent: "center",
                        marginTop: 0,
                      }}
                      placeholderStyle={{
                        color: "gray",
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
                      containerStyle={{
                        backgroundColor: colors.cardBg,
                        borderWidth: 0,
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                      activeColor="#3a3b3d"
                    />
                    <HelperText type="error" visible={!!errors.barberId}>
                      {errors.barberId?.message as string}
                    </HelperText>
                  </>
                )}
              />
            )}
          </View>
        </Dialog.Content>
        <Dialog.Actions style={{ flexDirection: "column", alignItems: "stretch", paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
          <Button
            mode="contained"
            loading={isAdding || isUpdating}
            disabled={isAdding || isUpdating}
            onPress={handleSubmit(submit)}
            buttonColor="#10B981"
            textColor="white"
            style={{ borderRadius: 10 }}
            labelStyle={{ fontFamily: "CenturyGothic" }}
          >
            {t("common.save")}
          </Button>
          <Button
            mode="outlined"
            onPress={onClose}
            textColor={colors.textSecondary}
            style={{ borderRadius: 10, borderColor: colors.borderColor2 }}
            labelStyle={{ fontFamily: "CenturyGothic" }}
          >
            {t("common.cancel")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};
