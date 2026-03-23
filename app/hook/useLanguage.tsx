import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { loadLanguage, saveLanguage } from '../i18n/config';

export type Language = 'tr' | 'en' | 'ar' | 'de';

// Global state to prevent multiple initializations
let isInitialized = false;
let initPromise: Promise<string> | null = null;

export const useLanguage = () => {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<Language>(i18n.language as Language || 'tr');
  const [isLoading, setIsLoading] = useState(!isInitialized);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const initLanguage = async () => {
      // Eğer zaten başlatıldıysa, sadece mevcut dili kullan
      if (isInitialized) {
        if (mountedRef.current) {
          setCurrentLanguage(i18n.language as Language);
          setIsLoading(false);
        }
        return;
      }

      // Eğer başlatma işlemi devam ediyorsa, bekle
      if (initPromise) {
        const savedLanguage = await initPromise;
        if (mountedRef.current) {
          setCurrentLanguage(savedLanguage as Language);
          setIsLoading(false);
        }
        return;
      }

      // İlk başlatma
      initPromise = loadLanguage();
      
      try {
        const savedLanguage = await initPromise;
        isInitialized = true;
        
        if (mountedRef.current) {
          setCurrentLanguage(savedLanguage as Language);
          // Dil zaten config'de ayarlandı, sadece farklıysa değiştir
          if (i18n.language !== savedLanguage) {
            i18n.changeLanguage(savedLanguage);
          }
        }
      } catch (error) {
        // Dil başlatma hatası sessizce atlanır
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initLanguage();
    
    return () => {
      mountedRef.current = false;
    };
  }, [i18n]);

  // i18n dil değişikliklerini dinle
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      if (mountedRef.current) {
        setCurrentLanguage(lng as Language);
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = useCallback(async (language: Language) => {
    try {
      // Önce state'i güncelle (optimistic update)
      setCurrentLanguage(language);

      // AsyncStorage'a kaydet (arka planda)
      saveLanguage(language);

      // i18n'i güncelle
      if (i18n.language !== language) {
        i18n.changeLanguage(language);
      }
    } catch (error) {
      // Dil değiştirme hatası sessizce atlanır
    }
  }, [i18n]);

  return {
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
  };
};
