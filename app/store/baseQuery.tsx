import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { tokenStore } from '../lib/tokenStore';
import { saveTokens, clearStoredTokens, loadTokens } from '../lib/tokenStorage';
import { jwtDecode } from 'jwt-decode';
import { API_CONFIG } from '../constants/api';
import { triggerSubscriptionExpired } from './subscriptionSlice';
import { persistHelpGuideOnboardingFromAuthPayload } from '../lib/helpGuideOnboarding';

export const API = API_CONFIG.BASE_URL;

type Decoded = { exp?: number };


function extractTokens(body: any) {
  const wrapped = body && typeof body.success === 'boolean' && 'data' in body;
  const payload = wrapped ? body.data : body;
  void persistHelpGuideOnboardingFromAuthPayload(payload);
  const accessToken = payload?.accessToken ?? payload?.token;
  const refreshToken = payload?.refreshToken;
  if (!accessToken || !refreshToken) {
    throw new Error('Invalid refresh payload shape');
  }
  return { accessToken, refreshToken };
}


export const isExpired = (access: string, skewMs = API_CONFIG.REFRESH_TOKEN_SKEW_MS) => {
  try {
    const { exp } = jwtDecode<Decoded>(access) || {};
    if (!exp) return true;
    return exp * 1000 <= Date.now() + skewMs;
  } catch {
    return true;
  }
};

export const normalizeLoaded = (raw: any) => {
  const access = raw?.access ?? raw?.accessToken ?? raw?.token ?? null;
  const refresh = raw?.refresh ?? raw?.refreshToken ?? null;
  return access && refresh ? { access, refresh } : null;
};

/**
 * Açık uçlu (login / refresh / OTP) endpoint'ler: token olmadan da çağrılabilir.
 * Bu liste dışındaki bir endpoint token yoksa network'e gitmeden iptal edilir.
 *
 * Not: Daha önce buraya `console.warn` eklenmişti ama cold-start / hesap geçişi /
 * logout geçiş pencerelerinde 10+ farklı endpoint aynı anda tick'liyor. Uyarı
 * gerçek bir hata değil (bail-out zaten network'i iptal ediyor); log spam'i
 * yaratmaması için kaldırıldı. Teşhis gerekirse buraya geçici log eklenebilir.
 */
const PUBLIC_ENDPOINTS = new Set<string>([
  'login',
  'loginRequest',
  'verifyOtp',
  'sendOtp',
  'refresh',
  'register',
]);

const raw = fetchBaseQuery({
  baseUrl: API,
  timeout: API_CONFIG.REQUEST_TIMEOUT_MS,
  prepareHeaders: (h) => {
    if (tokenStore.access) {
      h.set('Authorization', `Bearer ${tokenStore.access}`);
    }
    return h;
  },
});
const rawNoAuth = fetchBaseQuery({
  baseUrl: API,
  timeout: API_CONFIG.REQUEST_TIMEOUT_MS,
});

let refreshing: Promise<any> | null = null;

/** Hesap geçişinde mevcut refresh döngüsünü iptal et. */
export function clearRefreshLock() {
  refreshing = null;
}

export type TokenRefreshFailureReason = 'network' | 'invalid' | 'unknown';

/**
 * Refresh sonucu: ağ hatası ile sunucunun refresh'i reddetmesi (401/403) ayrılır —
 * çoklu hesapta geçişte geçici ağ hatasında kayıtlı hesabı silmemek için.
 */
export async function attemptTokenRefreshWithReason(
  refreshToken: string
): Promise<
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; reason: TokenRefreshFailureReason }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API}Auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'invalid' };
    }
    if (!response.ok) {
      return { ok: false, reason: 'unknown' };
    }
    const data = await response.json();
    try {
      const tokens = extractTokens(data);
      return { ok: true, ...tokens };
    } catch {
      return { ok: false, reason: 'unknown' };
    }
  } catch {
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hesap geçişi öncesinde token yenileme deneyi.
 * Sadece geçerli refresh token ile çağrılmalı.
 * Başarılı: { accessToken, refreshToken } döner.
 * Başarısız: null döner.
 */
export async function attemptTokenRefresh(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const r = await attemptTokenRefreshWithReason(refreshToken);
  return r.ok ? { accessToken: r.accessToken, refreshToken: r.refreshToken } : null;
}

export const baseQueryWithReauth: BaseQueryFn<any, unknown, FetchBaseQueryError> =
  async (args, api, extra) => {
    try {
      // Token yoksa ve endpoint public değilse network'e gitmeden iptal et.
      // Polling / interval / arka plan fetch'leri logout/refresh-failure sonrası
      // gereksiz network trafiği yaratmasın.
      const endpointName = (api as any)?.endpoint as string | undefined;
      const isPublic = endpointName ? PUBLIC_ENDPOINTS.has(endpointName) : false;
      if (!tokenStore.access && !tokenStore.refresh && !isPublic) {
        return {
          error: {
            status: 'CUSTOM_ERROR',
            data: { message: '' },
          },
        } as any;
      }

      let res = await raw(args, api, extra);

      // AbortError kontrolü - RTK Query'nin kendi AbortController'ı tarafından iptal edilen query'ler
      // Bu normal bir durum (component unmount, yeni query başlatıldığında vb.)
      if (res.error) {
        // AbortError'ı kontrol et - RTK Query bunu FETCH_ERROR olarak döndürebilir
        const errorData = res.error.data as any;
        const errorMessage = typeof errorData === 'string' ? errorData : errorData?.message || '';

        // AbortError belirtileri: "aborted", "cancel", "AbortError" içeren mesajlar
        if (
          res.error.status === 'FETCH_ERROR' &&
          (
            errorMessage?.toLowerCase().includes('aborted') ||
            errorMessage?.toLowerCase().includes('cancel') ||
            errorMessage?.toLowerCase().includes('abort')
          )
        ) {
          // Abort hatası normal bir durum - sessizce ignore et, hata gösterme
          return {
            error: {
              status: 'CUSTOM_ERROR',
              data: { message: '' } // Boş mesaj - hata gösterilmez
            }
          } as any;
        }

        // Network hatası mı kontrol et (gerçek network hataları)
        if (res.error.status === 'FETCH_ERROR' && !errorMessage?.toLowerCase().includes('abort')) {
          return {
            error: {
              status: 'FETCH_ERROR',
              data: { message: 'Sunucuya ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.' }
            }
          } as any;
        }

        // Timeout hatası mı kontrol et
        if (res.error.status === 'TIMEOUT_ERROR') {
          return {
            error: {
              status: 'TIMEOUT_ERROR',
              data: { message: 'Sunucudan cevap yok. Lütfen tekrar deneyin.' }
            }
          } as any;
        }

        // Backend'den gelen error data'sını kontrol et (IDataResult formatında olabilir)
        if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
          // FluentValidation hatalarını kontrol et (errors array)
          // Backend'den gelen format: { success: false, message: "...", errors: [{ field: "...", message: "..." }] }
          if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
            // FluentValidation errors array formatını işle
            // Her error: { field: "PhoneNumber", message: "Telefon numarası zorunludur" }
            const errorMessages = errorData.errors
              .map((e: any) => e?.message || e?.Message)
              .filter(Boolean);

            const errorMessage = errorMessages.length > 0
              ? errorMessages.join(', ')
              : (errorData.message || errorData.Message || 'Doğrulama hatası');

            res.error.data = {
              message: errorMessage,
              errors: errorData.errors // Tüm hataları da gönder (field bazlı hata gösterimi için)
            };
          } else {
            // Backend'den gelen message'ı kullan (PascalCase veya camelCase olabilir)
            const errorMessage = errorData.message || errorData.Message || errorData.data?.message || errorData.Data?.message;
            if (errorMessage) {
              res.error.data = { message: errorMessage };
            }
          }
        }
      }

      // Abonelik süresi dolmuş veya ban: 403 + backend mesajı kontrol et.
      // Bu durumda token refresh denemesi yapma — subscription expired event'i yayınla.
      if (res.error?.status === 403) {
        const errData = res.error.data as any;
        const msg: string = errData?.message || errData?.Message || '';
        if (msg.includes('Deneme süreniz') || msg.includes('abone')) {
          (api as any).dispatch(triggerSubscriptionExpired());
          return res;
        }
      }

      // Fix operator precedence: && has higher precedence than ||
      if ((res.error?.status === 401 || res.error?.status === 403 || res.error?.status === 419 || res.error?.status === 498) && tokenStore.refresh) {
        if (!refreshing) {
          refreshing = (async () => {
            const epochAtStart = tokenStore.tokenEpoch;
            const refreshPlain = tokenStore.refresh;
            if (!refreshPlain) return false;
            tokenStore.setRefreshing(true); // SignalR'a bildir
            // Refresh'i çağıran query'nin abort sinyalinden ayır.
            // Aksi halde component unmount / yeni query refresh'i de iptal eder ve
            // AbortError catch'e düşerek kullanıcıyı gereksiz yere logout eder.
            const refreshAbortController = new AbortController();
            const refreshTimeoutTimer = setTimeout(
              () => refreshAbortController.abort(),
              API_CONFIG.REQUEST_TIMEOUT_MS,
            );
            const apiForRefresh = {
              ...(api as any),
              signal: refreshAbortController.signal,
              // abort property'si RTK Query internal kullanımı için; boş fn yeter.
              abort: () => refreshAbortController.abort(),
            };
            try {
              const r = await rawNoAuth(
                { url: 'Auth/refresh', method: 'POST', body: { refreshToken: refreshPlain } },
                apiForRefresh, extra
              );
              if ((r as any).error) throw new Error('HTTP error');
              let accessToken: string;
              let refreshToken: string;
              try {
                ({ accessToken, refreshToken } = extractTokens((r as any).data));
              } catch {
                throw new Error('Invalid refresh payload');
              }
              // Hesap geçişi / çıkış sonrası başlayan refresh geç biterse yeni oturumu ezmesin
              if (tokenStore.tokenEpoch !== epochAtStart) return false;
              tokenStore.set({ accessToken, refreshToken });
              await saveTokens({ accessToken, refreshToken });
              return true;
            } catch (error: any) {
              // Oturum bu arada değiştiyse eski hatayı yeni hesaba uygulama
              if (tokenStore.tokenEpoch !== epochAtStart) return false;
              // AbortError: RTK Query dışı (bizim timeout) veya caller unmount'u.
              // Caller unmount'unu artık kendi signal'imizle filtrelediğimiz için
              // buraya sadece refresh-timeout/network-abort düşer → logout mantıklı değil.
              const isAbort =
                error?.name === 'AbortError' ||
                error?.name === 'DOMException' ||
                (typeof error?.message === 'string' &&
                  /abort|cancel/i.test(error.message));
              if (isAbort) return false;
              // Hesap geçişi sırasında refresh başarısız olursa token'ı silme —
              // o token artık yeni hesaba ait, silmek her şeyi patlatır.
              if (!tokenStore.isSwitchingAccount) {
                tokenStore.clear();
                await clearStoredTokens();
              }
              return false;
            } finally {
              clearTimeout(refreshTimeoutTimer);
              tokenStore.setRefreshing(false); // SignalR'a bildir
            }
          })();
        }
        const ok = await refreshing.finally(() => (refreshing = null));
        if (ok) {
          res = await raw(args, api, extra);
        } else if (tokenStore.isSwitchingAccount) {
          // Hesap geçişi sırasında refresh başarısız oldu ama token'ı silme.
          // Bu 401 response'u olduğu gibi döndür; component error state gösterir.
          return res;
        }
      }
      return res;
    } catch (error: any) {
      // AbortError (query iptal edildi) - bu normal bir durum, sessizce ignore et
      // RTK Query otomatik olarak query'leri iptal eder (component unmount, yeni query başlatıldığında vb.)
      if (
        error?.name === 'AbortError' ||
        error?.name === 'DOMException' ||
        error?.code === 20 ||
        error?.message?.includes('aborted') ||
        error?.message?.includes('cancel') ||
        error?.message?.includes('Abort')
      ) {
        // Abort hatası normal bir durum - sessizce ignore et, console'a da yazma
        return {
          error: {
            status: 'CUSTOM_ERROR',
            data: { message: '' } // Boş mesaj - hata gösterilmez
          }
        } as any;
      }

      // Network error veya diğer beklenmeyen hatalar
      const errorMessage = error?.message || 'Servise ulaşılamadı. Lütfen daha sonra tekrar deneyin.';
      return {
        error: {
          status: 'FETCH_ERROR',
          data: { message: errorMessage }
        }
      } as any;
    }
  };


export async function rehydrateTokens() {
  const stored = await loadTokens();
  const norm = normalizeLoaded(stored);
  if (!norm) {
    // Token yoksa sadece memory temizle; storage'ı zorla silme.
    // Böylece geçici storage read problemleri kalıcı logout'a dönüşmez.
    tokenStore.clear?.();
    return;
  }
  tokenStore.set({ accessToken: norm.access, refreshToken: norm.refresh });
  if (isExpired(norm.access)) {
    try {
      const r = await rawNoAuth(
        { url: 'Auth/refresh', method: 'POST', body: { refreshToken: norm.refresh } },
        { type: 'rehydrate' } as any,
        {} as any
      );
      const refreshError = (r as any).error;
      if (refreshError) {
        const status = refreshError.status;
        const isAuthError =
          status === 401 || status === 403 || status === 419 || status === 498;
        if (isAuthError) {
          tokenStore.clear?.();
          await clearStoredTokens();
        }
        // Network/timeout gibi geçici hatalarda session'ı koru.
        return;
      }
      const { accessToken, refreshToken } = extractTokens((r as any).data);
      tokenStore.set({ accessToken, refreshToken });
      await saveTokens({ accessToken, refreshToken });
    } catch {
      // Boot anında geçici hatalarda (network, timeout, parse vb.) kullanıcıyı auth'a atma.
      // Sonraki isteklerde refresh tekrar denenecek.
    }
  }
}
