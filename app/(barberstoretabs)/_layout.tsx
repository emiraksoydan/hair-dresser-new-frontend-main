import React, { useMemo } from "react";
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

const BarberStoreLayout = () => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  // Bottom sheet hook for add store
  const addStoreSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: false,
    enableOverDrag: false,
  });

  const tabs = useMemo(() => getCommonTabs(t, {
    icon: panelTabConfigs.barberStore.icon,
    iconFocused: panelTabConfigs.barberStore.iconFocused,
    label: t(panelTabConfigs.barberStore.labelKey),
  }), [t]);

  // Dropdown menu items - memoized
  const dropdownMenuItems = useMemo(
    () => [
      {
        icon: "plus",
        label: t("navigation.addStore"),
        onPress: () => addStoreSheet.present(),
      },
      {
        icon: "shopping-outline",
        label: t("navigation.shopping"),
        onPress: () => {},
      },
    ],
    [t, addStoreSheet],
  );

  // Add Store Bottom Sheet
  const renderAdditionalBottomSheets = () => (
    <BottomSheetModal
      ref={addStoreSheet.ref}
      backdropComponent={addStoreSheet.makeBackdrop()}
      handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
      backgroundStyle={{ backgroundColor: colors.sheetBg }}
      onChange={addStoreSheet.handleChange}
      snapPoints={addStoreSheet.snapPoints}
      enableOverDrag={addStoreSheet.enableOverDrag}
      enablePanDownToClose={addStoreSheet.enablePanDownToClose}
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
    <BaseTabLayout
      userType={UserType.BarberStore}
      accentColor={accentColors.barberStore}
      tabs={tabs}
      dropdownMenuItems={dropdownMenuItems}
      renderAdditionalBottomSheets={renderAdditionalBottomSheets}
    />
  );
};

export default BarberStoreLayout;
