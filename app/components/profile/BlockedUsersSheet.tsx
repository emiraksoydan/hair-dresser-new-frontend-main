import React from "react";
import { View, ActivityIndicator, Switch, Image } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useGetMyBlockedUsersQuery, useUnblockUserMutation } from "../../store/api";
import { BlockedGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import LottieView from "lottie-react-native";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { DEFAULT_AVATAR } from '../../constants/images';

type BlockedUsersSheetProps = {
  onClose: () => void;
};

export const BlockedUsersSheet: React.FC<BlockedUsersSheetProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useAlert();
  const { colors } = useTheme();
  const guard = useActionGuard();

  const { data: blockedUsers, isLoading, refetch } = useGetMyBlockedUsersQuery();
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();

  const safeBlockedUsers = Array.isArray(blockedUsers) ? blockedUsers : [];

  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${day}.${month}.${year}`;
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

  const handleUnblock = (blockedToUserId: string) => guard(async () => {
    try {
      await unblockUser({ blockedToUserId }).unwrap();
      showSuccess(t("profile.unblockSuccess"));
      refetch();
    } catch (error: any) {
      showError(error?.data?.message || t("profile.unblockError"));
    }
  });

  const renderBlockedItem = ({ item }: { item: BlockedGetDto }) => {
    const displayName = item.targetUserName || "Bilinmeyen Kullanıcı";
    const imageUrl = item.targetUserImage;
    const userTypeName = getUserTypeName(item.targetUserType);

    return (
      <View style={{ backgroundColor: colors.cardBg }} className="mb-3 flex-row items-center rounded-xl p-4">
        <View className="relative mr-3">
          <Image
            source={imageUrl ? { uri: imageUrl } : DEFAULT_AVATAR}
            style={{ width: 48, height: 48, borderRadius: 24 }}
            resizeMode="cover"
          />
          <Text style={{ color: colors.sectionHeaderText }} className="text-base font-semibold">{displayName}</Text>
          {userTypeName ? (
            <Text className="text-xs text-gray-400">{userTypeName}</Text>
          ) : null}
          <Text className="mt-1 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
        </View>

        {/* Engeli kaldır switch */}
        <Switch
          value={true}
          onValueChange={() => handleUnblock(item.blockedToUserId)}
          trackColor={{ false: "#767577", true: "#f05e23" }}
          thumbColor="#fff"
          disabled={isUnblocking}
        />
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
          {t("profile.blockedUsers")}
        </Text>
      </View>

      {safeBlockedUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <LottieView
            source={require("../../../assets/animations/empty.json")}
            autoPlay
            loop
            style={{ width: 120, height: 120 }}
          />
          <Text className="mt-4 text-center text-gray-400">
            {t("profile.blockedEmpty")}
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={safeBlockedUsers}
          keyExtractor={(item: BlockedGetDto) => item.id}
          renderItem={renderBlockedItem}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheetView>
  );
};
