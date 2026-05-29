import React, { useMemo, memo } from "react";
import { View } from "react-native";
import { PanelEmptyCta } from "../common/PanelEmptyCta";
import { SkeletonComponent } from "../common/skeleton";
import { UnifiedStateManager } from "../common/UnifiedStateManager";
import { FreeBarberMineCardComp } from "./FreeBarberMineCard";
import { getErrorMessage } from "../../utils/errorHandler";
import { FreeBarberPanelDto } from "../../types";
import { useLanguage } from "../../hook/useLanguage";

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
    const hasMineFreeBarber = !isLoading && freeBarber?.fullName != null;
    const cardWidthFreeBarber = useMemo(
      () => screenWidth * 0.935,
      [screenWidth],
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
        {isLoading ? (
          <View className="flex-1 pt-4">
            {Array.from({ length: 1 }).map((_, i) => (
              <SkeletonComponent key={i} />
            ))}
          </View>
        ) : !hasMineFreeBarber ? (
          <PanelEmptyCta
            title={t("empty.noPanelAdded")}
            subtitle={t("panel.emptyStateHintFreeBarber")}
            buttonLabel={t("common.add")}
            onPress={() => onOpenPanel(null)}
          />
        ) : locationStatus === "error" ? (
          <View style={{ minHeight: 200, maxHeight: 400 }}>
            <UnifiedStateManager
              locationStatus="unknown"
              state="location-unavailable"
              message={locationMessage ?? undefined}
              onRetry={onRetry}
              loading={false}
              fetchedOnce={true}
              hasData={false}
            />
          </View>
        ) : isError ? (
          <View style={{ minHeight: 200, maxHeight: 400 }}>
            <UnifiedStateManager
              error={error}
              message={getErrorMessage(error)}
              state="error"
              onRetry={onRetry}
              loading={false}
              fetchedOnce={true}
              hasData={false}
            />
          </View>
        ) : (
          <View key={freeBarber?.id}>
            <FreeBarberMineCardComp
              freeBarber={freeBarber as FreeBarberPanelDto}
              isList={isList}
              expanded={true}
              cardWidthFreeBarber={cardWidthFreeBarber}
              onPressUpdate={(barber) => onOpenPanel(barber.id)}
              onPressRatings={onPressRatings}
              showImageAnimation={showImageAnimation}
              profileCompact
            />
          </View>
        )}
      </>
    );
  },
);
