import { useCallback, useMemo } from 'react';
import { useGetAppointmentSocialShareStatusQuery } from '../store/api';

export function useAppointmentShareStatus(appointmentIds: string[]) {
  const stableIds = useMemo(
    () => [...new Set(appointmentIds.filter((id) => id?.trim()))],
    [appointmentIds],
  );

  const { data, isLoading, isFetching } = useGetAppointmentSocialShareStatusQuery(
    { appointmentIds: stableIds },
    { skip: stableIds.length === 0 },
  );

  const sharedSet = useMemo(() => new Set(data ?? []), [data]);

  const isAppointmentShared = useCallback(
    (appointmentId: string) => sharedSet.has(appointmentId),
    [sharedSet],
  );

  const ready = stableIds.length === 0 || (!isLoading && !isFetching);

  return { ready, isAppointmentShared };
}
