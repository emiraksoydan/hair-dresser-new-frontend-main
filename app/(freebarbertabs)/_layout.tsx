import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import * as Location from "expo-location";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { BaseTabLayout } from "../components/layout/BaseTabLayout";
import { FreeBarberLocationProvider } from "../components/freebarber/FreeBarberLocationProvider";
import { UserType } from "../types";
import { useLanguage } from "../hook/useLanguage";
import { getCommonTabs, panelTabConfigs, accentColors } from "../config/tabConfig";
import { useFullHeightBottomSheet } from "../hook/useBottomSheet";
import { useDeferredSheetPresent } from "../hook/useDeferredSheetPresent";
import { useTheme } from "../hook/useTheme";
import { DeferredRender } from "../components/common/deferredrender";
import { CrudSkeletonComponent } from "../components/common/crudskeleton";
import { FormFreeBarberOperation } from "../components/freebarber/FormFreeBarberOper";
import { useGetFreeBarberMinePanelQuery } from "../store/api";
import { FreeBarberPanelSheetContext } from "../context/FreeBarberPanelSheetContext";

const FreeBarberLayout = () => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [panelTargetId, setPanelTargetId] = useState<string | null>(null);

  const panelSheet = useFullHeightBottomSheet({
    enablePanDownToClose: false,
    enableHandlePanningGesture: false,
    pressBehavior: "none",
  });

  const [fgPerm] = Location.useForegroundPermissions();
  const locationStatusForForm = useMemo((): "unknown" | "granted" | "denied" => {
    if (!fgPerm) return "unknown";
    return fgPerm.granted ? "granted" : "denied";
  }, [fgPerm]);

  const { error: minePanelError } = useGetFreeBarberMinePanelQuery();

  const { present: presentPanelSheet } = panelSheet;
  const { schedulePresent: schedulePanelPresent, cancelScheduledPresent: cancelScheduledPanelPresent } =
    useDeferredSheetPresent(presentPanelSheet);

  const dismissPanelSheet = useCallback(() => {
    cancelScheduledPanelPresent();
    panelSheet.dismiss();
  }, [cancelScheduledPanelPresent, panelSheet]);

  const openPanel = useCallback(
    (freeBarberId: string | null) => {
      setPanelTargetId(freeBarberId);
      schedulePanelPresent(50);
    },
    [schedulePanelPresent],
  );

  const panelSheetApi = useMemo(() => ({ openPanel }), [openPanel]);

  const tabs = useMemo(
    () =>
      getCommonTabs(t, {
        icon: panelTabConfigs.freeBarber.icon,
        iconFocused: panelTabConfigs.freeBarber.iconFocused,
        label: t(panelTabConfigs.freeBarber.labelKey),
      }),
    [t],
  );

  const renderAdditionalBottomSheets = () => (
    <BottomSheetModal
      ref={panelSheet.ref}
      backdropComponent={panelSheet.makeBackdrop()}
      handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
      backgroundStyle={{ backgroundColor: colors.sheetBg }}
      onChange={panelSheet.handleChange}
      onDismiss={() => {
        cancelScheduledPanelPresent();
        panelSheet.handleDismiss();
      }}
      snapPoints={panelSheet.snapPoints}
      index={0}
      enableDynamicSizing={false}
      enableOverDrag={panelSheet.enableOverDrag}
      enablePanDownToClose={panelSheet.enablePanDownToClose}
      enableHandlePanningGesture={panelSheet.enableHandlePanningGesture}
    >
      <BottomSheetView className="h-full pt-2">
        <DeferredRender
          active={panelSheet.isOpen}
          placeholder={
            <View className="flex-1 pt-4">
              <CrudSkeletonComponent />
            </View>
          }
        >
          <FormFreeBarberOperation
            freeBarberId={panelTargetId}
            enabled={panelSheet.isOpen}
            onClose={dismissPanelSheet}
            error={minePanelError}
            locationStatus={locationStatusForForm}
          />
        </DeferredRender>
      </BottomSheetView>
    </BottomSheetModal>
  );

  return (
    <FreeBarberPanelSheetContext.Provider value={panelSheetApi}>
      <FreeBarberLocationProvider>
        <BaseTabLayout
          userType={UserType.FreeBarber}
          accentColor={accentColors.freeBarber}
          tabs={tabs}
          layoutSheetOpen={panelSheet.isOpen}
          renderAdditionalBottomSheets={renderAdditionalBottomSheets}
        />
      </FreeBarberLocationProvider>
    </FreeBarberPanelSheetContext.Provider>
  );
};

export default FreeBarberLayout;
