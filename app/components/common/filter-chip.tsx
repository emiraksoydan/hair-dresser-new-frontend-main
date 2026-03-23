import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '../../hook/useTheme';

interface FilterChipProps {
    itemKey: any
    selected?: boolean;
    bgColor?: string;
    className?: string;
    fontSize?: number;
    isDisabled?: boolean
    onPress?: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
}

const FilterChip: React.FC<FilterChipProps> = ({ itemKey, selected, className = 'rounded-3xl border-[1.5px] px-2 py-1.5 flex-row flex-1', fontSize = 12, isDisabled = false, onPress, children, icon }) => {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            key={itemKey}
            disabled={isDisabled}
            onPress={onPress}
            style={{
                backgroundColor: selected ? '#ffb900' : colors.cardBg,
                borderColor: selected ? '#ffb900' : '#fb9400'
            }}
            className={`items-center justify-center   ${className}`}
        >
            {icon && <View className="mr-1">{icon}</View>}
            {typeof children === 'string' || typeof children === 'number' ? (
                <Text
                    numberOfLines={1}
                    style={{
                        color: selected ? 'white' : colors.sectionHeaderText,
                        fontSize: fontSize,
                    }}
                >
                    {children}
                </Text>
            ) : (
                children
            )}
        </TouchableOpacity>
    );
};

export default FilterChip;
