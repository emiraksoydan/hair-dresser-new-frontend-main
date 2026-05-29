import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, FlatList, TouchableOpacity, type ListRenderItem } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from './Text';
import {
  BottomSheetModal,
  BottomSheetFlatList,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';
import SearchBar from './SearchBar';
import { useFabOverlayWhenSheetOpen } from '../../hook/usePanelMoreFab';

export type ServicePackageItem = {
  id: string;
  packageName: string;
  totalPrice: number;
  items?: { serviceOfferingId?: string; serviceName: string }[];
};

interface ServicePackagesListProps {
  packages: ServicePackageItem[];
  previewCount?: number;
}

const ACCENT = '#a78bfa';

type PackageRowProps = {
  pkg: ServicePackageItem;
  colors: {
    cardBg2: string;
    sectionHeaderText: string;
    textSecondary: string;
  };
  isDark: boolean;
  currencySymbol: string;
};

const PackageRow = React.memo(({ pkg, colors, isDark, currencySymbol }: PackageRowProps) => {
  const serviceLine = (pkg.items ?? []).map((i) => i.serviceName).join(' · ');

  return (
    <View
      className="px-3 py-2.5"
      style={{
        backgroundColor: colors.cardBg2,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(167,139,250,0.25)' : 'rgba(167,139,250,0.2)',
        borderRadius: 12,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
          <Icon source="tag-multiple-outline" size={14} color={ACCENT} />
          <Text
            style={{
              fontFamily: 'CenturyGothic-Bold',
              fontSize: 14,
              color: colors.sectionHeaderText,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {pkg.packageName}
          </Text>
        </View>
        <Text style={{ fontFamily: 'CenturyGothic-Bold', fontSize: 14, color: ACCENT }}>
          {pkg.totalPrice} {currencySymbol}
        </Text>
      </View>
      {serviceLine.length > 0 && (
        <Text
          style={{
            fontFamily: 'CenturyGothic',
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 3,
            marginLeft: 20,
          }}
          numberOfLines={1}
        >
          {serviceLine}
        </Text>
      )}
    </View>
  );
});

export const ServicePackagesList: React.FC<ServicePackagesListProps> = ({
  packages,
  previewCount = 3,
}) => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currencySymbol = t('card.currencySymbol');
  const hasMore = packages.length > previewCount;
  const previewData = hasMore ? packages.slice(0, previewCount) : packages;

  useFabOverlayWhenSheetOpen(sheetOpen);

  const filteredPackages = useMemo(() => {
    if (!searchQuery.trim()) return packages;
    const q = searchQuery.toLowerCase();
    return packages.filter(
      (p) =>
        p.packageName.toLowerCase().includes(q) ||
        (p.items ?? []).some((i) => i.serviceName.toLowerCase().includes(q)),
    );
  }, [packages, searchQuery]);

  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const openSheet = useCallback(() => {
    setSearchQuery('');
    sheetRef.current?.present();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: ServicePackageItem) => item.id, []);

  const renderPackageItem: ListRenderItem<ServicePackageItem> = useCallback(
    ({ item }) => (
      <PackageRow
        pkg={item}
        colors={colors}
        isDark={isDark}
        currencySymbol={currencySymbol}
      />
    ),
    [colors, currencySymbol, isDark],
  );

  const itemSeparator = useCallback(() => <View style={{ height: 6 }} />, []);

  const sheetHeader = useMemo(
    () => (
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text
          className="text-xl font-century-gothic-sans-semibold"
          style={{ color: colors.sectionHeaderText }}
        >
          {t('servicePackage.tabPackages')} ({packages.length})
        </Text>
        <View style={{ marginTop: 10 }}>
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showButtons={false}
            forceBorderColor={ACCENT}
          />
        </View>
      </View>
    ),
    [colors.sectionHeaderText, packages.length, searchQuery, t],
  );

  const sheetEmpty = useMemo(
    () => (
      <View className="py-6 items-center">
        <Text style={{ color: colors.textSecondary, fontSize: 15, fontFamily: 'CenturyGothic' }}>
          {t('common.noSearchResults')}
        </Text>
      </View>
    ),
    [colors.textSecondary, t],
  );

  if (!packages || packages.length === 0) return null;

  return (
    <>
      <FlatList
        data={previewData}
        keyExtractor={keyExtractor}
        renderItem={renderPackageItem}
        scrollEnabled={false}
        ItemSeparatorComponent={itemSeparator}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity
              onPress={openSheet}
              activeOpacity={0.7}
              className="py-2 mt-1 items-center"
            >
              <Text style={{ fontSize: 13, fontFamily: 'CenturyGothic-Bold', color: ACCENT }}>
                {t('common.showAll')} ({packages.length})
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {hasMore && (
        <BottomSheetModal
          ref={sheetRef}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose
          enableOverDrag={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.cardBg }}
          handleIndicatorStyle={{ backgroundColor: colors.borderColor }}
          onChange={(index) => setSheetOpen(index >= 0)}
          onDismiss={() => setSheetOpen(false)}
        >
          <View style={{ flex: 1 }}>
            {sheetHeader}
            <BottomSheetFlatList
              data={filteredPackages}
              keyExtractor={keyExtractor}
              renderItem={renderPackageItem}
              ItemSeparatorComponent={itemSeparator}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={sheetEmpty}
            />
          </View>
        </BottomSheetModal>
      )}
    </>
  );
};
