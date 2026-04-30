// components/BarberEditModal.tsx
import "react-native-get-random-values";
import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Dialog, HelperText, Icon, Portal, TextInput } from "react-native-paper";
import { Text } from "../common/Text";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { Button } from "../common/Button";
import { useForm, Controller } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { BarberFormValues, ImageOwnerType } from "../../types";
import {
  useAddManuelBarberMutation,
  useDeleteImageMutation,
  useLazyGetImagesByOwnerQuery,
  useUpdateManuelBarberMutation,
  useUploadImageMutation,
} from "../../store/api";
import { handlePickImage, resolveMimeType } from "../../utils/form/pick-document";
import { getErrorMessage } from "../../utils/errorHandler";
import { MESSAGES } from "../../constants/messages";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import {
  primaryConfirmButtonColors,
  softCancelSurface,
  SOFT_CANCEL_TEXT,
} from "../../theme/confirmDialogStyles";

type Props = {
  visible: boolean;
  title?: string;
  initialValues?: Partial<BarberFormValues>;
  onClose: () => void;
  storeId: string;
};

export const BarberEditModal: React.FC<Props> = ({
  visible,
  title = "Berber",
  initialValues,
  onClose,
  storeId,
}) => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const confirmBtn = primaryConfirmButtonColors(isDark);
  const cancelBtn = softCancelSurface(isDark);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BarberFormValues>({
    defaultValues: {
      name: "",
      ...initialValues,
    },
  });
  const [addBarber, { isLoading: isAdding }] = useAddManuelBarberMutation();
  const [updateBarber, { isLoading: isUpdating }] =
    useUpdateManuelBarberMutation();
  const [uploadImage] = useUploadImageMutation();
  const [deleteImage] = useDeleteImageMutation();
  const [triggerGetImagesByOwner] = useLazyGetImagesByOwnerQuery();
  const dispatch = useAppDispatch();
  const profileImage = watch("profileImage");
  const guard = useActionGuard();

  const handlePickAvatar = async () => {
    const file = await handlePickImage();
    if (file) {
      setValue("profileImage", file, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const removeImage = () => {
    setValue("profileImage", undefined, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };
  useEffect(() => {
    if (visible) {
      reset({
        id: initialValues?.id ?? undefined,
        name: initialValues?.name ?? undefined,
        profileImage: initialValues?.profileImage ?? undefined,
      });
    }
  }, [visible, initialValues, reset]);

  const isRemoteUri = (uri?: string) =>
    !!uri && (uri.startsWith("http://") || uri.startsWith("https://"));

  const deleteExistingImages = async (ownerId: string) => {
    const imagesResult = await triggerGetImagesByOwner({
      ownerId,
      ownerType: ImageOwnerType.ManuelBarber,
    });
    if ("error" in imagesResult) {
      throw new Error(
        getErrorMessage(imagesResult.error) || MESSAGES.FORM.IMAGE_DELETE_ERROR,
      );
    }
    const images = imagesResult.data;

    for (const img of images ?? []) {
      const deleteImageResult = await deleteImage(img.id);
      if ("error" in deleteImageResult) {
        throw new Error(
          getErrorMessage(deleteImageResult.error) ||
            MESSAGES.FORM.IMAGE_DELETE_ERROR,
        );
      }
      const deleteResult = deleteImageResult.data;
      if (!deleteResult?.success) {
        throw new Error(
          deleteResult?.message || MESSAGES.FORM.IMAGE_DELETE_ERROR,
        );
      }
    }
  };

  const uploadProfileImage = async (
    ownerId: string,
    file: BarberFormValues["profileImage"],
  ) => {
    if (!file || !file.uri) return;
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name ?? "photo.jpg",
      type: resolveMimeType(file.type, file.name),
    } as any);
    formData.append("ownerType", String(ImageOwnerType.ManuelBarber));
    formData.append("ownerId", ownerId);
    const uploadImageResult = await uploadImage({
      data: formData,
      isProfileImage: false,
    });
    if ("error" in uploadImageResult) {
      throw new Error(
        getErrorMessage(uploadImageResult.error) ||
          MESSAGES.FORM.IMAGE_UPLOAD_ERROR,
      );
    }
    const uploadResult = uploadImageResult.data;
    if (!uploadResult?.success) {
      throw new Error(
        uploadResult?.message || MESSAGES.FORM.IMAGE_UPLOAD_ERROR,
      );
    }
  };

  const submit = (values: BarberFormValues) => guard(async () => {
    try {
      if (!storeId || !storeId.trim()) {
        dispatch(showSnack({ message: t("errors.storeNotFound") || "Dükkan bulunamadı", isError: true }));
        return;
      }
      const isCreate = !values.id;
      const barberId = values.id && values.id.trim() ? values.id : uuid();
      let result: { message: string; success: boolean } | undefined;
      if (isCreate) {
        const addResult = await addBarber({
          dto: {
            id: barberId,
            fullName: values.name!,
            storeId: storeId,
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
        const updateResult = await updateBarber({
          dto: {
            id: barberId,
            fullName: values.name!,
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

      if (!result?.success) {
        dispatch(
          showSnack({
            message: result?.message ?? MESSAGES.FORM.OPERATION_FAILED,
            isError: true,
          }),
        );
        return;
      }

      let uploadError: string | null = null;
      const profileImage = values.profileImage;
      try {
        if (isCreate) {
          if (profileImage?.uri && !isRemoteUri(profileImage.uri)) {
            await deleteExistingImages(barberId);
            await uploadProfileImage(barberId, profileImage);
          }
        } else {
          if (!profileImage?.uri) {
            await deleteExistingImages(barberId);
          } else if (!isRemoteUri(profileImage.uri)) {
            await deleteExistingImages(barberId);
            await uploadProfileImage(barberId, profileImage);
          }
        }
      } catch (uploadErr: any) {
        uploadError = getErrorMessage(uploadErr);
      }

      if (uploadError) {
        const baseMessage = isCreate
          ? MESSAGES.FORM.BARBER_ADD_IMAGE_ERROR
          : MESSAGES.FORM.BARBER_UPDATE_IMAGE_ERROR;
        dispatch(
          showSnack({
            message: `${baseMessage} ${uploadError}`,
            isError: true,
          }),
        );
      } else {
        const successMessage = isCreate
          ? MESSAGES.FORM.BARBER_ADD_SUCCESS
          : MESSAGES.FORM.BARBER_UPDATE_SUCCESS;
        dispatch(
          showSnack({
            message: result?.message ?? successMessage,
            isError: false,
          }),
        );
      }
      onClose();
    } catch (e: any) {
      dispatch(showSnack({ message: getErrorMessage(e), isError: true }));
    }
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
          <View className="gap-3">
            {profileImage ? (
              <View className="relative">
                <Image
                  className="w-full rounded-xl"
                  style={{ aspectRatio: 2 / 1 }}
                  source={{ uri: profileImage.uri }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={removeImage}
                  className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                  activeOpacity={0.85}
                >
                  <Icon source="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickAvatar}
                className="w-full rounded-xl items-center justify-center"
                style={{ aspectRatio: 2 / 1, backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor }}
                activeOpacity={0.85}
              >
                <Icon source="image-plus" size={40} color="#888" />
              </TouchableOpacity>
            )}
            <Controller
              control={control}
              name="name"
              rules={{ required: t("form.personnelNameRequired") }}
              render={({ field: { value, onChange, onBlur } }) => (
                <>
                  <TextInput
                    label={t("form.personnelName")}
                    mode="outlined"
                    dense
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    textColor={colors.sectionHeaderText}
                    outlineColor={errors.name ? "#b00020" : colors.borderColor2}
                    activeOutlineColor={errors.name ? "#b00020" : "#FACC15"}
                    theme={{
                      roundness: 10,
                      colors: { onSurfaceVariant: "gray", primary: "#FACC15" },
                    }}
                    style={{ backgroundColor: colors.cardBg }}
                  />
                  <HelperText type="error" visible={!!errors.name}>
                    {errors.name?.message}
                  </HelperText>
                </>
              )}
            />
          </View>
        </Dialog.Content>
        <Dialog.Actions style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Button
            mode="outlined"
            onPress={onClose}
            textColor={SOFT_CANCEL_TEXT}
            buttonColor={cancelBtn.borderColor}
            style={{ borderRadius: 10, borderColor: cancelBtn.borderColor, backgroundColor: cancelBtn.backgroundColor, marginRight: 8 }}
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
            style={{ borderRadius: 10 }}
            labelStyle={{ fontFamily: "CenturyGothic" }}
          >
            {t("common.save")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};
