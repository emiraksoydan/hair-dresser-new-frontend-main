import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { View, TouchableOpacity } from "react-native";

import { Text } from "../common/Text";
import { FreeBarGetDto, FavoriteTargetType, BarberStoreMineDto } from "../../types";
import { useFavoriteToggle } from "../../hook/useFavoriteToggle";
import { useCallFreeBarberMutation } from "../../store/api";
import { CardServicesPackagesSection } from "../common/CardServicesPackagesSection";
import { Icon, TextInput } from "react-native-paper";
import { useLanguage } from "../../hook/useLanguage";
import { useCategoryHierarchy } from "../../hook/useCategoryHierarchy";
import { CardImage } from "../common/CardImage";
import { CardHeader } from "../common/CardHeader";
import { FavoriteButton } from "../common/FavoriteButton";
import { ENTITY_NUMBER } from "../../constants/entityDisplay";
import { RatingSection } from "../common/RatingSection";
import { StatusBadge } from "../common/StatusBadge";
import { ServiceOfferingsList } from "../common/ServiceOfferingsList";
import { TypeLabel } from "../common/TypeLabel";
import { getShortBarberTypeLabel } from "../../utils/card-helpers";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { PanelImageOverflowMenu } from "../panel/PanelImageOverflowMenu";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSubscriptionGuard } from "../../hook/useSubscriptionGuard";
import { useAppDispatch } from "../../store/hook";
import { requestAppointmentListTab } from "../../store/appointmentUiSlice";
import { AppointmentFilter } from "../../types/appointment";
import { COLORS } from "../../constants/colors";
import { BottomSheetModal, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useBottomSheet } from "../../hook/useBottomSheet";
import { getErrorMessage } from "../../utils/errorHandler";

type Props = {
  freeBarber: FreeBarGetDto;
  isList: boolean;
  expanded: boolean;
  cardWidthFreeBarber: number;
  typeLabel?: string;
  typeLabelColor?: string;
  onPressUpdate?: (freeBarber: FreeBarGetDto) => void;
  onPressAppointment?: (freeBarber: FreeBarGetDto) => void;
  mode?: "default" | "barbershop";
  onPressRatings?: (freeBarberId: string, freeBarberName: string) => void;
  onCallFreeBarber?: (freeBarberId: string) => void;
  /** Tek dükkan için geriye dönük uyumluluk. `mineStores` verilirse önceliği alır. */
  storeId?: string;
  /** Birden fazla dükkan olduğunda seçim sheet'i gösterilir. */
  mineStores?: BarberStoreMineDto[];
  showImageAnimation?: boolean;
  panelCompare?: { selected: boolean; onPress: () => void; hidden?: boolean };
  compactMeta?: boolean;
  disableImageNavigation?: boolean;
};

/** “Berberi çağır” / “Randevu al” — tema sarısı (#FACC15), kenarlık yok, siyah metin */
const CHIP_CTA_TEXT = COLORS.UI.TEXT_ON_GOLD;

const chipCallStyle = {
  backgroundColor: COLORS.UI.ACCENT_GOLD,
};

const chipBookStyle = {
  backgroundColor: COLORS.UI.ACCENT_GOLD,
};

const FreeBarberCard: React.FC<Props> = ({
  freeBarber,
  isList,
  expanded,
  cardWidthFreeBarber,
  typeLabel,
  typeLabelColor = "bg-green-500",
  onPressUpdate,
  onPressAppointment,
  mode = "default",
  onPressRatings,
  onCallFreeBarber,
  storeId,
  mineStores,
  showImageAnimation = true,
  panelCompare,
  compactMeta = false,
  disableImageNavigation = false,
}) => {
  const { colors, isDark } = useTheme();
  const carouselWidth = Math.max(0, cardWidthFreeBarber - 20);
  const { t } = useLanguage();
  const { alertSuccess, alertError, confirm } = useAlert();
  const dispatch = useAppDispatch();
  const guard = useActionGuard();
  const { withSubscription } = useSubscriptionGuard();
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
    if (disableImageNavigation) return;
    onPressUpdate?.(freeBarber);
  }, [disableImageNavigation, onPressUpdate, freeBarber]);

  const handlePressAppointment = useCallback(() => {
    if (onPressAppointment) {
      onPressAppointment(freeBarber);
      return;
    }
    handlePressCard();
  }, [onPressAppointment, freeBarber, handlePressCard]);

  const handlePressRatings = useCallback(() => {
    onPressRatings?.(freeBarber.id, freeBarber.fullName);
  }, [onPressRatings, freeBarber.id, freeBarber.fullName]);

  useEffect(() => {
    if (previousAvailableRef.current === false && isAvailable) {
      setHasCalled(false);
    }
    previousAvailableRef.current = isAvailable;
  }, [isAvailable]);

  const myStoreSelectionSheet = useBottomSheet({
    snapPoints: ["50%", "95%"],
    enablePanDownToClose: true,
  });

  const [selectedMyStoreId, setSelectedMyStoreId] = useState<string | null>(null);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");

  const effectiveStores: BarberStoreMineDto[] = useMemo(() => {
    if (mineStores && mineStores.length > 0) return mineStores;
    return [];
  }, [mineStores]);

  const filteredStores = useMemo(() => {
    const query = storeSearchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return effectiveStores;
    return effectiveStores.filter((store) => {
      const name = store.storeName?.toLocaleLowerCase("tr-TR") ?? "";
      const address = store.addressDescription?.toLocaleLowerCase("tr-TR") ?? "";
      return name.includes(query) || address.includes(query);
    });
  }, [effectiveStores, storeSearchQuery]);

  const doCallFreeBarber = useCallback(async (targetStoreId: string) => {
    const targetStore = effectiveStores.find((s) => s.id === targetStoreId);
    if (targetStore && !targetStore.isOpenNow) {
      alertError(t("common.error"), t("errors.storeNotOpen"));
      return;
    }
    if (!isAvailable) {
      alertError(t("common.error"), t("booking.freebarberNotAvailable"));
      return;
    }
    const freeBarberUserId = freeBarber.freeBarberUserId;
    if (!freeBarberUserId) {
      alertError(t("common.error"), t("booking.freebarberUserNotFound"));
      return;
    }
    const callResult = await callFreeBarber({ storeId: targetStoreId, freeBarberUserId });
    if ("error" in callResult) {
      const errorMessage = (callResult.error as any)?.data?.message || t("booking.barberCallFailed");
      alertError(t("common.error"), errorMessage);
      return;
    }
    setHasCalled(true);
    dispatch(requestAppointmentListTab({ filter: AppointmentFilter.Pending }));
    alertSuccess(t("common.success"), t("booking.barberCalled"));
    onCallFreeBarber?.(freeBarber.id);
  }, [
    effectiveStores,
    isAvailable,
    freeBarber.freeBarberUserId,
    freeBarber.id,
    callFreeBarber,
    alertError,
    alertSuccess,
    dispatch,
    onCallFreeBarber,
    t,
  ]);

  const handleCallFreeBarber = useCallback(() => {
    // mineStores yoksa eski storeId prop'una bak
    if (effectiveStores.length === 0 && !storeId) {
      alertError(t("common.error"), t("booking.selectStoreFirst"));
      return;
    }

    if (effectiveStores.length > 1) {
      setStoreSearchQuery("");
      myStoreSelectionSheet.present();
      return;
    }

    const targetStoreId = effectiveStores.length === 1 ? effectiveStores[0].id : storeId!;

    confirm(
      t("booking.callBarber"),
      t("card.callBarberConfirm", { name: freeBarber.fullName }),
      () => withSubscription(() => guard(async () => {
        await doCallFreeBarber(targetStoreId);
      })),
      undefined,
      t("booking.callBarber"),
      t("common.cancel"),
    );
  }, [
    guard,
    withSubscription,
    effectiveStores,
    storeId,
    freeBarber.fullName,
    myStoreSelectionSheet,
    doCallFreeBarber,
    confirm,
    alertError,
    t,
  ]);
  return (
    <>
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
                  className="flex-row items-center px-2 py-0.5 rounded-xl"
                  style={chipCallStyle}
                >
                  <Text
                    className="text-sm font-century-gothic-sans-medium"
                    style={{ color: CHIP_CTA_TEXT }}
                  >
                    {isCalling ? t("card.calling") : t("card.callBarber")}
                  </Text>
                </TouchableOpacity>
              )}
              {mode !== "barbershop" && (
                <TouchableOpacity
                  onPress={handlePressAppointment}
                  activeOpacity={0.8}
                  className="rounded-full px-2 py-0.5"
                  style={chipBookStyle}
                >
                  <Text
                    className="font-century-gothic-sans-semibold text-sm"
                    style={{ color: CHIP_CTA_TEXT }}
                  >
                    {t("card.bookAppointment")}
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
                  socialOwnerType={1}
                  socialOwnerId={freeBarber.id}
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
                </View>
              )}
            </View>

            <View
              className={`flex-1 flex-col ${isList ? "gap-2" : "gap-1"}`}
              style={{ marginTop: isList ? 8 : 0 }}
            >
              <View
                className={`flex-row justify-between ${!isList ? "items-start" : "items-center"} gap-2`}
              >
                {isList ? (
                  <View className="flex-1 flex-row items-center min-w-0 pr-1" style={{ flexWrap: "nowrap", gap: 6 }}>
                    <View style={{ flexShrink: 1, minWidth: 0 }}>
                      <CardHeader
                        title={freeBarber.fullName}
                        isList={isList}
                        barberType={freeBarber.type}
                        compact={compactMeta}
                        fillRow={false}
                      />
                    </View>
                    {mode === "barbershop" && isAvailable && !hasCalled && (
                      <TouchableOpacity
                        onPress={handleCallFreeBarber}
                        disabled={isCalling}
                        className="flex-row items-center rounded-full px-2.5 py-1 flex-shrink-0"
                        style={chipCallStyle}
                      >
                        <Text
                          className="font-century-gothic-sans-semibold text-sm"
                          style={{ color: CHIP_CTA_TEXT }}
                        >
                          {isCalling ? t("card.calling") : t("card.callBarber")}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {mode !== "barbershop" && (
                      <TouchableOpacity
                        onPress={handlePressAppointment}
                        activeOpacity={0.8}
                        className="rounded-full px-2.5 py-1 flex-shrink-0"
                        style={chipBookStyle}
                      >
                        <Text
                          className="font-century-gothic-sans-semibold text-sm"
                          style={{ color: CHIP_CTA_TEXT }}
                        >
                          {t("card.bookAppointment")}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <CardHeader
                    title={freeBarber.fullName}
                    isList={isList}
                    barberType={freeBarber.type}
                    compact={compactMeta}
                  />
                )}
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
                  <Text style={{ color: colors.textSecondary, fontSize: compactMeta ? ENTITY_NUMBER.cardCompact : ENTITY_NUMBER.cardNormal, fontFamily: 'CenturyGothic' }}>
                    {t('card.freeBarberNumber')}{': #'}{freeBarber.customerNumber}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <CardServicesPackagesSection
            ownerId={freeBarber.id}
            expanded={expanded}
            className={compactMeta ? "mt-2" : "mt-4"}
            renderServices={
              <>
                {mainOfferings.length > 0 && (
                  <ServiceOfferingsList
                    offerings={mainOfferings}
                    layout="vertical"
                    previewCount={3}
                    showExpandButton
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
                      showExpandButton
                    />
                  </View>
                )}
              </>
            }
          />
        </View>
      </View>
    </View>

    <BottomSheetModal
      ref={myStoreSelectionSheet.ref}
      stackBehavior="push"
      index={0}
      snapPoints={myStoreSelectionSheet.snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={myStoreSelectionSheet.enablePanDownToClose}
      handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
      backgroundStyle={{ backgroundColor: colors.sheetBg }}
      backdropComponent={myStoreSelectionSheet.makeBackdrop()}
      onChange={myStoreSelectionSheet.handleChange}
    >
      <Text
        className="text-lg mb-1 mt-2"
        style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", paddingHorizontal: 16 }}
      >
        {t("navigation.shops")}
      </Text>
      <Text className="text-sm mb-3" style={{ color: colors.textSecondary, paddingHorizontal: 16 }}>
        {t("booking.selectStoreFirst")}
      </Text>
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <TextInput
          value={storeSearchQuery}
          onChangeText={setStoreSearchQuery}
          mode="outlined"
          dense
          placeholder={t("common.searchPlaceholder")}
          left={<TextInput.Icon icon="magnify" />}
          right={
            storeSearchQuery.length > 0 ? (
              <TextInput.Icon icon="close" onPress={() => setStoreSearchQuery("")} />
            ) : undefined
          }
          textColor={colors.sectionHeaderText}
          outlineColor={colors.borderColor}
          activeOutlineColor="#3b82f6"
          placeholderTextColor={colors.textSecondary}
          style={{ backgroundColor: colors.cardBg2 }}
          theme={{
            roundness: 12,
            colors: {
              onSurfaceVariant: colors.textSecondary,
              primary: "#3b82f6",
            },
          }}
        />
      </View>
      <BottomSheetFlatList<BarberStoreMineDto>
        data={filteredStores}
        keyExtractor={(s: BarberStoreMineDto) => s.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListEmptyComponent={
          <View className="items-center py-8">
            <Icon source="store-search-outline" size={28} color={colors.textSecondary} />
            <Text className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
              {t("common.noSearchResults")}
            </Text>
          </View>
        }
        renderItem={({ item }: { item: BarberStoreMineDto }) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedMyStoreId(item.id);
              myStoreSelectionSheet.dismiss();
              void guard(async () => {
                try {
                  await doCallFreeBarber(item.id);
                } catch (error: any) {
                  const errorMsg = getErrorMessage(error);
                  if (errorMsg) alertError(t("common.error"), errorMsg);
                }
              });
            }}
            className="rounded-xl px-3 py-3 mb-2 border"
            style={{
              backgroundColor: colors.cardBg2,
              borderColor: selectedMyStoreId === item.id ? "#3b82f6" : colors.borderColor,
              borderWidth: selectedMyStoreId === item.id ? 2 : 1,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text
                className="text-base flex-1 mr-2"
                style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold" }}
                numberOfLines={2}
              >
                {item.storeName}
              </Text>
              <View
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: item.isOpenNow
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.15)",
                }}
              >
                <Text
                  className="text-xs"
                  style={{
                    color: item.isOpenNow ? "#22c55e" : "#ef4444",
                    fontFamily: "CenturyGothic-Bold",
                  }}
                >
                  {item.isOpenNow ? t("status.open") : t("status.closed")}
                </Text>
              </View>
            </View>
            {item.addressDescription ? (
              <Text
                className="text-xs mt-1"
                style={{ color: colors.textSecondary }}
                numberOfLines={2}
              >
                {item.addressDescription}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </BottomSheetModal>
    </>
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
    prev.mineStores === next.mineStores &&
    prev.onPressUpdate === next.onPressUpdate &&
    prev.onPressAppointment === next.onPressAppointment &&
    prev.onPressRatings === next.onPressRatings &&
    prev.onCallFreeBarber === next.onCallFreeBarber &&
    prev.showImageAnimation === next.showImageAnimation &&
    prev.panelCompare?.selected === next.panelCompare?.selected &&
    prev.panelCompare?.hidden === next.panelCompare?.hidden &&
    prev.panelCompare?.onPress === next.panelCompare?.onPress;

  return sameFreeBarber && sameProps;
});
