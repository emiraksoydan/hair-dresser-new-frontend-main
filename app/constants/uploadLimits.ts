/**
 * Backend `Business/Helpers/UploadFileValidator.cs` ile senkron limitler.
 * Backend'deki değerler değişirse burayı da güncelleyin — client-side guard
 * sadece UX için; asıl denetim sunucuda yapılır.
 *
 * Boyut aşımı:
 *   - pick-document helper'ları oversize dosyayı Alert ile bildirir ve upload
 *     etmez. Böylece kullanıcı dakikalarca yükleme beklentisi yapıp sonra
 *     sunucudan reddedilmekle uğraşmaz.
 */

export const UploadLimits = {
    /** Profil fotoğrafı, galeri, chat görseli, sertifika vs. */
    IMAGE_BYTES: 10 * 1024 * 1024,       // 10 MB
    /** Chat sesli mesaj, sesli bildirim. */
    AUDIO_BYTES: 20 * 1024 * 1024,       // 20 MB
    /** PDF/Office/ZIP — chat belge mesajları, sertifikalar. */
    DOCUMENT_BYTES: 25 * 1024 * 1024,    // 25 MB
    /** Chat video mesajı. */
    VIDEO_BYTES: 50 * 1024 * 1024,       // 50 MB
} as const;

/**
 * Byte cinsinden limiti insana okunur MB'ye çevirir (tam sayıya yuvarlanır,
 * kullanıcıya "Maks. 10 MB" gibi net bir bilgi gösterilebilsin diye).
 */
export function formatLimitMb(bytes: number): number {
    return Math.round(bytes / (1024 * 1024));
}
