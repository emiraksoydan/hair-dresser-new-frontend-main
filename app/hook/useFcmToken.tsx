import { useEffect, useRef, useState, useCallback } from 'react';
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './useAuth';
import { api } from '../store/api';

/**
 * Firebase Cloud Messaging token management hook
 * Handles FCM token registration and updates
 * Note: Requires native build (expo-dev-client) - does not work in Expo Go
 */

// Module-level ref: auth temizlenmeden önce logout'ta erişilebilmesi için.
let _currentFcmToken: string | null = null;

export const useFcmToken = () => {
  const { token } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registerFcmToken] = api.useRegisterFcmTokenMutation();
  const [unregisterFcmToken] = api.useUnregisterFcmTokenMutation();

  // executionEnvironment === 'storeClient' → Expo Go
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  // Kayıtlı olup olmadığını ref ile takip et — effect deps'e fcmToken koymadan erişelim.
  const fcmTokenRef = useRef<string | null>(null);

  const setFcmTokenSynced = useCallback((t: string | null) => {
    fcmTokenRef.current = t;
    _currentFcmToken = t;
    setFcmToken(t);
  }, []);

  // Get FCM token using React Native Firebase
  const getFcmToken = useCallback(async (): Promise<string | null> => {
    if (isExpoGo) {
      console.log('[FCM] Expo Go detected, skipping');
      return null;
    }
    if (!NativeModules.RNFBAppModule) {
      console.warn('[FCM] Native Firebase app not available (missing GoogleService-Info.plist / google-services.json or wrong bundle id)');
      // iOS: Firebase yoksa bile bildirim izni iste → iOS Settings'te "Notifications" satırı görünsün
      if (Platform.OS === 'ios') {
        try {
          const { requestPermissionsAsync } = require('expo-notifications');
          await requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
        } catch { /* sessizce devam */ }
      }
      return null;
    }

    try {
      const { getApp } = require('@react-native-firebase/app');
      getApp('[DEFAULT]');
    } catch {
      console.warn('[FCM] Firebase default app not yet initialized, skipping token fetch');
      return null;
    }

    let messaging;
    try {
      const messagingModule = require('@react-native-firebase/messaging');
      if (!messagingModule || typeof messagingModule.default === 'undefined') {
        console.warn('[FCM] messaging module not available');
        return null;
      }
      messaging = messagingModule.default;
    } catch (requireError: any) {
      console.warn('[FCM] require failed:', requireError?.message);
      return null;
    }

    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const permissionResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (permissionResult !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[FCM] Android POST_NOTIFICATIONS denied:', permissionResult);
          return null;
        }
      }

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('[FCM] Permission not granted, authStatus:', authStatus);
        return null;
      }

      if (Platform.OS === 'ios') {
        try {
          await messaging().registerDeviceForRemoteMessages();
        } catch (regErr: any) {
          console.warn('[FCM] registerDeviceForRemoteMessages:', regErr?.message ?? regErr);
        }
      }

      const fcmTok = await messaging().getToken();
      if (!fcmTok) {
        console.warn('[FCM] getToken() returned empty');
        return null;
      }
      console.log('[FCM] Token obtained successfully');
      return fcmTok;
    } catch (firebaseError: any) {
      console.error('[FCM] Firebase error:', firebaseError?.message ?? firebaseError);
      return null;
    }
  }, [isExpoGo]);

  // Register FCM token with backend
  const registerToken = useCallback(async (tokenToRegister: string) => {
    if (!tokenToRegister || !token) {
      return false;
    }

    try {
      const result = await registerFcmToken({
        fcmToken: tokenToRegister,
        deviceId: Platform.OS,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      if ('error' in result) {
        return false;
      }

      if (result.data?.success) {
        setFcmTokenSynced(tokenToRegister);
        setIsRegistered(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [token, registerFcmToken, setFcmTokenSynced]);

  // Unregister FCM token — token kontrolü olmadan; auth geçerliyken çağrılmalı.
  const unregisterToken = useCallback(async (tokenToUnregister: string) => {
    if (!tokenToUnregister) {
      return false;
    }

    try {
      const result = await unregisterFcmToken({
        fcmToken: tokenToUnregister,
      });

      if ('error' in result) {
        return false;
      }

      if (result.data?.success) {
        setFcmTokenSynced(null);
        setIsRegistered(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [unregisterFcmToken, setFcmTokenSynced]);

  // Initialize FCM token on mount and when user logs in.
  // fcmToken intentionally NOT in deps — prevents double-registration loop.
  useEffect(() => {
    if (!token) {
      // Auth temizlendi; local state sıfırla (unregister logout'ta yapılır).
      setFcmTokenSynced(null);
      setIsRegistered(false);
      return;
    }

    const initializeFcm = async () => {
      // 4 saniyelik gecikme: konum izni diyaloğu bitmeden bildirim izni açılmasın.
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const newFcmToken = await getFcmToken();
      if (newFcmToken) {
        await registerToken(newFcmToken);
      }
    };

    initializeFcm().catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // FCM token rotation: backend kaydı güncel kalsın (özellikle iOS).
  useEffect(() => {
    if (!token || isExpoGo || !NativeModules.RNFBAppModule) return;

    try {
      const { getApp } = require('@react-native-firebase/app');
      getApp('[DEFAULT]');
    } catch {
      return;
    }

    let messagingModule: any;
    try {
      messagingModule = require('@react-native-firebase/messaging');
      if (!messagingModule?.default) return;
    } catch {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = messagingModule.default().onTokenRefresh(async (newToken: string) => {
        if (!newToken) return;
        await registerToken(newToken);
      });
    } catch {
      return;
    }

    return unsubscribe;
  }, [token, isExpoGo, registerToken]);

  return {
    fcmToken,
    isRegistered,
    registerToken,
    unregisterToken,
    getFcmToken,
  };
};

/**
 * Logout öncesi FCM token'ı sil. Auth token hâlâ geçerliyken çağrılmalı.
 * handleLogout içinde `await logout(...)` çağrısından ÖNCE kullanılır.
 */
export function getCurrentFcmToken(): string | null {
  return _currentFcmToken;
}
