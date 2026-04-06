import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearHelpGuidePendingLocal } from './helpGuideOnboarding';

const ASYNC_KEY = 'auth_tokens_v1';
const SERVICE = 'com.hairdresser.app.tokens';

// Keychain native modülü — production build'de (EAS Build) çalışır.
// Expo Go / bağlantısız ortamda modül undefined gelir, o zaman AsyncStorage'a düşer.
function getKeychain() {
    try {
        return require('react-native-keychain') as typeof import('react-native-keychain');
    } catch {
        return null;
    }
}

export async function saveTokens(tokens: any) {
    const Keychain = getKeychain();
    if (Keychain?.setGenericPassword) {
        try {
            await Keychain.setGenericPassword(
                'tokens',
                JSON.stringify(tokens),
                { service: SERVICE, accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
            );
            return;
        } catch {}
    }
    await AsyncStorage.setItem(ASYNC_KEY, JSON.stringify(tokens));
}

export async function loadTokens() {
    const Keychain = getKeychain();
    if (Keychain?.getGenericPassword) {
        try {
            const result = await Keychain.getGenericPassword({ service: SERVICE });
            if (result && result.password) return JSON.parse(result.password);
        } catch {}
    }
    const s = await AsyncStorage.getItem(ASYNC_KEY);
    return s ? JSON.parse(s) : null;
}

export async function clearStoredTokens() {
    const Keychain = getKeychain();
    if (Keychain?.resetGenericPassword) {
        try {
            await Keychain.resetGenericPassword({ service: SERVICE });
        } catch {}
    }
    await AsyncStorage.removeItem(ASYNC_KEY);
    await clearHelpGuidePendingLocal();
}
