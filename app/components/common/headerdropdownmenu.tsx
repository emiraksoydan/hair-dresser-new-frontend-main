import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Icon } from 'react-native-paper';
import { MotiView } from 'moti';
import { useTheme } from '../../hook/useTheme';

interface MenuItem {
    icon: string;
    label: string;
    onPress: () => void;
}

interface HeaderDropdownMenuProps {
    items: MenuItem[];
    iconColor?: string;
    iconSize?: number;
}

export const HeaderDropdownMenu: React.FC<HeaderDropdownMenuProps> = ({
    items,
    iconColor = 'white',
    iconSize = 22, // Boyut biraz küçültüldü
}) => {
    const { colors, isDark } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen((prev) => !prev);

    const handleItemPress = (onPress: () => void) => {
        onPress();
        setIsOpen(false);
    };

    return (
        <View className='relative ml-2'>
            {/* Tetikleyici Dairesel Buton */}
            <TouchableOpacity
                onPress={toggleMenu}
                activeOpacity={0.7}
                className="w-12 h-12 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? colors.cardBg : colors.screenBg }}
            >
                <Icon source="menu" size={iconSize} color={colors.headerText} />
            </TouchableOpacity>

            {/* Dropdown Menü İçeriği */}
            <MotiView

                from={{ opacity: 0, scale: 0.8, translateY: -10 }}
                animate={{
                    opacity: isOpen ? 1 : 0,
                    scale: isOpen ? 1 : 0.8,
                    translateY: isOpen ? -5 : -10,
                }}
                transition={{
                    type: 'timing',
                    duration: 150,
                }}
                style={[styles.dropdown, { backgroundColor: colors.cardBg }]}
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                {items.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleItemPress(item.onPress)}
                        className="flex-row items-center px-4 py-2.5 rounded-lg"
                    >
                        <View style={{ marginRight: 10 }}>
                            <Icon source={item.icon} size={18} color={colors.sectionHeaderText} />
                        </View>
                        <Text className="text-sm font-medium" style={{ color: colors.sectionHeaderText }}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </MotiView>

            {/* Arka Plan Kapatma Katmanı (Backdrop) */}
            {isOpen && (
                <TouchableOpacity
                    style={styles.backdrop}
                    activeOpacity={1}
                    onPress={() => setIsOpen(false)}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({

    dropdown: {
        position: 'absolute',
        top: 48,
        right: 0,
        backgroundColor: 'transparent', // useTheme ile inline style ile override edilecek
        borderRadius: 14,
        paddingVertical: 6,
        paddingHorizontal: 4,
        minWidth: 170,
        zIndex: 1000,
        // Shadow (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        // Elevation (Android)
        elevation: 12,
    },
    backdrop: {
        position: 'absolute',
        top: -500,
        left: -500,
        right: -500,
        bottom: -500,
        zIndex: 999,
    },
});