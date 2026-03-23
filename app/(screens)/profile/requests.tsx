import React, { useState } from "react";
import { View, ActivityIndicator, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, FlatList, RefreshControl } from "react-native";
import { Text } from "../../components/common/Text";
import { Icon } from "react-native-paper";
import { useGetMyRequestsQuery, useCreateRequestMutation, useDeleteRequestMutation } from "../../store/api";
import { RequestGetDto } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { LottieViewComponent } from "../../components/common/lottieview";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../hook/useTheme";

export default function RequestsPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { showSuccess, showError, showConfirm } = useAlert();
    const { colors } = useTheme();

    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    const { data: requests, isLoading, refetch, isFetching } = useGetMyRequestsQuery();
    const [createRequest, { isLoading: isCreating }] = useCreateRequestMutation();
    const [deleteRequest, { isLoading: isDeleting }] = useDeleteRequestMutation();

    const safeRequests = Array.isArray(requests) ? requests : [];

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

    const handleSubmit = async () => {
        if (!title.trim()) {
            showError(t("profile.requestTitleRequired"));
            return;
        }
        if (!message.trim()) {
            showError(t("profile.requestMessageRequired"));
            return;
        }

        try {
            await createRequest({ requestTitle: title.trim(), requestMessage: message.trim() }).unwrap();
            showSuccess(t("profile.requestCreateSuccess"));
            setTitle("");
            setMessage("");
            setShowForm(false);
            refetch();
        } catch (error: any) {
            showError(error?.data?.message || t("profile.requestCreateError") || "İstek gönderilemedi");
        }
    };

    const handleDelete = async (requestId: string) => {
        showConfirm(
            t("profile.deleteRequestTitle"),
            t("profile.deleteRequestMessage"),
            async () => {
                try {
                    await deleteRequest(requestId).unwrap();
                    showSuccess(t("profile.deleteSuccess"));
                    refetch();
                } catch (error: any) {
                    showError(error?.data?.message || t("profile.deleteError") || "İstek silinemedi");
                }
            }
        );
    };

    const renderRequestItem = ({ item }: { item: RequestGetDto }) => {
        return (
            <View className="mb-3 rounded-xl p-4" style={{ backgroundColor: colors.cardBg2 }}>
                <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                        <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>{item.requestTitle}</Text>
                        <Text className="mt-0.5 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
                    </View>
                    <View className={`ml-2 rounded-full px-2 py-0.5 ${item.isProcessed ? "bg-green-900" : "bg-yellow-900"}`}>
                        <Text className={`text-xs ${item.isProcessed ? "text-green-400" : "text-yellow-400"}`}>
                            {item.isProcessed ? t("profile.processed") : t("profile.pending")}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        disabled={isDeleting}
                        className="ml-2 p-1"
                    >
                        <Icon source="delete-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
                <View className="mt-3 rounded-lg p-3" style={{ backgroundColor: colors.cardBg3 }}>
                    <Text className="text-sm text-gray-300">{item.requestMessage}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={["top"]}>
            <View
                className="flex-row items-center justify-between px-4 py-3"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
            >
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon source="chevron-left" size={28} color={colors.sectionHeaderText} />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold ml-2" style={{ color: colors.sectionHeaderText }}>
                        {t("profile.myRequests")}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => setShowForm(!showForm)} className="p-2">
                    <Icon source={showForm ? "close" : "plus"} size={24} color="#ffb900" />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#ffb900" />
                </View>
            ) : showForm ? (
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
                    <View className="flex-1 p-4">
                        <Text className="mb-2 text-sm text-gray-400">
                            {t("profile.formDescription")}
                        </Text>
                        <View className="mb-4">
                            <Text className="mb-1 text-xs text-gray-400">{t("profile.titleLabel")}</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder={t("profile.titlePlaceholder")}
                                placeholderTextColor="#6b7280"
                                maxLength={200}
                                className="rounded-lg p-3"
                                style={{
                                    backgroundColor: colors.cardBg2,
                                    color: colors.sectionHeaderText,
                                }}
                            />
                        </View>
                        <View className="mb-4 flex-1">
                            <Text className="mb-1 text-xs text-gray-400">{t("profile.messageLabel")}</Text>
                            <TextInput
                                value={message}
                                onChangeText={setMessage}
                                placeholder={t("profile.messagePlaceholder")}
                                placeholderTextColor="#6b7280"
                                multiline
                                numberOfLines={6}
                                maxLength={2000}
                                textAlignVertical="top"
                                className="min-h-[120px] flex-1 rounded-lg p-3"
                                style={{
                                    backgroundColor: colors.cardBg2,
                                    color: colors.sectionHeaderText,
                                }}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={isCreating}
                            style={{ backgroundColor: '#ffb900' }}
                            className="rounded-lg p-4"
                        >
                            {isCreating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text className="text-center font-semibold text-white">
                                    {t("profile.submit")}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            ) : (
                <FlatList
                    data={safeRequests}
                    keyExtractor={(item: RequestGetDto) => item.id}
                    renderItem={renderRequestItem}
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
                                message={t("profile.requestEmpty")}
                                animationSize={120}
                            />
                            <TouchableOpacity
                                onPress={() => setShowForm(true)}
                                className="mt-4 rounded-lg px-6 py-3"
                                style={{ backgroundColor: '#ffb900' }}
                            >
                                <Text className="font-semibold text-white">
                                    {t("profile.requestCreateNew")}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
