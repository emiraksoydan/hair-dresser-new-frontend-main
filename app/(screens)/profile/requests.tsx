import { Icon } from "react-native-paper";
import React, { useState, useMemo, useCallback } from "react";
import {
    View,
    ActivityIndicator,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
    RefreshControl,
    Pressable,
    useWindowDimensions,
} from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { Text } from "../../components/common/Text";

import { useGetMyRequestsQuery, useCreateRequestMutation, useDeleteRequestMutation } from "../../store/api";
import { RequestGetDto } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { LottieViewComponent } from "../../components/common/lottieview";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { ScrollStackItem } from "../../components/common/ScrollStackItem";

const REQUEST_STRIDE = 148;

const ACCENT = "#FACC15";

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

export default function RequestsPage() {
    const router = useSafeNavigation();
    const { t } = useLanguage();
    const { showSuccess, showError, showConfirm } = useAlert();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { height: winH, width: winW } = useWindowDimensions();
    const guard = useActionGuard();

    const formMetrics = useMemo(() => {
        const msgMin = Math.round(clamp(winH * 0.2, 100, 260));
        const padH = Math.round(clamp(winW * 0.042, 14, 22));
        const padTop = Math.round(clamp(winH * 0.02, 12, 22));
        const titleBottom = Math.round(clamp(winH * 0.015, 10, 16));
        const msgGap = Math.round(clamp(winH * 0.017, 10, 18));
        const btnExtra = Math.round(clamp(winH * 0.014, 8, 16));
        const listPad = Math.round(clamp(winW * 0.036, 12, 18));
        const lottieSize = Math.round(clamp(winW * 0.3, 96, 140));
        const iosKbOffset = Math.round(insets.top + clamp(winH * 0.055, 44, 56));
        const inputPadTop = Math.round(clamp(winH * 0.014, 10, 14));
        return {
            msgMin,
            padH,
            padTop,
            titleBottom,
            msgGap,
            btnBottom: Math.max(insets.bottom, 12) + btnExtra,
            listPad,
            lottieSize,
            iosKbOffset,
            inputPadTop,
        };
    }, [winH, winW, insets.bottom, insets.top]);

    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    const { data: requests, isLoading, refetch, isFetching } = useGetMyRequestsQuery();
    const [createRequest, { isLoading: isCreating }] = useCreateRequestMutation();
    const [deleteRequest, { isLoading: isDeleting }] = useDeleteRequestMutation();

    const safeRequests = Array.isArray(requests) ? requests : [];
    const [isPullRefreshing, setIsPullRefreshing] = useState(false);

    const scrollY = useSharedValue(0);
    const onScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollY.value = e.contentOffset.y / REQUEST_STRIDE;
        },
    });

    const labelAccent = useMemo(
        () => ({
            color: isDark ? "#fb923c" : "#c2410c",
            fontFamily: "CenturyGothic-Bold" as const,
            fontSize: 14,
            letterSpacing: 0.2,
            marginBottom: 8,
        }),
        [isDark],
    );

    const inputStyle = useMemo(
        () => ({
            backgroundColor: colors.cardBg2,
            color: colors.sectionHeaderText,
            borderWidth: 1,
            borderColor: colors.borderColor,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 13,
            fontFamily: "CenturyGothic" as const,
            fontSize: 16,
            lineHeight: 22,
        }),
        [colors.borderColor, colors.cardBg2, colors.sectionHeaderText],
    );

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

    const handleSubmit = () =>
        guard(async () => {
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
        });

    const handleDelete = (requestId: string) => {
        showConfirm(t("profile.deleteRequestTitle"), t("profile.deleteRequestMessage"), () =>
            guard(async () => {
                try {
                    await deleteRequest(requestId).unwrap();
                    showSuccess(t("profile.deleteSuccess"));
                    refetch();
                } catch (error: any) {
                    showError(error?.data?.message || t("profile.deleteError") || "İstek silinemedi");
                }
            }),
        );
    };

    const handleRefresh = useCallback(async () => {
        setIsPullRefreshing(true);
        try {
            await refetch();
        } finally {
            setIsPullRefreshing(false);
        }
    }, [refetch]);

    const renderRequestItem = ({ item, index }: { item: RequestGetDto; index: number }) => {
        const processed = item.isProcessed;
        return (
            <ScrollStackItem index={index} scroll={scrollY} vanish>
                <View
                    className="mb-3 overflow-hidden rounded-xl pl-3 pr-3 py-3"
                    style={{
                        backgroundColor: colors.cardBg2,
                        borderWidth: 1,
                        borderColor: colors.borderColor,
                        borderLeftWidth: 3,
                        borderLeftColor: ACCENT,
                    }}
                >
                    <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-2">
                            <Text
                                style={{
                                    color: colors.sectionHeaderText,
                                    fontFamily: "CenturyGothic-Bold",
                                    fontSize: 15,
                                }}
                            >
                                {item.requestTitle}
                            </Text>
                            <View className="mt-1 flex-row items-center">
                                <Icon source="clock-outline" size={12} color={colors.textSecondary} />
                                <Text
                                    style={{
                                        color: colors.textSecondary,
                                        fontFamily: "CenturyGothic",
                                        fontSize: 11,
                                        marginLeft: 4,
                                    }}
                                >
                                    {formatDateTime(item.createdAt)}
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center">
                            <View
                                style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 999,
                                    backgroundColor: processed
                                        ? isDark
                                            ? "rgba(34, 197, 94, 0.15)"
                                            : "rgba(34, 197, 94, 0.12)"
                                        : isDark
                                            ? "rgba(245, 158, 11, 0.15)"
                                            : "rgba(245, 158, 11, 0.14)",
                                }}
                            >
                                <Text
                                    style={{
                                        fontFamily: "CenturyGothic-Bold",
                                        fontSize: 10,
                                        color: processed ? "#22c55e" : "#f59e0b",
                                    }}
                                >
                                    {processed ? t("profile.processed") : t("profile.pending")}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleDelete(item.id)}
                                disabled={isDeleting}
                                style={{
                                    marginLeft: 8,
                                    padding: 8,
                                    borderRadius: 10,
                                    backgroundColor: colors.cardBg3,
                                    borderWidth: 1,
                                    borderColor: colors.borderColor2,
                                }}
                            >
                                <Icon source="delete-outline" size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View
                        className="mt-2.5 rounded-lg px-3 py-2.5"
                        style={{
                            backgroundColor: colors.cardBg3,
                            borderWidth: 1,
                            borderColor: colors.borderColor,
                        }}
                    >
                        <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic", fontSize: 13, lineHeight: 19 }}>
                            {item.requestMessage}
                        </Text>
                    </View>
                </View>
            </ScrollStackItem>
        );
    };

    const primaryButton = (
        onPress: () => void,
        loading: boolean,
        label: string,
        disabled?: boolean,
    ) => (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading || disabled}
            activeOpacity={0.85}
            style={{
                backgroundColor: ACCENT,
                borderRadius: 14,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading || disabled ? 0.5 : 1,
                shadowColor: ACCENT,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
            }}
        >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <>
                    <Icon source="send" size={20} color="#fff" />
                    <Text
                        style={{
                            color: "#fff",
                            fontFamily: "CenturyGothic-Bold",
                            fontSize: 15,
                            marginLeft: 8,
                        }}
                    >
                        {label}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );

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
                            {t("profile.myRequests")}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={() => setShowForm(!showForm)}
                    style={{
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: isDark ? "rgba(240, 94, 35, 0.15)" : "#fff7ed",
                        borderWidth: 1,
                        borderColor: isDark ? "rgba(240, 94, 35, 0.35)" : "rgba(251, 146, 60, 0.35)",
                    }}
                >
                    <Icon source={showForm ? "close" : "plus"} size={22} color={ACCENT} />
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={ACCENT} />
                </View>
            ) : showForm ? (
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === "ios" ? formMetrics.iosKbOffset : 0}
                >
                    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
                        <View
                            style={{
                                flex: 1,
                                paddingHorizontal: formMetrics.padH,
                                paddingTop: formMetrics.padTop,
                            }}
                        >
                            <View
                                className="mb-3 rounded-xl p-3.5"
                                style={{
                                    backgroundColor: colors.cardBg2,
                                    borderWidth: 1,
                                    borderColor: colors.borderColor,
                                }}
                            >
                                <View className="flex-row items-center">
                                    <View
                                        style={{
                                            padding: 8,
                                            borderRadius: 10,
                                            backgroundColor: isDark ? "rgba(250, 204, 21, 0.12)" : "#fffbeb",
                                            marginRight: 12,
                                        }}
                                    >
                                        <Icon source="information-outline" size={22} color={ACCENT} />
                                    </View>
                                    <Text
                                        style={{
                                            flex: 1,
                                            color: colors.textSecondary,
                                            fontFamily: "CenturyGothic",
                                            fontSize: 15,
                                            lineHeight: 22,
                                        }}
                                    >
                                        {t("profile.formDescription")}
                                    </Text>
                                </View>
                            </View>

                            <Text style={labelAccent}>{t("profile.titleLabel")}</Text>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder={t("profile.titlePlaceholder")}
                                placeholderTextColor={colors.textSecondary}
                                maxLength={200}
                                style={[inputStyle, { marginBottom: formMetrics.titleBottom }]}
                            />

                            <Text style={labelAccent}>{t("profile.messageLabel")}</Text>
                            <View style={{ flex: 1, minHeight: formMetrics.msgMin, marginBottom: formMetrics.msgGap }}>
                                <TextInput
                                    value={message}
                                    onChangeText={setMessage}
                                    placeholder={t("profile.messagePlaceholder")}
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    maxLength={2000}
                                    textAlignVertical="top"
                                    style={[
                                        inputStyle,
                                        {
                                            flex: 1,
                                            minHeight: formMetrics.msgMin,
                                            paddingTop: formMetrics.inputPadTop,
                                        },
                                    ]}
                                />
                            </View>

                            <View
                                style={{
                                    paddingBottom: formMetrics.btnBottom,
                                }}
                            >
                                {primaryButton(handleSubmit, isCreating, t("profile.submit"))}
                            </View>
                        </View>
                    </Pressable>
                </KeyboardAvoidingView>
            ) : (
                <Animated.FlatList
                    data={safeRequests}
                    keyExtractor={(item: RequestGetDto) => item.id}
                    renderItem={renderRequestItem}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ padding: formMetrics.listPad, flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isPullRefreshing}
                            onRefresh={handleRefresh}
                            tintColor={ACCENT}
                        />
                    }
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center px-4 pt-10">
                            <LottieViewComponent
                                animationSource={require("../../../assets/animations/request.json")}
                                message={t("profile.requestEmpty")}
                                animationSize={formMetrics.lottieSize}
                            />
                            <View className="mt-6 w-full max-w-sm self-center">
                                {primaryButton(() => setShowForm(true), false, t("profile.requestCreateNew"))}
                            </View>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}
