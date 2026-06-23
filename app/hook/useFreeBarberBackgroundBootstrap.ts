import { useMemo } from 'react';
import { useMultiAccount } from '../context/MultiAccountContext';
import { useNearbyControl } from './useNearByControl';
import { UserType } from '../types';

/**
 * Kayıtlı en az bir FreeBarber hesabı varken uygulama genelinde arka plan konum takibini başlatır.
 * Aktif oturum müşteri/dukkan veya sosyal mod olsa bile serbest berber konumu güncellenebilir.
 */
export function useFreeBarberBackgroundBootstrap() {
  const { accounts } = useMultiAccount();

  const hasTrackableFreeBarberAccount = useMemo(
    () =>
      accounts.some(
        (a) => a.userType === UserType.FreeBarber && !a.needsReauth && !!a.accessToken,
      ),
    [accounts],
  );

  useNearbyControl({
    enabled: hasTrackableFreeBarberAccount,
    enableBackgroundTracking: true,
    foregroundTracking: false,
    onFetch: async () => {
      /* Arka plan güncellemeleri backgroundLocation task handler'ında yapılır. */
    },
  });
}
