/** Arama kutusundan @ önekini temizler */
export function normalizeSocialSearchQuery(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}
