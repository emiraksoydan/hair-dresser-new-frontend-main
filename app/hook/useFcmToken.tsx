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

  // Check if we're in Expo Go (where native modules don't work)
  // Expo Go: executionEnvironment === 'storeClient'
  // Native build: executionEnvironment === 'standalone' | 'bare' | undefined
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  // Get FCM token using React Native Firebase
  const getFcmToken = useCallback(async (): Promise<string | null> => {
    // Skip in Expo Go - native modules not available
    if (isExpoGo) {
      // Silently skip - this is expected in Expo Go
      return null;
    }

    try {
      // Safely check if module exists before requiring
      let messaging;
      try {
        // Use dynamic import check - if module doesn't exist, this will throw
        const messagingModule = require('@react-native-firebase/messaging');

        // Check if module and default export exist
        if (!messagingModule) {
          return null;
        }

        // Check if default export exists (it might be undefined in Expo Go)
        if (typeof messagingModule.default === 'undefined') {
          return null;
        }

        messaging = messagingModule.default;
      } catch (requireError: any) {
        // Module doesn't exist or can't be loaded (expected in Expo Go)
        // Silently return null - this is not an error condition
        return null;
      }

      // If we get here, messaging should be available
      if (!messaging) {
        return null;
      }

      try {
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const permissionResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          if (permissionResult !== PermissionsAndroid.RESULTS.GRANTED) {
            return null;
          }
        }

        // Request permission for Firebase
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          // Firebase messaging permission not granted
          return null;
        }

        // Get FCM token
        const token = await messaging().getToken();
        return token || null;
      } catch (firebaseError) {
        // Firebase messaging error - log but don't throw
        // Firebase messaging error - silently fail
        return null;
      }
    } catch (error) {
      // Any other error - silently return null
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
    if (!token || isExpoGo) return;

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

