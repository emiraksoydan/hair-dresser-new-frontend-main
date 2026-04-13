let accessToken: string | null = null;
let refreshToken: string | null = null;
let isRefreshing = false;
/**
 * Oturum kimliği: hesap geçişi / çıkış sonrası artar.
 * Arka planda biten eski refresh sonuçları tokenStore'u ezmesin diye baseQuery bunu kullanır.
 */
let tokenEpoch = 0;
/**
 * Hesap geçişi devam ederken true.
 * Bu flag açıkken baseQueryWithReauth başarısız refresh sonrası
 * tokenStore.clear() çağırmamalı — o token artık farklı hesaba ait.
 */
let switchingAccount = false;

// Listener for token changes (SignalR reconnection etc.)
type TokenChangeListener = (hasToken: boolean, token?: string | null) => void;
const tokenChangeListeners: TokenChangeListener[] = [];

// Listener for refresh state changes
type RefreshStateListener = (isRefreshing: boolean) => void;
const refreshStateListeners: RefreshStateListener[] = [];

export function bumpTokenEpoch() {
  tokenEpoch += 1;
}

export const tokenStore = {
  get access() { return accessToken; },
  get refresh() { return refreshToken; },
  get tokenEpoch() { return tokenEpoch; },
  set(tokens: { accessToken: string; refreshToken: string }) {
    const previousToken = accessToken;
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    // Always notify listeners when token is set (login, refresh, re-login)
    if (accessToken && accessToken !== previousToken) {
      tokenChangeListeners.forEach(listener => listener(true, accessToken));
    }
  },
  clear() {
    tokenEpoch += 1;
    const hadToken = !!accessToken;
    accessToken = null;
    refreshToken = null;
    // Notify listeners that token is cleared
    if (hadToken) {
      tokenChangeListeners.forEach(listener => listener(false, null));
    }
  },
  // Subscribe to token changes
  onTokenChange(listener: TokenChangeListener) {
    tokenChangeListeners.push(listener);
    return () => {
      const index = tokenChangeListeners.indexOf(listener);
      if (index >= 0) tokenChangeListeners.splice(index, 1);
    };
  },
  // Refresh state management
  get isRefreshing() { return isRefreshing; },
  setRefreshing(value: boolean) {
    isRefreshing = value;
    refreshStateListeners.forEach(listener => listener(value));
  },
  // Subscribe to refresh state changes (for SignalR)
  onRefreshStateChange(listener: RefreshStateListener) {
    refreshStateListeners.push(listener);
    return () => {
      const index = refreshStateListeners.indexOf(listener);
      if (index >= 0) refreshStateListeners.splice(index, 1);
    };
  },
  // Hesap geçişi flag'i
  get isSwitchingAccount() { return switchingAccount; },
  setAccountSwitching(value: boolean) { switchingAccount = value; },
};
