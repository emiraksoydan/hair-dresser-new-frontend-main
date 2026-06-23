import type { WorkingHourGetDto } from '../../types/store';

const DAY_KEYS: Record<number, string> = {
  0: 'form.days.sun',
  1: 'form.days.mon',
  2: 'form.days.tue',
  3: 'form.days.wed',
  4: 'form.days.thu',
  5: 'form.days.fri',
  6: 'form.days.sat',
};

export function formatWorkingHoursSummary(
  hours: WorkingHourGetDto[] | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (!hours?.length) return null;

  const openDays = hours.filter((h) => !h.isClosed);
  if (openDays.length === 0) return t('social.workingHoursClosed');

  const today = new Date().getDay();
  const todayHour = hours.find((h) => h.dayOfWeek === today);

  if (todayHour && !todayHour.isClosed) {
    return t('social.workingHoursToday', {
      start: todayHour.startTime?.slice(0, 5) ?? '',
      end: todayHour.endTime?.slice(0, 5) ?? '',
    });
  }

  const first = openDays[0];
  const dayLabel = t(DAY_KEYS[first.dayOfWeek] ?? 'form.days.mon');
  return t('social.workingHoursSample', {
    day: dayLabel,
    start: first.startTime?.slice(0, 5) ?? '',
    end: first.endTime?.slice(0, 5) ?? '',
  });
}

export function buildSocialBioTemplate(
  ownerType: number,
  ownerDisplayName: string | null | undefined,
  barberTypeLabel: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (ownerType === 2) {
    return t('social.bioTemplateStore', {
      name: ownerDisplayName ?? '',
      type: barberTypeLabel,
    });
  }
  if (ownerType === 1) {
    return t('social.bioTemplateBarber', {
      name: ownerDisplayName ?? '',
      type: barberTypeLabel,
    });
  }
  return t('social.bioTemplateCustomer', { name: ownerDisplayName ?? '' });
}
