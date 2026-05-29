import type {
  PackageFormItem,
  ServiceOption,
} from "../components/store/ServicePackageStep";
import { parseTR } from "./form/money-helper";
const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ServicePackageSyncItemDto = {
  id?: string;
  packageName: string;
  totalPrice: number;
  serviceOfferingIds?: string[];
  serviceNames?: string[];
};

/** Form paketlerini backend senkron DTO'suna çevirir (tüm paketler ayrı gönderilir). */
export function buildServicePackageSyncItems(
  packages: PackageFormItem[],
  resolveLabel?: (id: string) => string | undefined,
  options?: { preferServiceNames?: boolean },
): ServicePackageSyncItemDto[] {
  const items: ServicePackageSyncItemDto[] = [];

  for (const pkg of packages) {
    const totalPrice = parseTR(pkg.totalPrice);
    const packageName = pkg.packageName?.trim() ?? "";
    if (!packageName || !totalPrice || totalPrice <= 0 || !pkg.serviceOfferingIds?.length) {
      continue;
    }

    const serviceOfferingIds: string[] = [];
    const serviceNames: string[] = [];

    for (const raw of pkg.serviceOfferingIds) {
      const label = (resolveLabel?.(raw) ?? raw).trim();
      if (options?.preferServiceNames) {
        if (label && !serviceNames.includes(label)) serviceNames.push(label);
        continue;
      }
      if (GUID_RE.test(raw)) {
        if (!serviceOfferingIds.includes(raw)) serviceOfferingIds.push(raw);
      } else if (label && !serviceNames.includes(label)) {
        serviceNames.push(label);
      }
    }

    items.push({
      id: pkg.id,
      packageName,
      totalPrice,
      serviceOfferingIds,
      serviceNames: serviceNames.length > 0 ? serviceNames : undefined,
    });
  }

  return items;
}

/** Dükkan güncelleme formu: seçili kategorilerden paket adımı hizmet seçenekleri. */
export function buildStorePackageServiceOptions(
  selectedCategories: string[],
  services: { id: string; name: string }[],
  existingOfferings?: { id: string; serviceName: string }[],
): ServiceOption[] {
  return selectedCategories.map((categoryId) => {
    const label =
      services.find((c) => c.id === categoryId)?.name ?? categoryId;
    const offering = existingOfferings?.find((o) => o.serviceName === label);
    return { id: offering?.id ?? categoryId, label };
  });
}

function normalizePackageServiceId(
  raw: string,
  optionById: Map<string, ServiceOption>,
  optionByLabel: Map<string, ServiceOption>,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (optionById.has(trimmed)) return trimmed;
  const byLabel = optionByLabel.get(trimmed.toLowerCase());
  if (byLabel) return byLabel.id;
  return null;
}

/** Hizmet listesi değişince paketlerdeki bağlantıları günceller; artık var olmayan hizmetleri düşürür. */
export function syncPackagesWithServiceOptions(
  packages: PackageFormItem[],
  options: ServiceOption[],
): PackageFormItem[] {
  if (options.length === 0) return [];

  const optionById = new Map(options.map((o) => [o.id, o]));
  const optionByLabel = new Map(
    options.map((o) => [o.label.trim().toLowerCase(), o]),
  );

  return packages
    .map((pkg) => {
      const ids = new Set<string>();
      for (const raw of pkg.serviceOfferingIds ?? []) {
        const normalized = normalizePackageServiceId(
          raw,
          optionById,
          optionByLabel,
        );
        if (normalized) ids.add(normalized);
      }
      return { ...pkg, serviceOfferingIds: [...ids] };
    })
    .filter((pkg) => pkg.serviceOfferingIds.length > 0);
}

export function packagesDifferAfterServiceSync(
  current: PackageFormItem[],
  next: PackageFormItem[],
): boolean {
  if (current.length !== next.length) return true;
  const nextByLocal = new Map(next.map((p) => [p.localId, p]));
  for (const pkg of current) {
    const synced = nextByLocal.get(pkg.localId);
    if (!synced) return true;
    const a = [...pkg.serviceOfferingIds].sort().join("\u0001");
    const b = [...synced.serviceOfferingIds].sort().join("\u0001");
    if (a !== b) return true;
  }
  return false;
}
