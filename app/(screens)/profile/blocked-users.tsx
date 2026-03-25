import React from "react";
import { View, ActivityIndicator, Switch, Image, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { Text } from "../../components/common/Text";
import { Icon } from "react-native-paper";
import { useGetMyBlockedUsersQuery, useUnblockUserMutation } from "../../store/api";
import { BlockedGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { LottieViewComponent } from "../../components/common/lottieview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { DEFAULT_AVATAR } from '../../constants/images';

export default function BlockedUsersPage() {
    const router = useSafeNavigation();
    const { t } = useLanguage();
    const { showSuccess, showError } = useAlert();
    const { colors } = useTheme();
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
            <View
                className="mb-3 flex-row items-center rounded-xl p-4"
                style={{ backgroundColor: colors.cardBg2 }}
            >
                <View className="relative mr-3">
                    <Image
                        source={imageUrl ? { uri: imageUrl } : DEFAULT_AVATAR}
                        style={{ width: 48, height: 48, borderRadius: 24 }}
                        resizeMode="cover"
                    />
                </View>
                <View className="flex-1">
                    <Text className="text-base font-semibold" style={{ color: colors.sectionHeaderText }}>{displayName}</Text>
                    {userTypeName ? (
                        <Text className="text-xs text-gray-400">{userTypeName}</Text>
                    ) : null}
                    <Text className="mt-1 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
                </View>
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

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={["top"]}>
            <View
                className="flex-row items-center px-4 py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
            >
                <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon source="chevron-left" size={28} color={colors.sectionHeaderText} />
                </TouchableOpacity>
                <Text className="text-lg font-bold ml-2" style={{ color: colors.sectionHeaderText }}>
                    {t("profile.blockedUsers")}
                </Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffb900" />
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
                            tintColor="#ffb900"
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-4 pt-12">
                            <LottieViewComponent
                                animationSource={require("../../../assets/animations/block.json")}
                                message={t("profile.blockedEmpty")}
                                animationSize={120}
                            />
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
