import { Icon } from "react-native-paper";
import React from "react";
import { View, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

import { Text } from "./Text";
import { useTheme } from "../../hook/useTheme";

export type CategoryItem = {
  label: string;
  value: string;
};

type CategoryListSelectProps = {
  data: CategoryItem[];
  value: string[];
  onChange: (value: string[]) => void;
  labelField?: keyof CategoryItem;
  valueField?: keyof CategoryItem;
  maxHeight?: number;
  /** Tek seçim: sadece bir eleman seçilebilir (örn. ana kategori) */
  singleSelect?: boolean;
};

export const CategoryListSelect = React.memo(
  ({
    data,
    value = [],
    onChange,
    labelField = "label",
    valueField = "value",
    maxHeight,
    singleSelect = false,
  }: CategoryListSelectProps) => {
    const { colors } = useTheme();
    const valueSet = React.useMemo(() => new Set(value), [value]);

    const toggleItem = (itemValue: string) => {
      if (singleSelect) {
        onChange(valueSet.has(itemValue) ? [] : [itemValue]);
        return;
      }
      const next = valueSet.has(itemValue)
        ? value.filter((v) => v !== itemValue)
        : [...value, itemValue];
      onChange(next);
    };

    const listMaxH = maxHeight ?? 380;

    const rows = data.map((item, index) => {
      const itemValue = item[valueField] as string;
      const itemLabel = item[labelField] as string;
      const isSelected = valueSet.has(itemValue);

      return (
        <TouchableOpacity
          key={`${itemValue}-${index}`}
          onPress={() => toggleItem(itemValue)}
          activeOpacity={0.7}
          style={[
            styles.item,
            isSelected && [styles.itemSelected, { backgroundColor: colors.cardBg2 }],
          ]}
        >
          <Text
            className="flex-1"
            style={[styles.label, { color: colors.sectionHeaderText }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {itemLabel}
          </Text>
          <Icon source="chevron-right" size={20} color={isSelected ? "#FACC15" : "#6B7280"} />
        </TouchableOpacity>
      );
    });

    return (
      <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          style={{ maxHeight: listMaxH }}
          showsVerticalScrollIndicator={data.length > 6}
        >
          {rows}
        </ScrollView>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    marginHorizontal: 0,
    paddingHorizontal: 0,
    borderRadius: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 0,
  },
  itemSelected: {
    borderLeftWidth: 3,
    borderLeftColor: "#FACC15",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  label: {
    fontSize: 15,
    fontFamily: "CenturyGothic",
  },
});
