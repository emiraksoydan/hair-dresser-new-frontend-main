/**
 * Form-related constants
 */

export const trMoneyRegex = /^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/;

export const PRICING_OPTIONS = [
    { label: "Koltuk Kirala", value: "rent" },
    { label: "Yüzdelik", value: "percent" },
] as const;

export const DAYS_TR = [
    { label: "Pzt", full: "Pazartesi", day: 1 },
    { label: "Sal", full: "Salı", day: 2 },
    { label: "Çar", full: "Çarşamba", day: 3 },
    { label: "Per", full: "Perşembe", day: 4 },
    { label: "Cum", full: "Cuma", day: 5 },
    { label: "Cmt", full: "Cumartesi", day: 6 },
    { label: "Paz", full: "Pazar", day: 0 },
];

