import { Icon } from "react-native-paper";
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../common/Text';

import { useLanguage } from '../../hook/useLanguage';
import { LegalModal } from '../common/LegalModal';
import { LegalDocumentType } from '../../constants/legal';

interface LegalAgreementCheckboxProps {
    checked: boolean;
    onToggle: (value: boolean) => void;
    error?: string;
}

export const LegalAgreementCheckbox: React.FC<LegalAgreementCheckboxProps> = ({
    checked, onToggle, error,
}) => {
    const { t } = useLanguage();
    const [modalDoc, setModalDoc] = useState<LegalDocumentType | null>(null);

    const LinkText = ({ docType, label }: { docType: LegalDocumentType; label: string }) => (
        <TouchableOpacity
            onPress={() => setModalDoc(docType)}
            activeOpacity={0.6}
            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
        >
            <Text
                style={{ color: '#60a5fa', textDecorationLine: 'underline', fontSize: 12, lineHeight: 18 }}
                className="font-century-gothic-sans-medium"
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View>
            <View className="flex-row items-start">
                {/* Custom Checkbox */}
                <TouchableOpacity
                    onPress={() => onToggle(!checked)}
                    activeOpacity={0.7}
                    className="mt-0.5"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
                >
                    <View
                        className="w-5 h-5 rounded items-center justify-center"
                        style={{
                            borderWidth: 1.5,
                            borderColor: checked ? '#22c55e' : error ? '#ef4444' : '#6b7280',
                            backgroundColor: checked ? '#22c55e' : 'transparent',
                        }}
                    >
                        {checked && (
                            <Icon source="check" size={14} color="#ffffff" />
                        )}
                    </View>
                </TouchableOpacity>

                {/* Text with tappable links */}
                <View className="flex-1 flex-row flex-wrap ml-2.5" style={{ marginTop: 1 }}>
                    <Text className="text-gray-400 text-xs font-century-gothic-sans-regular" style={{ lineHeight: 18 }}>
                        {t('legal.agreementPrefix')}
                    </Text>
                    <LinkText docType="kvkk" label={t('legal.kvkk')} />
                    <Text className="text-gray-400 text-xs" style={{ lineHeight: 18 }}>{', '}</Text>
                    <LinkText docType="terms" label={t('legal.terms')} />
                    <Text className="text-gray-400 text-xs" style={{ lineHeight: 18 }}>{', '}</Text>
                    <LinkText docType="privacy" label={t('legal.privacy')} />
                    <Text className="text-gray-400 text-xs" style={{ lineHeight: 18 }}>{t('legal.and')}</Text>
                    <LinkText docType="consent" label={t('legal.consent')} />
                    <Text className="text-gray-400 text-xs font-century-gothic-sans-regular" style={{ lineHeight: 18 }}>
                        {t('legal.agreementSuffix')}
                    </Text>
                </View>
            </View>

            {error && (
                <Text
                    style={{
                        color: '#ef4444',
                        fontSize: 11,
                        fontWeight: '500',
                        marginTop: 4,
                        marginLeft: 28,
                    }}
                >
                    {error}
                </Text>
            )}

            <LegalModal
                visible={modalDoc !== null}
                onClose={() => setModalDoc(null)}
                documentType={modalDoc || 'kvkk'}
            />
        </View>
    );
};
