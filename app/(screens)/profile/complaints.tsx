import React from "react";
import { View, ActivityIndicator, TouchableOpacity, Image, FlatList, RefreshControl } from "react-native";
import { Text } from "../../components/common/Text";
import { Icon } from "react-native-paper";
import { useGetMyComplaintsQuery, useDeleteComplaintMutation } from "../../store/api";
import { ComplaintGetDto, UserType } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { LottieViewComponent } from "../../components/common/lottieview";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hook/useTheme";

export default function ComplaintsPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { showSuccess, showError, showConfirm } = useAlert();
    const { colors } = useTheme();

    const { data: complaints, isLoading, refetch, isFetching } = useGetMyComplaintsQuery();
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

    const handleDelete = async (complaintId: string) => {
        showConfirm(
            t("profile.deleteConfirmTitle"),
            t("profile.deleteConfirmMessage"),
            async () => {
                try {
                    await deleteComplaint(complaintId).unwrap();
                    showSuccess(t("profile.complanintDeleteSuccess"));
                    refetch();
                } catch (error: any) {
                    showError(error?.data?.message || t("profile.complaintDeleteError"));
                }
            }
        );
    };

    const renderComplaintItem = ({ item }: { item: ComplaintGetDto }) => {
        const displayName = item.targetUserName || "Bilinmeyen Kullanıcı";
        const imageUrl = item.targetUserImage;
        const userTypeName = getUserTypeName(item.targetUserType);

        return (
            <View className="mb-3 rounded-xl p-4" style={{ backgroundColor: colors.cardBg2 }}>
                <View className="flex-row items-start">
                    <View className="relative mr-3">
                        <Image
                            source={imageUrl ? { uri: imageUrl } : { uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQxxOeOXHNrUgfxDbpJZJCxcDOjTlrBRlH7wA&s' }}
                            style={{ width: 40, height: 40, borderRadius: 20 }}
                            resizeMode="cover"
                        />
                    </View>
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>{displayName}</Text>
                            {userTypeName ? (
                                <View
                                    className="ml-2 rounded-full px-2 py-0.5"
                                    style={{ backgroundColor: colors.cardBg3 }}
                                >
                                    <Text className="text-xs text-gray-300">{userTypeName}</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text className="mt-0.5 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        disabled={isDeleting}
                        className="p-2"
                    >
                        <Icon source="delete-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                </View>
                <View className="mt-3 rounded-lg p-3" style={{ backgroundColor: colors.cardBg3 }}>
                    <Text className="text-sm text-gray-300">{item.complaintReason}</Text>
                </View>
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
                    {t("profile.myComplaints")}
                </Text>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffb900" />
                </View>
            ) : (
                <FlatList
                    data={safeComplaints}
                    keyExtractor={(item: ComplaintGetDto) => item.id}
                    renderItem={renderComplaintItem}
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
                                animationSource={require("../../../assets/animations/empty.json")}
                                message={t("profile.complaintEmpty")}
                                animationSize={120}
                            />
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
