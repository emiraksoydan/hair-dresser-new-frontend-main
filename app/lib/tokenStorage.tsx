import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = 'auth_tokens_v1';

export async function saveTokens(tokens: any) {
    await AsyncStorage.setItem(KEY, JSON.stringify(tokens));
}
export async function loadTokens() {
    const s = await AsyncStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
}
export async function clearStoredTokens() {
    await AsyncStorage.removeItem(KEY);
}
