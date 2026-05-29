import React, { useEffect } from "react";
import { View } from "react-native";
import { Text } from "../common/Text";
import { Dialog, HelperText, Portal, Icon } from "react-native-paper";
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
import { useLanguage } from "../../hook/useLanguage";
import { PersonnelSelectList } from "./PersonnelSelectList";
import { ChairNamePlateField } from "./ChairNamePlateField";
import { ChairModeSegmentedControl } from "./ChairModeSegmentedControl";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import {
  primaryConfirmButtonColors,
  softCancelSurface,
  SOFT_CANCEL_TEXT,
} from "../../theme/confirmDialogStyles";

type ChairModalBarber = {
  id: string;
  name: string;
  ratingAvg?: number | null;
  ratingCount?: number | null;
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

  const barberOptions = barbers.map((b) => ({
    label: b.name,
    value: b.id,
    ratingAvg: b.ratingAvg ?? null,
    ratingCount: b.ratingCount ?? null,
  }));
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const confirmBtn = primaryConfirmButtonColors(isDark);
  const cancelBtn = softCancelSurface(isDark);
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
      dispatch(showSnack({ message: t("errors.storeNotFound"), isError: true }));
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
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.borderColor,
              backgroundColor: isDark
                ? "rgba(194, 165, 35, 0.08)"
                : "rgba(194, 165, 35, 0.07)",
              padding: 12,
              marginBottom: 14,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: isDark
                  ? "rgba(194, 165, 35, 0.22)"
                  : "rgba(194, 165, 35, 0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon source="chair-rolling" size={22} color="#c2a523" />
            </View>
            <Text
              style={{
                flex: 1,
                fontFamily: "CenturyGothic",
                fontSize: 12,
                lineHeight: 18,
                color: colors.textSecondary,
              }}
            >
              {t("form.chairDialogIntro")}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: "CenturyGothic-Bold",
              fontSize: 13,
              color: colors.sectionHeaderText,
              marginBottom: 8,
            }}
          >
            {t("form.chairSetupTitle")}
          </Text>
          <ChairModeSegmentedControl
            mode={mode ?? "named"}
            onModeChange={handleModeChange}
            footerHint={t("form.chairModePickerHint")}
          />

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
                    <ChairNamePlateField
                      value={value ?? ""}
                      onChange={onChange}
                      onBlur={onBlur}
                      error={!!errors.name}
                      caption={t("form.chairNameFieldLabel")}
                      placeholder={t("form.chairNamePlaceholder")}
                    />
                    {!!errors.name && (
                      <HelperText type="error" visible>
                        {errors.name?.message as string}
                      </HelperText>
                    )}
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
                    ? { required: t("form.personnelSelectionRequired") }
                    : undefined
                }
                render={({ field: { value, onChange } }) => (
                  <>
                    <PersonnelSelectList
                      options={barberOptions}
                      value={value ?? undefined}
                      onChange={onChange}
                      disabled={barberOptions.length === 0}
                      emptyHint={t("form.addPersonnelForChairHint")}
                      hasError={!!errors.barberId}
                      listTitle={t("form.personnelListTitle")}
                      listBadgeLabel={t("form.personnelListBadge", {
                        count: barberOptions.length,
                      })}
                      hint={t("form.selectPersonnelListHint")}
                    />
                    {!!errors.barberId && (
                      <HelperText type="error" visible>
                        {errors.barberId?.message as string}
                      </HelperText>
                    )}
                  </>
                )}
              />
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10, paddingBottom: 12 }}>
            <Button
              mode="outlined"
              onPress={onClose}
              textColor={SOFT_CANCEL_TEXT}
              buttonColor={cancelBtn.borderColor}
              style={{ borderRadius: 10, borderColor: cancelBtn.borderColor, backgroundColor: cancelBtn.backgroundColor, flex: 1 }}
              contentStyle={{ justifyContent: "center" }}
              labelStyle={{ fontFamily: "CenturyGothic" }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              mode="contained"
              loading={isAdding || isUpdating}
              disabled={isAdding || isUpdating}
              onPress={handleSubmit(submit)}
              buttonColor={confirmBtn.backgroundColor}
              textColor={confirmBtn.color}
              style={{ borderRadius: 10, flex: 1 }}
              contentStyle={{ justifyContent: "center" }}
              labelStyle={{ fontFamily: "CenturyGothic" }}
            >
              {t("common.save")}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog>
    </Portal>
  );
};
