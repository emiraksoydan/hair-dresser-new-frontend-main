import React, { createContext, useContext, useMemo } from "react";
import { useGetFreeBarberMinePanelQuery } from "../../store/api";
import { useTrackFreeBarberLocation } from "../../hook/useTrackFreeBarberLocation";

type FreeBarberLocationCtx = {
  isTracking: boolean;
  isUpdating: boolean;
};

const FreeBarberLocationContext = createContext<FreeBarberLocationCtx | null>(
  null,
);

/**
 * Serbest berber sekme grubunda mount kalır; hangi alt sekmede olursanız olun
 * konum sunucuya periyodik/hareket ile gönderilmeye devam eder.
 */
export function FreeBarberLocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: freeBarber } = useGetFreeBarberMinePanelQuery(undefined, {
    skip: false,
  });
  const { isTracking, isUpdating } = useTrackFreeBarberLocation(
    true,
    freeBarber?.id ?? null,
  );
  const value = useMemo(
    () => ({ isTracking, isUpdating }),
    [isTracking, isUpdating],
  );

  return (
    <FreeBarberLocationContext.Provider value={value}>
      {children}
    </FreeBarberLocationContext.Provider>
  );
}

/** Panel UI (ör. durum noktası); provider yoksa güvenli varsayılan. */
export function useFreeBarberLocationTracking(): FreeBarberLocationCtx {
  const ctx = useContext(FreeBarberLocationContext);
  return ctx ?? { isTracking: false, isUpdating: false };
}
