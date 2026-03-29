import { Icon } from "react-native-paper";
import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Text } from './Text';

import { BlurView } from 'expo-blur';
import { useLanguage } from '../../hook/useLanguage';
import { getLegalDocuments, LegalDocumentType } from '../../constants/legal';
import { useTheme } from '../../hook/useTheme';

interface LegalModalProps {
    visible: boolean;
    onClose: () => void;
    documentType: LegalDocumentType;
}

export const LegalModal: React.FC<LegalModalProps> = ({ visible, onClose, documentType }) => {
    const { t, currentLanguage } = useLanguage();
    const { colors, isDark } = useTheme();
    const documents = getLegalDocuments(currentLanguage);
    const doc = documents[documentType];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="flex-1 justify-center items-center px-4">
                <View
                    style={{
                        backgroundColor: colors.sheetBg,
                        borderColor: colors.borderColor,
                        maxHeight: '85%',
                    }}
                    className="rounded-2xl w-full max-w-lg border"
                >
                    {/* Header */}
                    <View
                        style={{ borderBottomColor: colors.borderColor }}
                        className="flex-row justify-between items-center p-4 border-b"
                    >
                        <Text style={{ color: colors.sectionHeaderText }} className="text-lg font-semibold flex-1" numberOfLines={2}>
                            {doc.title}
                        </Text>
                        <TouchableOpacity onPress={onClose} className="p-1 ml-2">
                            <Icon source="close" size={22} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView className="p-4" showsVerticalScrollIndicator={true}>
                        <Text style={{ color: colors.sectionHeaderText }} className="text-sm leading-6 font-century-gothic-sans-regular">
                            {doc.content}
                        </Text>
                    </ScrollView>

                    {/* Close Button */}
                    <View style={{ borderTopColor: colors.borderColor }} className="p-4 border-t">
                        <TouchableOpacity
                            onPress={onClose}
                            style={{ backgroundColor: colors.cardBg2 }}
                            className="w-full rounded-xl py-3 items-center"
                        >
                            <Text style={{ color: colors.sectionHeaderText }} className="text-base font-semibold">
                                {t('legal.close')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Modal>
    );
};
