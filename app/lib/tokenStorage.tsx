import * as Keychain from 'react-native-keychain';

const SERVICE = 'com.hairdresser.app.tokens';

export async function saveTokens(tokens: any) {
    await Keychain.setGenericPassword(
        'tokens',
        JSON.stringify(tokens),
        { service: SERVICE, accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
    );
}

export async function loadTokens() {
    const result = await Keychain.getGenericPassword({ service: SERVICE });
    if (!result) return null;
    try {
        return JSON.parse(result.password);
    } catch {
        return null;
    }
}

export async function clearStoredTokens() {
    await Keychain.resetGenericPassword({ service: SERVICE });
}
