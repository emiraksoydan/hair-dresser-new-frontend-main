import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { View, TouchableOpacity } from "react-native";

import { Text } from "../common/Text";
import { FreeBarGetDto, FavoriteTargetType } from "../../types";
import { useFavoriteToggle } from "../../hook/useFavoriteToggle";
import { useCallFreeBarberMutation, useLazyGetServicePackagesByOwnerQuery } from "../../store/api";
import { Icon } from "react-native-paper";
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
  const { colors, isDark } = useTheme();
  const carouselWidth = Math.max(0, cardWidthFreeBarber - 20);
  const { t } = useLanguage();
  const { alertSuccess, alertError, confirm } = useAlert();
  const guard = useActionGuard();
  const { getAllServicesForType } = useCategoryHierarchy({});
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
  const [triggerGetPackages, { data: packagesData, isFetching: packagesFetching }] = useLazyGetServicePackagesByOwnerQuery();
  const fbPackages = packagesData ?? [];

  const handleTabPress = useCallback((tab: 'services' | 'packages') => {
    setActiveTab(tab);
    if (tab === 'packages' && !packagesData) {
      triggerGetPackages(freeBarber.id);
    }
  }, [freeBarber.id, packagesData, triggerGetPackages]);

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

            <View
              className={`flex-1 flex-col ${isList ? "gap-2" : "gap-1"}`}
              style={{ marginTop: isList ? 8 : 0 }}
            >
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
                <View className="flex-row items-center">
                  <Text style={{ color: colors.textSecondary, fontSize: compactMeta ? 10 : 11, fontFamily: 'CenturyGothic' }}>
                    {t('card.freeBarberNumber')}{': #'}{freeBarber.customerNumber}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View className={`rounded-xl pr-2 ${compactMeta ? "mt-2" : "mt-4"}`}>
            {/* Hizmetler / Paketler Tab */}
            <View className="flex-row mb-2 rounded-lg overflow-hidden" style={{ backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor }}>
              <TouchableOpacity
                onPress={() => handleTabPress('services')}
                activeOpacity={0.7}
                className="flex-1 py-2 items-center flex-row justify-center gap-1"
                style={{ backgroundColor: activeTab === 'services' ? (isDark ? 'rgba(96,165,250,0.18)' : 'rgba(96,165,250,0.12)') : 'transparent' }}
              >
                <Icon source="scissors-cutting" size={14} color={activeTab === 'services' ? '#60a5fa' : colors.textSecondary} />
                <Text style={{ fontSize: 13, fontFamily: 'CenturyGothic-Bold', color: activeTab === 'services' ? '#60a5fa' : colors.textSecondary }}>
                  {t('common.services')}
                </Text>
              </TouchableOpacity>
              <View style={{ width: 1, backgroundColor: colors.borderColor }} />
              <TouchableOpacity
                onPress={() => handleTabPress('packages')}
                activeOpacity={0.7}
                className="flex-1 py-2 items-center flex-row justify-center gap-1"
                style={{ backgroundColor: activeTab === 'packages' ? (isDark ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.12)') : 'transparent' }}
              >
                <Icon source="tag-multiple-outline" size={14} color={activeTab === 'packages' ? '#a78bfa' : colors.textSecondary} />
                <Text style={{ fontSize: 13, fontFamily: 'CenturyGothic-Bold', color: activeTab === 'packages' ? '#a78bfa' : colors.textSecondary }}>
                  {t('servicePackage.tabPackages')}
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'services' && (
              <>
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
              </>
            )}
            {activeTab === 'packages' && (
              packagesFetching ? (
                <View className="py-4 items-center">
                  <Icon source="loading" size={20} color={colors.textSecondary} />
                </View>
              ) : (fbPackages as any[]).length === 0 ? (
                <View className="py-3 items-center">
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontFamily: 'CenturyGothic' }}>
                    {t('servicePackage.noPackagesYet')}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 6 }}>
                  {(fbPackages as any[]).slice(0, 3).map((pkg: any) => (
                    <View key={pkg.id} className="px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: isDark ? 'rgba(167,139,250,0.25)' : 'rgba(167,139,250,0.2)' }}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                          <Icon source="tag-multiple-outline" size={14} color="#a78bfa" />
                          <Text style={{ fontFamily: 'CenturyGothic-Bold', fontSize: 14, color: colors.sectionHeaderText, flex: 1 }} numberOfLines={1}>
                            {pkg.packageName}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: 'CenturyGothic-Bold', fontSize: 14, color: '#a78bfa' }}>
                          {pkg.totalPrice} {t('card.currencySymbol')}
                        </Text>
                      </View>
                      {(pkg.items ?? []).length > 0 && (
                        <Text style={{ fontFamily: 'CenturyGothic', fontSize: 12, color: colors.textSecondary, marginTop: 3, marginLeft: 20 }} numberOfLines={1}>
                          {(pkg.items as any[]).map((i: any) => i.serviceName).join(' · ')}
                        </Text>
                      )}
                    </View>
                  ))}
                  {(fbPackages as any[]).length > 3 && (
                    <Text style={{ fontSize: 12, fontFamily: 'CenturyGothic', color: '#a78bfa', textAlign: 'center', paddingVertical: 4 }}>
                      {t('servicePackage.morePackages', { count: (fbPackages as any[]).length - 3 })}
                    </Text>
                  )}
                </View>
              )
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
