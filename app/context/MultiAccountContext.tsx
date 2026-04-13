import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import i18n from 'i18next';
import {
  loadAllAccounts,
  upsertAccount,
  updateAccountTokens,
  removeAccount,
  pruneStaleSavedAccounts,
  SavedAccount,
} from '../lib/multiAccountStorage';
import { showSnack } from '../store/snackbarSlice';
import { UserType } from '../types';
import { tokenStore, bumpTokenEpoch } from '../lib/tokenStore';
import { saveTokens } from '../lib/tokenStorage';
import { resetSignalRState } from '../store/signalrSlice';
import { api } from '../store/api';
import { clearRefreshLock, isExpired, attemptTokenRefresh } from '../store/baseQuery';
import { useAppDispatch } from '../store/hook';
import { JwtPayload } from '../types';
import { pathByUserType } from '../utils/auth/redirect-by-user-type';
import { useRouter } from 'expo-router';

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
});

export const useMultiAccount = () => useContext(MultiAccountContext);

export const MultiAccountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const openSwitcherRef = useRef<(() => void) | null>(null);
  /** Aynı anda iki kez switchAccount (çift dokunuş / yarış) token ve navigasyonu bozar. */
  const accountSwitchLockRef = useRef(false);

  const refreshAccounts = useCallback(async () => {
    const loaded = await loadAllAccounts();
    setAccounts(loaded);
  }, []);

  const prepareAccountSwitcherList = useCallback(async () => {
    await pruneStaleSavedAccounts();
    await refreshAccounts();
  }, [refreshAccounts]);

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
    bootstrapCurrentSession().then(() => {
      refreshAccounts();
      refreshCurrentUser();
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
        const currentToken = tokenStore.access;
        const currentRefresh = tokenStore.refresh;
        const savedCurrentId = currentUserId;
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

        let finalAccessToken = freshTarget.accessToken;
        let finalRefreshToken = freshTarget.refreshToken;

        // Yalnızca access token gerçekten süresi dolmuşsa refresh yap.
        // Geçerli bir token için gereksiz refresh → rotated refreshToken → reuse-detection riski.
        if (isExpired(freshTarget.accessToken) && freshTarget.refreshToken) {
          const refreshed = await attemptTokenRefresh(freshTarget.refreshToken);
          if (refreshed) {
            finalAccessToken = refreshed.accessToken;
            finalRefreshToken = refreshed.refreshToken;
            void updateAccountTokens(target.id, {
              accessToken: finalAccessToken,
              refreshToken: finalRefreshToken,
            });
          }
        }

        // 4. Her iki token da geçersizse (refresh token revoke edilmiş) hesabı sil + bildir.
        //    Normal kullanımda buraya düşülmez; yalnızca güvenlik olayı sonrası olur.
        if (isExpired(finalAccessToken)) {
          void removeAccount(target.id).catch(() => {});
          await refreshAccounts();
          await pruneStaleSavedAccounts();
          await refreshAccounts();
          const list = await loadAllAccounts();
          const fallback = list
            .filter(
              (a) =>
                currentUserId == null ||
                a.id.toLowerCase() !== currentUserId.toLowerCase()
            )
            .sort((a, b) => b.savedAt - a.savedAt)[0];

          if (fallback) {
            dispatch(
              showSnack({
                message: i18n.t('accounts.sessionRevokedSwitching'),
                isError: true,
              })
            );
            tokenStore.setAccountSwitching(false);
            setIsSwitchingAccount(false);
            setTimeout(() => {
              void switchAccount(fallback);
            }, 0);
            return;
          }

          dispatch(
            showSnack({
              message: i18n.t('accounts.sessionRevoked'),
              isError: true,
            })
          );
          tokenStore.setAccountSwitching(false);
          setIsSwitchingAccount(false);
          return;
        }

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

        // 6. Navigation tamamlandıktan sonra flag'leri kapat
        setTimeout(() => {
          tokenStore.setAccountSwitching(false);
          setIsSwitchingAccount(false);
        }, 600);

        // 7. SignalR'ı arka planda temizle
        void resetSignalRState();
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
    ]
  );

  return (
    <MultiAccountContext.Provider value={value}>
      {children}
    </MultiAccountContext.Provider>
  );
};
