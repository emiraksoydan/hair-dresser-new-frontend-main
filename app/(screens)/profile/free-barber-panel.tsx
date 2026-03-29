import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "react-native-paper";
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
    enablePanDownToClose: true,
    enableOverDrag: false,
  });
  const ratingsSheet = useBottomSheet({
    snapPoints: ["50%", "85%"],
    enablePanDownToClose: true,
  });

  const [freeBarberId, setFreeBarberId] = useState<string | null>(null);
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);

  const screenWidth = Dimensions.get("window").width;

  const { present: presentFreeBarberPanel } = freeBarberPanelSheet;
  const handleOpenPanel = useCallback(
    (id: string | null) => {
      setFreeBarberId(id);
      setTimeout(() => presentFreeBarberPanel(), 100);
    },
    [presentFreeBarberPanel],
  );

  const { present: presentRatings } = ratingsSheet;
  const handlePressRatings = useCallback(
    (targetId: string, targetName: string) => {
      setSelectedRatingsTarget({ targetId, targetName });
      setTimeout(() => presentRatings(), 100);
    },
    [presentRatings],
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
            iconColor="#ffb900"
            size={22}
            onPress={() => router.back()}
            accessibilityLabel={t("common.goBack")}
            style={{ margin: 0 }}
          />
        </View>
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
          onToggleLayout={() => setIsList((v) => !v)}
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
        snapPoints={freeBarberPanelSheet.snapPoints}
        enableOverDrag={freeBarberPanelSheet.enableOverDrag}
        enablePanDownToClose={freeBarberPanelSheet.enablePanDownToClose}
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
              onClose={() => freeBarberPanelSheet.dismiss()}
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
      >
        {selectedRatingsTarget ? (
          <RatingsBottomSheet
            targetId={selectedRatingsTarget.targetId}
            targetName={selectedRatingsTarget.targetName}
            onClose={() => {
              setSelectedRatingsTarget(null);
              ratingsSheet.dismiss();
            }}
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
