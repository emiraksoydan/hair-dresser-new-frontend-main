import type { LocationStatus } from "../types";

/**
 * Keşif panellerinde "sunucuya / servise ulaşılamıyor" tam ekran kartını
 * yalnızca gerçekten ulaşım / zaman aşımı / 5xx gibi altyapı hatalarında göstermek için.
 *
 * İş kuralı / doğrulama (4xx, CUSTOM_ERROR + mesaj) bu kapsamda değildir.
 */
export function isPanelConnectivityError(error: unknown): boolean {
  if (error == null) return false;

  const e = error as {
    status?: unknown;
    data?: { message?: string };
    message?: string;
  };
  const status = e.status;
  const msg = String(e?.data?.message ?? e?.message ?? "").trim();

  if (status === "CUSTOM_ERROR" && msg === "") return false;

  // Backend / RTK: iş mantığı genelde CUSTOM_ERROR + dolu mesaj veya 4xx sayısı ile gelir
  if (status === "CUSTOM_ERROR" && msg !== "") return false;

  if (status === "FETCH_ERROR") return true;
  if (status === "TIMEOUT_ERROR") return true;
  if (status === "PARSING_ERROR") return true;

  if (status === 0 || status === null || status === undefined) return true;

  if (typeof status === "number") {
    if (status >= 500) return true;
    if (status === 408 || status === 502 || status === 503 || status === 504) return true;
  }

  const lower = msg.toLowerCase();
  if (
    lower.includes("network") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("internet") ||
    lower.includes("fetch") ||
    lower.includes("connection") ||
    lower.includes("ulaşılam") ||
    lower.includes("ulaşılamıyor") ||
    lower.includes("sunucuya ulaşılam") ||
    lower.includes("sunucudan cevap yok") ||
    (lower.includes("sunucu") &&
      (lower.includes("cevap") || lower.includes("ulaş") || lower.includes("yanıt")))
  ) {
    return true;
  }

  if (
    lower.includes("service unavailable") ||
    lower.includes("bad gateway") ||
    lower.includes("gateway timeout")
  ) {
    return true;
  }

  return false;
}

export type DiscoveryLocationMode = "userGps" | "storeAnchor";

/**
 * userGps: kullanıcı konumu olmadan yapılan istek hatası "servise ulaşılamadı" olarak gösterilmez
 * (konum reddi / beklerken yanlış pozitif önlenir).
 * storeAnchor: dükkan koordinatına göre istek; kullanıcı GPS'i şart değildir.
 */
export function shouldShowDiscoveryConnectivityError(
  error: unknown,
  opts: { mode: DiscoveryLocationMode; locationStatus?: LocationStatus },
): boolean {
  if (!isPanelConnectivityError(error)) return false;
  if (opts.mode === "storeAnchor") return true;
  return opts.locationStatus === "granted";
}
