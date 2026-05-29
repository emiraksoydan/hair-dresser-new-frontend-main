import { useEffect, useMemo } from "react";
import type {
  PackageFormItem,
  ServiceOption,
} from "../components/store/ServicePackageStep";
import {
  packagesDifferAfterServiceSync,
  syncPackagesWithServiceOptions,
} from "../utils/service-package-sync";

/** Hizmet listesi değişince paketleri günceller (paket adımı mount olmasa da çalışır). */
export function useSyncPackagesWithServiceOptions(
  packages: PackageFormItem[],
  serviceOptions: ServiceOption[],
  onPackagesChange: (packages: PackageFormItem[]) => void,
  enabled = true,
) {
  const serviceOptionsKey = useMemo(
    () =>
      serviceOptions
        .map((o) => `${o.id}\u0001${o.label}`)
        .join("\u0002"),
    [serviceOptions],
  );
  const packagesSignature = useMemo(
    () =>
      packages
        .map(
          (p) =>
            `${p.localId}\u0003${[...(p.serviceOfferingIds ?? [])].sort().join("\u0004")}`,
        )
        .join("\u0005"),
    [packages],
  );

  useEffect(() => {
    if (!enabled) return;
    const synced = syncPackagesWithServiceOptions(packages, serviceOptions);
    if (packagesDifferAfterServiceSync(packages, synced)) {
      onPackagesChange(synced);
    }
  }, [
    enabled,
    serviceOptionsKey,
    packagesSignature,
    packages,
    serviceOptions,
    onPackagesChange,
  ]);
}
