import { Icon } from "react-native-paper";
import React from "react";
import { View, ActivityIndicator, Switch, Image, TouchableOpacity } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";

import { useGetMyBlockedUsersQuery, useUnblockUserMutation } from "../../store/api";
import { BlockedGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import LottieView from "lottie-react-native";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { DEFAULT_AVATAR } from "../../constants/images";
import { COLORS, getProfileNativeSwitchProps } from "../../constants/colors";

const ACCENT = COLORS.PROFILE_SWITCH.ACTIVE;

type BlockedUsersSheetProps = {
  onClose: () => void;
};

const AVATAR = 56;
const AVATAR_RADIUS = 12;

export const BlockedUsersSheet: React.FC<BlockedUsersSheetProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
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

  const handleUnblock = (blockedToUserId: string) =>
    guard(async () => {
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
      <View
        className="mb-3 flex-row items-center overflow-hidden rounded-xl p-4"
        style={{
          backgroundColor: colors.cardBg2,
          borderWidth: 1,
          borderColor: colors.borderColor,
          borderLeftWidth: 3,
          borderLeftColor: ACCENT,
        }}
      >
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
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {userTypeName ? (
            <Text
              style={{
                marginTop: 4,
                color: colors.textSecondary,
                fontFamily: "CenturyGothic",
                fontSize: 14,
              }}
              numberOfLines={1}
            >
              {userTypeName}
            </Text>
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
        <Switch
          value={true}
          onValueChange={() => handleUnblock(item.blockedToUserId)}
          disabled={isUnblocking}
          {...getProfileNativeSwitchProps(isDark, true)}
        />
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
          {t("profile.blockedUsers")}
        </Text>
        <View style={{ width: 46 }} />
      </View>

      {safeBlockedUsers.length === 0 ? (
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
