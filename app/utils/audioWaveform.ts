/**
 * expo-av RecordingStatus.metering: yaklaşık -160 (sessiz) … 0 dBFS (max).
 * Görsel dalga için 0…1 aralığına taşır; konuşma aralığına ağırlık verir.
 */
export function meteringDbToNorm(db: number): number {
  if (!Number.isFinite(db)) return 0.1;
  // Sessiz / arka plan: neredeyse düz çizgi; konuşma arttıkça bar belirgin yükselir (WhatsApp benzeri)
  if (db < -48) {
    const u = Math.max(0, Math.min(1, (db + 160) / 112));
    return 0.035 + u * 0.1;
  }
  const lo = -48;
  const hi = -8;
  const t = Math.max(0, Math.min(1, (db - lo) / (hi - lo)));
  return 0.16 + t * 0.84;
}

/** Kayıt boyunca biriken örnekleri sabit sayıda çubuğa indirger (segment içi max — tepe takibi). */
export function downsampleWaveformPeaks(samples: number[], targetCount: number): number[] {
  const n = Math.max(8, Math.min(64, targetCount));
  if (samples.length === 0) {
    return Array.from({ length: n }, () => 0.35);
  }
  const out: number[] = [];
  const bucket = samples.length / n;
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * bucket);
    const b = Math.min(samples.length, Math.floor((i + 1) * bucket));
    let max = 0;
    for (let j = a; j < b; j++) max = Math.max(max, samples[j]!);
    out.push(Math.min(1, Math.max(0.03, max)));
  }
  return out;
}
