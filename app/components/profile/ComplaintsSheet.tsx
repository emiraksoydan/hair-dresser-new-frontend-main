import { Icon } from "react-native-paper";
import React from "react";
import { View, ActivityIndicator, TouchableOpacity, Image } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";

import { useGetMyComplaintsQuery, useDeleteComplaintMutation } from "../../store/api";
import { ComplaintGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import LottieView from "lottie-react-native";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { DEFAULT_AVATAR } from "../../constants/images";

const ACCENT = "#ffb900";

type ComplaintsSheetProps = {
  onClose: () => void;
};

const AVATAR = 56;
const AVATAR_RADIUS = 12;

export const ComplaintsSheet: React.FC<ComplaintsSheetProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { showSuccess, showError, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const guard = useActionGuard();

  const { data: complaints, isLoading, refetch } = useGetMyComplaintsQuery();
  const [deleteComplaint, { isLoading: isDeleting }] = useDeleteComplaintMutation();

  const safeComplaints = Array.isArray(complaints) ? complaints : [];

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  const getUserTypeName = (userType?: UserType | null) => {
    switch (userType) {
      case UserType.Customer:
        return t("common.customer");
      case UserType.FreeBarber:
        return t("common.freeBarber");
      case UserType.BarberStore:
        return t("common.barberStore");
      default:
        return "";
    }
  };

  const handleDelete = (complaintId: string) => {
    showConfirm(t("profile.deleteConfirmTitle"), t("profile.deleteConfirmMessage"), () =>
      guard(async () => {
        try {
          await deleteComplaint(complaintId).unwrap();
          showSuccess(t("profile.complanintDeleteSuccess"));
          refetch();
        } catch (error: any) {
          showError(error?.data?.message || t("profile.complaintDeleteError"));
        }
      }),
    );
  };

  const renderComplaintItem = ({ item }: { item: ComplaintGetDto }) => {
    const displayName = item.targetUserName || "Bilinmeyen Kullanıcı";
    const imageUrl = item.targetUserImage;
    const userTypeName = getUserTypeName(item.targetUserType);

    return (
      <View
        className="mb-3 overflow-hidden rounded-xl p-4"
        style={{
          backgroundColor: colors.cardBg2,
          borderWidth: 1,
          borderColor: colors.borderColor,
          borderLeftWidth: 3,
          borderLeftColor: ACCENT,
        }}
      >
        <View className="flex-row items-start">
          <View className="mr-3">
            <Image
              source={imageUrl ? { uri: imageUrl } : DEFAULT_AVATAR}
              style={{ width: AVATAR, height: AVATAR, borderRadius: AVATAR_RADIUS }}
              resizeMode="cover"
            />
          </View>

          <View className="min-w-0 flex-1 pr-2">
            <Text
              style={{
                color: colors.sectionHeaderText,
                fontFamily: "CenturyGothic-Bold",
                fontSize: 16,
              }}
              numberOfLines={2}
            >
              {displayName}
            </Text>
            {userTypeName ? (
              <View
                className="mt-1.5 self-start rounded-full px-2.5 py-1"
                style={{
                  backgroundColor: isDark ? "rgba(255, 185, 0, 0.14)" : "rgba(255, 185, 0, 0.12)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255, 185, 0, 0.35)" : "rgba(251, 191, 36, 0.45)",
                }}
              >
                <Text
                  style={{
                    color: colors.sectionHeaderText,
                    fontFamily: "CenturyGothic-Bold",
                    fontSize: 12,
                  }}
                >
                  {userTypeName}
                </Text>
              </View>
            ) : null}
            <Text
              style={{
                marginTop: 6,
                color: colors.textSecondary,
                fontFamily: "CenturyGothic",
                fontSize: 13,
              }}
            >
              {formatDateTime(item.createdAt)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            disabled={isDeleting}
            style={{
              padding: 8,
              borderRadius: 10,
              backgroundColor: colors.cardBg3,
              borderWidth: 1,
              borderColor: colors.borderColor2,
            }}
          >
            <Icon source="delete-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>

        <View
          className="mt-3 rounded-xl px-3.5 py-3"
          style={{
            backgroundColor: colors.cardBg3,
            borderWidth: 1,
            borderColor: colors.borderColor,
          }}
        >
          <Text
            style={{
              color: colors.sectionHeaderText,
              fontFamily: "CenturyGothic",
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {item.complaintReason}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <BottomSheetView style={{ flex: 1, backgroundColor: colors.sheetBg }} className="items-center justify-center p-4">
        <ActivityIndicator size="large" color={ACCENT} />
      </BottomSheetView>
    );
  }

  return (
    <BottomSheetView style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <View
        className="flex-row items-center border-b px-2 pb-2.5 pt-1"
        style={{ borderBottomColor: colors.borderColor }}
      >
        <View style={{ width: 46, alignItems: "flex-start" }}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: colors.cardBg3,
              borderWidth: 1,
              borderColor: colors.borderColor2,
            }}
          >
            <Icon source="close" size={22} color={colors.sectionHeaderText} />
          </TouchableOpacity>
        </View>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            color: colors.sectionHeaderText,
            fontFamily: "CenturyGothic-Bold",
            fontSize: 16,
          }}
          numberOfLines={1}
        >
          {t("profile.myComplaints")}
        </Text>
        <View style={{ width: 46 }} />
      </View>

      {safeComplaints.length === 0 ? (
        <View className="flex-1 items-center justify-center px-5 py-8">
          <LottieView
            source={require("../../../assets/animations/empty.json")}
            autoPlay
            loop
            style={{ width: 132, height: 132 }}
          />
          <Text
            style={{
              marginTop: 16,
              textAlign: "center",
              color: colors.textSecondary,
              fontFamily: "CenturyGothic",
              fontSize: 15,
              lineHeight: 22,
              paddingHorizontal: 12,
            }}
          >
            {t("profile.complaintEmpty")}
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={safeComplaints}
          keyExtractor={(item: ComplaintGetDto) => item.id}
          renderItem={renderComplaintItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheetView>
  );
};
