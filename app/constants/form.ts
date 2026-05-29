/**
 * Form-related constants
 */

export const trMoneyRegex = /^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/;

const WEEKDAY_DEFS = [
    { day: 1, shortKey: "form.days.monShort", fullKey: "form.days.mon" },
    { day: 2, shortKey: "form.days.tueShort", fullKey: "form.days.tue" },
    { day: 3, shortKey: "form.days.wedShort", fullKey: "form.days.wed" },
    { day: 4, shortKey: "form.days.thuShort", fullKey: "form.days.thu" },
    { day: 5, shortKey: "form.days.friShort", fullKey: "form.days.fri" },
    { day: 6, shortKey: "form.days.satShort", fullKey: "form.days.sat" },
    { day: 0, shortKey: "form.days.sunShort", fullKey: "form.days.sun" },
] as const;

export type WorkingDayOption = {
    label: string;
    full: string;
    day: number;
};

/** Haftalık gün listesi (çalışma saatleri UI). */
export function getWorkingDays(t: (key: string) => string): WorkingDayOption[] {
    return WEEKDAY_DEFS.map((d) => ({
        day: d.day,
        label: t(d.shortKey),
        full: t(d.fullKey),
    }));
}

export function getPricingOptions(t: (key: string) => string) {
    return [
        { label: t("form.pricingOptionRent"), value: "rent" as const },
        { label: t("form.pricingOptionPercent"), value: "percent" as const },
    ];
}

/** @deprecated Use getWorkingDays(t) */
export const DAYS_TR = WEEKDAY_DEFS.map((d) => ({
    label: d.shortKey,
    full: d.fullKey,
    day: d.day,
}));

/** @deprecated Use getPricingOptions(t) */
export const PRICING_OPTIONS = [
    { label: "form.pricingOptionRent", value: "rent" },
    { label: "form.pricingOptionPercent", value: "percent" },
] as const;
