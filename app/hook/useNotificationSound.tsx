import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './useAuth';
import { useGetSettingQuery } from '../store/api';

// Local notification sound - no network dependency
const NOTIFICATION_SOUND = require('../../assets/sounds/notificationmessage.mp3');

/**
 * Hook to play notification sound when badge count changes
 * Plays sound when:
 * 1. Badge count increases (new notification received)
 * 2. App is opened and there are unread notifications (first time only)
 * 
 * ÖNEMLİ: 
 * - Ses sadece bildirimi alan kullanıcıda çalar (badge count artışı kontrolü ile)
 * - Aynı anda birden fazla bildirim gelirse, zaten çalan bir ses varsa diğerleri çalmaz
 * - Cooldown süresi (3 saniye) içinde yeni bildirimler için ses çalmaz
 * - CRITICAL FIX: Manuel refresh sonrası da ses çalar (eğer yeni bildirim varsa)
 * 
 * Sound source: Local asset (assets/sounds/notification.mp3) - network bağımsız, anında çalar
 * Ses dosyasının kendi süresi var (3 saniye), otomatik biter - döngüye gerek yok
 */
export const useNotificationSound = (notificationBadgeCount: number, chatBadgeCount: number) => {
    const { isAuthenticated } = useAuth();
    const { data: settingData } = useGetSettingQuery(undefined, { skip: !isAuthenticated });
    const soundEnabled = settingData?.data?.enableNotificationSound ?? true;

    // CRITICAL FIX: Initialize with -1 to detect first real value
    // This ensures sound plays on manual refresh if there are new notifications
    const previousBadgeCountRef = useRef<number>(-1);
    const soundRef = useRef<Audio.Sound | null>(null);
    const hasPlayedOnMountRef = useRef<boolean>(false);
    const appStateRef = useRef<AppStateStatus>('active');
    const lastSoundPlayTimeRef = useRef<number>(0);
    const SOUND_COOLDOWN_MS = 3000; // 3 saniye cooldown - çoklu bildirimlerde her biri için ses çalmasın
    const isPlayingRef = useRef<boolean>(false); // Şu anda bir ses çalıyor mu kontrolü
    const isInitializedRef = useRef<boolean>(false); // İlk değer alındı mı?
    const previousAuthStateRef = useRef<boolean>(isAuthenticated); // Track auth state changes
    // Badge refetch / okundu sonrası kısa süre 0 görünüp eski değere dönmesi sesi tetiklemesin
    const lastNonZeroBeforeZeroRef = useRef<number>(0);
    const zeroedAtMsRef = useRef<number | null>(null);

    // Set audio mode for notifications - iOS sessiz modda bile çalsın
    useEffect(() => {
        const setupAudioMode = async () => {
            try {
                // expo-av paketindeki Audio.setAudioModeAsync kullanılıyor
                // Eğer bu method yoksa veya hata veriyorsa, ses yine de çalacak
                // Sadece iOS sessiz modda çalmayabilir
                if (Audio.setAudioModeAsync) {
                    await Audio.setAudioModeAsync({
                        playsInSilentModeIOS: true,
                        staysActiveInBackground: false,
                        shouldDuckAndroid: true,
                        playThroughEarpieceAndroid: false,
                    });
                }
            } catch (error) {
                // Audio mode ayarlanamadıysa sessizce devam et
                // Ses yine de çalacak, sadece iOS silent modda çalmayabilir
            }
        };

        setupAudioMode();
    }, []);

    // Monitor app state
    useEffect(() => {
        try {
            const subscription = AppState.addEventListener('change', (nextAppState) => {
                appStateRef.current = nextAppState;
            });
            return () => subscription.remove();
        } catch {
            // Parse hatası durumunda sessizce devam et
            return () => { }; // Return a no-op cleanup function
        }
    }, []);

    // CRITICAL FIX: Reset refs when authentication state changes (logout/login)
    useEffect(() => {
        const authChanged = previousAuthStateRef.current !== isAuthenticated;

        if (authChanged) {
            if (!isAuthenticated) {
                // Logout: Reset all refs
                previousBadgeCountRef.current = -1;
                hasPlayedOnMountRef.current = false;
                isInitializedRef.current = false;
                lastSoundPlayTimeRef.current = 0;
                lastNonZeroBeforeZeroRef.current = 0;
                zeroedAtMsRef.current = null;

                // Stop any playing sound
                if (soundRef.current) {
                    soundRef.current.stopAsync().catch(() => { });
                    soundRef.current.unloadAsync().catch(() => { });
                    soundRef.current = null;
                }
                isPlayingRef.current = false;
            } else {
                // Login: Reset initialization state to detect new badge count
                previousBadgeCountRef.current = -1;
                isInitializedRef.current = false;
                hasPlayedOnMountRef.current = false;
                // Don't reset lastSoundPlayTimeRef - allow immediate sound on first notification
            }

            previousAuthStateRef.current = isAuthenticated;
        }
    }, [isAuthenticated]);

    // Play sound when badge count increases
    useEffect(() => {
        const badgeCount = (notificationBadgeCount || 0) + (chatBadgeCount || 0);
        const previousCount = previousBadgeCountRef.current;

        // ÖNEMLİ: Okunmayan bildirim yoksa ses çalmamalı
        if (badgeCount === 0) {
            if (previousCount > 0) {
                lastNonZeroBeforeZeroRef.current = previousCount;
                zeroedAtMsRef.current = Date.now();
            }
            // First value received - just store it
            if (!isInitializedRef.current) {
                isInitializedRef.current = true;
            }
            previousBadgeCountRef.current = badgeCount;
            return;
        }

        // CRITICAL FIX: Handle initial value (first render)
        // If previousCount is -1 (initial), this is the first real value
        // We should NOT play sound for this (it's app load, not new notification)
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            previousBadgeCountRef.current = badgeCount;
            // But if app was opened with notifications, play once
            if (badgeCount > 0 && appStateRef.current === 'active') {
                if (soundRef.current === null && !isPlayingRef.current) {
                    hasPlayedOnMountRef.current = true;
                    playNotificationSound();
                }
            }
            return;
        }

        // Play sound if:
        // 1. Badge count increased (new notification)
        // 2. App just opened with notifications (first time only) - handled above
        if (badgeCount > previousCount) {
            const nowMs = Date.now();
            const likelyStaleRefetch =
                previousCount === 0 &&
                lastNonZeroBeforeZeroRef.current > 0 &&
                zeroedAtMsRef.current != null &&
                nowMs - zeroedAtMsRef.current < 4000 &&
                badgeCount === lastNonZeroBeforeZeroRef.current;
            if (likelyStaleRefetch) {
                zeroedAtMsRef.current = null;
                lastNonZeroBeforeZeroRef.current = 0;
                previousBadgeCountRef.current = badgeCount;
                return;
            }

            // New notification received - sadece cooldown süresi geçtiyse VE şu anda çalan bir ses yoksa ses çal
            const now = Date.now();
            const timeSinceLastSound = now - lastSoundPlayTimeRef.current;
            const isSoundCurrentlyPlaying = soundRef.current !== null || isPlayingRef.current;

            // hasPlayedOnMountRef'i her zaman true yap - count artışında backup check tetiklenmesin
            hasPlayedOnMountRef.current = true;

            // Eğer bir ses zaten çalıyorsa veya cooldown süresi geçmediyse, yeni ses çalma
            if (!isSoundCurrentlyPlaying && timeSinceLastSound >= SOUND_COOLDOWN_MS) {
                playNotificationSound();
            }
        } else if (!hasPlayedOnMountRef.current && badgeCount > 0 && appStateRef.current === 'active') {
            // App opened with existing notifications (play once) - backup check
            // Sadece şu anda çalan bir ses yoksa çal
            if (soundRef.current === null && !isPlayingRef.current) {
                hasPlayedOnMountRef.current = true;
                playNotificationSound();
            }
        }

        previousBadgeCountRef.current = badgeCount;
    }, [notificationBadgeCount, chatBadgeCount, soundEnabled]);

    const playNotificationSound = async () => {
        // Only play if app is active
        if (appStateRef.current !== 'active') {
            return;
        }

        if (!soundEnabled) {
            return;
        }

        // ÖNEMLİ: Okunmayan bildirim yoksa ses çalmamalı
        const totalBadgeCount = (notificationBadgeCount || 0) + (chatBadgeCount || 0);
        if (totalBadgeCount === 0) {
            return;
        }

        // ÖNEMLİ: Eğer bir ses zaten çalıyorsa, yeni ses çalma (aynı anda birden fazla bildirim gelirse)
        if (soundRef.current !== null || isPlayingRef.current) {
            return;
        }

        // Cooldown kontrolü - son ses çalınmasından bu yana 3 saniye geçti mi?
        const now = Date.now();
        const timeSinceLastSound = now - lastSoundPlayTimeRef.current;
        if (timeSinceLastSound < SOUND_COOLDOWN_MS) {
            return;
        }

        // Ses çalmaya başladığını işaretle
        isPlayingRef.current = true;

        try {
            // Local notification sound - anında çalar, network bağımsız
            const { sound } = await Audio.Sound.createAsync(
                NOTIFICATION_SOUND,
                {
                    shouldPlay: true,
                    volume: 0.6,
                    isLooping: false,
                    shouldCorrectPitch: true,
                    rate: 1.0
                }
            );

            soundRef.current = sound;
            lastSoundPlayTimeRef.current = Date.now(); // Ses çalma zamanını kaydet

            // Ses dosyası bittiğinde otomatik olarak durdur (ses dosyasının kendi süresi var, döngüye gerek yok)
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    // Ses dosyası bitti, temizle
                    if (soundRef.current) {
                        soundRef.current.unloadAsync().catch(() => { });
                        soundRef.current = null;
                    }
                    isPlayingRef.current = false;
                }
            });
        } catch (error) {
            // Hata durumunda ses çalma durumunu sıfırla
            isPlayingRef.current = false;
            // Silently fail - don't interrupt user experience
            // If sound fails to load, user can still use the app normally
            // Notification sound not available - silently fail
        }
    };

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(() => { });
            }
            isPlayingRef.current = false;
        };
    }, []);
};

