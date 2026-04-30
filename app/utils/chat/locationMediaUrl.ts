/**
 * Backend (ChatManager.ValidateMediaUrl) Location için `{"lat": number, "lng": number}` JSON bekler.
 * Eski istemciler `geo:lat,lng` göndermiş olabilir — okurken her iki biçim desteklenir.
 */
export function buildLocationMediaPayload(latitude: number, longitude: number): string {
  return JSON.stringify({ lat: latitude, lng: longitude });
}

export function parseLocationMediaUrl(
  mediaUrl: string | null | undefined
): { lat: string; lng: string } | null {
  if (!mediaUrl?.trim()) return null;
  const raw = mediaUrl.trim();
  if (raw.startsWith("{")) {
    try {
      const j = JSON.parse(raw) as { lat?: unknown; lng?: unknown };
      const lat = typeof j.lat === "number" ? j.lat : Number(j.lat);
      const lng = typeof j.lng === "number" ? j.lng : Number(j.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat: String(lat), lng: String(lng) };
    } catch {
      return null;
    }
  }
  if (raw.toLowerCase().startsWith("geo:")) {
    const rest = raw.slice(4);
    const coords = rest.split(",");
    if (coords.length === 2) {
      return { lat: coords[0]!.trim(), lng: coords[1]!.trim() };
    }
  }
  return null;
}
