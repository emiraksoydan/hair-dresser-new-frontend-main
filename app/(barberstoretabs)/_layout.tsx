import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { BaseTabLayout } from "../components/layout/BaseTabLayout";
import { UserType } from "../types";
import { useLanguage } from "../hook/useLanguage";
import { useBottomSheet } from "../hook/useBottomSheet";
import { DeferredRender } from "../components/common/deferredrender";
import { CrudSkeletonComponent } from "../components/common/crudskeleton";
import FormStoreAdd from "../components/store/formstoreadd";
import { getCommonTabs, panelTabConfigs, accentColors } from "../config/tabConfig";
import { useTheme } from "../hook/useTheme";
import { BarberStoreSheetContext } from "../context/BarberStoreSheetContext";

const BarberStoreLayout = () => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  // Bottom sheet hook for add store
  const addStoreSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: false,
    enableOverDrag: false,
    enableHandlePanningGesture: false,
    pressBehavior: "none",
  });

  const tabs = useMemo(() => getCommonTabs(t, {
    icon: panelTabConfigs.barberStore.icon,
    iconFocused: panelTabConfigs.barberStore.iconFocused,
    label: t(panelTabConfigs.barberStore.labelKey),
  }), [t]);

  const openAddStore = useCallback(() => addStoreSheet.present(), [addStoreSheet]);

  const storeSheetApi = useMemo(
    () => ({ openAddStore }),
    [openAddStore],
  );

  const fabExtraItems = useMemo(
    () => [
      {
        id: "add-store",
        icon: "plus",
        label: t("navigation.addStore"),
        onPress: openAddStore,
      },
    ],
    [t, openAddStore],
  );

  // Add Store Bottom Sheet
  const renderAdditionalBottomSheets = () => (
    <BottomSheetModal
      ref={addStoreSheet.ref}
      backdropComponent={addStoreSheet.makeBackdrop()}
      handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
      backgroundStyle={{ backgroundColor: colors.sheetBg }}
      onChange={addStoreSheet.handleChange}
      onDismiss={addStoreSheet.handleDismiss}
      snapPoints={addStoreSheet.snapPoints}
      enableOverDrag={addStoreSheet.enableOverDrag}
      enablePanDownToClose={addStoreSheet.enablePanDownToClose}
      enableHandlePanningGesture={addStoreSheet.enableHandlePanningGesture}
    >
      <BottomSheetView className="h-full pt-2">
        <DeferredRender
          active={addStoreSheet.isOpen}
          placeholder={
            <View className="flex-1 pt-4">
              <CrudSkeletonComponent />
            </View>
          }
        >
          <FormStoreAdd onClose={() => addStoreSheet.dismiss()} />
        </DeferredRender>
      </BottomSheetView>
    </BottomSheetModal>
  );

  return (
    <BarberStoreSheetContext.Provider value={storeSheetApi}>
      <BaseTabLayout
        userType={UserType.BarberStore}
        accentColor={accentColors.barberStore}
        tabs={tabs}
        fabExtraItems={fabExtraItems}
        layoutSheetOpen={addStoreSheet.isOpen}
        renderAdditionalBottomSheets={renderAdditionalBottomSheets}
      />
    </BarberStoreSheetContext.Provider>
  );
};

export default BarberStoreLayout;
