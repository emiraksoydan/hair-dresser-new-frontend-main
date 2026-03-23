/**
 * Notification Participant View Component
 * Displays participant information in notifications based on recipient role
 */

import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "../common/Text";
import { Icon } from "react-native-paper";
import type { NotificationPayload } from "../../types";
import { UserType, BarberType, ImageOwnerType } from "../../types";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { OwnerAvatar } from "../common/owneravatar";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";

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
  const { colors } = useTheme();
  const hasManualBarber =
    !!payload?.chair?.manuelBarberId || !!payload?.chair?.manuelBarberName;

  if (recipientRole === "store") {
    return (
      <View className="flex-row gap-3">
        {payload.customer && (
          <View className="flex-1 flex-row items-start">
            <OwnerAvatar
              ownerId={payload.customer.userId}
              ownerType={ImageOwnerType.User}
              fallbackUrl={payload.customer.avatarUrl}
              imageClassName="w-12 h-12 rounded-full mr-2"
              iconSource="account"
              iconSize={24}
            />
            <View className="flex-1">
              <Text className="text-[#9ca3af] text-xs">
                {t("card.customer")}
              </Text>
              <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                {payload.customer?.displayName || t("card.customer")}
              </Text>
              {payload.customer?.customerNumber && (
                <Text className="text-[#6b7280] text-xs mt-0.5">
                  {t("card.customerNumber")}: {payload.customer.customerNumber}
                </Text>
              )}
              {isCustomerInFavorites && (
                <View className="flex-row items-center mt-0.5">
                  <Icon source="heart" size={12} color="#f05e23" />
                  <Text className="text-[#f05e23] text-xs ml-1">
                    {t("appointment.actions.inFavorites")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        <View className="flex-1">
          {payload.freeBarber ? (
            <View className="flex-row items-start">
              <OwnerAvatar
                ownerId={payload.freeBarber.userId}
                ownerType={ImageOwnerType.User}
                fallbackUrl={payload.freeBarber.avatarUrl}
                imageClassName="w-12 h-12 rounded-full mr-2"
                iconSource="account-supervisor"
                iconSize={24}
              />
              <View className="flex-1">
                <Text className="text-[#9ca3af] text-xs">
                  {t("labels.freeBarber")}
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                  {payload.freeBarber?.displayName ||
                    t("labels.freeBarberDefaultName")}
                </Text>
                {payload.freeBarber.type !== undefined && (
                  <Text className="text-[#9ca3af] text-xs mt-0.5">
                    {getBarberTypeName(payload.freeBarber.type as BarberType)}
                  </Text>
                )}
                {(payload.freeBarber as any)?.customerNumber && (
                  <Text className="text-[#6b7280] text-xs mt-0.5">
                    {t("card.customerNumber")}: {(payload.freeBarber as any).customerNumber}
                  </Text>
                )}
                {isFreeBarberInFavorites && (
                  <View className="flex-row items-center mt-0.5">
                    <Icon source="heart" size={12} color="#f05e23" />
                    <Text className="text-[#f05e23] text-xs ml-1">
                      {t("appointment.actions.inFavorites")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : hasManualBarber ? (
            <View className="flex-row items-start">
              <OwnerAvatar
                ownerId={payload?.chair?.manuelBarberId}
                ownerType={ImageOwnerType.ManuelBarber}
                fallbackUrl={payload?.chair?.manuelBarberImageUrl}
                imageClassName="w-12 h-12 rounded-full mr-2"
                iconSource="account"
                iconSize={24}
              />
              <View className="flex-1">
                <Text className="text-[#9ca3af] text-xs">
                  {t("appointment.labels.storeBarber")}
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                  {payload?.chair?.manuelBarberName}
                </Text>
                {payload?.chair?.manuelBarberType !== undefined && (
                  <Text className="text-[#9ca3af] text-xs mt-0.5">
                    {getBarberTypeName(
                      payload.chair.manuelBarberType as BarberType,
                    )}
                  </Text>
                )}
              </View>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full mr-2 items-center justify-center"
                style={{ backgroundColor: colors.cardBg2 }}
              >
                <Icon source="seat" size={24} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                  {payload.chair?.chairName}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (recipientRole === "freebarber") {
    return (
      <View>
        {payload.store && (
          <View className="flex-row items-start mb-2">
            <OwnerAvatar
              ownerId={payload.store.storeId}
              ownerType={ImageOwnerType.Store}
              fallbackUrl={payload.store.imageUrl}
              imageClassName="w-12 h-12 rounded-full mr-2"
              iconSource="store"
              iconSize={24}
            />
            <View className="flex-1">
              <Text className="text-[#9ca3af] text-xs">
                {t("labels.store")}
              </Text>
              <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                {payload.store.storeName}
              </Text>
              {payload.store.type !== undefined && (
                <Text className="text-[#9ca3af] text-xs mt-0.5">
                  {getBarberTypeName(payload.store.type as BarberType)}
                </Text>
              )}
              {(payload.store as any)?.storeNo && (
                <Text className="text-[#6b7280] text-xs mt-0.5">
                  {t("card.storeNo")}: {(payload.store as any).storeNo}
                </Text>
              )}
              {payload.store.storeOwnerNumber && (
                <Text className="text-[#6b7280] text-xs mt-0.5">
                  {t("card.storeOwnerNumber")}: {payload.store.storeOwnerNumber}
                </Text>
              )}
              {payload.store.addressDescription && (
                <View className="mt-1 flex-row items-start">
                  <View className="mt-0.5">
                    <Icon source="map-marker" size={12} color="#6b7280" />
                  </View>
                  <Text className="text-[#6b7280] text-xs ml-1 flex-1">
                    {payload.store.addressDescription}
                  </Text>
                </View>
              )}
              {isStoreInFavorites && (
                <View className="flex-row items-center mt-0.5">
                  <Icon source="heart" size={12} color="#f05e23" />
                  <Text className="text-[#f05e23] text-xs ml-1">
                    {t("appointment.actions.inFavorites")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        {payload.customer && (
          <View className="flex-row items-start">
            <OwnerAvatar
              ownerId={payload.customer.userId}
              ownerType={ImageOwnerType.User}
              fallbackUrl={payload.customer.avatarUrl}
              imageClassName="w-10 h-10 rounded-full mr-2"
              iconSource="account"
              iconSize={20}
            />
            <View className="flex-1">
              <Text className="text-[#9ca3af] text-xs">
                {t("card.customer")}
              </Text>
              <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                {payload.customer?.displayName || t("card.customer")}
              </Text>
              {payload.customer?.customerNumber && (
                <Text className="text-[#6b7280] text-xs mt-0.5">
                  {t("card.customerNumber")}: {payload.customer.customerNumber}
                </Text>
              )}
              {isCustomerInFavorites && (
                <View className="flex-row items-center mt-0.5">
                  <Icon source="heart" size={12} color="#f05e23" />
                  <Text className="text-[#f05e23] text-xs ml-1">
                    {t("appointment.actions.inFavorites")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    );
  }

  if (recipientRole === "customer") {
    return (
      <View className="flex-row gap-3">
        {payload.store && (
          <View className="flex-1 flex-row items-start">
            <OwnerAvatar
              ownerId={payload.store.storeId}
              ownerType={ImageOwnerType.Store}
              fallbackUrl={payload.store.imageUrl}
              imageClassName="w-12 h-12 rounded-full mr-2"
              iconSource="store"
              iconSize={24}
            />
            <View className="flex-1">
              <Text className="text-[#9ca3af] text-xs">
                {t("labels.store")}
              </Text>
              <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                {payload.store.storeName}
              </Text>
              {payload.store.type !== undefined && (
                <Text className="text-[#9ca3af] text-xs mt-0.5">
                  {getBarberTypeName(payload.store.type as BarberType)}
                </Text>
              )}
              {(payload.store as any)?.storeNo && (
                <Text className="text-[#6b7280] text-xs mt-0.5">
                  {t("card.storeNo")}: {(payload.store as any).storeNo}
                </Text>
              )}
              {payload.store.storeOwnerNumber && (
                <Text className="text-[#6b7280] text-xs mt-0.5">
                  {t("card.storeOwnerNumber")}: {payload.store.storeOwnerNumber}
                </Text>
              )}
              {payload.store.addressDescription && (
                <View className="mt-1 flex-row items-start">
                  <View className="mt-0.5">
                    <Icon source="map-marker" size={12} color="#6b7280" />
                  </View>
                  <Text className="text-[#6b7280] text-xs ml-1 flex-1">
                    {payload.store.addressDescription}
                  </Text>
                </View>
              )}
              {payload.store.rating !== undefined && (
                <View className="flex-row items-center mt-0.5">
                  <Icon source="star" size={12} color="#fbbf24" />
                  <Text className="text-[#fbbf24] text-xs ml-1">
                    {formatRating(payload.store.rating)}
                  </Text>
                </View>
              )}
              {isStoreInFavorites && (
                <View className="flex-row items-center mt-0.5">
                  <Icon source="heart" size={12} color="#f05e23" />
                  <Text className="text-[#f05e23] text-xs ml-1">
                    {t("appointment.actions.inFavorites")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View className="flex-1">
          {payload.freeBarber ? (
            <View className="flex-row items-start">
              <OwnerAvatar
                ownerId={payload.freeBarber.userId}
                ownerType={ImageOwnerType.User}
                fallbackUrl={payload.freeBarber.avatarUrl}
                imageClassName="w-12 h-12 rounded-full mr-2"
                iconSource="account-supervisor"
                iconSize={24}
              />
              <View className="flex-1">
                <Text className="text-[#9ca3af] text-xs">
                  {t("labels.freeBarber")}
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                  {payload.freeBarber?.displayName ||
                    t("labels.freeBarberDefaultName")}
                </Text>
                {payload.freeBarber?.type !== undefined && (
                  <Text className="text-[#9ca3af] text-xs mt-0.5">
                    {getBarberTypeName(payload.freeBarber.type as BarberType)}
                  </Text>
                )}
                {(payload.freeBarber as any)?.customerNumber && (
                  <Text className="text-[#6b7280] text-xs mt-0.5">
                    {t("card.customerNumber")}: {(payload.freeBarber as any).customerNumber}
                  </Text>
                )}
                {payload.freeBarber?.rating !== undefined && (
                  <View className="flex-row items-center mt-0.5">
                    <Icon source="star" size={12} color="#fbbf24" />
                    <Text className="text-[#fbbf24] text-xs ml-1">
                      {formatRating(payload.freeBarber.rating)}
                    </Text>
                  </View>
                )}
                {isFreeBarberInFavorites && (
                  <View className="flex-row items-center mt-0.5">
                    <Icon source="heart" size={12} color="#f05e23" />
                    <Text className="text-[#f05e23] text-xs ml-1">
                      {t("appointment.actions.inFavorites")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : hasManualBarber ? (
            <View className="flex-row items-start">
              <OwnerAvatar
                ownerId={payload?.chair?.manuelBarberId}
                ownerType={ImageOwnerType.ManuelBarber}
                fallbackUrl={payload?.chair?.manuelBarberImageUrl}
                imageClassName="w-12 h-12 rounded-full mr-2"
                iconSource="account"
                iconSize={24}
              />
              <View className="flex-1">
                <Text className="text-[#9ca3af] text-xs">
                  {t("appointment.labels.storeBarber")}
                </Text>
                <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                  {payload?.chair?.manuelBarberName}
                </Text>
                {payload?.chair?.manuelBarberType !== undefined && (
                  <Text className="text-[#9ca3af] text-xs mt-0.5">
                    {getBarberTypeName(
                      payload.chair.manuelBarberType as BarberType,
                    )}
                  </Text>
                )}
                {payload?.chair?.manuelBarberRating !== undefined && (
                  <View className="flex-row items-center mt-0.5">
                    <Icon source="star" size={12} color="#fbbf24" />
                    <Text className="text-[#fbbf24] text-xs ml-1">
                      {formatRating(payload.chair.manuelBarberRating)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full mr-2 items-center justify-center"
                style={{ backgroundColor: colors.cardBg2 }}
              >
                <Icon source="seat" size={24} color="#6b7280" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                  {payload.chair?.chairName}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  return null;
};
