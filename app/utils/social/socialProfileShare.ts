import * as Linking from 'expo-linking';

export function buildSocialProfileShareUrl(username: string): string {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  return Linking.createURL('/(screens)/social/profile-view', {
    queryParams: { username: normalized },
  });
}

export function buildSocialProfileShareMessage(
  username: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const url = buildSocialProfileShareUrl(username);
  return t('social.shareProfileMessage', { username, url });
}
