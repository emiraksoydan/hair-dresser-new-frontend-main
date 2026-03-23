import React from "react";
import { ScrollView, View } from "react-native";
import { Text } from "./Text";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Chip, Divider, Icon } from "react-native-paper";
import { LegendList } from "@legendapp/list";
import { useBottomSheet } from "../../hook/useBottomSheet";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { catData, ratings } from "../../constants";

type FilterBottomSheetProps = {
  selectedType: string;
  onChangeType: (type: string) => void;
  selectedRating: string | number | null;
  onChangeRating: (rating: string | number | null) => void;
  selectedServices: string[];
  hasService: (service: string) => boolean;
  toggleService: (service: string) => void;
};

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  selectedType,
  onChangeType,
  selectedRating,
  onChangeRating,
  selectedServices,
  hasService,
  toggleService,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const filterSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: true,
  });

  return (
    <BottomSheetModal
      ref={filterSheet.ref}
      snapPoints={filterSheet.snapPoints}
      backdropComponent={filterSheet.makeBackdrop()}
      enablePanDownToClose={filterSheet.enablePanDownToClose}
      handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
      backgroundStyle={{ backgroundColor: colors.sheetBg }}
      onChange={filterSheet.handleChange}
    >
      <BottomSheetView className="h-full p-5 pt-2">
        <Text className="text-center text-xl mb-4" style={{ color: colors.sectionHeaderText }}>
          {t("filters.title") || "Filtreler"}
        </Text>
        <Divider style={{ borderWidth: 0.1, backgroundColor: colors.borderColor }} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingVertical: 20,
            rowGap: 15,
          }}
        >
          {/* Kategori */}
          <Text className="text-lg font-semibold mb-2" style={{ color: colors.sectionHeaderText }}>
            Kategori
          </Text>
          <View className="flex-row gap-2">
            {catData.map((type) => {
              const isSelected = selectedType === type;
              return (
                <Chip
                  selected={isSelected}
                  key={`type-${type}`}
                  mode="outlined"
                  textStyle={{
                    fontSize: 12,
                    color: isSelected ? '#ffffff' : colors.sectionHeaderText,
                  }}
                  style={{
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: "#f05e23",
                    backgroundColor: isSelected ? "#f05e23" : "transparent",
                  }}
                  onPress={() => onChangeType(type)}
                >
                  {type}
                </Chip>
              );
            })}
          </View>

          {/* Puanlama */}
          <Text className="text-lg font-semibold mb-2" style={{ color: colors.sectionHeaderText }}>
            Puanlama
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              columnGap: 10,
            }}
          >
            {ratings.map((rating) => {
              const isSelected = selectedRating === rating;
              return (
                <Chip
                  key={`rating-${rating}`}
                  icon={(props) => (
                    <Icon
                      {...props}
                      source="star"
                      size={16}
                      color={isSelected ? "white" : "#facc15"}
                    />
                  )}
                  mode="outlined"
                  textStyle={{
                    fontSize: 12,
                    color: isSelected ? '#ffffff' : colors.sectionHeaderText,
                  }}
                  style={{
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: "#f05e23",
                    backgroundColor: isSelected ? "#f05e23" : "transparent",
                  }}
                  onPress={() => onChangeRating(rating)}
                >
                  {rating}
                </Chip>
              );
            })}
          </ScrollView>

          {/* Hizmetler */}
          <Text className="text-lg font-semibold mb-2" style={{ color: colors.sectionHeaderText }}>
            Hizmetler
          </Text>
          <LegendList
            horizontal
            data={[
              "Saç Kesimi",
              "Sakal",
              "Cilt Bakımı",
              "Saç Boyama",
              "Manikür",
              "Pedikür",
            ]}
            keyExtractor={(item) => item}
            contentContainerStyle={{ columnGap: 10 }}
            showsHorizontalScrollIndicator={false}
            extraData={selectedServices}
            recycleItems={true}
            renderItem={({ item: service }) => {
              const isSelected = hasService(service);
              return (
                <Chip
                  key={`svc-${service}`}
                  mode="outlined"
                  selected={isSelected}
                  onPress={() => toggleService(service)}
                  style={{
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: "#f05e23",
                    backgroundColor: isSelected ? "#f05e23" : "transparent",
                  }}
                  textStyle={{
                    fontSize: 12,
                    color: isSelected ? '#ffffff' : colors.sectionHeaderText,
                  }}
                >
                  {service}
                </Chip>
              );
            }}
          />
        </ScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
};
