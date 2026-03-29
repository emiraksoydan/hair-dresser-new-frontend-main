import { Icon } from "react-native-paper";
import React, { useState } from "react";
import { View, Image, TextInput, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";

import { useCreateComplaintMutation } from "../../store/api";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { DEFAULT_AVATAR } from "../../constants/images";

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
  const { colors, isDark } = useTheme();
  const guard = useActionGuard();
  const [reason, setReason] = useState("");
  const [createComplaint, { isLoading }] = useCreateComplaintMutation();

  const handleSubmit = () =>
    guard(async () => {
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

  const labelStyle = {
    color: isDark ? "#fb923c" : "#c2410c",
    fontFamily: "CenturyGothic-Bold" as const,
    fontSize: 15,
    marginBottom: 10,
    letterSpacing: 0.15,
  };

  return (
    <BottomSheetView style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          flexGrow: 1,
        }}
      >
        <View
          style={{
            paddingBottom: 14,
            marginBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderColor,
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontFamily: "CenturyGothic-Bold",
              fontSize: 20,
              color: colors.sectionHeaderText,
            }}
          >
            {t("complaint.title")}
          </Text>
        </View>

        <View
          className="flex-row items-center mb-4 rounded-xl p-3"
          style={{ backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor }}
        >
          <Image
            source={targetImage ? { uri: targetImage } : DEFAULT_AVATAR}
            style={{ width: 52, height: 52, borderRadius: 12 }}
            resizeMode="cover"
          />
          <View className="ml-3 flex-1">
            <Text style={{ color: colors.textSecondary, fontFamily: "CenturyGothic", fontSize: 13 }}>
              {t("complaint.complainingAbout")}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontFamily: "CenturyGothic-Bold",
                fontSize: 16,
                color: colors.sectionHeaderText,
              }}
            >
              {targetName}
            </Text>
          </View>
        </View>

        <Text style={labelStyle}>{t("complaint.reason")} *</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder={t("complaint.reasonPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={4}
          style={{
            backgroundColor: colors.cardBg2,
            borderColor: colors.borderColor,
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
            color: colors.sectionHeaderText,
            minHeight: 120,
            textAlignVertical: "top",
            fontFamily: "CenturyGothic",
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 8,
          }}
        />
      </BottomSheetScrollView>

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: Platform.OS === "ios" ? 28 : 22,
          borderTopWidth: 1,
          borderTopColor: colors.borderColor,
          backgroundColor: colors.sheetBg,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading || !reason.trim()}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#dc2626",
            borderRadius: 14,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading || !reason.trim() ? 0.5 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon source="alert-circle-outline" size={22} color="#ffffff" />
              <Text
                style={{
                  color: "#ffffff",
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 16,
                  marginLeft: 8,
                }}
              >
                {t("complaint.submit")}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheetView>
  );
};
