import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "react-native-paper";
import { Text } from "../../components/common/Text";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useBottomSheet } from "../../hook/useBottomSheet";
import { FormFreeBarberOperation } from "../../components/freebarber/formfreebarberoper";
import { FreeBarberPanelSection } from "../../components/freebarber/freebarberpanelsection";
import * as Location from "expo-location";
import {
  useGetAllCategoriesQuery,
  useGetFreeBarberMinePanelQuery,
  useGetSettingQuery,
} from "../../store/api";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useFreeBarberLocationTracking } from "../../components/freebarber/FreeBarberLocationProvider";
import { DeferredRender } from "../../components/common/deferredrender";
import { CrudSkeletonComponent } from "../../components/common/crudskeleton";
import { SkeletonComponent } from "../../components/common/skeleton";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import { useFabOverlayWhenSheetOpen } from "../../hook/usePanelMoreFab";
import { useDeferredSheetPresent } from "../../hook/useDeferredSheetPresent";

/**
 * Serbest berberin kendi paneli: arama/filtre yok; liste/yatay geçiş ve üst özet burada.
 */
export default function MyPanelScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeNavigation();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [fgPerm] = Location.useForegroundPermissions();
  const locationStatusForForm = useMemo((): "unknown" | "granted" | "denied" => {
    if (!fgPerm) return "unknown";
    return fgPerm.granted ? "granted" : "denied";
  }, [fgPerm]);

  const {
    data: freeBarber,
    isLoading,
    isError,
    error,
    refetch: refetchFreeBarber,
  } = useGetFreeBarberMinePanelQuery(undefined, { skip: false });

  const { data: allCategories = [] } = useGetAllCategoriesQuery();
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    (allCategories ?? []).forEach((c: any) => {
      if (c?.id && c?.name) map.set(String(c.id), String(c.name));
    });
    return map;
  }, [allCategories]);

  const { data: settingData } = useGetSettingQuery();
  const [isList, setIsList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  const freeBarberPanelSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: false,
    enableOverDrag: false,
    enableHandlePanningGesture: false,
    pressBehavior: "none",
  });
  const ratingsSheet = useBottomSheet({
    snapPoints: ["50%", "85%"],
    enablePanDownToClose: true,
  });

  useFabOverlayWhenSheetOpen(
    freeBarberPanelSheet.isOpen || ratingsSheet.isOpen,
  );

  const [freeBarberId, setFreeBarberId] = useState<string | null>(null);
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);

  const screenWidth = Dimensions.get("window").width;

  const { present: presentFreeBarberPanel } = freeBarberPanelSheet;
  const { schedulePresent: schedulePanelPresent, cancelScheduledPresent: cancelScheduledPanelPresent } =
    useDeferredSheetPresent(presentFreeBarberPanel);

  const dismissFreeBarberPanelSheet = useCallback(() => {
    cancelScheduledPanelPresent();
    freeBarberPanelSheet.dismiss();
  }, [cancelScheduledPanelPresent, freeBarberPanelSheet]);

  const handleOpenPanel = useCallback(
    (id: string | null) => {
      setFreeBarberId(id);
      schedulePanelPresent(100);
    },
    [schedulePanelPresent],
  );

  const { present: presentRatings } = ratingsSheet;
  const { schedulePresent: scheduleRatingsPresent, cancelScheduledPresent: cancelScheduledRatingsPresent } =
    useDeferredSheetPresent(presentRatings);

  const dismissRatingsSheet = useCallback(() => {
    cancelScheduledRatingsPresent();
    setSelectedRatingsTarget(null);
    ratingsSheet.dismiss();
  }, [cancelScheduledRatingsPresent, ratingsSheet]);

  const handlePressRatings = useCallback(
    (targetId: string, targetName: string) => {
      setSelectedRatingsTarget({ targetId, targetName });
      scheduleRatingsPresent(100);
    },
    [scheduleRatingsPresent],
  );

  const onRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    setRefreshing(true);
    try {
      isRefreshingRef.current = true;
      await refetchFreeBarber();
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [refetchFreeBarber]);

  const { isTracking, isUpdating } = useFreeBarberLocationTracking();

  return (
    <View
      className="flex-1 pl-4 pr-2"
      style={{ backgroundColor: colors.screenBg }}
    >
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 4,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            marginTop: 8,
            borderRadius: 999,
            backgroundColor: colors.cardBg,
            overflow: "hidden",
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.borderColor2,
          }}
        >
          <IconButton
            icon="arrow-left"
            iconColor="#FACC15"
            size={20}
            onPress={() => router.back()}
            accessibilityLabel={t("common.goBack")}
            style={{ margin: 0 }}
          />
        </View>
        <Text style={{ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic-Bold', fontSize: 17, marginLeft: 8, flex: 1 }}>
          {t("panel.myPanel")}
        </Text>
        <IconButton
          icon={isList ? "format-list-bulleted" : "view-grid-outline"}
          iconColor="#FACC15"
          size={20}
          onPress={() => setIsList((v) => !v)}
          style={{ margin: 0, marginTop: 8 }}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f05e23" />
        }
      >
        <FreeBarberPanelSection
          isList={isList}
          locationStatus={locationStatusForForm === "denied" ? "error" : locationStatusForForm}
          locationMessage={
            locationStatusForForm === "denied"
              ? t("panel.locationDeniedShort")
              : null
          }
          onOpenPanel={handleOpenPanel}
          onPressRatings={handlePressRatings}
          screenWidth={screenWidth}
          freeBarber={freeBarber}
          isLoading={isLoading}
          isError={isError}
          error={error}
          isUpdating={isUpdating}
          isTracking={isTracking}
          searchQuery=""
          categoryNameById={categoryNameById}
          showImageAnimation={settingData?.data?.showImageAnimation ?? true}
          onRetry={refetchFreeBarber}
        />
      </ScrollView>

      <BottomSheetModal
        ref={freeBarberPanelSheet.ref}
        backdropComponent={freeBarberPanelSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        onChange={freeBarberPanelSheet.handleChange}
        onDismiss={() => {
          cancelScheduledPanelPresent();
          freeBarberPanelSheet.handleDismiss();
        }}
        snapPoints={freeBarberPanelSheet.snapPoints}
        enableOverDrag={freeBarberPanelSheet.enableOverDrag}
        enablePanDownToClose={freeBarberPanelSheet.enablePanDownToClose}
        enableHandlePanningGesture={freeBarberPanelSheet.enableHandlePanningGesture}
      >
        <BottomSheetView className="h-full pt-2">
          <DeferredRender
            active={freeBarberPanelSheet.isOpen}
            placeholder={
              <View className="flex-1 pt-4">
                <CrudSkeletonComponent />
              </View>
            }
          >
            <FormFreeBarberOperation
              freeBarberId={freeBarberId}
              enabled={freeBarberPanelSheet.isOpen}
              onClose={dismissFreeBarberPanelSheet}
              error={error}
              locationStatus={locationStatusForForm}
            />
          </DeferredRender>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={ratingsSheet.ref}
        snapPoints={ratingsSheet.snapPoints}
        enablePanDownToClose={ratingsSheet.enablePanDownToClose}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        backdropComponent={ratingsSheet.makeBackdrop()}
        onChange={(index) => {
          ratingsSheet.handleChange(index);
          if (index < 0) setSelectedRatingsTarget(null);
        }}
        onDismiss={() => {
          cancelScheduledRatingsPresent();
          ratingsSheet.handleDismiss();
        }}
      >
        {selectedRatingsTarget ? (
          <RatingsBottomSheet
            targetId={selectedRatingsTarget.targetId}
            targetName={selectedRatingsTarget.targetName}
            onClose={dismissRatingsSheet}
          />
        ) : (
          <View className="flex-1 pt-4">
            <SkeletonComponent />
          </View>
        )}
      </BottomSheetModal>
    </View>
  );
}
