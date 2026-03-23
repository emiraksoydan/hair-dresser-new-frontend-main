import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text } from './Text';
import { Icon } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import SearchBar from './searchbar';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

interface InfoModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    items: Array<{
        title: string;
        description?: string;
    }>;
}

export const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose, title, items }) => {
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const defaultTitle = title || t('navigation.usageInfo');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        const query = searchQuery.toLowerCase();
        return items.filter(item => 
            item.title.toLowerCase().includes(query) || 
            (item.description && item.description.toLowerCase().includes(query))
        );
    }, [items, searchQuery]);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="flex-1 justify-center items-center px-4">
                <View className="rounded-2xl w-full max-w-lg max-h-[75%]" style={{ backgroundColor: colors.sheetBg, borderWidth: 1, borderColor: colors.borderColor }}>
                    {/* Header */}
                    <View className="flex-row justify-between items-center p-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
                        <Text className="text-lg font-semibold flex-1" style={{ color: colors.sectionHeaderText }}>{defaultTitle}</Text>
                        <TouchableOpacity onPress={onClose} className="p-1 ml-2">
                            <Icon source="close" size={22} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View className="px-4 pt-4 pb-2">
                        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} showButtons={false} />
                    </View>

                    {/* Content */}
                    <ScrollView className="p-4" showsVerticalScrollIndicator={false}>
                        {filteredItems.length === 0 ? (
                            <View className="py-8 items-center">
                                <Text className="text-gray-400 text-sm">{t('common.noSearchResults')}</Text>
                            </View>
                        ) : (
                            filteredItems.map((item, index) => (
                                <View key={index} className="mb-5">
                                    <View className="flex-row items-center mb-2">
                                        <View className="w-2 h-2 rounded-full bg-[#f05e23] mr-3" />
                                        <Text className="text-base font-medium flex-1" style={{ color: colors.sectionHeaderText }}>{item.title}</Text>
                                    </View>
                                    {item.description && (
                                        <Text className="text-sm text-gray-400 ml-5 leading-5">{item.description}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            </BlurView>
        </Modal>
    );
};

