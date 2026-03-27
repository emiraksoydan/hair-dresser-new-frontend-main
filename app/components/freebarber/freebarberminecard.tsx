// app/components/FreeBarberMineCard.tsx
import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Text } from "../common/Text";
import { FreeBarberPanelDto, FavoriteTargetType } from "../../types";
import { useFavoriteToggle } from "../../hook/useFavoriteToggle";
import { CardImage } from "../common/CardImage";
import { CardHeader } from "../common/CardHeader";
import { FavoriteButton } from "../common/FavoriteButton";
import { RatingSection } from "../common/RatingSection";
import { StatusBadge } from "../common/StatusBadge";
import { ServiceOfferingsList } from "../common/ServiceOfferingsList";
import { getShortBarberTypeLabel } from "../../utils/card-helpers";
import { useUpdateFreeBarberAvailabilityMutation } from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import { useLanguage } from "../../hook/useLanguage";
import { useCategoryHierarchy } from "../../hook/useCategoryHierarchy";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

type Props = {
  freeBarber: FreeBarberPanelDto;
  isList: boolean;
  expanded: boolean;
  cardWidthFreeBarber: number;
  onPressUpdate?: (store: FreeBarberPanelDto) => void;
  onPressRatings?: (freeBarberId: string, freeBarberName: string) => void;
  showImageAnimation?: boolean;
};

const FreeBarberMineCard: React.FC<Props> = ({
  freeBarber,
  isList,
  expanded,
  cardWidthFreeBarber,
  onPressUpdate,
  onPressRatings,
  showImageAnimation = true,
}) => {
  const carouselWidth = Math.max(0, cardWidthFreeBarber - 20);
  const { t } = useLanguage();
  const { getAllServicesForType } = useCategoryHierarchy({});
  const { colors } = useTheme();

  const hasBeautySalonCertificate = Boolean(
    freeBarber.type === 2 || freeBarber.beautySalonCertificateImageId,
  );

  const { mainOfferings, beautyOfferings } = useMemo(() => {
    const offerings = freeBarber.offerings || [];
    if (offerings.length === 0) return { mainOfferings: [], beautyOfferings: [] };
    const beautyNames = new Set(
      getAllServicesForType("Güzellik Salonu").map((s) => s.name),
    );
    const main: typeof offerings = [];
    const beauty: typeof offerings = [];
    offerings.forEach((o) => {
      if (beautyNames.has(o.serviceName)) beauty.push(o);
      else main.push(o);
    });
    return { mainOfferings: main, beautyOfferings: beauty };
  }, [freeBarber.offerings, getAllServicesForType]);

  const { isFavorite, favoriteCount, isLoading, favoriteDisabled, toggleFavorite } =
    useFavoriteToggle({
      targetId: freeBarber.id,
      targetType: FavoriteTargetType.FreeBarber,
      initialFavoriteCount: freeBarber.favoriteCount || 0,
      skipQuery: false,
      counterpartyUserId: freeBarber.freeBarberUserId ?? null,
    });

  const handlePressCard = useCallback(() => {
    onPressUpdate?.(freeBarber);
  }, [onPressUpdate, freeBarber]);

  const handlePressRatings = useCallback(() => {
    onPressRatings?.(freeBarber.id, freeBarber.fullName);
  }, [onPressRatings, freeBarber.id, freeBarber.fullName]);

  const dispatch = useAppDispatch();
  const [updateAvailability, { isLoading: isUpdatingAvailability }] =
    useUpdateFreeBarberAvailabilityMutation();
  const guard = useActionGuard();

  const handleToggleAvailability = useCallback(() => guard(async () => {
    const nextState = !freeBarber.isAvailable;
    const updateResult = await updateAvailability(nextState);
    if ("error" in updateResult) {
      const errorMessage =
        (updateResult.error as any)?.data?.message || "Durum güncellenemedi";
      dispatch(showSnack({ message: errorMessage, isError: true }));
      return;
    }
    const result = updateResult.data;
    dispatch(
      showSnack({
        message: result?.message || "İşlem tamamlandı",
        isError: !result?.success,
      }),
    );
  }), [freeBarber.isAvailable, updateAvailability, dispatch, guard]);

  return (
    <View
      style={{ width: cardWidthFreeBarber, backgroundColor: colors.cardBg }}
      className={`mt-4 ${!isList ? "pl-4 py-2 rounded-lg" : "rounded-xl p-3"
        }`}
    >
      {!isList && (
        <View className="flex-row justify-end items-center gap-1 px-2 pb-1">
          {hasBeautySalonCertificate && (
            <View className="bg-purple-600/90 px-2 py-0.5 rounded-full">
              <Text className="text-white text-xs font-century-gothic-sans-semibold">
                {t("card.beautyExpert")}
              </Text>
            </View>
          )}
          <StatusBadge
            type={freeBarber.isAvailable ? "available" : "busy"}
            isList={false}
          />
        </View>
      )}
      <View className={`${!isList ? "flex flex-row " : ""}`}>
        <View className="relative mr-2">
          <CardImage
            images={freeBarber.imageList}
            onPress={handlePressCard}
            isList={isList}
            width={isList ? carouselWidth : 112}
            height={isList ? 320 : 112}
            autoPlay={showImageAnimation}
            className={!isList ? "mr-2" : ""}
          />
          {isList && (
            <View className="absolute top-3 right-3 flex-row gap-2 z-10">
              {hasBeautySalonCertificate && (
                <View className="bg-purple-600/90 px-2 py-0.5 rounded-full">
                  <Text className="text-white text-sm font-century-gothic-sans-semibold">
                    {t("card.beautyExpert")}
                  </Text>
                </View>
              )}
          <StatusBadge
            type="barber-type"
            barberType={freeBarber.type}
            isList={isList}
          />
              <TouchableOpacity
                onPress={handleToggleAvailability}
                disabled={isUpdatingAvailability}
                style={{ opacity: isUpdatingAvailability ? 0.7 : 1 }}
              >
                {isUpdatingAvailability ? (
                  <View
                    style={{
                      width: 80,
                      height: 24,
                      backgroundColor: colors.cardBg,
                      borderRadius: 12,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <ActivityIndicator size="small" color="#f05e23" />
                  </View>
                ) : (
                  <StatusBadge
                    type={freeBarber.isAvailable ? "available" : "busy"}
                    isList={isList}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View className="flex-1 flex-col gap-2">
          <View
            className={`flex-row justify-between ${!isList ? "items-start" : "items-center"}`}
          >
            <CardHeader
              title={freeBarber.fullName}
              isList={isList}
              barberType={freeBarber.type}
            />
            {isList && (
              <FavoriteButton
                isFavorite={isFavorite}
                favoriteCount={favoriteCount}
                isLoading={isLoading}
                favoriteDisabled={favoriteDisabled}
                onPress={toggleFavorite}
                variant="icon"
                className="pb-2"
              />
            )}
          </View>
          {!isList && (
            <View className="flex-row pr-2 justify-between">
              <Text style={{ color: colors.textSecondary }} className="text-base">
                {getShortBarberTypeLabel(freeBarber.type)}
              </Text>
              <FavoriteButton
                isFavorite={isFavorite}
                favoriteCount={favoriteCount}
                isLoading={isLoading}
                favoriteDisabled={favoriteDisabled}
                onPress={toggleFavorite}
                variant="button"
                className="pb-1"
              />
            </View>
          )}
          <View
            className="flex-row justify-between items-center"
            style={{ marginTop: !isList ? -5 : -10 }}
          >
            <RatingSection
              rating={freeBarber.rating}
              reviewCount={freeBarber.reviewCount}
              onPressRatings={handlePressRatings}
            />
          </View>
        </View>
      </View>
      <View className="rounded-xl pr-2 mt-4">
        {mainOfferings.length > 0 && (
          <ServiceOfferingsList
            offerings={mainOfferings}
            layout="vertical"
            previewCount={3}
            showExpandButton={true}
          />
        )}
        {beautyOfferings.length > 0 && (
          <View className="mt-3">
            <Text style={{ color: colors.textSecondary }} className="text-sm mb-1.5 font-century-gothic-sans-semibold">
              {t("form.beautySalonServices")}
            </Text>
            <ServiceOfferingsList
              offerings={beautyOfferings}
              layout="vertical"
              previewCount={3}
              showExpandButton={true}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export const FreeBarberMineCardComp = React.memo(
  FreeBarberMineCard,
  (prev, next) =>
    prev.freeBarber.id === next.freeBarber.id &&
    prev.freeBarber.favoriteCount === next.freeBarber.favoriteCount &&
    prev.freeBarber.fullName === next.freeBarber.fullName &&
    prev.freeBarber.isAvailable === next.freeBarber.isAvailable &&
    prev.isList === next.isList &&
    prev.expanded === next.expanded &&
    prev.cardWidthFreeBarber === next.cardWidthFreeBarber &&
    prev.showImageAnimation === next.showImageAnimation,
);
