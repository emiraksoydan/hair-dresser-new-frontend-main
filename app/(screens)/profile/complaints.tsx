import { Icon } from "react-native-paper";
import React from "react";
import { View, ActivityIndicator, TouchableOpacity, Image, RefreshControl } from "react-native";
import { Text } from "../../components/common/Text";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";

import { useGetMyComplaintsQuery, useDeleteComplaintMutation } from "../../store/api";
import { ComplaintGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { LottieViewComponent } from "../../components/common/lottieview";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { DEFAULT_AVATAR } from "../../constants/images";
import { ScrollStackItem } from "../../components/common/ScrollStackItem";

const COMPLAINT_STRIDE = 160;

const ACCENT = "#ffb900";
const AVATAR = 58;
const AVATAR_RADIUS = 12;

export default function ComplaintsPage() {
    const router = useSafeNavigation();
    const { t } = useLanguage();
    const { showSuccess, showError, showConfirm } = useAlert();
    const { colors, isDark } = useTheme();
    const guard = useActionGuard();

    const { data: complaints, isLoading, refetch, isFetching } = useGetMyComplaintsQuery();
    const [deleteComplaint, { isLoading: isDeleting }] = useDeleteComplaintMutation();

    const safeComplaints = Array.isArray(complaints) ? complaints : [];

    const scrollY = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollY.value = e.contentOffset.y / COMPLAINT_STRIDE;
        },
    });

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
            () =>
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

    const renderComplaintItem = ({ item, index }: { item: ComplaintGetDto; index: number }) => {
        const displayName = item.targetUserName || "Bilinmeyen Kullanıcı";
        const imageUrl = item.targetUserImage;
        const userTypeName = getUserTypeName(item.targetUserType);

        return (
            <ScrollStackItem index={index} scroll={scrollY} vanish>
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
                            {t("profile.myComplaints")}
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
                    data={safeComplaints}
                    keyExtractor={(item: ComplaintGetDto) => item.id}
                    renderItem={renderComplaintItem}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
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
                                animationSource={require("../../../assets/animations/complaint.json")}
                                message={t("profile.complaintEmpty")}
                                animationSize={132}
                            />
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
