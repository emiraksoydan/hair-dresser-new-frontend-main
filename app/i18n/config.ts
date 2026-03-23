import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './locales/tr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';
import de from './locales/de.json';

const LANGUAGE_STORAGE_KEY = '@app_language';

// AsyncStorage'dan dil tercihini yükle
export const loadLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage) {
      return savedLanguage;
    }
    // Eğer kaydedilmiş dil yoksa, sistem dilini kullan
    const systemLocale = Localization.getLocales()[0]?.languageCode || 'tr';
    // Sistem dilini desteklenen dillere map et
    const supportedLanguages = ['tr', 'en', 'ar', 'de'];
    if (supportedLanguages.includes(systemLocale)) {
      return systemLocale;
    }
    return 'tr'; // Varsayılan dil
  } catch (error) {
    // Dil yükleme hatası - varsayılan dil döndür
    return 'tr';
  }
};

// Dil tercihini kaydet
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    i18n.changeLanguage(language);
  } catch (error) {
    // Dil kaydetme hatası sessizce atlanır
  }
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      ar: { translation: ar },
      de: { translation: de },
    },
    lng: 'tr', // Varsayılan dil, loadLanguage ile güncellenecek
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false, // React zaten escape ediyor
    },
  });

// Uygulama başladığında kaydedilmiş dili yükle
loadLanguage().then((language) => {
  i18n.changeLanguage(language);
});

export default i18n;
