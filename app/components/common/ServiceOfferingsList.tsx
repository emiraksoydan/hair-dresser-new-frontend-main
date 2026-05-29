import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, FlatList, TouchableOpacity, type ListRenderItem } from 'react-native';
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

interface ServiceOffering {
  id?: string;
  serviceName: string;
  price: number | string;
}

interface ServiceOfferingsListProps {
  offerings: ServiceOffering[];
  className?: string;
  layout?: 'horizontal' | 'vertical';
  previewCount?: number;
  showExpandButton?: boolean;
}

type ServiceItemProps = {
  service: ServiceOffering;
  isFirst: boolean;
  isLast: boolean;
  colors: { cardBg2: string; borderColor: string; sectionHeaderText: string; tagline: string };
  currency: string;
};

const ServiceItem = React.memo(({ service, isFirst, isLast, colors, currency }: ServiceItemProps) => (
  <View
    style={{
      backgroundColor: colors.cardBg2,
      borderBottomWidth: !isLast ? 1 : 0,
      borderBottomColor: !isLast ? colors.borderColor : undefined,
    }}
    className={`flex-row justify-between items-center px-3 py-3
      ${isFirst ? 'rounded-t-xl' : ''}
      ${isLast ? 'rounded-b-xl' : ''}`}
  >
    <View className="flex-row items-center flex-1 mr-2">
      <View className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] mr-2" />
      <Text
        style={{ color: colors.sectionHeaderText, fontSize: 15, fontFamily: 'CenturyGothic' }}
        className="flex-1"
        numberOfLines={1}
      >
        {service.serviceName}
      </Text>
    </View>
    <Text style={{ color: colors.tagline, fontSize: 15, fontFamily: 'CenturyGothic-Bold' }}>
      {service.price} {currency}
    </Text>
  </View>
));

const HorizontalServiceChip = React.memo(({
  service,
  colors,
  currency,
}: {
  service: ServiceOffering;
  colors: ServiceItemProps['colors'];
  currency: string;
}) => (
  <View
    style={{ backgroundColor: colors.cardBg2 }}
    className="flex-row px-3 py-2.5 rounded-lg items-center"
  >
    <Text
      style={{ color: colors.sectionHeaderText, fontSize: 15, fontFamily: 'CenturyGothic' }}
      className="mr-1"
    >
      {service.serviceName} :
    </Text>
    <Text style={{ color: colors.tagline, fontSize: 15, fontFamily: 'CenturyGothic-Bold' }}>
      {service.price} {currency}
    </Text>
  </View>
));

export const ServiceOfferingsList: React.FC<ServiceOfferingsListProps> = ({
  offerings,
  className = '',
  layout = 'horizontal',
  previewCount,
  showExpandButton = false,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currency = t('card.currency');

  useFabOverlayWhenSheetOpen(sheetOpen);

  const filteredOfferings = useMemo(() => {
    if (!searchQuery.trim()) return offerings;
    const q = searchQuery.toLowerCase();
    return offerings.filter((o) => o.serviceName.toLowerCase().includes(q));
  }, [offerings, searchQuery]);

  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const openSheet = useCallback(() => {
    setSearchQuery('');
    sheetRef.current?.present();
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  const keyExtractor = useCallback(
    (item: ServiceOffering, index: number) => item.id ?? `${item.serviceName}-${index}`,
    [],
  );

  const hasMore = showExpandButton && previewCount != null && offerings.length > previewCount;
  const previewData = hasMore ? offerings.slice(0, previewCount) : offerings;

  const renderPreviewItem: ListRenderItem<ServiceOffering> = useCallback(
    ({ item, index }) => (
      <ServiceItem
        service={item}
        isFirst={index === 0}
        isLast={index === previewData.length - 1}
        colors={colors}
        currency={currency}
      />
    ),
    [colors, currency, previewData.length],
  );

  const renderSheetItem: ListRenderItem<ServiceOffering> = useCallback(
    ({ item, index }) => (
      <ServiceItem
        service={item}
        isFirst={index === 0}
        isLast={index === filteredOfferings.length - 1}
        colors={colors}
        currency={currency}
      />
    ),
    [colors, currency, filteredOfferings.length],
  );

  const renderHorizontalItem: ListRenderItem<ServiceOffering> = useCallback(
    ({ item }) => <HorizontalServiceChip service={item} colors={colors} currency={currency} />,
    [colors, currency],
  );

  const sheetHeader = useMemo(
    () => (
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text
          className="text-xl font-century-gothic-sans-semibold"
          style={{ color: colors.sectionHeaderText }}
        >
          {t('common.showAll')} ({offerings.length})
        </Text>
        <View style={{ marginTop: 10 }}>
          <SearchBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showButtons={false}
            forceBorderColor="#FACC15"
          />
        </View>
      </View>
    ),
    [colors.sectionHeaderText, offerings.length, searchQuery, t],
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

  if (!offerings || offerings.length === 0) {
    return null;
  }

  if (layout === 'horizontal') {
    return (
      <FlatList
        horizontal
        data={offerings}
        keyExtractor={keyExtractor}
        renderItem={renderHorizontalItem}
        showsHorizontalScrollIndicator={false}
        className={`mt-2 ${className}`}
        contentContainerStyle={{ gap: 8 }}
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
      />
    );
  }

  return (
    <>
      <FlatList
        data={previewData}
        keyExtractor={keyExtractor}
        renderItem={renderPreviewItem}
        scrollEnabled={false}
        className={`mt-0 mb-2 ${className}`}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity onPress={openSheet} className="py-2 mt-1 items-center" activeOpacity={0.7}>
              <Text style={{ fontSize: 15, fontFamily: 'CenturyGothic-Bold' }} className="text-[#60a5fa]">
                {t('common.showAll')} ({offerings.length})
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
              data={filteredOfferings}
              keyExtractor={keyExtractor}
              renderItem={renderSheetItem}
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
