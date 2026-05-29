import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { InteractionManager } from 'react-native';
import { jwtDecode } from 'jwt-decode';
import i18n from 'i18next';
import {
  loadAllAccounts,
  upsertAccount,
  updateAccountTokens,
  pruneStaleSavedAccounts,
  refreshInactiveAccounts,
  markAccountNeedsReauth,
  clearAccountReauthFlag,
  removeAccount,
  refreshAccountIfNeeded,
  SavedAccount,
} from '../lib/multiAccountStorage';
import { clearStoredTokens } from '../lib/tokenStorage';
import { showSnack } from '../store/snackbarSlice';
import { UserType } from '../types';
import { tokenStore, bumpTokenEpoch } from '../lib/tokenStore';
import { saveTokens } from '../lib/tokenStorage';
import { resetSignalRState } from '../store/signalrSlice';
import { api } from '../store/api';
import { clearRefreshLock, isExpired } from '../store/baseQuery';
import { useAppDispatch } from '../store/hook';
import { JwtPayload } from '../types';
import { pathByUserType } from '../utils/auth/redirect-by-user-type';
import { useRouter } from 'expo-router';
import { API_CONFIG } from '../constants/api';

const NAME_ID_CLAIM =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

function extractUserId(decoded: Partial<JwtPayload> & Record<string, any>): string | null {
  return (
    decoded.identifier ||
    decoded.sub ||
    decoded.userId ||
    decoded.nameid ||
    decoded[NAME_ID_CLAIM] ||
    null
  );
}

/**
 * Liste/prune öncesi: bellekteki güncel tokenları kayıtlı hesaba yazar.
 * Aksi halde diskte eski refresh kalmış olabilir; pruneStaleSavedAccounts yanlışlıkla aktif oturumu siler.
 */
async function persistActiveTokensToSavedAccounts(): Promise<void> {
  const access = tokenStore.access;
  const refresh = tokenStore.refresh;
  if (!access || !refresh) return;
  try {
    const decoded = jwtDecode<JwtPayload>(access);
    const uid = extractUserId(decoded as any);
    if (!uid) return;
    const existing = await loadAllAccounts();
    const prev = existing.find((a) => a.id.toLowerCase() === uid.toLowerCase());
    const userTypeStr = (decoded.userType ?? '').toLowerCase();
    let ut = UserType.Customer;
    if (userTypeStr === 'freebarber') ut = UserType.FreeBarber;
    else if (userTypeStr === 'barberstore') ut = UserType.BarberStore;
    const displayName = [decoded.name, decoded.lastName].filter(Boolean).join(' ');
    await upsertAccount({
      id: uid,
      userType: ut,
      displayName: displayName || prev?.displayName || uid,
      phone: prev?.phone ?? '',
      accessToken: access,
      refreshToken: refresh,
      savedAt: prev?.savedAt ?? Date.now(),
    });
  } catch {
    /* ignore */
  }
}

interface MultiAccountContextValue {
  accounts: SavedAccount[];
  currentUserId: string | null;
  isSwitchingAccount: boolean;
  refreshAccounts: () => Promise<void>;
  /** Sheet açılmadan önce ölü oturumları temizler (liste güncellenir). */
  prepareAccountSwitcherList: () => Promise<void>;
  switchAccount: (target: SavedAccount) => Promise<void>;
  /** Called by BaseTabLayout to register the "open account switcher" trigger */
  registerOpenAccountSwitcher: (fn: () => void) => void;
  /** Opens the account switcher sheet (registered by BaseTabLayout) */
  openAccountSwitcher: () => void;
  /** Hesap → unread notification count (sadece aktif olmayan hesaplar için anlamlı;
   *  aktif hesabın gerçek değeri RTK Query Badge'de). */
  accountBadges: Record<string, number>;
  /** Switcher açılınca tetiklenir: tüm aktif olmayan hesapların `Badge` endpoint'ini
   *  paralel çağırıp local cache'i tazeler. 60s memoize edilir. */
  refreshAccountBadges: (force?: boolean) => Promise<void>;
  /** Foreground push geldiğinde cross-account unread sayısını lokal arttırır. */
  incrementAccountBadge: (userId: string, by?: number) => void;
  /** Kayıtlı hesabı cihaz listesinden siler (yeniden giriş isteyen dahil). Aktif hesapsa kalan hesaba geçer veya çıkış. */
  removeSavedAccount: (id: string) => Promise<void>;
}

const MultiAccountContext = createContext<MultiAccountContextValue>({
  accounts: [],
  currentUserId: null,
  isSwitchingAccount: false,
  refreshAccounts: async () => { },
  prepareAccountSwitcherList: async () => { },
  switchAccount: async () => { },
  registerOpenAccountSwitcher: () => { },
  openAccountSwitcher: () => { },
  accountBadges: {},
  refreshAccountBadges: async () => { },
  incrementAccountBadge: () => { },
  removeSavedAccount: async () => { },
});

const ACCOUNT_BADGE_TTL_MS = 60_000;

export const useMultiAccount = () => useContext(MultiAccountContext);

export const MultiAccountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [accountBadges, setAccountBadges] = useState<Record<string, number>>({});
  const accountBadgesFetchedAtRef = useRef<Record<string, number>>({});
  const router = useRouter();
  const dispatch = useAppDispatch();
  const openSwitcherRef = useRef<(() => void) | null>(null);
  /** Aynı anda iki kez switchAccount (çift dokunuş / yarış) token ve navigasyonu bozar. */
  const accountSwitchLockRef = useRef(false);

  // Tek hesap için unread notification count'u manuel fetch ile çek.
  // RTK Query baseQuery aktif token'ı kullandığı için aktif olmayan hesaplara erişim için
  // doğrudan `fetch` kullanıyoruz; her hesabın kendi accessToken'ı header'a yerleştirilir.
  const fetchAccountBadge = useCallback(async (account: SavedAccount): Promise<number | null> => {
    if (!account.accessToken) return null;
    if (account.needsReauth) return null;
    try {
      const url = `${API_CONFIG.BASE_URL}Badge`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          Accept: 'application/json',
        },
      });
      if (!res.ok) return null;
      const json: any = await res.json().catch(() => null);
      const count: unknown =
        json?.data?.notificationUnreadCount ??
        json?.data?.NotificationUnreadCount ??
        json?.notificationUnreadCount;
      if (typeof count === 'number' && count >= 0) return count;
      return null;
    } catch {
      return null;
    }
  }, []);

  const refreshAccountBadges = useCallback(async (force = false) => {
    const all = await loadAllAccounts();
    const now = Date.now();
    const targets = all.filter((a) => {
      // Aktif hesap atlanır — onun değeri RTK Query getBadgeCounts içinde otoritatif tutulur.
      if (currentUserId && a.id.toLowerCase() === currentUserId.toLowerCase()) return false;
      if (!a.accessToken || a.needsReauth) return false;
      if (force) return true;
      const last = accountBadgesFetchedAtRef.current[a.id] ?? 0;
      return now - last > ACCOUNT_BADGE_TTL_MS;
    });
    if (targets.length === 0) return;
    // Her hesap için paralel — N=2-3 zaten küçük.
    const results = await Promise.all(
      targets.map(async (a) => ({ id: a.id, count: await fetchAccountBadge(a) })),
    );
    setAccountBadges((prev) => {
      const next = { ...prev };
      for (const r of results) {
        if (r.count !== null) {
          next[r.id] = r.count;
          accountBadgesFetchedAtRef.current[r.id] = now;
        }
      }
      return next;
    });
  }, [currentUserId, fetchAccountBadge]);

  const incrementAccountBadge = useCallback((userId: string, by = 1) => {
    if (!userId) return;
    setAccountBadges((prev) => {
      const k = userId;
      const cur = prev[k] ?? 0;
      const nv = Math.max(0, cur + by);
      if (nv === cur) return prev;
      return { ...prev, [k]: nv };
    });
  }, []);

  const refreshAccounts = useCallback(async () => {
    const loaded = await loadAllAccounts();
    setAccounts(loaded);
  }, []);

  const prepareAccountSwitcherList = useCallback(async () => {
    await persistActiveTokensToSavedAccounts();
    await pruneStaleSavedAccounts();
    await refreshAccounts();
    // Sheet açılırken badge'leri tazele — fire-and-forget; sheet açılması bunu beklemez.
    void refreshAccountBadges();
  }, [refreshAccounts, refreshAccountBadges]);

  /**
   * Uygulama açılışında aktif token var ama bu hesap storage'a hiç kaydedilmemişse
   * (feature eklenmeden önce login olan hesaplar) otomatik kaydet.
   */
  const bootstrapCurrentSession = useCallback(async () => {
    const token = tokenStore.access;
    const refresh = tokenStore.refresh;
    if (!token || !refresh) return;
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const uid = extractUserId(decoded as any);
      if (!uid) return;

      const existing = await loadAllAccounts();
      if (existing.find(a => a.id === uid)) return; // Zaten kayıtlı

      // JWT'den bilinen alanlarla kaydet (phone sonradan güncellenebilir)
      const userTypeStr = (decoded.userType ?? '').toLowerCase();
      let ut = UserType.Customer;
      if (userTypeStr === 'freebarber') ut = UserType.FreeBarber;
      else if (userTypeStr === 'barberstore') ut = UserType.BarberStore;

      const displayName = [decoded.name, decoded.lastName].filter(Boolean).join(' ');
      await upsertAccount({
        id: uid,
        userType: ut,
        displayName: displayName || uid,
        phone: '',
        accessToken: token,
        refreshToken: refresh,
        savedAt: Date.now(),
      });
    } catch { }
  }, []);

  const refreshCurrentUser = useCallback(() => {
    const token = tokenStore.access;
    if (!token) {
      setCurrentUserId(null);
      return;
    }
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      setCurrentUserId(extractUserId(decoded as any));
    } catch {
      setCurrentUserId(null);
    }
  }, []);

  useEffect(() => {
    // Önce bootstrap: storage'a kaydedilmemiş mevcut oturumu kaydet
    bootstrapCurrentSession().then(async () => {
      await persistActiveTokensToSavedAccounts();
      refreshAccounts();
      refreshCurrentUser();
      // Aktif olmayan kayıtlı hesapların tokenlarını arka planda yenile.
      // Böylece 30 günlük refresh token süresi dolmadan önce hesap geçişi çalışır.
      const activeId = tokenStore.access
        ? (() => { try { const d = jwtDecode<JwtPayload>(tokenStore.access!); return extractUserId(d as any); } catch { return null; } })()
        : null;
      void refreshInactiveAccounts(activeId).then(() => refreshAccounts());
    });

    const unsubscribe = tokenStore.onTokenChange((hasToken, token) => {
      refreshAccounts();
      refreshCurrentUser();
      if (hasToken && token) {
        try {
          const decoded = jwtDecode<JwtPayload>(token);
          const uid = extractUserId(decoded as any);
          if (uid && tokenStore.refresh) {
            void updateAccountTokens(uid, {
              accessToken: token,
              refreshToken: tokenStore.refresh,
            });
            // Yeni token alındı → reauth flag'ini temizle (re-login flow'undan dönüyor olabilir)
            void clearAccountReauthFlag(uid).then(() => refreshAccounts());
          }
        } catch { }
      }
    });
    return unsubscribe;
  }, [bootstrapCurrentSession, refreshAccounts, refreshCurrentUser]);

  const switchAccount = useCallback(
    async (target: SavedAccount) => {
      if (
        currentUserId != null &&
        target.id.toLowerCase() === currentUserId.toLowerCase()
      ) {
        return;
      }
      if (accountSwitchLockRef.current) return;
      accountSwitchLockRef.current = true;
      // Arka planda süren RTK refresh tamamlanırsa yeni hesabın tokenlarını ezmesin
      bumpTokenEpoch();

      try {
        setIsSwitchingAccount(true);
        tokenStore.setAccountSwitching(true);

        // Overlay'in render olması için 2 frame bekle
        await new Promise<void>(r => setTimeout(r, 48));

        // 1. Mevcut hesabın son tokenlarını kaydet.
        //    try-catch: AsyncStorage hatası kritik yolu engellemesin.
        //    React state (currentUserId) onTokenChange listener'ı sebebiyle stale
        //    olabilir; güvenli yol: aktif access token'ı decode edip id'yi oradan al.
        const currentToken = tokenStore.access;
        const currentRefresh = tokenStore.refresh;
        let savedCurrentId: string | null = currentUserId;
        if (currentToken) {
          try {
            const decoded = jwtDecode<JwtPayload>(currentToken);
            const tid = extractUserId(decoded as any);
            if (tid) savedCurrentId = tid;
          } catch { /* decode hatası: state'deki id kullanılır */ }
        }
        if (currentToken && currentRefresh && savedCurrentId) {
          try {
            await updateAccountTokens(savedCurrentId, {
              accessToken: currentToken,
              refreshToken: currentRefresh,
            });
          } catch { /* storage hatası navigasyonu engellemez */ }
        }

        // 2. Devam eden refresh döngüsünü iptal et
        clearRefreshLock();

        // 3. Hedef hesap: AsyncStorage'dan taze token oku.
        //    React state, onTokenChange listener'ında refreshAccounts() updateAccountTokens()'dan
        //    önce çalışabileceği için stale token tutabilir.
        //    Eski (replaced) bir refreshToken gönderilirse backend reuse-detection (RevokeFamilyAsync)
        //    tetikler ve tüm token ailesini iptal eder.
        let freshTarget = target;
        try {
          const freshAccounts = await loadAllAccounts();
          freshTarget = freshAccounts.find(a => a.id === target.id) ?? target;
        } catch { /* storage hatası: state'den gelen target kullanılır */ }

        // Access süresi dolmuşsa refresh dene.
        // refreshAccountIfNeeded: eş zamanlı başka bir refresh varsa (startup veya
        // pruneStaleSavedAccounts) aynı promise'i bekler — token iki kez gönderilmez.
        if (isExpired(freshTarget.accessToken) && freshTarget.refreshToken) {
          await refreshAccountIfNeeded(target.id);
        }

        // Refresh sonrası storage'dan taze oku (refreshAccountIfNeeded güncelledi)
        let finalAccessToken = freshTarget.accessToken;
        let finalRefreshToken = freshTarget.refreshToken;
        try {
          const afterRefresh = await loadAllAccounts();
          const updated = afterRefresh.find(a => a.id === target.id);
          if (updated) {
            finalAccessToken = updated.accessToken;
            finalRefreshToken = updated.refreshToken;
          }
        } catch { /* storage hatası: freshTarget kullanılır */ }

        const lastRefreshReason = isExpired(finalAccessToken) && freshTarget.needsReauth ? 'invalid' : null;

        // Hâlâ kullanılamıyorsa: kayıtlı hesabı listeden silme; yalnızca kullanıcıya bilgi ver.
        if (isExpired(finalAccessToken)) {
          const msg = lastRefreshReason === 'invalid'
            ? i18n.t('accounts.switchFailedSessionExpired')
            : i18n.t('accounts.switchFailedTryAgain');
          dispatch(
            showSnack({
              message: msg,
              isError: true,
            }),
          );
          // Listeyi tazele ki yeni `needsReauth` flag'i UI'a yansısın.
          void refreshAccounts();
          tokenStore.setAccountSwitching(false);
          setIsSwitchingAccount(false);
          return;
        }

        await resetSignalRState();

        tokenStore.set({
          accessToken: finalAccessToken,
          refreshToken: finalRefreshToken,
        });
        setCurrentUserId(target.id);

        // Kalıcı depolama (Keychain/AsyncStorage) — in-session için zorunlu değil,
        // void ile arka planda çalışsın; hata kritik yolu engellemesin.
        void saveTokens({
          accessToken: finalAccessToken,
          refreshToken: finalRefreshToken,
        });

        // 5. Cache'i temizle ve navigate et — kritik yol.
        const path = pathByUserType(String(target.userType));
        dispatch(api.util.resetApiState());
        router.replace(path as any);

        // 6. Navigation ve re-mount tamamlandıktan sonra flag'leri kapat.
        //    Sabit 600ms yerine InteractionManager + emniyet timeout'u:
        //    • runAfterInteractions → navigation animasyonu bittikten hemen sonra
        //      tetiklenir (hızlı cihazlarda gereksiz bekleme yok).
        //    • 2sn fallback → interactions bir türlü bitmezse (nadir edge case)
        //      UI kilitlenmesin diye zorla kapatır.
        //    flagClosed guard → iki yolun aynı anda bitip çift çağrı yapmasını önler.
        let flagClosed = false;
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
        const closeSwitchingFlags = () => {
          if (flagClosed) return;
          flagClosed = true;
          if (fallbackTimer) clearTimeout(fallbackTimer);
          tokenStore.setAccountSwitching(false);
          setIsSwitchingAccount(false);
        };
        fallbackTimer = setTimeout(closeSwitchingFlags, 2000);
        InteractionManager.runAfterInteractions(closeSwitchingFlags);

      } catch {
        tokenStore.setAccountSwitching(false);
        setIsSwitchingAccount(false);
      } finally {
        accountSwitchLockRef.current = false;
      }
    },
    [currentUserId, dispatch, refreshAccounts, router]
  );

  const registerOpenAccountSwitcher = useCallback((fn: () => void) => {
    openSwitcherRef.current = fn;
  }, []);

  const openAccountSwitcher = useCallback(() => {
    openSwitcherRef.current?.();
  }, []);

  const removeSavedAccount = useCallback(
    async (id: string) => {
      const idLower = id.toLowerCase();
      const isRemovingActive =
        currentUserId != null && currentUserId.toLowerCase() === idLower;

      await removeAccount(id);

      setAccountBadges((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.toLowerCase() === idLower) delete next[k];
        }
        return next;
      });
      for (const k of Object.keys(accountBadgesFetchedAtRef.current)) {
        if (k.toLowerCase() === idLower) delete accountBadgesFetchedAtRef.current[k];
      }

      await refreshAccounts();

      if (isRemovingActive) {
        const remaining = await loadAllAccounts();
        if (remaining.length > 0) {
          const nextAcc = [...remaining].sort((a, b) => b.savedAt - a.savedAt)[0]!;
          await switchAccount(nextAcc);
        } else {
          await resetSignalRState();
          dispatch(api.util.resetApiState());
          tokenStore.clear();
          await clearStoredTokens();
          setCurrentUserId(null);
          router.replace("(auth)" as any);
        }
      }

      dispatch(
        showSnack({
          message: i18n.t("accounts.removedFromList"),
          isError: false,
        }),
      );
    },
    [currentUserId, refreshAccounts, switchAccount, dispatch, router],
  );

  // Also expose upsertAccount so auth can call it via context (optional helper)
  const value = useMemo<MultiAccountContextValue>(
    () => ({
      accounts,
      currentUserId,
      isSwitchingAccount,
      refreshAccounts,
      prepareAccountSwitcherList,
      switchAccount,
      registerOpenAccountSwitcher,
      openAccountSwitcher,
      accountBadges,
      refreshAccountBadges,
      incrementAccountBadge,
      removeSavedAccount,
    }),
    [
      accounts,
      currentUserId,
      isSwitchingAccount,
      refreshAccounts,
      prepareAccountSwitcherList,
      switchAccount,
      registerOpenAccountSwitcher,
      openAccountSwitcher,
      accountBadges,
      refreshAccountBadges,
      incrementAccountBadge,
      removeSavedAccount,
    ]
  );

  return (
    <MultiAccountContext.Provider value={value}>
      {children}
    </MultiAccountContext.Provider>
  );
};
