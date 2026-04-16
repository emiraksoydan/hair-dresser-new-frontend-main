import { Icon } from "react-native-paper";
import React, { useState, useCallback } from "react";
import { View, ActivityIndicator, Switch, Image, RefreshControl, TouchableOpacity } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
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
import { COLORS, getProfileNativeSwitchProps } from "../../constants/colors";
import { ScrollStackItem } from "../../components/common/ScrollStackItem";

const BLOCKED_STRIDE = 136;

const ACCENT = COLORS.PROFILE_SWITCH.ACTIVE;
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
    const [isPullRefreshing, setIsPullRefreshing] = useState(false);

    const scrollY = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollY.value = e.contentOffset.y / BLOCKED_STRIDE;
        },
    });

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

    const handleRefresh = useCallback(async () => {
        setIsPullRefreshing(true);
        try {
            await refetch();
        } finally {
            setIsPullRefreshing(false);
        }
    }, [refetch]);

    const renderBlockedItem = ({ item, index }: { item: BlockedGetDto; index: number }) => {
        const displayName = item.targetUserName || "Bilinmeyen Kullanıcı";
        const imageUrl = item.targetUserImage;
        const userTypeName = getUserTypeName(item.targetUserType);

        return (
            <ScrollStackItem index={index} scroll={scrollY} vanish>
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
            </ScrollStackItem>
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
                <Animated.FlatList
                    data={safeBlockedUsers}
                    keyExtractor={(item: BlockedGetDto) => item.id}
                    renderItem={renderBlockedItem}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ padding: 16, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isPullRefreshing}
                            onRefresh={handleRefresh}
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
