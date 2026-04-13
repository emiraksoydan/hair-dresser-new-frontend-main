import { useCallback, useEffect, useRef } from "react";

/**
 * `setTimeout(() => sheet.present(), delay)` yarışını önler: kullanıcı sheet'i
 * kapatırsa bekleyen timer iptal edilir; aksi halde gecikmeden sonra tekrar
 * `present()` çağrılıp sheet yeniden açılabilir.
 */
export function useDeferredSheetPresent(present: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduledPresent = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedulePresent = useCallback(
    (delayMs: number) => {
      cancelScheduledPresent();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        present();
      }, delayMs);
    },
    [present, cancelScheduledPresent],
  );

  useEffect(() => () => cancelScheduledPresent(), [cancelScheduledPresent]);

  return { schedulePresent, cancelScheduledPresent };
}
