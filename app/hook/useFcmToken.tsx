import { useEffect, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './useAuth';
import { api } from '../store/api';

/**
 * Firebase Cloud Messaging token management hook
 * Handles FCM token registration and updates
 * Note: Requires native build (expo-dev-client) - does not work in Expo Go
 */
export const useFcmToken = () => {
  const { token } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registerFcmToken] = api.useRegisterFcmTokenMutation();
  const [unregisterFcmToken] = api.useUnregisterFcmTokenMutation();

  // appOwnership === 'expo' = Expo Go; null/undefined = native build
  const isExpoGo = Constants.appOwnership === 'expo';

  // Get FCM token using React Native Firebase
  const getFcmToken = useCallback(async (): Promise<string | null> => {
    if (isExpoGo) {
      console.log('[FCM] Expo Go detected, skipping');
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
        deviceId: Platform.OS, // Can be enhanced with device-specific ID
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      if ('error' in result) {
        // Error registering FCM token - silently fail
        return false;
      }

      if (result.data?.success) {
        setFcmToken(tokenToRegister);
        setIsRegistered(true);
        return true;
      }
      return false;
    } catch (error) {
      // Error registering FCM token - silently fail
      return false;
    }
  }, [token, registerFcmToken]);

  // Unregister FCM token
  const unregisterToken = useCallback(async (tokenToUnregister: string) => {
    if (!tokenToUnregister || !token) {
      return false;
    }

    try {
      const result = await unregisterFcmToken({
        fcmToken: tokenToUnregister,
      });

      if ('error' in result) {
        // Error unregistering FCM token - silently fail
        return false;
      }

      if (result.data?.success) {
        setFcmToken(null);
        setIsRegistered(false);
        return true;
      }
      return false;
    } catch (error) {
      // Error unregistering FCM token - silently fail
      return false;
    }
  }, [token, unregisterFcmToken]);

  // Initialize FCM token on mount and when user logs in
  useEffect(() => {
    if (!token) {
      // User not logged in, unregister if token exists
      if (fcmToken) {
        unregisterToken(fcmToken);
      }
      return;
    }

    // User logged in, get and register FCM token
    // 4 saniyelik gecikme: konum izni diyaloğu tamamlanmadan bildirim izni açılmasın
    // (Android aynı anda iki sistem diyaloğunu gösteremiyor, biri diğerini kapatıyor)
    const initializeFcm = async () => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      const token = await getFcmToken();
      if (token) {
        await registerToken(token);
      }
    };

    initializeFcm();
  }, [token, getFcmToken, registerToken, unregisterToken, fcmToken]);

  // FCM token rotation: backend kaydı güncel kalsın (özellikle iOS).
  useEffect(() => {
    if (!token || isExpoGo) return; // isExpoGo = appOwnership === 'expo'

    let messagingModule: any;
    try {
      messagingModule = require('@react-native-firebase/messaging');
      if (!messagingModule?.default) return;
    } catch {
      return;
    }

    const unsubscribe = messagingModule.default().onTokenRefresh(async (newToken: string) => {
      if (!newToken) return;
      await registerToken(newToken);
    });

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

