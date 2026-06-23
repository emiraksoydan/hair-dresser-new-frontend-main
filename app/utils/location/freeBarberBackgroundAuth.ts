import { jwtDecode } from 'jwt-decode';
import { loadAllAccounts } from '../../lib/multiAccountStorage';
import { loadTokens } from '../../lib/tokenStorage';
import { tokenStore } from '../../lib/tokenStore';
import { JwtPayload, UserType } from '../../types';

const NAME_ID_CLAIM =
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

function extractUserId(decoded: Partial<JwtPayload> & Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    decoded.identifier,
    decoded.sub,
    decoded.userId,
    decoded.nameid,
    decoded[NAME_ID_CLAIM],
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

function isFreeBarberToken(token: string): { ok: true; userId: string } | { ok: false } {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const ut = decoded.userType?.toLowerCase();
    if (ut !== 'freebarber') return { ok: false };
    const userId = extractUserId(decoded as Record<string, unknown>);
    if (!userId) return { ok: false };
    return { ok: true, userId };
  } catch {
    return { ok: false };
  }
}

/**
 * Arka plan konum görevi için FreeBarber access token çözümle.
 * Sıra: bellek → kalıcı oturum → kayıtlı FreeBarber hesapları (aktif hesap müşteri olsa bile).
 */
export async function resolveFreeBarberBackgroundAccessToken(): Promise<{
  accessToken: string;
  userId: string;
} | null> {
  const memoryToken = tokenStore.access;
  if (memoryToken) {
    const parsed = isFreeBarberToken(memoryToken);
    if (parsed.ok) return { accessToken: memoryToken, userId: parsed.userId };
  }

  try {
    const stored = await loadTokens();
    const storedAccess = stored?.accessToken as string | undefined;
    if (storedAccess) {
      const parsed = isFreeBarberToken(storedAccess);
      if (parsed.ok) return { accessToken: storedAccess, userId: parsed.userId };
    }
  } catch {
    /* ignore */
  }

  try {
    const accounts = await loadAllAccounts();
    const freeBarberAccounts = accounts
      .filter((a) => a.userType === UserType.FreeBarber && !a.needsReauth && !!a.accessToken)
      .sort((a, b) => b.savedAt - a.savedAt);
    for (const account of freeBarberAccounts) {
      const parsed = isFreeBarberToken(account.accessToken);
      if (parsed.ok) {
        return { accessToken: account.accessToken, userId: parsed.userId };
      }
    }
  } catch {
    /* ignore */
  }

  return null;
}
