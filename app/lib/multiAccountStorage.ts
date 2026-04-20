import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserType } from '../types';
import { isExpired, attemptTokenRefreshWithReason } from '../store/baseQuery';

const ACCOUNTS_KEY = 'multi_accounts_v1';

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
}

export async function loadAllAccounts(): Promise<SavedAccount[]> {
  try {
    const s = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return s ? JSON.parse(s) : [];
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
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
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
        await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
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
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(filtered));
    } catch {}
  });
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
    if (!isExpired(a.accessToken)) continue; // henüz süresi dolmamış, atla
    const result = await attemptTokenRefreshWithReason(a.refreshToken);
    if (result.ok) {
      await updateAccountTokens(a.id, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } else if (result.reason === 'invalid') {
      await removeAccount(a.id);
    }
    // network/unknown: kaydı koru, bir sonraki açılışta tekrar dene
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
      await removeAccount(a.id);
      continue;
    }
    const refreshed = await attemptTokenRefreshWithReason(a.refreshToken);
    if (refreshed.ok) {
      await updateAccountTokens(a.id, {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      });
    } else if (refreshed.reason === 'invalid') {
      // Sunucu refresh'i reddetti; kayıt anlamsız
      await removeAccount(a.id);
    }
    // network / unknown: kaydı tut; geçiş veya sonraki istekte yeniden denenir
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
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    } catch {}
  });
}
