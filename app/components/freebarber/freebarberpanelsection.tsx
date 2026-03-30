import React, { useState, useMemo, memo } from "react";
import { View, Dimensions } from "react-native";
import { IconButton } from "react-native-paper";
import { Text } from "../common/Text";
import { PanelEmptyCta } from "../common/PanelEmptyCta";
import { SkeletonComponent } from "../common/skeleton";
import { UnifiedStateManager } from "../common/UnifiedStateManager";
import MotiViewExpand from "../common/motiviewexpand";
import { FreeBarberMineCardComp } from "./freebarberminecard";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { getErrorMessage } from "../../utils/errorHandler";
import { FreeBarberPanelDto } from "../../types";
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
  /** Liste/grid geçişi; verilirse başlık satırında chevron’un solunda gösterilir */
  onToggleLayout?: () => void;
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
    onToggleLayout,
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
        <View className="flex flex-row justify-between items-center mt-1">
          <View className="flex-row items-center gap-2 flex-1 mr-2">
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
            <View className="flex-row items-center shrink-0">
              {onToggleLayout && (
                <IconButton
                  icon={isList ? "format-list-bulleted" : "view-grid-outline"}
                  iconColor="#ffb900"
                  size={20}
                  onPress={onToggleLayout}
                  style={{ margin: 0 }}
                />
              )}
              <MotiViewExpand
                expanded={expandedMineStore}
                onPress={() =>
                  toggleExpand(expandedMineStore, setExpandedMineStore)
                }
                size={20}
              />
            </View>
          )}
        </View>
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
              expanded={expandedMineStore}
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
