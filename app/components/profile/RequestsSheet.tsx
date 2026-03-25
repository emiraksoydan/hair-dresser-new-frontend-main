import React, { useState } from "react";
import { View, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView, BottomSheetFlatList, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { Icon } from "react-native-paper";
import { useGetMyRequestsQuery, useCreateRequestMutation, useDeleteRequestMutation } from "../../store/api";
import { RequestGetDto } from "../../types";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import LottieView from "lottie-react-native";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

type RequestsSheetProps = {
  onClose: () => void;
};

export const RequestsSheet: React.FC<RequestsSheetProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { showSuccess, showError, showConfirm } = useAlert();
  const { colors } = useTheme();
  const guard = useActionGuard();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const { data: requests, isLoading, refetch } = useGetMyRequestsQuery();
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

  const handleSubmit = () => guard(async () => {
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
    showConfirm(
      t("profile.deleteRequestTitle"),
      t("profile.deleteRequestMessage"),
      () => guard(async () => {
        try {
          await deleteRequest(requestId).unwrap();
          showSuccess(t("profile.deleteSuccess"));
          refetch();
        } catch (error: any) {
          showError(error?.data?.message || t("profile.deleteError") || "İstek silinemedi");
        }
      })
    );
  };

  const renderRequestItem = ({ item }: { item: RequestGetDto }) => {
    return (
      <View style={{ backgroundColor: colors.cardBg }} className="mb-3 rounded-xl p-4">
        {/* Üst kısım: Başlık ve tarih */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text style={{ color: colors.sectionHeaderText }} className="text-sm font-semibold">{item.requestTitle}</Text>
            <Text className="mt-0.5 text-xs text-gray-500">{formatDateTime(item.createdAt)}</Text>
          </View>

          {/* Status badge */}
          <View className={`ml-2 rounded-full px-2 py-0.5 ${item.isProcessed ? "bg-green-900" : "bg-yellow-900"}`}>
            <Text className={`text-xs ${item.isProcessed ? "text-green-400" : "text-yellow-400"}`}>
              {item.isProcessed ? (t("profile.processed")) : (t("profile.pending"))}
            </Text>
          </View>

          {/* Sil butonu */}
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            disabled={isDeleting}
            className="ml-2 p-1"
          >
            <Icon source="delete-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* İstek mesajı */}
        <View style={{ backgroundColor: colors.cardBg2 }} className="mt-3 rounded-lg p-3">
          <Text style={{ color: colors.sectionHeaderText }} className="text-sm">{item.requestMessage}</Text>
        </View>
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
      <View style={{ borderBottomColor: colors.borderColor }} className="flex-row items-center justify-between border-b px-4 pb-3">
        <View className="w-10" />
        <Text style={{ color: colors.sectionHeaderText }} className="text-lg font-bold">
          {t("profile.myRequests")}
        </Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} className="p-2">
          <Icon source={showForm ? "close" : "plus"} size={24} color="#ffb900" />
        </TouchableOpacity>
      </View>

      {showForm ? (
        /* Yeni istek formu */
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <View className="flex-1 p-4">
            <Text className="mb-2 text-sm text-gray-400">
              {t("profile.formDescription")}
            </Text>

            {/* Başlık */}
            <View className="mb-4">
              <Text className="mb-1 text-xs text-gray-400">{t("profile.titleLabel")}</Text>
              <BottomSheetTextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t("profile.titlePlaceholder")}
                placeholderTextColor="#6b7280"
                maxLength={200}
                style={{ backgroundColor: colors.cardBg, color: colors.sectionHeaderText, borderRadius: 8, padding: 12 }}
              />
            </View>

            {/* Mesaj */}
            <View className="mb-4 flex-1">
              <Text className="mb-1 text-xs text-gray-400">{t("profile.messageLabel")}</Text>
              <BottomSheetTextInput
                value={message}
                onChangeText={setMessage}
                placeholder={t("profile.messagePlaceholder")}
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={6}
                maxLength={2000}
                textAlignVertical="top"
                style={{ backgroundColor: colors.cardBg, color: colors.sectionHeaderText, borderRadius: 8, padding: 12, minHeight: 120, flex: 1 }}
              />
            </View>

            {/* Gönder butonu */}
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
        /* İstekler listesi */
        safeRequests.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4">
            <LottieView
              source={require("../../../assets/animations/empty.json")}
              autoPlay
              loop
              style={{ width: 120, height: 120 }}
            />
            <Text className="mt-4 text-center text-gray-400">
              {t("profile.requestEmpty")}
            </Text>
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
        ) : (
          <BottomSheetFlatList
            data={safeRequests}
            keyExtractor={(item: RequestGetDto) => item.id}
            renderItem={renderRequestItem}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )
      )}
    </BottomSheetView>
  );
};
