/**
 * İki veya daha fazla paket seçilirken, herhangi bir ortak hizmet (ServiceOfferingId)
 * varsa seçime izin verilmemeli — backend ile aynı kural.
 */
export type PackageForOverlap = {
  id: string;
  items?: { serviceOfferingId: string }[] | null;
};

export function wouldServicePackagesOverlap(
  allPackages: PackageForOverlap[],
  selectedIds: string[],
  toggleId: string,
): boolean {
  const nextSelected = selectedIds.includes(toggleId)
    ? selectedIds.filter((x) => x !== toggleId)
    : [...selectedIds, toggleId];

  if (nextSelected.length < 2) return false;

  const sets = nextSelected.map((id) => {
    const p = allPackages.find((x) => x.id === id);
    return new Set(
      (p?.items ?? []).map((i) => i.serviceOfferingId).filter(Boolean),
    );
  });

  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      for (const sid of sets[i]) {
        if (sets[j].has(sid)) return true;
      }
    }
  }
  return false;
}

/** Seçilen tekil hizmetlerden biri bu paketin içindeyse paket seçilemez. */
export function packageOverlapsAnySelectedService(
  pkg: PackageForOverlap,
  selectedServiceIds: string[],
): boolean {
  if (!selectedServiceIds.length) return false;
  const set = new Set(selectedServiceIds);
  return (pkg.items ?? []).some(
    (i) => !!i.serviceOfferingId && set.has(i.serviceOfferingId),
  );
}

/** Bu hizmet, seçili paketlerden birinin içindeyse tekil seçilemez. */
export function serviceIsInsideSelectedPackages(
  serviceId: string,
  allPackages: PackageForOverlap[],
  selectedPackageIds: string[],
): boolean {
  for (const pid of selectedPackageIds) {
    const p = allPackages.find((x) => x.id === pid);
    if ((p?.items ?? []).some((i) => i.serviceOfferingId === serviceId)) return true;
  }
  return false;
}
