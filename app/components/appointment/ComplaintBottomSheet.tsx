import React, { useState } from "react";
import { View, Image, TextInput } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Button } from "../common/Button";
import { useCreateComplaintMutation } from "../../store/api";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { DEFAULT_AVATAR } from '../../constants/images';

type ComplaintBottomSheetProps = {
  appointmentId: string;
  targetUserId: string;
  targetName: string;
  targetImage?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export const ComplaintBottomSheet: React.FC<ComplaintBottomSheetProps> = ({
  appointmentId,
  targetUserId,
  targetName,
  targetImage,
  onClose,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useAlert();
  const { colors } = useTheme();
  const guard = useActionGuard();
  const [reason, setReason] = useState("");
  const [createComplaint, { isLoading }] = useCreateComplaintMutation();

  const handleSubmit = () => guard(async () => {
    if (!reason.trim()) {
      showError(t("complaint.reasonRequired"));
      return;
    }

    try {
      await createComplaint({
        complaintToUserId: targetUserId,
        appointmentId: appointmentId,
        complaintReason: reason.trim(),
      }).unwrap();

      showSuccess(t("complaint.createSuccess"));
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showError(error?.data?.message || t("complaint.createError"));
    }
  });

  return (
    <BottomSheetScrollView style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      {/* Header */}
      <View
        className="px-4 pb-3"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
      >
        <Text className="text-center text-lg font-bold" style={{ color: colors.sectionHeaderText }}>
          {t("complaint.title")}
        </Text>
      </View>

      <View className="px-4 py-4">
        {/* Target User Info */}
        <View
          className="flex-row items-center mb-4 rounded-xl p-3"
          style={{ backgroundColor: colors.cardBg2 }}
        >
          <Image
            source={targetImage ? { uri: targetImage } : DEFAULT_AVATAR}
            style={{ width: 48, height: 48, borderRadius: 24 }}
            resizeMode="cover"
          />
          <View className="ml-3 flex-1">
            <Text className="text-gray-400 text-xs">{t("complaint.complainingAbout")}</Text>
            <Text className="text-base font-semibold" style={{ color: colors.sectionHeaderText }}>{targetName}</Text>
          </View>
        </View>

        {/* Reason Input */}
        <View className="mb-4">
          <Text className="text-sm font-semibold mb-2" style={{ color: colors.sectionHeaderText }}>
            {t("complaint.reason")} *
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t("complaint.reasonPlaceholder")}
            placeholderTextColor="#6b7280"
            multiline
            numberOfLines={4}
            style={{
              backgroundColor: colors.cardBg2,
              borderColor: colors.borderColor,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              color: colors.sectionHeaderText,
              minHeight: 100,
              textAlignVertical: "top",
            }}
          />
        </View>

        {/* Submit Button */}
        <Button
          onPress={handleSubmit}
          disabled={isLoading || !reason.trim()}
          buttonColor="#dc2626"
          textColor="#ffffff"
          icon="alert-circle-outline"
          loading={isLoading}
        >
          {t("complaint.submit")}
        </Button>
      </View>
    </BottomSheetScrollView>
  );
};
