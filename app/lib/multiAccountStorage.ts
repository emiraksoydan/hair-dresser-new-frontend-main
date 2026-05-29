import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserType } from '../types';
import { isExpired, attemptTokenRefreshWithReason } from '../store/baseQuery';

const ACCOUNTS_KEY = 'multi_accounts_v1';
// iOS'ta uygulama silinse bile Keychain bazı durumlarda kalır (özellikle ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY).
// Bu sayede app silinip kurulunca tüm kayıtlı hesaplar geri yüklenebilir, sadece son aktif hesap değil.
const KEYCHAIN_SERVICE = 'com.hairdresser.app.accounts';

function getKeychain() {
  try {
    return require('react-native-keychain') as typeof import('react-native-keychain');
  } catch {
    return null;
  }
}

/**
 * Hesap listesini Keychain'e yedekler. AsyncStorage primary; Keychain backup.
 * Yazma hatasını yutuyoruz — Keychain bazı emülatörlerde / Expo Go'da çalışmaz.
 */
async function backupAccountsToKeychain(serialized: string): Promise<void> {
  const Keychain = getKeychain();
  if (!Keychain?.setGenericPassword) return;
  try {
    await Keychain.setGenericPassword(
      'accounts',
      serialized,
      {
        service: KEYCHAIN_SERVICE,
        // AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: cihaz unlocked olduktan sonra erişilebilir,
        // device transfer / restore'da kaybolmaz; sadece bu cihaza özel.
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      },
    );
  } catch {
    /* sessizce devam */
  }
}

/**
 * Keychain'den hesap listesi oku — AsyncStorage boşsa fallback olarak kullanılır.
 * Genellikle sadece app silinip yeniden kurulunca tetiklenir.
 */
async function restoreAccountsFromKeychain(): Promise<SavedAccount[] | null> {
  const Keychain = getKeychain();
  if (!Keychain?.getGenericPassword) return null;
  try {
    const result = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (result && (result as any).password) {
      const parsed = JSON.parse((result as any).password);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* sessizce devam */
  }
  return null;
}

/** Okuma-yazma yarışlarını önle (hesap geçişi + token listener aynı anda yazmasın). */
let writeChain: Promise<unknown> = Promise.resolve();

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeChain.then(fn, fn);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Per-account refresh deduplication.
 * Aynı hesap için eş zamanlı iki refresh başlarsa ikinci çağrı ilkinin
 * promise'ini bekler — aynı refresh token iki kez gönderilmez.
 * Backend'in reuse-detection'ı (RevokeFamilyAsync) bu senaryo için devreye girer
 * ve tüm token ailesini iptal eder; bunu önlemek için bu lock şart.
 */
const inProgressRefreshes = new Map<string, Promise<void>>();

export async function refreshAccountIfNeeded(accountId: string): Promise<void> {
  const key = accountId.toLowerCase();

  // Zaten devam eden bir refresh varsa onu bekle (aynı promise)
  const existing = inProgressRefreshes.get(key);
  if (existing) return existing;

  const p = (async () => {
    // Fresh okuma: başka bir yol bu hesabı zaten refresh etmiş olabilir
    const accounts = await loadAllAccounts();
    const a = accounts.find(x => x.id.toLowerCase() === key);
    if (!a || !a.refreshToken || !isExpired(a.accessToken)) return;

    const result = await attemptTokenRefreshWithReason(a.refreshToken);
    if (result.ok) {
      await updateAccountTokens(a.id, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      await clearAccountReauthFlag(a.id);
    } else if (result.reason === 'invalid') {
      await markAccountNeedsReauth(a.id);
    }
    // network/unknown: sessizce geç, bir sonraki açılışta tekrar denenecek
  })();

  inProgressRefreshes.set(key, p);
  try {
    return await p;
  } finally {
    inProgressRefreshes.delete(key);
  }
}

function findAccountIndex(accounts: SavedAccount[], id: string): number {
  const n = id.toLowerCase();
  return accounts.findIndex(a => a.id.toLowerCase() === n);
}

export interface SavedAccount {
  id: string;           // userId from JWT (identifier claim)
  userType: UserType;
  displayName: string;  // firstName + lastName
  phone: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken: string;
  savedAt: number;      // timestamp for ordering
  /** Refresh token sunucu tarafından `invalid` döndüğünde set edilir.
   *  Hesap listeden SİLİNMEZ — switcher'da "Tekrar giriş yap" CTA gösterilir. */
  needsReauth?: boolean;
}

export async function loadAllAccounts(): Promise<SavedAccount[]> {
  try {
    const s = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // AsyncStorage boş — uygulama yeni silinip kurulmuş olabilir.
    // Keychain'den kurtarmayı dene (iOS'ta uygulama silinse bile Keychain kalabiliyor).
    const fromKeychain = await restoreAccountsFromKeychain();
    if (fromKeychain && fromKeychain.length > 0) {
      // AsyncStorage'a geri yükle ki sonraki çağrılar hızlı olsun
      try {
        await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(fromKeychain));
      } catch {}
      return fromKeychain;
    }
    return [];
  } catch {
    return [];
  }
}

export async function upsertAccount(account: SavedAccount): Promise<void> {
  return withWriteLock(async () => {
    try {
      const accounts = await loadAllAccounts();
      const idx = findAccountIndex(accounts, account.id);
      if (idx >= 0) {
        const stableId = accounts[idx]!.id;
        accounts[idx] = { ...accounts[idx], ...account, id: stableId };
      } else {
        accounts.push(account);
      }
      const serialized = JSON.stringify(accounts);
      await AsyncStorage.setItem(ACCOUNTS_KEY, serialized);
      // Keychain'e de yedekle — uninstall sonrası kurtarma için
      await backupAccountsToKeychain(serialized);
    } catch {}
  });
}

export async function updateAccountTokens(
  id: string,
  tokens: { accessToken: string; refreshToken: string }
): Promise<void> {
  return withWriteLock(async () => {
    try {
      const accounts = await loadAllAccounts();
      const idx = findAccountIndex(accounts, id);
      if (idx >= 0) {
        accounts[idx] = { ...accounts[idx], ...tokens };
        const serialized = JSON.stringify(accounts);
        await AsyncStorage.setItem(ACCOUNTS_KEY, serialized);
        await backupAccountsToKeychain(serialized);
      }
    } catch {}
  });
}

export async function removeAccount(id: string): Promise<void> {
  return withWriteLock(async () => {
    try {
      const accounts = await loadAllAccounts();
      const n = id.toLowerCase();
      const filtered = accounts.filter(a => a.id.toLowerCase() !== n);
      const serialized = JSON.stringify(filtered);
      await AsyncStorage.setItem(ACCOUNTS_KEY, serialized);
      await backupAccountsToKeychain(serialized);
    } catch {}
  });
}

/**
 * Hesabı silmek yerine `needsReauth: true` flag'le.
 * Switcher'da "Tekrar giriş yap" CTA gösterilecek.
 */
export async function markAccountNeedsReauth(id: string): Promise<void> {
  return withWriteLock(async () => {
    try {
      const accounts = await loadAllAccounts();
      const idx = findAccountIndex(accounts, id);
      if (idx < 0) return;
      if (accounts[idx].needsReauth === true) return; // zaten flagli
      accounts[idx] = { ...accounts[idx], needsReauth: true };
      const serialized = JSON.stringify(accounts);
      await AsyncStorage.setItem(ACCOUNTS_KEY, serialized);
      await backupAccountsToKeychain(serialized);
    } catch {}
  });
}

/** Yeni token alındığında flag'i temizle. */
export async function clearAccountReauthFlag(id: string): Promise<void> {
  return withWriteLock(async () => {
    try {
      const accounts = await loadAllAccounts();
      const idx = findAccountIndex(accounts, id);
      if (idx < 0) return;
      if (!accounts[idx].needsReauth) return;
      const next = { ...accounts[idx] };
      delete (next as any).needsReauth;
      accounts[idx] = next;
      const serialized = JSON.stringify(accounts);
      await AsyncStorage.setItem(ACCOUNTS_KEY, serialized);
      await backupAccountsToKeychain(serialized);
    } catch {}
  });
}

/** Görüntüleme: 5XXXXXXXXX veya E.164 → 05XXXXXXXXX */
export function formatPhoneForDisplay(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  let local = digits;
  if (digits.startsWith('90') && digits.length >= 12) local = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) local = digits.slice(1);
  if (local.length === 10) return `0${local}`;
  return phone || '';
}

export function normalizePhoneForCompare(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith('0') && digits.length >= 11) return digits.slice(1);
  return digits;
}

/** Kayıtlı hesaplarda aynı telefon + kullanıcı türü (ör. müşteri / berber / salon). */
export function findSavedAccountByPhoneAndUserType(
  accounts: SavedAccount[],
  phoneE164OrLocal: string,
  userType: UserType
): SavedAccount | undefined {
  const target = normalizePhoneForCompare(phoneE164OrLocal);
  if (!target) return undefined;
  return accounts.find(
    (a) => normalizePhoneForCompare(a.phone) === target && a.userType === userType
  );
}

/**
 * Aktif olmayan kayıtlı hesapların tokenlarını arka planda yeniler.
 * Uygulama açılışında çağrılır — 30 günlük refresh token süresi dolmadan önce
 * hesapları canlı tutar. Aktif hesabı atlar (baseQueryWithReauth halleder).
 */
export async function refreshInactiveAccounts(activeUserId: string | null): Promise<void> {
  const accounts = await loadAllAccounts();
  for (const a of accounts) {
    if (activeUserId && a.id.toLowerCase() === activeUserId.toLowerCase()) continue;
    if (!a.refreshToken) continue;
    await refreshAccountIfNeeded(a.id);
  }
}

/**
 * Kayıtlı hesaplar: access süresi dolmuşsa refresh dene; olmazsa kaydı sil.
 * Sheet / geçiş öncesi listede ölü oturum göstermemek için kullanılır.
 */
export async function pruneStaleSavedAccounts(): Promise<void> {
  const accounts = await loadAllAccounts();
  for (const a of accounts) {
    if (!isExpired(a.accessToken)) continue;
    if (!a.refreshToken) {
      // Refresh token hiç yoksa hesap kullanılamaz; silmek yerine flagle.
      await markAccountNeedsReauth(a.id);
      continue;
    }
    await refreshAccountIfNeeded(a.id);
  }
}

/**
 * Update locally saved account phones that belong to same logical phone family.
 * Backend updates all sibling accounts by customerNumber; on client we approximate
 * by matching previous phone value.
 */
export async function updateAccountsPhoneByPreviousPhone(
  previousPhone: string,
  nextPhone: string
): Promise<void> {
  return withWriteLock(async () => {
    try {
      const prev = normalizePhoneForCompare(previousPhone);
      const next = normalizePhoneForCompare(nextPhone);
      if (!prev || !next) return;
      const accounts = await loadAllAccounts();
      const updated = accounts.map((a) => {
        const p = normalizePhoneForCompare(a.phone);
        if (p === prev) {
          return { ...a, phone: next };
        }
        return a;
      });
      const serialized = JSON.stringify(updated);
      await AsyncStorage.setItem(ACCOUNTS_KEY, serialized);
      await backupAccountsToKeychain(serialized);
    } catch {}
  });
}
