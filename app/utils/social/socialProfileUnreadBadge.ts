type BadgeData = {
  socialChatUnreadCount?: number;
  socialProfileUnreadCounts?: Record<string, number>;
};

/** Mesaj tab rozetinde aktif sosyal profile ait okunmamış DM sayısı. */
export function resolveSocialMessagesTabBadge(
  badgeData: BadgeData | null | undefined,
  activeProfileId: string | null,
): number {
  const perProfile = badgeData?.socialProfileUnreadCounts;
  if (perProfile && Object.keys(perProfile).length > 0) {
    if (activeProfileId) {
      const direct = perProfile[activeProfileId];
      if (direct != null) return Math.max(0, direct);
      const normalized = activeProfileId.toLowerCase();
      const match = Object.entries(perProfile).find(([id]) => id.toLowerCase() === normalized);
      if (match) return Math.max(0, match[1]);
      return 0;
    }
    const keys = Object.keys(perProfile);
    if (keys.length === 1) return Math.max(0, perProfile[keys[0]!] ?? 0);
  }
  return Math.max(0, badgeData?.socialChatUnreadCount ?? 0);
}
