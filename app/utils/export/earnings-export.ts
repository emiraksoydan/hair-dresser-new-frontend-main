import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";

export type EarningsExportPayload = {
  title: string;
  periodLabel: string;
  dailyEarnings: number;
  totalEarnings: number;
  previousPeriodEarnings: number;
  changePercent: number;
  rows: { label: string; amount: number }[];
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildEarningsCsv(payload: EarningsExportPayload): string {
  const lines = [
    payload.title,
    payload.periodLabel,
    "",
    "Alan;Değer",
    `Günlük;${payload.dailyEarnings}`,
    `Toplam;${payload.totalEarnings}`,
    `Önceki dönem;${payload.previousPeriodEarnings}`,
    `Değişim %;${payload.changePercent}`,
    "",
    "Dönem;Tutar (₺)",
    ...payload.rows.map((r) => `${r.label};${r.amount}`),
  ];
  return lines.join("\n");
}

function buildEarningsHtml(payload: EarningsExportPayload): string {
  const rows = payload.rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.label)}</td><td style="text-align:right">${r.amount.toLocaleString("tr-TR")} ₺</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  .muted { color: #64748b; font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #e2e8f0; padding: 8px 10px; }
  th { background: #f8fafc; text-align: left; }
  .sum { margin: 16px 0; font-size: 14px; }
</style></head><body>
  <h1>${escapeHtml(payload.title)}</h1>
  <div class="muted">${escapeHtml(payload.periodLabel)}</div>
  <div class="sum">Günlük: <strong>${payload.dailyEarnings.toLocaleString("tr-TR")} ₺</strong> · Toplam: <strong>${payload.totalEarnings.toLocaleString("tr-TR")} ₺</strong></div>
  <div class="sum">Önceki dönem: ${payload.previousPeriodEarnings.toLocaleString("tr-TR")} ₺ · Değişim: ${payload.changePercent.toFixed(1)}%</div>
  <table><thead><tr><th>Dönem</th><th>Tutar (₺)</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

export async function shareEarningsCsv(payload: EarningsExportPayload): Promise<void> {
  const csv = buildEarningsCsv(payload);
  const name = `kazanc-${Date.now()}.csv`;
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) {
    await Share.share({ message: csv, title: payload.title });
    return;
  }
  const path = `${base}${name}`;
  await FileSystem.writeAsStringAsync(path, "\uFEFF" + csv, { encoding: "utf8" });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: "text/csv",
      dialogTitle: payload.title,
      UTI: "public.comma-separated-values-text",
    });
  }
}

export async function shareEarningsPdf(payload: EarningsExportPayload): Promise<void> {
  const html = buildEarningsHtml(payload);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: payload.title,
      UTI: "com.adobe.pdf",
    });
  }
}
