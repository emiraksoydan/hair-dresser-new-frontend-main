import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { SocialBottomSheet } from './SocialBottomSheet';
import { MultiSelect } from 'react-native-element-dropdown';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { useGetCategoryHierarchyQuery } from '../../store/api';
import type { CategoryHierarchyDto } from '../../types/common';
import { AvailabilityFilter } from '../../constants/filterDefaults';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { STATUS_KEYS } from '../../hook/useBackendFilters';

export type SocialDiscoverFilters = {
  availability: AvailabilityFilter;
  serviceIds: string[];
};

export const DEFAULT_SOCIAL_DISCOVER_FILTERS: SocialDiscoverFilters = {
  availability: AvailabilityFilter.Any,
  serviceIds: [],
};

type Props = {
  sheet: ReturnType<typeof useBottomSheet>;
  value: SocialDiscoverFilters;
  onApply: (next: SocialDiscoverFilters) => void;
};

function flattenServiceOptions(hierarchy: CategoryHierarchyDto[]) {
  const options: { label: string; value: string }[] = [];
  const seen = new Set<string>();

  const walk = (node: CategoryHierarchyDto) => {
    if (node.children?.length) {
      node.children.forEach(walk);
      return;
    }
    if (!seen.has(node.id)) {
      seen.add(node.id);
      options.push({ label: node.name, value: node.id });
    }
  };

  hierarchy.forEach(walk);
  return options.sort((a, b) => a.label.localeCompare(b.label, 'tr'));
}

export const SocialDiscoverFiltersSheet: React.FC<Props> = ({ sheet, value, onApply }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { data: hierarchy = [], isLoading } = useGetCategoryHierarchyQuery();
  const [draft, setDraft] = useState<SocialDiscoverFilters>(value);

  useEffect(() => {
    if (sheet.isOpen) setDraft(value);
  }, [sheet.isOpen, value]);

  const serviceOptions = useMemo(() => flattenServiceOptions(hierarchy), [hierarchy]);

  const statusOptions = useMemo(
    () => [
      { key: STATUS_KEYS.ALL, label: t('filters.all'), value: AvailabilityFilter.Any },
      { key: STATUS_KEYS.AVAILABLE, label: t('filters.availableOpen'), value: AvailabilityFilter.Ready },
      { key: STATUS_KEYS.UNAVAILABLE, label: t('filters.unavailableClosed'), value: AvailabilityFilter.NotReady },
    ],
    [t],
  );

  const multiSelectStyles = useMemo(
    () => ({
      style: {
        borderWidth: 1,
        borderColor: colors.borderColor2,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: colors.cardBg,
        minHeight: 48,
      },
      containerStyle: {
        backgroundColor: colors.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderColor2,
      },
      placeholderStyle: { color: colors.textSecondary, fontSize: 13 },
      selectedTextStyle: { color: colors.headerText, fontSize: 13 },
      inputSearchStyle: { color: colors.headerText, fontSize: 13, borderRadius: 8 },
      itemTextStyle: { color: colors.headerText, fontSize: 13 },
      selectedStyle: { backgroundColor: isDark ? 'rgba(250,204,21,0.15)' : 'rgba(250,204,21,0.25)' },
    }),
    [colors, isDark],
  );

  const handleApply = useCallback(() => {
    onApply(draft);
    sheet.dismiss();
  }, [draft, onApply, sheet]);

  const handleClear = useCallback(() => {
    setDraft(DEFAULT_SOCIAL_DISCOVER_FILTERS);
  }, []);

  return (
    <SocialBottomSheet sheet={sheet}>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}>
        <Text className="text-lg font-bold mb-4" style={{ color: colors.headerText }}>
          {t('social.discoverFiltersTitle')}
        </Text>

        <Text className="text-sm font-bold mb-2" style={{ color: colors.sectionHeaderText ?? colors.headerText }}>
          {t('filters.status')}
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          {statusOptions.map((opt) => {
            const selected = draft.availability === opt.value;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setDraft((prev) => ({ ...prev, availability: opt.value }))}
                className="px-3 py-2 rounded-full border"
                style={{
                  backgroundColor: selected ? SOCIAL_ACCENT : colors.cardBg,
                  borderColor: selected ? SOCIAL_ACCENT : colors.borderColor2,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: selected ? SOCIAL_ACCENT_TEXT : colors.headerText }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text className="text-sm font-bold mb-2" style={{ color: colors.sectionHeaderText ?? colors.headerText }}>
          {t('filters.services')}
        </Text>
        <Text className="text-xs mb-2" style={{ color: colors.textSecondary }}>
          {t('social.discoverServicesHint')}
        </Text>

        {isLoading ? (
          <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginVertical: 16 }} />
        ) : (
          <MultiSelect
            data={serviceOptions}
            labelField="label"
            valueField="value"
            value={draft.serviceIds}
            onChange={(ids) => setDraft((prev) => ({ ...prev, serviceIds: ids }))}
            placeholder={t('filters.selectService')}
            search
            searchPlaceholder={t('common.search')}
            inside
            alwaysRenderSelectedItem
            visibleSelectedItem
            style={multiSelectStyles.style}
            containerStyle={multiSelectStyles.containerStyle}
            placeholderStyle={multiSelectStyles.placeholderStyle}
            selectedTextStyle={multiSelectStyles.selectedTextStyle}
            inputSearchStyle={multiSelectStyles.inputSearchStyle}
            itemTextStyle={multiSelectStyles.itemTextStyle}
            selectedStyle={multiSelectStyles.selectedStyle}
            activeColor="#FACC15"
            selectedTextProps={{ numberOfLines: 1 }}
          />
        )}

        <View className="flex-row gap-2 mt-6">
          <TouchableOpacity
            onPress={handleClear}
            className="flex-1 py-3 rounded-xl items-center border"
            style={{ borderColor: colors.borderColor2, backgroundColor: colors.cardBg }}
          >
            <Text className="font-bold text-sm" style={{ color: colors.headerText }}>
              {t('filters.clear')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleApply}
            className="flex-1 py-3 rounded-xl items-center"
            style={{ backgroundColor: SOCIAL_ACCENT }}
          >
            <Text className="font-bold text-sm" style={{ color: SOCIAL_ACCENT_TEXT }}>
              {t('social.discoverFiltersApply')}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </SocialBottomSheet>
  );
};

export function countActiveSocialDiscoverFilters(filters: SocialDiscoverFilters): number {
  let n = 0;
  if (filters.availability !== AvailabilityFilter.Any) n += 1;
  if (filters.serviceIds.length > 0) n += 1;
  return n;
}
