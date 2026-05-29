export type EarningsVariant = "store" | "freeBarber";

export type EarningsTheme = {
  variant: EarningsVariant;
  pageBg: string;
  /** Status bar + üst başlık + yapışkan filtre şeridi (açık tema: beyaz) */
  headerSurface: string;
  headerGrad: readonly [string, string, string];
  headerTitleLight: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  chipActiveBg: string;
  chipActiveText: string;
  cardRadius: number;
  cardBorderWidth: number;
  chartAccent: string;
  chartFill: string;
  chartShellBg: string;
  headerIcon: string;
};

export function getEarningsTheme(variant: EarningsVariant, isDark: boolean): EarningsTheme {
  if (variant === "store") {
    return {
      variant,
      pageBg: isDark ? "#0c1210" : "#ecfdf5",
      headerSurface: isDark ? "#042f2e" : "#ffffff",
      headerGrad: isDark
        ? (["#042f2e", "#0f766e", "#0c1210"] as const)
        : (["#ffffff", "#ffffff", "#ffffff"] as const),
      headerTitleLight: "#134e4a",
      accent: isDark ? "#5eead4" : "#0d9488",
      accentSoft: isDark ? "rgba(45, 212, 191, 0.16)" : "rgba(13, 148, 136, 0.1)",
      accentBorder: isDark ? "rgba(45, 212, 191, 0.32)" : "rgba(13, 148, 136, 0.2)",
      chipActiveBg: isDark ? "#0f766e" : "#0d9488",
      chipActiveText: "#ffffff",
      cardRadius: 16,
      cardBorderWidth: 1,
      chartAccent: isDark ? "rgba(94, 234, 212, 0.9)" : "rgba(13, 148, 136, 0.9)",
      chartFill: isDark ? "rgba(20,184,166,0.9)" : "rgba(13,148,136,0.85)",
      chartShellBg: isDark ? "rgba(15, 45, 42, 0.55)" : "rgba(204, 251, 241, 0.65)",
      headerIcon: "store",
    };
  }
  return {
    variant,
    pageBg: isDark ? "#0c1210" : "#ecfdf5",
    headerSurface: isDark ? "#042f2e" : "#ffffff",
    headerGrad: isDark
      ? (["#042f2e", "#0f766e", "#0c1210"] as const)
      : (["#ffffff", "#ffffff", "#ffffff"] as const),
    headerTitleLight: "#134e4a",
    accent: isDark ? "#5eead4" : "#0d9488",
    accentSoft: isDark ? "rgba(45, 212, 191, 0.16)" : "rgba(13, 148, 136, 0.1)",
    accentBorder: isDark ? "rgba(45, 212, 191, 0.32)" : "rgba(13, 148, 136, 0.2)",
    chipActiveBg: isDark ? "#0f766e" : "#0d9488",
    chipActiveText: "#ffffff",
    cardRadius: 20,
    cardBorderWidth: 1,
    chartAccent: isDark ? "rgba(94, 234, 212, 0.9)" : "rgba(13, 148, 136, 0.9)",
    chartFill: isDark ? "rgba(20,184,166,0.9)" : "rgba(13,148,136,0.85)",
    chartShellBg: isDark ? "rgba(15, 45, 42, 0.55)" : "rgba(204, 251, 241, 0.65)",
    headerIcon: "wallet",
  };
}

export function getPiePalette(variant: EarningsVariant): string[] {
  if (variant === "store") {
    return [
      "rgba(13,148,136,0.9)",
      "rgba(45,212,191,0.88)",
      "rgba(52,211,153,0.85)",
      "rgba(110,231,183,0.88)",
      "rgba(20,184,166,0.9)",
      "rgba(94,234,212,0.85)",
    ];
  }
  return [
    "rgba(13,148,136,0.9)",
    "rgba(45,212,191,0.88)",
    "rgba(52,211,153,0.85)",
    "rgba(110,231,183,0.88)",
    "rgba(20,184,166,0.9)",
    "rgba(94,234,212,0.85)",
  ];
}
