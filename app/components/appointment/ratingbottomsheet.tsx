import React, { useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Text } from "../common/Text";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { Icon } from "react-native-paper";
import StarRating from "react-native-star-rating-widget";
import { useCreateRatingMutation } from "../../store/api";
import { CreateRatingDto, ImageOwnerType } from "../../types";
import { OwnerAvatar } from "../common/owneravatar";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

type RatingBottomSheetProps = {
  appointmentId: string;
  targetId: string;
  targetName: string;
  targetType: "store" | "freeBarber" | "manuelBarber" | "customer";
  targetImage?: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export const RatingBottomSheet: React.FC<RatingBottomSheetProps> = ({
  appointmentId,
  targetId,
  targetName,
  targetType,
  targetImage,
  onClose,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [createRating, { isLoading }] = useCreateRatingMutation();
  const guard = useActionGuard();
  const { t } = useLanguage();
  const { alert, alertSuccess, alertError } = useAlert();
  const { colors } = useTheme();

  const normalizedTargetImage =
    targetImage && Platform.OS === "ios" && targetImage.startsWith("file://")
      ? targetImage.replace(/ /g, "%20")
      : targetImage;

  const targetOwnerType: ImageOwnerType =
    targetType === "store"
      ? ImageOwnerType.Store
      : targetType === "freeBarber"
        ? ImageOwnerType.FreeBarber
        : targetType === "manuelBarber"
          ? ImageOwnerType.ManuelBarber
          : ImageOwnerType.User;

  const handleSubmit = useCallback(() => guard(async () => {
    if (rating === 0) {
      alert(t("booking.warning"), t("rating.selectRating"), undefined, 'warning');
      return;
    }

    const dto: CreateRatingDto = {
      appointmentId,
      targetId,
      score: rating,
      comment: comment.trim() || null,
    };

    const createResult = await createRating(dto);
    if ("error" in createResult) {
      const errorMessage =
        (createResult.error as any)?.data?.message ||
        t("rating.ratingSaveFailed");
      alertError(t("common.error"), errorMessage);
      return;
    }
    alertSuccess(t("common.success"), t("rating.ratingSaved"));
    onSuccess?.();
    onClose();
  }), [
    rating,
    comment,
    appointmentId,
    targetId,
    createRating,
    onClose,
    onSuccess,
    t,
    alert,
    alertSuccess,
    alertError,
    guard,
  ]);

  return (
    <BottomSheetView style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold" style={{ color: colors.sectionHeaderText }}>{t("rating.title")}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon source="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* Hedef Tipi ve Fotoğraf */}
          <View className="mb-3">
            <View className="flex-row items-center gap-3 mb-2">
              {/* Fotoğraf */}
              <OwnerAvatar
                ownerId={targetId}
                ownerType={targetOwnerType}
                fallbackUrl={normalizedTargetImage}
                imageClassName="w-12 h-12 rounded-full"
                iconSource={
                  targetType === "store"
                    ? "store"
                    : targetType === "freeBarber"
                      ? "account-supervisor"
                      : "account"
                }
                iconSize={30}
                iconColor="#6b7280"
              />
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-[#9ca3af] text-xs">
                    {targetType === "store"
                      ? t("labels.store")
                      : targetType === "freeBarber"
                        ? t("labels.freeBarber")
                        : targetType === "manuelBarber"
                          ? t("appointment.labels.storeBarber")
                          : t("card.customer")}
                  </Text>
                </View>
                <View className="flex-row gap-2 items-center flex-wrap">
                  <Text className="text-base font-semibold" style={{ color: colors.sectionHeaderText }}>
                    {targetName}
                  </Text>
                  <Text className="text-[#9ca3af] text-sm">
                    {t("rating.rateFor")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="items-start mb-4">
            <View className="flex-row items-center">
              <StarRating
                rating={rating}
                onChange={setRating}
                starSize={40}
                color="#fbbf24"
                starStyle={{ marginHorizontal: 4 }}
              />
              {rating > 0 && (
                <Text className="text-[#fbbf24] text-4xl font-bold">
                  : {rating}
                </Text>
              )}
            </View>
          </View>

          <Text className="text-sm mb-2" style={{ color: colors.sectionHeaderText }}>{t("rating.commentOptional")}</Text>
          <TextInput
            className="rounded-lg p-3 mb-4 min-h-[100px] font-century-gothic"
            placeholder={t("rating.commentPlaceholder")}
            placeholderTextColor="#6b7280"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
            style={{
              backgroundColor: colors.cardBg2,
              color: colors.sectionHeaderText,
              fontFamily:
                Platform.OS === "ios" ? "CenturyGothic" : "CenturyGothic",
            }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading || rating === 0}
            className={`bg-[#ffb900] py-3 rounded-xl flex-row items-center justify-center mb-4 ${isLoading || rating === 0 ? "opacity-50" : ""}`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Icon source="star" size={20} color="white" />
                <Text className="text-white font-bold ml-2">
                  {t("rating.submit")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheetView>
  );
};
