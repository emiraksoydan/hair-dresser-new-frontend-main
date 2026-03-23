import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Text } from './Text';
import { Icon } from 'react-native-paper';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

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

// Approximate height per service item (py-2.5 = 20px padding + ~14px text + 1px border)
const ITEM_H = 42;

const ServiceItem = ({ service, isFirst, isLast, colors, currency }: {
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
    className={`flex-row justify-between items-center px-3 py-2.5
      ${isFirst ? 'rounded-t-xl' : ''}
      ${isLast ? 'rounded-b-xl' : ''}`}
  >
    <View className="flex-row items-center flex-1 mr-2">
      <View className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] mr-2" />
      <Text style={{ color: colors.sectionHeaderText }} className="text-sm flex-1" numberOfLines={1}>
        {service.serviceName}
      </Text>
    </View>
    <Text style={{ color: colors.tagline }} className="text-sm font-century-gothic-bold">
      {service.price} {currency}
    </Text>
  </View>
);

/**
 * Reusable service offerings list component
 * Supports horizontal scrollable and vertical list layouts
 * Inline expand — no Modal, works correctly inside FlatList grouped items
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
  const [isExpanded, setIsExpanded] = useState(false);

  const currency = t('card.currency');

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
            className="flex-row px-3 py-2 rounded-lg items-center"
          >
            <Text style={{ color: colors.sectionHeaderText }} className="mr-1 text-sm">
              {service.serviceName} :
            </Text>
            <Text style={{ color: colors.tagline }} className="text-sm">
              {service.price} {currency}
            </Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  // Vertical layout — no expand button
  const hasMore = showExpandButton && previewCount != null && offerings.length > previewCount;

  if (!hasMore) {
    return (
      <View className={`mt-0 mb-2 ${className}`}>
        {offerings.map((service, index) => (
          <ServiceItem
            key={service.id ?? service.serviceName ?? index}
            service={service}
            isFirst={index === 0}
            isLast={index === offerings.length - 1}
            colors={colors}
            currency={currency}
          />
        ))}
      </View>
    );
  }

  // Has expand — render ALL items always, animate height to avoid DOM insertions
  return (
    <ExpandableServiceList
      offerings={offerings}
      previewCount={previewCount!}
      colors={colors}
      currency={currency}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(v => !v)}
      t={t}
      className={className}
    />
  );
};

const ExpandableServiceList = React.memo(({
  offerings,
  previewCount,
  colors,
  currency,
  isExpanded,
  onToggle,
  t,
  className,
}: {
  offerings: ServiceOffering[];
  previewCount: number;
  colors: any;
  currency: string;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
  className: string;
}) => {
  const collapsedH = previewCount * ITEM_H;
  const fullH = offerings.length * ITEM_H;
  const animHeight = useRef(new Animated.Value(collapsedH)).current;

  useEffect(() => {
    Animated.timing(animHeight, {
      toValue: isExpanded ? fullH : collapsedH,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, fullH, collapsedH]);

  return (
    <View className={`mt-0 mb-2 ${className}`}>
      <Animated.View style={{ height: animHeight, overflow: 'hidden' }}>
        {offerings.map((service, index) => (
          <ServiceItem
            key={service.id ?? service.serviceName ?? index}
            service={service}
            isFirst={index === 0}
            isLast={index === offerings.length - 1}
            colors={colors}
            currency={currency}
          />
        ))}
      </Animated.View>

      <TouchableOpacity
        onPress={onToggle}
        className="flex-row items-center justify-center py-2 mt-1"
        activeOpacity={0.7}
      >
        <Text className="text-[#60a5fa] text-sm mr-1">
          {isExpanded ? t('common.showLess') : `${t('common.showAll')} (${offerings.length})`}
        </Text>
        <Icon
          source={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#60a5fa"
        />
      </TouchableOpacity>
    </View>
  );
});
