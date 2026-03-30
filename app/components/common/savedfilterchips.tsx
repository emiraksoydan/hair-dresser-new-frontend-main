import { Icon } from "react-native-paper";
import React, { memo } from 'react';
import { FlatList, StyleProp, TouchableOpacity, View, ViewStyle } from 'react-native';

import { Text } from './Text';
import { useTheme } from '../../hook/useTheme';
import { SavedFilterGetDto } from '../../types/filter';
import { useTranslation } from 'react-i18next';

interface SavedFilterChipsProps {
    savedFilters: SavedFilterGetDto[];
    activeFilterId?: string;
    onLoad: (filterCriteriaJson: string, filterId: string) => void;
}

export const SavedFilterChips = memo(({ savedFilters, activeFilterId, onLoad }: SavedFilterChipsProps) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    if (!savedFilters || savedFilters.length === 0) return null;

    return (
        <View style={{ marginTop: 0, marginBottom: 0 }}>
            <Text style={{ color: colors.sectionHeaderText, fontSize: 12, fontFamily: 'CenturyGothic-Bold', marginBottom: 8, opacity: 0.85 }}>
                {t('filters.savedFilters')}
            </Text>
                <FlatList
                horizontal
                data={savedFilters}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 2, paddingRight: 4 }}
                renderItem={({ item }) => {
                    const isActive = item.id === activeFilterId;
                    return (
                        <TouchableOpacity
                            onPress={() => onLoad(item.filterCriteriaJson, item.id)}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: isActive ? '#ffb900' : colors.cardBg2,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: '#ffb900',
                                paddingHorizontal: 13,
                                paddingVertical: 7,
                                minHeight: 32,
                            }}
                        >
                            <Icon source="bookmark" size={14} color={isActive ? colors.cardBg2 : '#ffb900'} />
                            <Text
                                style={{
                                    color: isActive ? colors.cardBg2 : colors.sectionHeaderText,
                                    fontSize: 12,
                                    fontFamily: 'CenturyGothic',
                                }}
                                numberOfLines={1}
                            >
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
});
