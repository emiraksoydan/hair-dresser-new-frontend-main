import React, { useState, useMemo } from "react";
import {
  View,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Text } from "../common/Text";
import {
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Icon } from "react-native-paper";
import { useGetMyRequestsQuery, useCreateRequestMutation, useDeleteRequestMutation } from "../../store/api";
import { RequestGetDto } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import LottieView from "lottie-react-native";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

const ACCENT = "#ffb900";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type RequestsSheetProps = {
  onClose: () => void;
};

export const RequestsSheet: React.FC<RequestsSheetProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { showSuccess, showError, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();
  const guard = useActionGuard();
  const { height: winH, width: winW } = useWindowDimensions();

  const sheetFormMetrics = useMemo(() => {
    const padH = Math.round(clamp(winW * 0.042, 14, 22));
    const padTop = Math.round(clamp(winH * 0.015, 10, 18));
    const padBottom = Math.round(clamp(winH * 0.028, 18, 36));
    const msgMin = Math.round(clamp(winH * 0.14, 80, 168));
    const titleMb = Math.round(clamp(winH * 0.014, 10, 16));
    const msgMb = Math.round(clamp(winH * 0.018, 12, 22));
    const lottie = Math.round(clamp(winW * 0.26, 88, 128));
    const listPad = Math.round(clamp(winW * 0.036, 12, 18));
    const msgInputPadTop = Math.round(clamp(winH * 0.014, 10, 14));
    const iosKbOffset = Math.round(clamp(winH * 0.045, 32, 52));
    return {
      padH,
      padTop,
      padBottom,
      msgMin,
      titleMb,
      msgMb,
      lottie,
      listPad,
      msgInputPadTop,
      iosKbOffset,
    };
  }, [winH, winW]);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const { data: requests, isLoading, refetch } = useGetMyRequestsQuery();
  const [createRequest, { isLoading: isCreating }] = useCreateRequestMutation();
  const [deleteRequest, { isLoading: isDeleting }] = useDeleteRequestMutation();

  const safeRequests = Array.isArray(requests) ? requests : [];

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

  const inputBase = useMemo(
    () => ({
      backgroundColor: colors.cardBg2,
      color: colors.sectionHeaderText,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderColor,
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

  const renderRequestItem = ({ item }: { item: RequestGetDto }) => {
    const processed = item.isProcessed;
    return (
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
          <Text
            style={{
              color: colors.sectionHeaderText,
              fontFamily: "CenturyGothic",
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {item.requestMessage}
          </Text>
        </View>
      </View>
    );
  };

  const submitButton = (
    <TouchableOpacity
      onPress={handleSubmit}
      disabled={isCreating}
      activeOpacity={0.85}
      style={{
        backgroundColor: ACCENT,
        borderRadius: 14,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        opacity: isCreating ? 0.5 : 1,
        shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {isCreating ? (
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
            {t("profile.submit")}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );

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
          {t("profile.myRequests")}
        </Text>
        <View style={{ width: 46, alignItems: "flex-end" }}>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(240, 94, 35, 0.15)" : "#fff7ed",
              borderWidth: 1,
              borderColor: isDark ? "rgba(240, 94, 35, 0.35)" : "rgba(251, 146, 60, 0.35)",
            }}
          >
            <Icon source={showForm ? "close" : "plus"} size={22} color={ACCENT} />
          </TouchableOpacity>
        </View>
      </View>

      {showForm ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? sheetFormMetrics.iosKbOffset : 0}
        >
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: sheetFormMetrics.padH,
              paddingTop: sheetFormMetrics.padTop,
              paddingBottom: sheetFormMetrics.padBottom,
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
                    backgroundColor: isDark ? "rgba(255, 185, 0, 0.12)" : "#fffbeb",
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
            <BottomSheetTextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("profile.titlePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              maxLength={200}
              style={[inputBase, { marginBottom: sheetFormMetrics.titleMb }]}
            />

            <Text style={labelAccent}>{t("profile.messageLabel")}</Text>
            <BottomSheetTextInput
              value={message}
              onChangeText={setMessage}
              placeholder={t("profile.messagePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={2000}
              textAlignVertical="top"
              style={[
                inputBase,
                {
                  minHeight: sheetFormMetrics.msgMin,
                  marginBottom: sheetFormMetrics.msgMb,
                  paddingTop: sheetFormMetrics.msgInputPadTop,
                },
              ]}
            />

            {submitButton}
          </BottomSheetScrollView>
        </KeyboardAvoidingView>
      ) : safeRequests.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4 py-6">
          <LottieView
            source={require("../../../assets/animations/empty.json")}
            autoPlay
            loop
            style={{ width: sheetFormMetrics.lottie, height: sheetFormMetrics.lottie }}
          />
          <Text
            style={{
              marginTop: 12,
              textAlign: "center",
              color: colors.textSecondary,
              fontFamily: "CenturyGothic",
              fontSize: 13,
              lineHeight: 19,
            }}
          >
            {t("profile.requestEmpty")}
          </Text>
          <View className="mt-6 w-full">
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              activeOpacity={0.85}
              style={{
                backgroundColor: ACCENT,
                borderRadius: 14,
                paddingVertical: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: ACCENT,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Icon source="plus" size={20} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 15,
                  marginLeft: 8,
                }}
              >
                {t("profile.requestCreateNew")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <BottomSheetFlatList
          data={safeRequests}
          keyExtractor={(item: RequestGetDto) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={{ padding: sheetFormMetrics.listPad }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheetView>
  );
};
