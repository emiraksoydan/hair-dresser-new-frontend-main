import type { NotificationDto } from '../../types';

/** Sonraki ilk sayfa merge'inde cache'i tamamen newItems ile değiştir (pull-to-refresh, tümünü sil, tümünü oku). */
let nextMergeFullReplace = false;

export function requestNotificationsFullCacheReplace(): void {
  nextMergeFullReplace = true;
}

function consumeFullReplace(): boolean {
  if (!nextMergeFullReplace) return false;
  nextMergeFullReplace = false;
  return true;
}

function normId(id: string | undefined): string {
  return (id ?? '').replace(/-/g, '').toLowerCase();
}

/** Pozitif → `a` listede `b`'den daha yeni (DESC: createdAt, sonra id). */
export function compareNotificationsDesc(a: NotificationDto, b: NotificationDto): number {
  const ta = a.createdAt ?? '';
  const tb = b.createdAt ?? '';
  if (ta !== tb) {
    return ta > tb ? 1 : -1;
  }
  const ia = normId(a.id);
  const ib = normId(b.id);
  if (ia === ib) return 0;
  return ia > ib ? 1 : -1;
}

function isStrictlyOlderThan(n: NotificationDto, cursor: NotificationDto): boolean {
  return compareNotificationsDesc(cursor, n) > 0;
}

/**
 * getAllNotifications RTK merge:
 * - `before` yok + full replace → sunucunun ilk sayfası (invalidate sonrası tail korunmaz)
 * - `before` yok + sync → ilk sayfayı güncelle, daha eski yüklenmiş sayfaları koru
 * - `before` var → eski sayfa append
 */
export function mergeNotificationsCachePages(
  currentCache: NotificationDto[],
  newItems: NotificationDto[],
  arg: unknown,
): NotificationDto[] {
  const before = (arg as { before?: string } | undefined)?.before;
  if (before) {
    const seen = new Set(currentCache.map((n) => n.id));
    const deduped = newItems.filter((n) => !seen.has(n.id));
    return [...currentCache, ...deduped];
  }

  if (consumeFullReplace() || !currentCache?.length) {
    return newItems;
  }

  if (!newItems?.length) {
    return newItems;
  }

  const newIdSet = new Set(newItems.map((n) => n.id));
  const oldestNew = newItems[newItems.length - 1];
  const tail = currentCache.filter(
    (n) => !newIdSet.has(n.id) && isStrictlyOlderThan(n, oldestNew),
  );
  return [...newItems, ...tail];
}
