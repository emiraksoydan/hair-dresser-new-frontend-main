import { getWorkingDays } from "../../constants/form";

// --- SABİTLER ---
export const timeHHmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function getHolidayOptions(t: (key: string) => string) {
    return getWorkingDays(t).map((d) => ({ label: d.full, value: String(d.day) }));
}

/** @deprecated Use getHolidayOptions(t) */
export const HOLIDAY_OPTIONS: { label: string; value: string }[] = [];


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
export const normalizeTime = (t?: string | null): string => {
    if (!t) return "";
    const parts = t.trim().replace(".", ":").split(":");
    const hh = (parts[0] ?? "00").padStart(2, "0");
    const mm = (parts[1] ?? "00").padStart(2, "0");
    return `${hh}:${mm}`;
};

export const fromHHmm = (s?: string, fallback = "09:00"): Date => {
    const d = new Date();
    const safeTime = normalizeTime(s || fallback);
    const [hh, mm] = safeTime.split(":").map((x) => parseInt(x, 10));

    d.setHours(hh || 0, mm || 0, 0, 0);
    return d;
};

export const toMinutes = (hhmm?: string): number => {
    if (!hhmm) return NaN;
    const [h, m] = hhmm.split(":");
    const hh = Number(h), mm = Number(m);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
    return hh * 60 + mm;
};


// --- HESAPLAMA VE YARDIMCI FONKSİYONLAR ---

export const addMinutesToHHmm = (hhmm: string, minutes: number): string => {
    const d = fromHHmm(hhmm);
    d.setMinutes(d.getMinutes() + minutes);
    return fmtHHmm(d);
};

export const build7Days = (): Date[] => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        return d;
    });
};

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

export const formatDate = (dateStr: string): string => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
};
