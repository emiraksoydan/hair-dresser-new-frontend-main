import React, { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Icon, IconButton } from "react-native-paper";
import { SearchBarProps } from '../../types';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

// Tip tanımına buton fonksiyonlarını da eklediğini varsayıyorum
interface ExtendedSearchBarProps extends SearchBarProps {
    isList?: boolean;
    setIsList?: (val: boolean) => void;
    onFilterPress?: () => void;
    showButtons?: boolean;
    /** Her zaman bu renkte border göster (focus durumuna bakılmaksızın) */
    forceBorderColor?: string;
    /** Arka plan ve border'ı kaldırır — bir container içinde kullanım için */
    transparent?: boolean;
    /** Panel üstü: ikon ve yazı biraz küçük */
    compact?: boolean;
}

const SearchBar: React.FC<ExtendedSearchBarProps> = ({
    searchQuery,
    setSearchQuery,
    isList = true,
    setIsList,
    onFilterPress,
    showButtons = true,
    forceBorderColor,
    transparent = false,
    compact = false,
}) => {
    const { t } = useLanguage();
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const iconSz = compact ? 19 : 22;
    const inputFs = compact ? 14 : 15;
    const btnSz = compact ? 19 : 22;

    const shouldShowLayoutToggle = showButtons && !!setIsList;
    const shouldShowFilter = showButtons && !!onFilterPress;

    const borderColor = forceBorderColor ?? (isFocused ? "#FACC15" : colors.cardBg);

    return (
        <View
            className={`flex-row items-center px-3 rounded-xl ${compact ? "h-12" : "h-14"}`}
            style={{
                backgroundColor: transparent ? 'transparent' : colors.cardBg,
                borderWidth: transparent ? 0 : 1.5,
                borderColor: transparent ? 'transparent' : borderColor,
            }}
        >
            <Icon source="magnify" size={iconSz} color="#9aa1ae" />

            <TextInput
                placeholder={t('common.searchPlaceholder')}
                placeholderTextColor="#474b5a"
                onChangeText={setSearchQuery}
                value={searchQuery}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{ flex: 1, marginLeft: 8, fontSize: inputFs, color: colors.sectionHeaderText, fontFamily: 'CenturyGothic' }}
            />

            {(shouldShowLayoutToggle || shouldShowFilter) && (
                <View className="flex-row items-center">
                    {shouldShowLayoutToggle && setIsList && (
                        <IconButton
                            icon={isList ? "format-list-bulleted" : "view-grid-outline"}
                            iconColor={'#9aa1ae'}
                            size={btnSz}
                            onPress={() => setIsList(!isList)}
                            style={{ margin: 0 }}
                        />
                    )}
                    {shouldShowFilter && onFilterPress && (
                        <IconButton
                            icon="filter-variant"
                            iconColor="#9aa1ae"
                            size={btnSz}
                            onPress={onFilterPress}
                            style={{ margin: 0 }}
                        />
                    )}
                </View>
            )}
        </View>
    );
};

export default SearchBar;
