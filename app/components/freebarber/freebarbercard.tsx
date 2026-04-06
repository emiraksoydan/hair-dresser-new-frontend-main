import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { View, TouchableOpacity } from "react-native";

import { Text } from "../common/Text";
import { FreeBarGetDto, FavoriteTargetType } from "../../types";
import { useFavoriteToggle } from "../../hook/useFavoriteToggle";
import { useCallFreeBarberMutation } from "../../store/api";
import { useLanguage } from "../../hook/useLanguage";
import { useCategoryHierarchy } from "../../hook/useCategoryHierarchy";
import { CardImage } from "../common/CardImage";
import { CardHeader } from "../common/CardHeader";
import { FavoriteButton } from "../common/FavoriteButton";
import { RatingSection } from "../common/RatingSection";
import { StatusBadge } from "../common/StatusBadge";
import { ServiceOfferingsList } from "../common/ServiceOfferingsList";
import { TypeLabel } from "../common/TypeLabel";
import { getShortBarberTypeLabel } from "../../utils/card-helpers";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { PanelImageOverflowMenu } from "../panel/PanelImageOverflowMenu";
import { useActionGuard } from "../../hook/useActionGuard";

type Props = {
  freeBarber: FreeBarGetDto;
  isList: boolean;
  expanded: boolean;
  cardWidthFreeBarber: number;
  typeLabel?: string;
  typeLabelColor?: string;
  onPressUpdate?: (freeBarber: FreeBarGetDto) => void;
  mode?: "default" | "barbershop";
  onPressRatings?: (freeBarberId: string, freeBarberName: string) => void;
  onCallFreeBarber?: (freeBarberId: string) => void;
  storeId?: string;
  showImageAnimation?: boolean;
  panelCompare?: { selected: boolean; onPress: () => void; hidden?: boolean };
  compactMeta?: boolean;
};

const FreeBarberCard: React.FC<Props> = ({
  freeBarber,
  isList,
  expanded,
  cardWidthFreeBarber,
  typeLabel,
  typeLabelColor = "bg-green-500",
  onPressUpdate,
  mode = "default",
  onPressRatings,
  onCallFreeBarber,
  storeId,
  showImageAnimation = true,
  panelCompare,
  compactMeta = false,
}) => {
  const { colors } = useTheme();
  const carouselWidth = Math.max(0, cardWidthFreeBarber - 20);
  const { t } = useLanguage();
  const { alertSuccess, alertError, confirm } = useAlert();
  const guard = useActionGuard();
  const { getAllServicesForType } = useCategoryHierarchy({});

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
  const [callFreeBarber, { isLoading: isCalling }] =
    useCallFreeBarberMutation();
  const [hasCalled, setHasCalled] = useState(false);
  const previousAvailableRef = useRef<boolean | null>(null);

  const isAvailable = freeBarber.isAvailable ?? true;

  const { isFavorite, favoriteCount, isLoading, favoriteDisabled, toggleFavorite } =
    useFavoriteToggle({
      targetId: freeBarber.id,
      targetType: FavoriteTargetType.FreeBarber,
      initialIsFavorite: freeBarber.isFavorited ?? false,
      initialFavoriteCount: freeBarber.favoriteCount || 0,
      skipQuery: true, // FreeBarberCard uses isFavorited from props
      counterpartyUserId: freeBarber.freeBarberUserId ?? null,
    });

  const handlePressCard = useCallback(() => {
    onPressUpdate?.(freeBarber);
  }, [onPressUpdate, freeBarber]);

  const handlePressRatings = useCallback(() => {
    onPressRatings?.(freeBarber.id, freeBarber.fullName);
  }, [onPressRatings, freeBarber.id, freeBarber.fullName]);

  useEffect(() => {
    if (previousAvailableRef.current === false && isAvailable) {
      setHasCalled(false);
    }
    previousAvailableRef.current = isAvailable;
  }, [isAvailable]);

  const handleCallFreeBarber = useCallback(async () => {
    if (!storeId) {
      // Multi-store selection needed -> Go to detail view
      onPressUpdate?.(freeBarber);
      return;
    }

    confirm(
      t("booking.callBarber"),
      t("card.callBarberConfirm", { name: freeBarber.fullName }),
      () => guard(async () => {
        const freeBarberUserId = freeBarber.freeBarberUserId;
        if (!freeBarberUserId) {
          alertError(
            t("common.error"),
            t("booking.freebarberUserNotFound"),
          );
          return;
        }

        const callResult = await callFreeBarber({
          storeId,
          freeBarberUserId,
        });
        if ("error" in callResult) {
          const errorMessage =
            (callResult.error as any)?.data?.message ||
            t("booking.barberCallFailed");
          alertError(t("common.error"), errorMessage);
          return;
        }
        setHasCalled(true);
        alertSuccess(t("common.success"), t("booking.barberCalled"));
        if (onCallFreeBarber) {
          onCallFreeBarber(freeBarber.id);
        }
      }),
      undefined,
      t("booking.callBarber"),
      t("common.cancel"),
    );
  }, [
    guard,
    storeId,
    freeBarber.id,
    freeBarber.fullName,
    callFreeBarber,
    onCallFreeBarber,
    confirm,
    alertError,
    alertSuccess,
    t,
  ]);
  return (
    <View
      style={{ width: cardWidthFreeBarber, marginBottom: 12 }}
      className="mt-4"
    >
      <View
        style={{
          borderRadius: 12,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.borderColor2,
        }}
      >
        <View
          className={` ${!isList ? "pl-4 py-2 rounded-lg" : "rounded-xl px-3 pt-3 pb-4"}`}
          style={{ backgroundColor: colors.cardBg }}
        >
          {!isList && (
            <View className="flex-row justify-end items-center gap-1 px-2 pb-2">
              {hasBeautySalonCertificate && (
                <View className="bg-purple-600/90 rounded-xl px-2 py-0.5 flex-row items-center justify-center">
                  <Text className="text-white font-century-gothic-sans-medium text-sm">
                    {t("card.beautyExpert")}
                  </Text>
                </View>
              )}
              <StatusBadge
                type={isAvailable ? "available" : "busy"}
                isList={false}
              />
              {mode === "barbershop" && isAvailable && !hasCalled && (
                <TouchableOpacity
                  onPress={handleCallFreeBarber}
                  disabled={isCalling}
                  className="bg-[#ffb900] flex-row items-center px-2 py-0.5 rounded-xl"
                >
                  <Text className="text-white text-sm font-century-gothic-sans-medium">
                    {isCalling ? t("card.calling") : t("card.callBarber")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View className={isList ? "" : "flex flex-row"}>
            <View className="relative mr-2">
              <CardImage
                images={freeBarber.imageList}
                onPress={handlePressCard}
                isList={isList}
                width={isList ? carouselWidth : 112}
                height={isList ? 250 : 112}
                autoPlay={showImageAnimation}
              />
              {isList && (
                <PanelImageOverflowMenu
                  images={freeBarber.imageList}
                  panelCompare={panelCompare ?? undefined}
                  galleryTitle={freeBarber.fullName}
                />
              )}
              {isList && (
                <View
                  className="absolute top-2 left-2 right-2 z-10 flex-row flex-wrap justify-end items-center gap-2"
                  pointerEvents="box-none"
                >
                  {hasBeautySalonCertificate && (
                    <View className="bg-purple-600/90 rounded-xl self-start max-w-full px-2.5 py-1 flex-row items-center justify-center">
                      <Text className="text-white font-century-gothic-sans-medium text-sm">
                        {t("card.beautyExpert")}
                      </Text>
                    </View>
                  )}
                  {typeLabel && (
                    <TypeLabel
                      label={typeLabel}
                      color={typeLabelColor}
                      compact
                    />
                  )}
                  <StatusBadge
                    type="barber-type"
                    barberType={freeBarber.type}
                    isList={true}
                  />
                  <StatusBadge
                    type={isAvailable ? "available" : "busy"}
                    isList={true}
                  />
                  {mode === "barbershop" && isAvailable && !hasCalled && (
                    <TouchableOpacity
                      onPress={handleCallFreeBarber}
                      disabled={isCalling}
                      className="bg-[#ffb900] flex-row items-center rounded-full px-2.5 py-1"
                    >
                      <Text className="text-white font-century-gothic-sans-semibold text-sm">
                        {isCalling ? t("card.calling") : t("card.callBarber")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <View className="flex-1 flex-col gap-1">
              <View
                className={`flex-row justify-between ${!isList ? "items-start" : "items-center"}`}
              >
                <CardHeader
                  title={freeBarber.fullName}
                  isList={isList}
                  barberType={freeBarber.type}
                  compact={compactMeta}
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
                <View className="flex-row justify-between pr-2">
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-century-gothic-sans-medium">
                    {getShortBarberTypeLabel(freeBarber.type)}
                  </Text>
                  <FavoriteButton
                    isFavorite={isFavorite}
                    favoriteCount={favoriteCount}
                    isLoading={isLoading}
                    favoriteDisabled={favoriteDisabled}
                    onPress={toggleFavorite}
                    variant="button"
                  />
                </View>
              )}

              <View
                className="flex-row justify-between items-center"
              >
                <RatingSection
                  rating={freeBarber.rating}
                  reviewCount={freeBarber.reviewCount}
                  onPressRatings={handlePressRatings}
                  compact={compactMeta}
                />
              </View>
              {freeBarber.customerNumber && (
                <View className="flex-row items-center mt-1">
                  <Text style={{ color: colors.textSecondary, fontSize: compactMeta ? 10 : 11, fontFamily: 'CenturyGothic' }}>
                    {t('card.freeBarberNumber')}{': #'}{freeBarber.customerNumber}
                  </Text>
                </View>
              )}
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
                <Text className="text-gray-400 text-sm mb-1.5 font-century-gothic-sans-semibold">
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
      </View>
    </View>
  );
};

export const FreeBarberCardInner = React.memo(FreeBarberCard, (prev, next) => {
  const sameFreeBarber =
    prev.freeBarber.id === next.freeBarber.id &&
    prev.freeBarber.fullName === next.freeBarber.fullName &&
    prev.freeBarber.type === next.freeBarber.type &&
    prev.freeBarber.isAvailable === next.freeBarber.isAvailable &&
    prev.freeBarber.rating === next.freeBarber.rating &&
    prev.freeBarber.reviewCount === next.freeBarber.reviewCount &&
    prev.freeBarber.favoriteCount === next.freeBarber.favoriteCount &&
    (prev.freeBarber.isFavorited ?? false) === (next.freeBarber.isFavorited ?? false) &&
    prev.freeBarber.imageList === next.freeBarber.imageList &&
    prev.freeBarber.offerings === next.freeBarber.offerings &&
    (prev.freeBarber.beautySalonCertificateImageId ?? null) === (next.freeBarber.beautySalonCertificateImageId ?? null);

  const sameProps =
    (prev.compactMeta ?? false) === (next.compactMeta ?? false) &&
    prev.isList === next.isList &&
    prev.expanded === next.expanded &&
    prev.cardWidthFreeBarber === next.cardWidthFreeBarber &&
    prev.typeLabel === next.typeLabel &&
    prev.typeLabelColor === next.typeLabelColor &&
    prev.mode === next.mode &&
    prev.storeId === next.storeId &&
    prev.onPressUpdate === next.onPressUpdate &&
    prev.onPressRatings === next.onPressRatings &&
    prev.onCallFreeBarber === next.onCallFreeBarber &&
    prev.showImageAnimation === next.showImageAnimation &&
    prev.panelCompare?.selected === next.panelCompare?.selected &&
    prev.panelCompare?.hidden === next.panelCompare?.hidden &&
    prev.panelCompare?.onPress === next.panelCompare?.onPress;

  return sameFreeBarber && sameProps;
});
