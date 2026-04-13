import { DAYS_TR } from "../../constants";

// --- SABİTLER ---
export const timeHHmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const HOLIDAY_OPTIONS = DAYS_TR.map(d => ({ label: d.full, value: String(d.day) }));


// --- FORMATLAMA FONKSİYONLARI ---

// Date nesnesini "YYYY-MM-DD" formatına çevirir
export const fmtDateOnly = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};

// Date nesnesini "HH:mm" formatına çevirir
export const fmtHHmm = (d: Date): string => {
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
};


// --- DÖNÜŞTÜRME VE PARSE FONKSİYONLARI ---

// "9:5", "09:30:00" veya "9.30" gibi girdileri standart "09:30" formatına çevirir
// (Eski toHHmm fonksiyonunun yerini bu aldı, daha güvenli)
export const normalizeTime = (t?: string | null): string => {
    if (!t) return "";
    // Noktayı iki noktaya çevir, saniyeleri at ve böl
    const parts = t.trim().replace(".", ":").split(":");
    const hh = (parts[0] ?? "00").padStart(2, "0");
    const mm = (parts[1] ?? "00").padStart(2, "0");
    return `${hh}:${mm}`;
};

// "HH:mm" string'ini Date objesine çevirir (Günü bugüne ayarlar)
export const fromHHmm = (s?: string, fallback = "09:00"): Date => {
    const d = new Date();
    // normalizeTime kullanarak önce stringi temizliyoruz
    const safeTime = normalizeTime(s || fallback); 
    const [hh, mm] = safeTime.split(":").map((x) => parseInt(x, 10));
    
    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
};

// "HH:mm" string'ini dakika cinsinden integer'a çevirir (Örn: "01:30" -> 90)
export const toMinutes = (hhmm?: string): number => {
    if (!hhmm) return NaN;
    const [h, m] = hhmm.split(':');
    const hh = Number(h), mm = Number(m);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
    return hh * 60 + mm;
};


// --- HESAPLAMA VE YARDIMCI FONKSİYONLAR ---

// "HH:mm" string'ine dakika ekler ve yeni "HH:mm" stringi döner
export const addMinutesToHHmm = (hhmm: string, minutes: number): string => {
    // Kodu tekrar yazmak yerine yukarıdaki yardımcıları kullanıyoruz:
    const d = fromHHmm(hhmm);       // String -> Date
    d.setMinutes(d.getMinutes() + minutes); // Ekleme yap
    return fmtHHmm(d);              // Date -> String
};

// Önümüzdeki 7 günü array olarak döner
export const build7Days = (): Date[] => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        return d;
    });
};

// Gün bilgilerini döndür (randevu takvimi için)
export const getDayInfo = (d: Date): { dayName: string; dayShort: string; dayNum: number; monthShort: string; isToday: boolean } => {
    const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    const dayShorts = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const monthShorts = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);

    return {
        dayName: dayNames[d.getDay()],
        dayShort: dayShorts[d.getDay()],
        dayNum: d.getDate(),
        monthShort: monthShorts[d.getMonth()],
        isToday: today.getTime() === target.getTime(),
    };
};

// Date string'ini formatla
export const formatDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    } catch {
        return dateStr;
    }
};