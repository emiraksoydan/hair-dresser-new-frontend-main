import React, { useState, useMemo, memo } from "react";
import { View, Dimensions } from "react-native";
import { Text } from "../common/Text";
import { Button } from "../common/Button";
import { SkeletonComponent } from "../common/skeleton";
import { LottieViewComponent } from "../common/lottieview";
import MotiViewExpand from "../common/motiviewexpand";
import { FreeBarberMineCardComp } from "./freebarberminecard";
import { useGetFreeBarberMinePanelQuery } from "../../store/api";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { getErrorMessage } from "../../utils/errorHandler";
import { FreeBarberPanelDto } from "../../types";
import { useTrackFreeBarberLocation } from "../../hook/useTrackFreeBarberLocation";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";

interface Props {
  isList: boolean;
  locationStatus: string;
  locationMessage: string | null;
  onOpenPanel: (id: string | null) => void;
  onPressRatings?: (freeBarberId: string, freeBarberName: string) => void;
  screenWidth: number;
  freeBarber?: FreeBarberPanelDto;
  isLoading: boolean;
  isError: boolean;
  error: any;
  isTracking: boolean;
  isUpdating: boolean;
  searchQuery?: string;
  categoryNameById?: Map<string, string>;
  showImageAnimation?: boolean;
  onRetry?: () => void;
}

// React.memo ile sarmaladık. Sadece props değişirse render olur.
export const FreeBarberPanelSection = memo(
  ({
    isList,
    locationStatus,
    locationMessage,
    onOpenPanel,
    onPressRatings,
    screenWidth,
    freeBarber,
    isLoading,
    isError,
    error,
    isTracking,
    isUpdating,
    searchQuery = "",
    categoryNameById,
    showImageAnimation = true,
    onRetry,
  }: Props) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const [expandedMineStore, setExpandedMineStore] = useState(true);
    const hasMineFreeBarber = !isLoading && freeBarber?.fullName != null;
    const cardWidthFreeBarber = useMemo(
      () => (expandedMineStore ? screenWidth * 0.92 : screenWidth * 0.94),
      [expandedMineStore, screenWidth],
    );

    // Basit filtre kontrolü - sadece searchQuery
    const shouldShow = useMemo(() => {
      if (!freeBarber) return true;
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      const fullName = freeBarber.fullName?.toLowerCase() || "";

      return fullName.includes(query);
    }, [freeBarber, searchQuery]);

    // Filtre sonucu gösterilmemeli ise null dön
    if (hasMineFreeBarber && !shouldShow) {
      return null;
    }

    return (
      <>
        <View className="flex flex-row justify-between items-center mt-4">
          <View className="flex-row items-center gap-2">
            <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-sans-regular text-xl">
              {t("panel.myPanel")}
            </Text>
            {hasMineFreeBarber && isTracking && (
              <View
                className={`w-2 h-2 rounded-full ${isUpdating ? "bg-yellow-400" : "bg-green-500"}`}
              />
            )}
          </View>

          {hasMineFreeBarber && (
            <MotiViewExpand
              expanded={expandedMineStore}
              onPress={() =>
                toggleExpand(expandedMineStore, setExpandedMineStore)
              }
            />
          )}
        </View>
        {isLoading ? (
          <View className="flex-1 pt-4">
            {Array.from({ length: 1 }).map((_, i) => (
              <SkeletonComponent key={i} />
            ))}
          </View>
        ) : !hasMineFreeBarber ? (
          <View style={{ backgroundColor: colors.cardBg }} className="rounded-xl mt-2">
            <LottieViewComponent message={t("empty.noPanelAdded")} />
            <Button
              style={{ marginTop: -10, marginBottom: 10, marginHorizontal: 10 }}
              buttonColor="#ffb900"
              mode="contained"
              icon={"plus"}
              onPress={() => onOpenPanel(null)}
            >
              {t("common.add")}
            </Button>
          </View>
        ) : locationStatus === "error" ? (
          <LottieViewComponent
            animationSource={require("../../../assets/animations/Location.json")}
            message={locationMessage!}
          />
        ) : isError ? (
          <LottieViewComponent
            animationSource={require("../../../assets/animations/error.json")}
            message={getErrorMessage(error)}
            onRetry={onRetry}
          />
        ) : (
          <View key={freeBarber?.id}>
            <FreeBarberMineCardComp
              freeBarber={freeBarber as FreeBarberPanelDto}
              isList={isList}
              expanded={expandedMineStore}
              cardWidthFreeBarber={cardWidthFreeBarber}
              onPressUpdate={(barber) => onOpenPanel(barber.id)}
              onPressRatings={onPressRatings}
              showImageAnimation={showImageAnimation}
            />
          </View>
        )}
      </>
    );
  },
);
