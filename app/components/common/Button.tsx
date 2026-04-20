import { Icon } from "react-native-paper";
import React from 'react';
import { TouchableOpacity, View, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Text } from './Text';

interface ButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    loading?: boolean;
    disabled?: boolean;
    mode?: 'contained' | 'outlined' | 'text' | 'contained-tonal';
    buttonColor?: string;
    textColor?: string;
    icon?: string;
    style?: ViewStyle;
    className?: string;
    contentStyle?: ViewStyle;
    labelStyle?: TextStyle;
    testID?: string;
    /** Daha az dikey padding kullanır (küçük butonlar için). */
    compact?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    onPress,
    children,
    loading = false,
    disabled = false,
    mode = 'contained',
    buttonColor,
    textColor,
    icon,
    style,
    className,
    contentStyle,
    labelStyle,
    testID,
    compact = false,
}) => {
    const isDisabled = disabled || loading;

    // buttonColor'a göre disabled rengi hesapla
    const getDisabledColor = (color: string): string => {
        // Diyalog yumuşak yeşil (GlobalAlert / confirmDialogStyles)
        if (color === '#a7f3d0' || color === '#34d399') {
            return 'rgba(4, 120, 87, 0.28)';
        }
        // Emerald renkleri için koyu versiyonlar
        if (color === '#059669') {
            return '#047857'; // emerald-700 (daha koyu)
        }
        if (color === '#10B981') {
            return '#059669'; // emerald-600 (daha koyu)
        }
        // Ana tema rengi — soluk/şeffaf versiyonu
        if (color === '#fea60e' || color === '#FFB900' || color === '#ffb900') {
            return 'rgba(254,166,14,0.35)';
        }
        // Diğer renkler için genel koyu versiyon
        return '#374151'; // gray-700 (fallback)
    };

    // Mode'a göre default renkler
    const getDefaultColors = () => {
        switch (mode) {
            case 'contained':
                return {
                    bg: buttonColor || '#10B981', // emerald-500
                    text: textColor || '#FFFFFF',
                    bgDisabled: buttonColor ? getDisabledColor(buttonColor) : '#374151', // gray-700
                    textDisabled: '#9CA3AF', // gray-400
                    border: 'transparent',
                };
            case 'outlined':
                return {
                    bg: 'transparent',
                    text: textColor || '#10B981',
                    bgDisabled: 'transparent',
                    textDisabled: '#6B7280', // gray-500
                    border: buttonColor || '#10B981',
                    borderDisabled: '#4B5563', // gray-600
                };
            case 'text':
                return {
                    bg: 'transparent',
                    text: textColor || '#10B981',
                    bgDisabled: 'transparent',
                    textDisabled: '#6B7280',
                    border: 'transparent',
                };
            case 'contained-tonal':
                return {
                    bg: buttonColor || '#064E3B', // emerald-900
                    text: textColor || '#10B981',
                    bgDisabled: '#1F2937', // gray-800
                    textDisabled: '#6B7280',
                    border: 'transparent',
                };
            default:
                return {
                    bg: '#10B981',
                    text: '#FFFFFF',
                    bgDisabled: '#374151',
                    textDisabled: '#9CA3AF',
                    border: 'transparent',
                };
        }
    };

    const colors = getDefaultColors();

    const buttonStyle: ViewStyle = {
        borderRadius: 10,
        paddingVertical: compact ? 4 : 10,
        paddingHorizontal: compact ? 10 : 16,
        backgroundColor: isDisabled ? colors.bgDisabled : colors.bg,
        borderWidth: mode === 'outlined' ? 1 : 0,
        borderColor: isDisabled
            ? colors.borderDisabled || colors.border
            : colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...(style as ViewStyle),
    };

    const textStyle: TextStyle = {
        fontSize: 16,
        fontWeight: '600',
        color: isDisabled ? colors.textDisabled : colors.text,
        ...(labelStyle as TextStyle),
    };

    const content = (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={buttonStyle}
            testID={testID}
        >
            <View
                style={[
                    {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    },
                    contentStyle,
                ]}
            >
                {loading && (
                    <ActivityIndicator
                        size="small"
                        color={isDisabled ? colors.textDisabled : colors.text}
                    />
                )}
                {!loading && icon && (
                    <Icon
                        source={icon}
                        size={20}
                        color={isDisabled ? colors.textDisabled : colors.text}
                    />
                )}
                <Text style={textStyle}>{children}</Text>
            </View>
        </TouchableOpacity>
    );

    // className varsa View ile wrap et
    if (className) {
        return <View className={className}>{content}</View>;
    }

    return content;
};
