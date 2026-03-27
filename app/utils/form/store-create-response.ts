/**
 * Normalizes BarberStore create-store API body so we always get the new store id
 * (handles camelCase / PascalCase `data` field).
 */
export function extractCreatedStoreIdFromResponse(body: unknown): string | undefined {
  if (body == null || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  const raw = o.data ?? o.Data;
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  return undefined;
}
