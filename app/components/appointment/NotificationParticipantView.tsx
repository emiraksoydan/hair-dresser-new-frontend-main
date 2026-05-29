/**
 * Notification Participant View Component
 * Displays participant information in notifications based on recipient role
 */

import { Icon } from "react-native-paper";
import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "../common/Text";

import type { NotificationPayload } from "../../types";
import { ImageOwnerType, BarberType } from "../../types";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { OwnerAvatar } from "../common/owneravatar";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import type { ThemeColors } from "../../hook/useTheme";
import { StarRatingDisplay } from "react-native-star-rating-widget";
import {
  COLORS,
  getStarRatingScoreColor,
  getStarRatingWidgetProps,
  getTextOnGold,
} from "../../constants/colors";
import { ThemedStarIcon } from "../common/ThemedStarIcon";

const ACCENT = COLORS.UI.ACCENT_GOLD;

function ParticipantSurface({
  isDark,
  children,
}: {
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.055)"
            : "rgba(248, 250, 252, 0.92)",
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(148, 163, 184, 0.22)",
        },
      ]}
    >
      {children}
    </View>
  );
}

function AvatarRing({ children }: { children: React.ReactNode }) {
  return <View style={styles.avatarRing}>{children}</View>;
}

function FieldLabel({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  return (
    <Text
      style={[
        styles.fieldLabel,
        { color: colors.textSecondary },
      ]}
    >
      {children}
    </Text>
  );
}

function MetaChip({
  icon,
  text,
  colors,
  isDark,
}: {
  icon: string;
  text: string;
  colors: ThemeColors;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.metaChip,
        {
          backgroundColor: isDark
            ? "rgba(251, 191, 36, 0.12)"
            : "rgba(254, 243, 199, 0.65)",
        },
      ]}
    >
      <Icon source={icon as any} size={15} color={isDark ? "#d97706" : getTextOnGold(false)} />
      <Text
        style={[styles.metaChipText, { color: colors.sectionHeaderText }]}
        numberOfLines={2}
      >
        {text}
      </Text>
    </View>
  );
}

function FavoritePill({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  const onGoldFg = getTextOnGold(isDark);
  return (
    <View
      style={[
        styles.favPill,
        { backgroundColor: isDark ? "rgba(254, 243, 199, 0.7)" : COLORS.UI.ACCENT_GOLD },
      ]}
    >
      <Icon source="heart" size={12} color={onGoldFg} />
      <Text style={[styles.favPillText, { color: onGoldFg }]}>{children}</Text>
    </View>
  );
}

function RatingRow({
  rating,
  formatRating,
  isDark,
}: {
  rating: number;
  formatRating: (r?: number) => string;
  isDark: boolean;
}) {
  const starProps = getStarRatingWidgetProps(isDark);
  const scoreColor = getStarRatingScoreColor(isDark);
  return (
    <View style={styles.ratingRow}>
      <StarRatingDisplay
        rating={rating}
        starSize={14}
        color={starProps.color}
        emptyColor={starProps.emptyColor}
        StarIconComponent={ThemedStarIcon}
        starStyle={{ marginHorizontal: 0 }}
      />
      <Text style={[styles.ratingText, { color: scoreColor }]}>
        {formatRating(rating)}
      </Text>
    </View>
  );
}

interface NotificationParticipantViewProps {
  payload: NotificationPayload;
  recipientRole: string | undefined;
  isStoreInFavorites: boolean;
  isFreeBarberInFavorites: boolean;
  isCustomerInFavorites: boolean;
  formatRating: (r?: number) => any;
  onToggleFavorite?: (targetId: string) => void;
  isTogglingFavorite?: boolean;
}

export const NotificationParticipantView: React.FC<
  NotificationParticipantViewProps
> = ({
  payload,
  recipientRole,
  isStoreInFavorites,
  isFreeBarberInFavorites,
  isCustomerInFavorites,
  formatRating,
}) => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const hasManuelBarber =
    !!payload?.chair?.manuelBarberId || !!payload?.chair?.manuelBarberName;

  if (recipientRole === "store") {
    return (
      <View>
        {payload.customer && (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <AvatarRing>
                <OwnerAvatar
                  ownerId={payload.customer.userId}
                  ownerType={ImageOwnerType.User}
                  fallbackUrl={payload.customer.avatarUrl}
                  imageClassName="w-11 h-11 rounded-full"
                  iconSource="account"
                  iconSize={22}
                />
              </AvatarRing>
              <View style={styles.body}>
                <FieldLabel colors={colors}>{t("card.customer")}</FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload.customer?.displayName || t("labels.customerDefaultName")}
                </Text>
                <View style={styles.chipRow}>
                  {payload.customer?.customerNumber ? (
                    <MetaChip
                      icon="identifier"
                      text={`${t("card.customerNumber")}: ${payload.customer.customerNumber}`}
                      colors={colors}
                      isDark={isDark}
                    />
                  ) : null}
                </View>
                {isCustomerInFavorites ? (
                  <FavoritePill isDark={isDark}>{t("appointment.actions.inFavorites")}</FavoritePill>
                ) : null}
              </View>
            </View>
          </ParticipantSurface>
        )}
        {payload.freeBarber ? (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <AvatarRing>
                <OwnerAvatar
                  ownerId={payload.freeBarber.userId}
                  ownerType={ImageOwnerType.User}
                  fallbackUrl={payload.freeBarber.avatarUrl}
                  imageClassName="w-11 h-11 rounded-full"
                  iconSource="account-supervisor"
                  iconSize={22}
                />
              </AvatarRing>
              <View style={styles.body}>
                <FieldLabel colors={colors}>{t("labels.freeBarber")}</FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload.freeBarber?.displayName ||
                    t("labels.freeBarberDefaultName")}
                </Text>
                {payload.freeBarber.type !== undefined ? (
                  <Text
                    style={[styles.subMuted, { color: colors.textSecondary }]}
                  >
                    {getBarberTypeName(payload.freeBarber.type as BarberType)}
                  </Text>
                ) : null}
                <View style={styles.chipRow}>
                  {(payload.freeBarber as any)?.customerNumber ? (
                    <MetaChip
                      icon="identifier"
                      text={`${t("card.customerNumber")}: ${(payload.freeBarber as any).customerNumber}`}
                      colors={colors}
                      isDark={isDark}
                    />
                  ) : null}
                </View>
                {isFreeBarberInFavorites ? (
                  <FavoritePill isDark={isDark}>{t("appointment.actions.inFavorites")}</FavoritePill>
                ) : null}
              </View>
            </View>
          </ParticipantSurface>
        ) : hasManuelBarber ? (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <AvatarRing>
                <OwnerAvatar
                  ownerId={payload?.chair?.manuelBarberId}
                  ownerType={ImageOwnerType.ManuelBarber}
                  fallbackUrl={payload?.chair?.manuelBarberImageUrl}
                  imageClassName="w-11 h-11 rounded-full"
                  iconSource="account"
                  iconSize={22}
                />
              </AvatarRing>
              <View style={styles.body}>
                <FieldLabel colors={colors}>
                  {t("appointment.labels.storeBarber")}
                </FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload?.chair?.manuelBarberName || t("chatDefaults.barberDefaultName")}
                </Text>
                {payload?.chair?.manuelBarberType !== undefined ? (
                  <Text
                    style={[styles.subMuted, { color: colors.textSecondary }]}
                  >
                    {getBarberTypeName(
                      payload.chair.manuelBarberType as BarberType,
                    )}
                  </Text>
                ) : null}
              </View>
            </View>
          </ParticipantSurface>
        ) : (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <View
                style={[
                  styles.seatIcon,
                  { backgroundColor: colors.cardBg2 },
                ]}
              >
                <Icon source="seat" size={22} color="#6b7280" />
              </View>
              <View style={styles.body}>
                <FieldLabel colors={colors}>
                  {t("appointment.labels.chairName")}
                </FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload.chair?.chairName || t("appointment.labels.chair")}
                </Text>
              </View>
            </View>
          </ParticipantSurface>
        )}
      </View>
    );
  }

  if (recipientRole === "freebarber") {
    return (
      <View>
        {payload.store && (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <AvatarRing>
                <OwnerAvatar
                  ownerId={payload.store.storeId}
                  ownerType={ImageOwnerType.Store}
                  fallbackUrl={payload.store.imageUrl}
                  imageClassName="w-11 h-11 rounded-full"
                  iconSource="store"
                  iconSize={22}
                />
              </AvatarRing>
              <View style={styles.body}>
                <FieldLabel colors={colors}>{t("labels.store")}</FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload.store.storeName}
                </Text>
                {payload.store.type !== undefined ? (
                  <Text
                    style={[styles.subMuted, { color: colors.textSecondary }]}
                  >
                    {getBarberTypeName(payload.store.type as BarberType)}
                  </Text>
                ) : null}
                <View style={styles.chipRow}>
                  {(payload.store as any)?.storeNo ? (
                    <MetaChip
                      icon="tag-outline"
                      text={`${t("card.storeNo")}: ${(payload.store as any).storeNo}`}
                      colors={colors}
                      isDark={isDark}
                    />
                  ) : null}
                  {payload.store.storeOwnerNumber ? (
                    <MetaChip
                      icon="account-tie"
                      text={`${t("card.storeOwnerNumber")}: ${payload.store.storeOwnerNumber}`}
                      colors={colors}
                      isDark={isDark}
                    />
                  ) : null}
                </View>
                {payload.store.addressDescription ? (
                  <View
                    style={[
                      styles.addressBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(226, 232, 240, 0.45)",
                      },
                    ]}
                  >
                    <Icon source="map-marker" size={14} color="#d97706" />
                    <Text
                      style={[
                        styles.addressText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {payload.store.addressDescription}
                    </Text>
                  </View>
                ) : null}
                {isStoreInFavorites ? (
                  <FavoritePill isDark={isDark}>{t("appointment.actions.inFavorites")}</FavoritePill>
                ) : null}
              </View>
            </View>
          </ParticipantSurface>
        )}
        {payload.customer && (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <AvatarRing>
                <OwnerAvatar
                  ownerId={payload.customer.userId}
                  ownerType={ImageOwnerType.User}
                  fallbackUrl={payload.customer.avatarUrl}
                  imageClassName="w-11 h-11 rounded-full"
                  iconSource="account"
                  iconSize={22}
                />
              </AvatarRing>
              <View style={styles.body}>
                <FieldLabel colors={colors}>{t("card.customer")}</FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload.customer?.displayName || t("labels.customerDefaultName")}
                </Text>
                <View style={styles.chipRow}>
                  {payload.customer?.customerNumber ? (
                    <MetaChip
                      icon="identifier"
                      text={`${t("card.customerNumber")}: ${payload.customer.customerNumber}`}
                      colors={colors}
                      isDark={isDark}
                    />
                  ) : null}
                </View>
                {isCustomerInFavorites ? (
                  <FavoritePill isDark={isDark}>{t("appointment.actions.inFavorites")}</FavoritePill>
                ) : null}
              </View>
            </View>
          </ParticipantSurface>
        )}
      </View>
    );
  }

  if (recipientRole === "customer") {
    return (
      <View>
        {payload.store && (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <AvatarRing>
                <OwnerAvatar
                  ownerId={payload.store.storeId}
                  ownerType={ImageOwnerType.Store}
                  fallbackUrl={payload.store.imageUrl}
                  imageClassName="w-11 h-11 rounded-full"
                  iconSource="store"
                  iconSize={22}
                />
              </AvatarRing>
              <View style={styles.body}>
                <FieldLabel colors={colors}>{t("labels.store")}</FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload.store.storeName}
                </Text>
                {payload.store.type !== undefined ? (
                  <Text
                    style={[styles.subMuted, { color: colors.textSecondary }]}
                  >
                    {getBarberTypeName(payload.store.type as BarberType)}
                  </Text>
                ) : null}
                <View style={styles.chipRow}>
                  {(payload.store as any)?.storeNo ? (
                    <MetaChip
                      icon="tag-outline"
                      text={`${t("card.storeNo")}: ${(payload.store as any).storeNo}`}
                      colors={colors}
                      isDark={isDark}
                    />
                  ) : null}
                  {payload.store.storeOwnerNumber ? (
                    <MetaChip
                      icon="account-tie"
                      text={`${t("card.storeOwnerNumber")}: ${payload.store.storeOwnerNumber}`}
                      colors={colors}
                      isDark={isDark}
                    />
                  ) : null}
                </View>
                {payload.store.addressDescription ? (
                  <View
                    style={[
                      styles.addressBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(226, 232, 240, 0.45)",
                      },
                    ]}
                  >
                    <Icon source="map-marker" size={14} color="#d97706" />
                    <Text
                      style={[
                        styles.addressText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {payload.store.addressDescription}
                    </Text>
                  </View>
                ) : null}
                {payload.store.rating !== undefined ? (
                  <RatingRow rating={payload.store.rating} formatRating={formatRating} isDark={isDark} />
                ) : null}
                {isStoreInFavorites ? (
                  <FavoritePill isDark={isDark}>{t("appointment.actions.inFavorites")}</FavoritePill>
                ) : null}
              </View>
            </View>
          </ParticipantSurface>
        )}

        {payload.freeBarber ? (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <AvatarRing>
                <OwnerAvatar
                  ownerId={payload.freeBarber.userId}
                  ownerType={ImageOwnerType.User}
                  fallbackUrl={payload.freeBarber.avatarUrl}
                  imageClassName="w-11 h-11 rounded-full"
                  iconSource="account-supervisor"
                  iconSize={22}
                />
              </AvatarRing>
              <View style={styles.body}>
                <FieldLabel colors={colors}>{t("labels.freeBarber")}</FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload.freeBarber?.displayName ||
                    t("labels.freeBarberDefaultName")}
                </Text>
                {payload.freeBarber?.type !== undefined ? (
                  <Text
                    style={[styles.subMuted, { color: colors.textSecondary }]}
                  >
                    {getBarberTypeName(payload.freeBarber.type as BarberType)}
                  </Text>
                ) : null}
                <View style={styles.chipRow}>
                  {(payload.freeBarber as any)?.customerNumber ? (
                    <MetaChip
                      icon="identifier"
                      text={`${t("card.customerNumber")}: ${(payload.freeBarber as any).customerNumber}`}
                      colors={colors}
                      isDark={isDark}
                    />
                  ) : null}
                </View>
                {payload.freeBarber?.rating !== undefined ? (
                  <RatingRow rating={payload.freeBarber.rating} formatRating={formatRating} isDark={isDark} />
                ) : null}
                {isFreeBarberInFavorites ? (
                  <FavoritePill isDark={isDark}>{t("appointment.actions.inFavorites")}</FavoritePill>
                ) : null}
              </View>
            </View>
          </ParticipantSurface>
        ) : hasManuelBarber ? (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <AvatarRing>
                <OwnerAvatar
                  ownerId={payload?.chair?.manuelBarberId}
                  ownerType={ImageOwnerType.ManuelBarber}
                  fallbackUrl={payload?.chair?.manuelBarberImageUrl}
                  imageClassName="w-11 h-11 rounded-full"
                  iconSource="account"
                  iconSize={22}
                />
              </AvatarRing>
              <View style={styles.body}>
                <FieldLabel colors={colors}>
                  {t("appointment.labels.storeBarber")}
                </FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload?.chair?.manuelBarberName || t("chatDefaults.barberDefaultName")}
                </Text>
                {payload?.chair?.manuelBarberType !== undefined ? (
                  <Text
                    style={[styles.subMuted, { color: colors.textSecondary }]}
                  >
                    {getBarberTypeName(
                      payload.chair.manuelBarberType as BarberType,
                    )}
                  </Text>
                ) : null}
                {payload?.chair?.manuelBarberRating !== undefined ? (
                  <RatingRow
                    rating={payload.chair.manuelBarberRating}
                    formatRating={formatRating}
                    isDark={isDark}
                  />
                ) : null}
              </View>
            </View>
          </ParticipantSurface>
        ) : (
          <ParticipantSurface isDark={isDark}>
            <View style={styles.row}>
              <View
                style={[
                  styles.seatIcon,
                  { backgroundColor: colors.cardBg2 },
                ]}
              >
                <Icon source="seat" size={22} color="#6b7280" />
              </View>
              <View style={styles.body}>
                <FieldLabel colors={colors}>
                  {t("appointment.labels.chairName")}
                </FieldLabel>
                <Text
                  style={[styles.name, { color: colors.sectionHeaderText }]}
                >
                  {payload.chair?.chairName || t("appointment.labels.chair")}
                </Text>
              </View>
            </View>
          </ParticipantSurface>
        )}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  surface: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(240, 94, 35, 0.32)",
    padding: 2,
    marginRight: 12,
  },
  seatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: "CenturyGothic-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
    opacity: 0.95,
  },
  name: {
    fontSize: 15,
    fontFamily: "CenturyGothic-Bold",
  },
  subMuted: {
    fontSize: 12,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    maxWidth: "100%",
  },
  metaChipText: {
    fontSize: 14,
    flexShrink: 1,
    fontFamily: "CenturyGothic",
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "CenturyGothic",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  ratingText: {
    fontSize: 14,
    color: "#fbbf24",
    fontFamily: "CenturyGothic-Bold",
  },
  favPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(254, 243, 199, 0.7)",
  },
  favPillText: {
    fontSize: 12,
    color: "#c2410c",
    fontFamily: "CenturyGothic-Bold",
  },
});
