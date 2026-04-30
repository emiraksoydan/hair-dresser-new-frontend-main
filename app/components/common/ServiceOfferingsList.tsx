import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { BottomSheetModal, BottomSheetFlatList, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';
import SearchBar from './searchbar';
import { useFabOverlayWhenSheetOpen } from '../../hook/usePanelMoreFab';

interface ServiceOffering {
  id?: string;
  serviceName: string;
  price: number | string;
}

interface ServiceOfferingsListProps {
  offerings: ServiceOffering[];
  className?: string;
  /** 'horizontal' = yatay kaydırmalı (varsayılan), 'vertical' = dikey liste */
  layout?: 'horizontal' | 'vertical';
  /** Dikey modda gösterilecek önizleme sayısı (undefined = hepsini göster) */
  previewCount?: number;
  /** "Tümünü Göster" butonu gösterilsin mi */
  showExpandButton?: boolean;
}

const ServiceItem = React.memo(({ service, isFirst, isLast, colors, currency }: {
  service: ServiceOffering;
  isFirst: boolean;
  isLast: boolean;
  colors: any;
  currency: string;
}) => (
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
      <Text style={{ color: colors.sectionHeaderText, fontSize: 15, fontFamily: 'CenturyGothic' }} className="flex-1" numberOfLines={1}>
        {service.serviceName}
      </Text>
    </View>
    <Text style={{ color: colors.tagline, fontSize: 15, fontFamily: 'CenturyGothic-Bold' }}>
      {service.price} {currency}
    </Text>
  </View>
));

/**
 * Reusable service offerings list component
 * Supports horizontal scrollable and vertical list layouts
 * Sheet expand — no inline animation, uses BottomSheetModal
 */
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

  if (!offerings || offerings.length === 0) {
    return null;
  }

  // Horizontal layout
  if (layout === 'horizontal') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className={`mt-2 ${className}`}
        contentContainerStyle={{ gap: 8 }}
      >
        {offerings.map((service, index) => (
          <View
            key={service.id ?? service.serviceName ?? index}
            style={{ backgroundColor: colors.cardBg2 }}
            className="flex-row px-3 py-2.5 rounded-lg items-center"
          >
            <Text style={{ color: colors.sectionHeaderText, fontSize: 15, fontFamily: 'CenturyGothic' }} className="mr-1">
              {service.serviceName} :
            </Text>
            <Text style={{ color: colors.tagline, fontSize: 15, fontFamily: 'CenturyGothic-Bold' }}>
              {service.price} {currency}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // Vertical layout — no expand needed
  const hasMore = showExpandButton && previewCount != null && offerings.length > previewCount;
  const previewItems = hasMore ? offerings.slice(0, previewCount) : offerings;

  return (
    <>
      <View className={`mt-0 mb-2 ${className}`}>
        {previewItems.map((service, index) => (
          <ServiceItem
            key={service.id ?? service.serviceName ?? index}
            service={service}
            isFirst={index === 0}
            isLast={index === previewItems.length - 1}
            colors={colors}
            currency={currency}
          />
        ))}

        {hasMore && (
          <TouchableOpacity
            onPress={openSheet}
            className="py-2 mt-1 items-center"
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 15, fontFamily: 'CenturyGothic-Bold' }} className="text-[#60a5fa]">
              {t('common.showAll')} ({offerings.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {hasMore && (
        <BottomSheetModal
          ref={sheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableOverDrag={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: colors.cardBg }}
          handleIndicatorStyle={{ backgroundColor: colors.borderColor }}
          onChange={(index) => setSheetOpen(index >= 0)}
          onDismiss={() => setSheetOpen(false)}
        >
          <BottomSheetFlatList<ServiceOffering>
            data={filteredOfferings}
            keyExtractor={(item: ServiceOffering, index: number) => item.id ?? `${item.serviceName}-${index}`}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={(
              <>
                <View className="pt-3 pb-2">
                  <Text
                    className="text-xl font-century-gothic-sans-semibold"
                    style={{ color: colors.sectionHeaderText }}
                  >
                    {t('common.showAll')} ({offerings.length})
                  </Text>
                </View>
                <View className="pb-3">
                  <SearchBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showButtons={false}
                    forceBorderColor="#FACC15"
                  />
                </View>
              </>
            )}
            ListEmptyComponent={(
              <View className="py-6 items-center">
                <Text style={{ color: colors.textSecondary, fontSize: 15, fontFamily: 'CenturyGothic' }}>
                  {t('common.noSearchResults')}
                </Text>
              </View>
            )}
            renderItem={({ item, index }: { item: ServiceOffering; index: number }) => (
              <ServiceItem
                service={item}
                isFirst={index === 0}
                isLast={index === filteredOfferings.length - 1}
                colors={colors}
                currency={currency}
              />
            )}
          />
        </BottomSheetModal>
      )}
    </>
  );
};
