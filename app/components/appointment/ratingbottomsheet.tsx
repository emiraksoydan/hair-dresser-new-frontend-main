import { Icon } from "react-native-paper";
import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Keyboard,
  InputAccessoryView,
  StyleSheet,
} from "react-native";
import { Text } from "../common/Text";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import StarRating from "react-native-star-rating-widget";
import { useCreateRatingMutation } from "../../store/api";
import { CreateRatingDto, ImageOwnerType } from "../../types";
import { OwnerAvatar } from "../common/owneravatar";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

/** Ana CTA — uygulamadaki sarı / altın vurgu (#FACC15) */
const ACCENT = "#FACC15";

const RATING_COMMENT_INPUT_ACCESSORY_ID = "rating-comment-input-accessory";

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
  const commentInputRef = useRef<TextInput>(null);
  const [createRating, { isLoading }] = useCreateRatingMutation();
  const guard = useActionGuard();
  const { t } = useLanguage();
  const { alert, alertSuccess, alertError } = useAlert();
  const { colors, isDark } = useTheme();

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

  const avatarWrap = useMemo(
    () => ({
      padding: 2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "rgba(250, 204, 21, 0.45)" : "rgba(217, 119, 6, 0.4)",
      marginRight: 14,
    }),
    [isDark],
  );

  const sectionLabel = useMemo(
    () => ({
      color: isDark ? "#fcd34d" : "#b45309",
      fontFamily: "CenturyGothic-Bold" as const,
      fontSize: 14,
      letterSpacing: 0.2,
      marginBottom: 8,
    }),
    [isDark],
  );

  const handleSubmit = useCallback(
    () =>
      guard(async () => {
        if (rating === 0) {
          alert(t("booking.warning"), t("rating.selectRating"), undefined, "warning");
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
      }),
    [
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
    ],
  );

  const targetTypeLabel =
    targetType === "store"
      ? t("labels.store")
      : targetType === "freeBarber"
        ? t("labels.freeBarber")
        : targetType === "manuelBarber"
          ? t("appointment.labels.storeBarber")
          : t("card.customer");

  const keyboardDismissMode =
    Platform.OS === "ios" ? ("interactive" as const) : ("on-drag" as const);

  return (
    <BottomSheetScrollView
      style={{ flex: 1, backgroundColor: colors.sheetBg }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 20,
        flexGrow: 1,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboardDismissMode}
      showsVerticalScrollIndicator={false}
    >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: 12,
            marginBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderColor,
          }}
        >
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text
              style={{
                color: colors.sectionHeaderText,
                fontFamily: "CenturyGothic-Bold",
                fontSize: 22,
                lineHeight: 28,
              }}
            >
              {t("rating.title")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: colors.cardBg3,
              borderWidth: 1,
              borderColor: colors.borderColor2,
            }}
          >
            <Icon source="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <OwnerAvatar
            wrapperStyle={avatarWrap}
            ownerId={targetId}
            ownerType={targetOwnerType}
            fallbackUrl={normalizedTargetImage}
            imageClassName="w-[72px] h-[72px] rounded-xl"
            iconSource={
              targetType === "store"
                ? "store"
                : targetType === "freeBarber"
                  ? "account-supervisor"
                  : "account"
            }
            iconSize={32}
            iconColor="#6b7280"
          />
          <View style={{ flex: 1, minWidth: 0, paddingTop: 0 }}>
            <Text
              style={{
                color: isDark ? "#fcd34d" : "#b45309",
                fontFamily: "CenturyGothic-Bold",
                fontSize: 12,
                letterSpacing: 0.15,
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {targetTypeLabel}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
              <Text
                style={{
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 18,
                  lineHeight: 24,
                  marginRight: 6,
                }}
                numberOfLines={3}
              >
                {targetName}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontFamily: "CenturyGothic",
                  fontSize: 12,
                  lineHeight: 18,
                  flexShrink: 1,
                }}
                numberOfLines={2}
              >
                {t("rating.rateFor")}
              </Text>
            </View>
          </View>
        </View>

        <Text style={sectionLabel}>{t("rating.starSectionTitle")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
          <StarRating
            rating={rating}
            onChange={setRating}
            starSize={40}
            color="#fbbf24"
            emptyColor={isDark ? "#475569" : "#cbd5e1"}
            starStyle={{ marginHorizontal: 4 }}
          />
          {rating > 0 && (
            <Text
              style={{
                marginLeft: 8,
                color: "#f59e0b",
                fontFamily: "CenturyGothic-Bold",
                fontSize: 17,
              }}
            >
              {rating}/5
            </Text>
          )}
        </View>

        <Text style={[sectionLabel, { marginTop: 16 }]}>{t("rating.commentOptional")}</Text>
        {Platform.OS === "ios" ? (
          <InputAccessoryView nativeID={RATING_COMMENT_INPUT_ACCESSORY_ID}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.borderColor,
                backgroundColor: colors.cardBg2,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  commentInputRef.current?.blur();
                  Keyboard.dismiss();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t("common.ok")}
              >
                <Text style={{ color: ACCENT, fontFamily: "CenturyGothic-Bold", fontSize: 16 }}>
                  {t("common.ok")}
                </Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        ) : null}
        <TextInput
          ref={commentInputRef}
          placeholder={t("rating.commentPlaceholder")}
          placeholderTextColor={colors.textSecondary}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
          inputAccessoryViewID={
            Platform.OS === "ios" ? RATING_COMMENT_INPUT_ACCESSORY_ID : undefined
          }
          style={{
            minHeight: 128,
            backgroundColor: colors.cardBg2,
            color: colors.sectionHeaderText,
            fontFamily: "CenturyGothic",
            borderWidth: 1,
            borderColor: colors.borderColor,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 4,
          }}
        />
        <Text
          style={{
            alignSelf: "flex-end",
            color: colors.textSecondary,
            fontFamily: "CenturyGothic",
            fontSize: 11,
            marginBottom: 14,
          }}
        >
          {comment.length}/500
        </Text>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading || rating === 0}
          activeOpacity={0.85}
          style={{
            backgroundColor: ACCENT,
            borderRadius: 14,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading || rating === 0 ? 0.45 : 1,
            shadowColor: "#ca8a04",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Icon source="send" size={20} color="white" />
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 15,
                  marginLeft: 8,
                }}
              >
                {t("rating.submit")}
              </Text>
            </>
          )}
        </TouchableOpacity>
    </BottomSheetScrollView>
  );
};
