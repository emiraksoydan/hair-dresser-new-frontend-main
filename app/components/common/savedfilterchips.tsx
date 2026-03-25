import React, { memo } from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
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
        <View style={{ marginTop: 6, marginBottom: 2 }}>
            <Text style={{ color: colors.sectionHeaderText, fontSize: 11, fontFamily: 'CenturyGothic', marginBottom: 4, opacity: 0.7 }}>
                {t('filters.savedFilters')}
            </Text>
            <FlatList
                horizontal
                data={savedFilters}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
                renderItem={({ item }) => {
                    const isActive = item.id === activeFilterId;
                    return (
                        <TouchableOpacity
                            onPress={() => onLoad(item.filterCriteriaJson, item.id)}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: isActive ? '#ffb900' : colors.cardBg2,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: '#ffb900',
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                            }}
                        >
                            <Icon source="bookmark" size={12} color={isActive ? colors.cardBg2 : '#ffb900'} />
                            <Text style={{ color: isActive ? colors.cardBg2 : colors.sectionHeaderText, fontSize: 12, fontFamily: 'CenturyGothic' }}>
                                {item.name}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
});
