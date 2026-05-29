import { AppointmentFilter, AppointmentGetDto } from '../../types/appointment';

/** Filtre başına: sonraki ilk sayfa merge'inde cache tamamen newItems ile değişir. */
const nextMergeFullReplaceByFilter = new Map<AppointmentFilter, boolean>();

export function requestAppointmentsFullCacheReplace(filter: AppointmentFilter): void {
  nextMergeFullReplaceByFilter.set(filter, true);
}

/** Tümünü sil / global senkron — her sekme önbelleği bir sonraki refetch'te sıfırlanır. */
export function requestAllAppointmentsFiltersFullCacheReplace(): void {
  for (const f of [
    AppointmentFilter.All,
    AppointmentFilter.Active,
    AppointmentFilter.Completed,
    AppointmentFilter.Cancelled,
    AppointmentFilter.Pending,
  ]) {
    nextMergeFullReplaceByFilter.set(f, true);
  }
}

function consumeFullReplace(filter: AppointmentFilter | undefined): boolean {
  if (filter === undefined) return false;
  if (!nextMergeFullReplaceByFilter.get(filter)) return false;
  nextMergeFullReplaceByFilter.delete(filter);
  return true;
}

function normId(id: string | undefined): string {
  return (id ?? '').replace(/-/g, '').toLowerCase();
}

/** Pozitif → `a` listede `b`'den daha yeni (DESC: createdAt, sonra id). */
export function compareAppointmentsDesc(a: AppointmentGetDto, b: AppointmentGetDto): number {
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

function isStrictlyOlderThan(a: AppointmentGetDto, cursor: AppointmentGetDto): boolean {
  return compareAppointmentsDesc(cursor, a) > 0;
}

/**
 * getAllAppointmentByFilter RTK merge (her `filter` ayrı cache slot):
 * - `before` yok + full replace → sunucu ilk sayfası
 * - `before` yok + sync → ilk sayfa güncellenir, daha eski sayfalar korunur
 * - `before` var → append
 */
export function mergeAppointmentFilterCachePages(
  currentCache: AppointmentGetDto[],
  newItems: AppointmentGetDto[],
  arg: { filter?: AppointmentFilter; before?: string; beforeId?: string } | undefined,
): AppointmentGetDto[] {
  const before = arg?.before;
  if (before) {
    const existing = new Set(currentCache.map((a) => a.id));
    const deduped = newItems.filter((a) => !existing.has(a.id));
    return [...currentCache, ...deduped];
  }

  const filter = arg?.filter;
  if (filter !== undefined && consumeFullReplace(filter)) {
    return newItems;
  }

  if (!currentCache?.length) {
    return newItems;
  }

  if (!newItems?.length) {
    return newItems;
  }

  const newIdSet = new Set(newItems.map((a) => a.id));
  const oldestNew = newItems[newItems.length - 1];
  const tail = currentCache.filter(
    (a) => !newIdSet.has(a.id) && isStrictlyOlderThan(a, oldestNew),
  );
  return [...newItems, ...tail];
}
