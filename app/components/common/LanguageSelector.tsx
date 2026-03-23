import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal } from 'react-native';
import { Text } from './Text';
import { useLanguage, Language } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

interface LanguageSelectorProps {
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ showLabel = true }) => {
  const { currentLanguage, changeLanguage, t } = useLanguage();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [localCurrentLanguage, setLocalCurrentLanguage] = useState(currentLanguage);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'tr', label: t('languages.tr'), flag: '🇹🇷' },
    { code: 'en', label: t('languages.en'), flag: '🇬🇧' },
    { code: 'ar', label: t('languages.ar'), flag: '🇸🇦' },
    { code: 'de', label: t('languages.de'), flag: '🇩🇪' },
  ];

  const handleLanguageSelect = (language: Language) => {
    // Optimistic update - UI'ı hemen güncelle, async işlemi arka planda yap
    setLocalCurrentLanguage(language);
    setModalVisible(false);
    // Async işlemi arka planda yap, await beklemeden devam et
    changeLanguage(language).catch((error) => {
      // Hata durumunda eski dil'e geri dön
      setLocalCurrentLanguage(currentLanguage);
    });
  };

  // currentLanguage değiştiğinde local state'i güncelle
  useEffect(() => {
    setLocalCurrentLanguage(currentLanguage);
  }, [currentLanguage]);

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center gap-2"
      >
        {showLabel && (
          <Text className="text-sm" style={{ color: colors.textSecondary }}>
            {t('auth.selectLanguage')}
          </Text>
        )}
        <View
          className="px-3 py-1.5 rounded-lg border flex-row items-center gap-2"
          style={{
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
          }}
        >
          <Text className="text-base">
            {languages.find(l => l.code === localCurrentLanguage)?.flag || '🇹🇷'}
          </Text>
          <Text className="text-sm font-bold" style={{ color: colors.text }}>
            {languages.find(l => l.code === localCurrentLanguage)?.label || localCurrentLanguage.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            className="rounded-2xl p-5 w-4/5"
            style={{ backgroundColor: colors.card }}
            onStartShouldSetResponder={() => true}
          >
            <Text className="text-lg font-bold mb-4" style={{ color: colors.text }}>
              {t('auth.selectLanguage')}
            </Text>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                className="py-3 px-4 rounded-lg mb-2 flex-row items-center gap-3"
                style={{
                  backgroundColor:
                    localCurrentLanguage === lang.code
                      ? colors.primary
                      : colors.inputBackground,
                }}
                onPress={() => handleLanguageSelect(lang.code)}
              >
                <Text className="text-xl">
                  {lang.flag}
                </Text>
                <Text
                  className="text-base"
                  style={{
                    color:
                      localCurrentLanguage === lang.code
                        ? colors.primaryText
                        : colors.text,
                    fontWeight: localCurrentLanguage === lang.code ? 'bold' : 'normal',
                  }}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};
