import React from "react";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Icon } from "react-native-paper";

type SheetCloseButtonProps = {
  onPress: () => void;
  color: string;
};

/**
 * Bottom sheet içinde Paper `IconButton` yerine RNGH dokunma kullanır;
 * gorhom sheet + RNGH ile çakışma / kaçan basım riski azalır.
 */
export function SheetCloseButton({ onPress, color }: SheetCloseButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.7}
      style={{
        padding: 8,
        justifyContent: "center",
        alignItems: "center",
        minWidth: 44,
        minHeight: 44,
      }}
      accessibilityRole="button"
      accessibilityLabel="Close"
    >
      <Icon source="close" size={24} color={color} />
    </TouchableOpacity>
  );
}
