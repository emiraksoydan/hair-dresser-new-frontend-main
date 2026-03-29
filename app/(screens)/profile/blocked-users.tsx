import { Icon } from "react-native-paper";
import React from "react";
import { View, ActivityIndicator, Switch, Image, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Text } from "../../components/common/Text";

import { useGetMyBlockedUsersQuery, useUnblockUserMutation } from "../../store/api";
import { BlockedGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { LottieViewComponent } from "../../components/common/lottieview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { DEFAULT_AVATAR } from "../../constants/images";

const ACCENT = "#ffb900";
const AVATAR = 58;
const AVATAR_RADIUS = 12;

export default function BlockedUsersPage() {
    const router = useSafeNavigation();
    const { t } = useLanguage();
    const { showSuccess, showError } = useAlert();
    const { colors, isDark } = useTheme();
    const guard = useActionGuard();

    const { data: blockedUsers, isLoading, refetch, isFetching } = useGetMyBlockedUsersQuery();
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
                    trackColor={{ false: isDark ? "#3a3a3c" : "#d1d5db", true: ACCENT }}
                    thumbColor="#ffffff"
                    ios_backgroundColor={isDark ? "#3a3a3c" : "#e5e7eb"}
                    disabled={isUnblocking}
                />
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={["top"]}>
            <View
                className="flex-row items-center justify-between px-3 py-2.5"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
            >
                <View className="flex-row items-center flex-1">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={{
                            padding: 8,
                            borderRadius: 12,
                            backgroundColor: colors.cardBg3,
                            borderWidth: 1,
                            borderColor: colors.borderColor2,
                        }}
                    >
                        <Icon source="chevron-left" size={24} color={colors.sectionHeaderText} />
                    </TouchableOpacity>
                    <View className="ml-2.5 flex-1">
                        <Text
                            style={{
                                color: colors.sectionHeaderText,
                                fontFamily: "CenturyGothic-Bold",
                                fontSize: 17,
                            }}
                        >
                            {t("profile.blockedUsers")}
                        </Text>
                    </View>
                </View>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={ACCENT} />
                </View>
            ) : (
                <FlatList
                    data={safeBlockedUsers}
                    keyExtractor={(item: BlockedGetDto) => item.id}
                    renderItem={renderBlockedItem}
                    contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isFetching && !isLoading}
                            onRefresh={refetch}
                            tintColor={ACCENT}
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-5 pt-14">
                            <LottieViewComponent
                                animationSource={require("../../../assets/animations/block.json")}
                                message={t("profile.blockedEmpty")}
                                animationSize={132}
                            />
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
