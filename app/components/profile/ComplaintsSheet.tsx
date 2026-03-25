import React from "react";
import { View, ActivityIndicator, TouchableOpacity, Image } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Icon } from "react-native-paper";
import { useGetMyComplaintsQuery, useDeleteComplaintMutation } from "../../store/api";
import { ComplaintGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import LottieView from "lottie-react-native";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { DEFAULT_AVATAR } from '../../constants/images';

type ComplaintsSheetProps = {
  onClose: () => void;
};

export const ComplaintsSheet: React.FC<ComplaintsSheetProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { showSuccess, showError, showConfirm } = useAlert();
  const { colors } = useTheme();
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
    showConfirm(
      t("profile.deleteConfirmTitle"),
      t("profile.deleteConfirmMessage"),
      () => guard(async () => {
        try {
          await deleteComplaint(complaintId).unwrap();
          showSuccess(t("profile.complanintDeleteSuccess"));
          refetch();
        } catch (error: any) {
          showError(error?.data?.message || t("profile.complaintDeleteError"));
        }
      })
    );
  };

  const renderComplaintItem = ({ item }: { item: ComplaintGetDto }) => {
    const displayName = item.targetUserName || "Bilinmeyen Kullanıcı";
    const imageUrl = item.targetUserImage;
    const userTypeName = getUserTypeName(item.targetUserType);

    return (
      <View style={{ backgroundColor: colors.cardBg }} className="mb-3 rounded-xl p-4">
        {/* Üst kısım: Kullanıcı bilgileri */}
        <View className="flex-row items-start">
          {/* Profil fotoğrafı */}
          <View className="relative mr-3">
            <Image
              source={imageUrl ? { uri: imageUrl } : DEFAULT_AVATAR}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              resizeMode="cover"
            />
          </View>

          {/* Kullanıcı bilgileri */}
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text style={{ color: colors.sectionHeaderText }} className="text-sm font-semibold">{displayName}</Text>
              {userTypeName ? (
                <View style={{ backgroundColor: colors.cardBg2 }} className="ml-2 rounded-full px-2 py-0.5">
                  <Text style={{ color: colors.sectionHeaderText }} className="text-xs">{userTypeName}</Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-0.5 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
          </View>

          {/* Sil butonu */}
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            disabled={isDeleting}
            className="p-2"
          >
            <Icon source="delete-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Şikayet mesajı */}
        <View style={{ backgroundColor: colors.cardBg2 }} className="mt-3 rounded-lg p-3">
          <Text style={{ color: colors.sectionHeaderText }} className="text-sm">{item.complaintReason}</Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <BottomSheetView style={{ flex: 1, backgroundColor: colors.sheetBg }} className="items-center justify-center p-4">
        <ActivityIndicator size="large" color="#f05e23" />
      </BottomSheetView>
    );
  }

  return (
    <BottomSheetView style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      {/* Header */}
      <View style={{ borderBottomColor: colors.borderColor }} className="border-b px-4 pb-3">
        <Text style={{ color: colors.sectionHeaderText }} className="text-center text-lg font-bold">
          {t("profile.myComplaints")}
        </Text>
      </View>

      {safeComplaints.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <LottieView
            source={require("../../../assets/animations/empty.json")}
            autoPlay
            loop
            style={{ width: 120, height: 120 }}
          />
          <Text className="mt-4 text-center text-gray-400">
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
