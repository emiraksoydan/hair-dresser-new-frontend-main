import { router, type Href } from 'expo-router';
import { pathByUserType } from '../auth/redirect-by-user-type';
import type { UserType } from '../../types';

export const SOCIAL_TAB_HREFS: Record<string, Href> = {
  '(feed)': '/(social)/(feed)',
  '(reels)': '/(social)/(reels)',
  '(search)': '/(social)/(search)',
  '(messages)': '/(social)/(messages)',
  '(profile)': '/(social)/(profile)',
};

/** Sosyal modda mıyız (tab veya sosyal stack ekranları). */
export function isSocialRealm(segments: string[]): boolean {
  if (segments[0] === '(social)') return true;
  if (segments[0] === '(screens)' && segments[1] === 'social') return true;
  return false;
}

/** Hesap değiştirince bulunulan modda kal (normal ↔ sosyal). */
export function pathAfterAccountSwitch(
  userType: string | number | null | undefined,
  segments: string[],
): Href {
  if (!isSocialRealm(segments)) {
    return pathByUserType(userType != null ? String(userType) : null) as Href;
  }
  if (segments[0] === '(social)') {
    const tab = segments[1];
    if (tab && tab in SOCIAL_TAB_HREFS) {
      return SOCIAL_TAB_HREFS[tab];
    }
  }
  return '/(social)/(feed)';
}

/** Sosyal moddan ana uygulamaya tek dokunuşla dönüş. */
export function exitSocialMode(userType?: UserType | string | null) {
  const home = pathByUserType(userType != null ? String(userType) : null) as Href;
  router.replace(home);
}
