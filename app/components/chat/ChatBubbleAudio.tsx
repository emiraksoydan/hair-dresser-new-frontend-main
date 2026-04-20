import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { View, Text, LayoutChangeEvent, StyleSheet, Platform } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type FrameInfo,
} from "react-native-reanimated";
import { Icon } from "react-native-paper";

const AnimatedText = Animated.createAnimatedComponent(Text);

const WAVE_BAR_MAX_H = 34;
/** Dar ekranda minimum çubuk; uzun kayıtta sıkıştırma */
const MIN_BAR_W = 1.15;
const MAX_BAR_W = 4.25;
const MIN_BAR_GAP = 0.65;
const SCRUBBER_SIZE = 14;
const SCRUBBER_HALF = SCRUBBER_SIZE / 2;
/** Dalga play düğmesine yakın; sağda kart kenarından daha fazla boşluk */
const WAVE_H_INSET_LEFT = 2;
const WAVE_H_INSET_RIGHT = 14;
/** Üstte boşluk — çubuklar biraz aşağıda / WhatsApp hissi */
const BARS_LAYER_H = WAVE_BAR_MAX_H + 4;
const WAVE_TRACK_HEIGHT = BARS_LAYER_H + 12;

const MIN_OUTER_W = 260;
const MIN_WAVE_COL_W = 140;

/** wavePx içine sığabilecek maksimum çubuk sayısı (minimum kalınlık varsayımı) */
function maxBarsForTrack(wavePx: number, gap: number): number {
  if (wavePx <= 0) return 48;
  return Math.max(12, Math.floor((wavePx + gap) / (MIN_BAR_W + gap)));
}

/** Uzun peak dizisini görünür çubuk sayısına indirger (zaman eksenine göre ortalama tepe) */
function downsamplePeaks(peaks: number[], targetCount: number): number[] {
  if (targetCount <= 0 || peaks.length === 0) return [];
  if (peaks.length <= targetCount) return peaks.map((p) => Math.min(1, Math.max(0.03, p)));
  const out: number[] = [];
  const bucket = peaks.length / targetCount;
  for (let i = 0; i < targetCount; i++) {
    const a = Math.floor(i * bucket);
    const b = Math.floor((i + 1) * bucket);
    let m = 0;
    for (let j = a; j < b && j < peaks.length; j++) m = Math.max(m, peaks[j]);
    out.push(Math.min(1, Math.max(0.03, m)));
  }
  return out;
}

type WaveLayout = {
  heights: number[];
  barW: number;
  gap: number;
  trackStart: number;
  trackW: number;
};

function computeWaveLayout(
  waveW: number,
  hasRealPeaks: boolean,
  waveformPeaks: number[] | null | undefined,
  messageId: string,
): WaveLayout {
  const gap = MIN_BAR_GAP;
  if (waveW <= 0) {
    return { heights: [], barW: MIN_BAR_W, gap, trackStart: 0, trackW: 1 };
  }

  const maxBars = maxBarsForTrack(waveW, gap);

  let heights: number[];
  let n: number;

  if (hasRealPeaks && waveformPeaks && waveformPeaks.length >= 8) {
    const raw = waveformPeaks.map((p) => Math.min(1, Math.max(0.03, p)));
    const targetN = Math.min(raw.length, maxBars);
    heights = downsamplePeaks(raw, targetN);
    n = heights.length;
    if (n === 0) {
      return { heights: [], barW: MIN_BAR_W, gap, trackStart: 0, trackW: 1 };
    }
  } else {
    n = Math.max(12, Math.min(maxBars, 56));
    heights = smoothFallbackHeights(`${messageId}:${n}`, n);
  }

  let barW = (waveW - (n - 1) * gap) / n;
  barW = Math.min(MAX_BAR_W, barW);
  let contentW = n * barW + (n - 1) * gap;
  if (contentW > waveW) {
    barW = Math.max(MIN_BAR_W, (waveW - (n - 1) * gap) / n);
    contentW = Math.min(waveW, n * barW + (n - 1) * gap);
  }
  /** Sola hizalı — çubuklar play’e yakın, sağda boşluk waveCol padding ile verilir */
  const trackStart = 0;
  return { heights, barW, gap, trackStart, trackW: contentW };
}

function smoothFallbackHeights(seedStr: string, count: number): number[] {
  let seed = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    seed ^= seedStr.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    return (Math.abs(seed) % 1000) / 1000;
  };
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(0.28 + rnd() * 0.72);
  }
  return out;
}


export function formatAudioClock(ms: number): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatAudioClockWorklet(ms: number): string {
  "worklet";
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const pad = s < 10 ? `0${s}` : `${s}`;
  return `${m}:${pad}`;
}

export interface ChatBubbleAudioProps {
  messageId: string;
  isMe: boolean;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  onTogglePlay: () => void;
  onSeek: (ratio: number) => void;
  /** Waveform sürüklemesi başladı (oynatmayı duraklatır — WhatsApp benzeri) */
  onScrubbingBegin?: () => void;
  /** Parmak kalktı ama seek tetiklenmediyse (iptal) */
  onScrubbingCancel?: () => void;
  bubbleBackgroundColor: string;
  brandColor: string;
  mutedTextColor: string;
  sectionHeaderText: string;
  softBrandBg: string;
  /** incoming: açık gri balon; outgoingOrange: turuncu gönderim balonu (beyaz dalga) */
  waveformSurface?: "incoming" | "outgoingOrange";
  avatarSlot: React.ReactNode;
  waveformPeaks?: number[] | null;
  /**
   * Sohbet mesaj listesinin `Gesture.Native()` kaydırma jesti (üstte GestureDetector ile sarılı FlatList).
   * Verilirse waveform sürüklemesi ile dikey kaydırma çakışması azalır.
   */
  listScrollGesture?: ReturnType<typeof Gesture.Native>;
}

function clamp(n: number, lo: number, hi: number) {
  "worklet";
  return Math.min(hi, Math.max(lo, n));
}

type WaveformBarLayersProps = {
  messageId: string;
  heights: number[];
  barW: number;
  barGap: number;
  stripOffset: number;
  unplayedColor: string;
  playedColor: string;
  hasRealPeaks: boolean;
  playedOverlayStyle: object;
};

const WaveformBarLayers = React.memo(
  function WaveformBarLayers({
    messageId: _mid,
    heights,
    barW,
    barGap,
    stripOffset,
    unplayedColor,
    playedColor,
    hasRealPeaks,
    playedOverlayStyle,
  }: WaveformBarLayersProps) {
    return (
      <>
        <View style={[styles.barsLayer, { paddingLeft: stripOffset }]}>
          {heights.map((hNorm: number, i: number) => {
            const barH = Math.max(2, Math.round(hNorm * WAVE_BAR_MAX_H));
            const isLast = i === heights.length - 1;
            return (
              <View
                key={`${hasRealPeaks ? "m" : "s"}-${i}`}
                style={[
                  styles.barShell,
                  {
                    height: barH,
                    width: barW,
                    marginRight: isLast ? 0 : barGap,
                    backgroundColor: unplayedColor,
                    borderRadius: Math.min(3, barW / 2),
                  },
                ]}
              />
            );
          })}
        </View>
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", left: stripOffset, top: 0, bottom: 0, overflow: "hidden" }, playedOverlayStyle]}
        >
          <View style={[styles.barsLayer]}>
            {heights.map((hNorm: number, i: number) => {
              const barH = Math.max(2, Math.round(hNorm * WAVE_BAR_MAX_H));
              const isLast = i === heights.length - 1;
              return (
                <View
                  key={`${hasRealPeaks ? "m" : "s"}-${i}`}
                  style={[
                    styles.barShell,
                    {
                      height: barH,
                      width: barW,
                      marginRight: isLast ? 0 : barGap,
                      backgroundColor: playedColor,
                      borderRadius: Math.min(3, barW / 2),
                    },
                  ]}
                />
              );
            })}
          </View>
        </Animated.View>
      </>
    );
  },
  (prev, next) =>
    prev.messageId === next.messageId &&
    prev.heights === next.heights &&
    prev.barW === next.barW &&
    prev.barGap === next.barGap &&
    prev.stripOffset === next.stripOffset &&
    prev.unplayedColor === next.unplayedColor &&
    prev.playedColor === next.playedColor &&
    prev.hasRealPeaks === next.hasRealPeaks &&
    prev.playedOverlayStyle === next.playedOverlayStyle,
);

export const ChatBubbleAudio: React.FC<ChatBubbleAudioProps> = ({
  messageId,
  isMe: _isMe,
  isPlaying,
  positionMillis,
  durationMillis,
  onTogglePlay,
  onSeek,
  onScrubbingBegin,
  onScrubbingCancel,
  bubbleBackgroundColor,
  brandColor,
  mutedTextColor,
  sectionHeaderText,
  softBrandBg: _softBrandBg,
  waveformSurface = "incoming",
  avatarSlot,
  waveformPeaks,
  listScrollGesture,
}) => {
  /** Dalga şeması genişliği (yatay inset düşülmüş) */
  const [waveW, setWaveW] = useState(0);
  /** Parent bazen kısa süre durationMillis=0 gönderir; oynatırken ilerleme için son bilinen süre */
  const lastDurationRef = useRef(0);
  const didSeekThisGestureRef = useRef(false);

  const waveWShared = useSharedValue(0);
  const scrubberX = useSharedValue(0);
  /** 0-1 — frame callback + extrapolasyon (akıcı); pending ile hizalı */
  const progressSV = useSharedValue(0);
  const trackStartSV = useSharedValue(0);
  const trackWSV = useSharedValue(1);
  const draggingSV = useSharedValue(false);
  const durationMsSV = useSharedValue(0);
  const pendingMsSV = useSharedValue(0);
  const playingSV = useSharedValue(false);
  /** extrapolasyon anchor — native küçük geride kalınca geri sıçratmamak için */
  const anchorMsSV = useSharedValue(0);
  const anchorTsSV = useSharedValue(0);
  const prevPendingSV = useSharedValue(-1);
  /** Parmak kalkınca bir sonraki karede anchor’ı pending ile hizala (önceki konuma flash yok) */
  const forceSyncSV = useSharedValue(0);

  const hasRealPeaks = Array.isArray(waveformPeaks) && waveformPeaks.length >= 8;

  const waveLayout = useMemo(
    () => computeWaveLayout(waveW, hasRealPeaks, waveformPeaks ?? null, messageId),
    [waveW, hasRealPeaks, waveformPeaks, messageId],
  );

  useEffect(() => {
    if (durationMillis > 0) lastDurationRef.current = durationMillis;
  }, [durationMillis]);

  useEffect(() => {
    lastDurationRef.current = 0;
  }, [messageId]);

  const playbackDuration =
    durationMillis > 0 ? durationMillis : isPlaying ? lastDurationRef.current : 0;

  const onWaveLayout = useCallback((e: LayoutChangeEvent) => {
    const outer = e.nativeEvent.layout.width;
    const inner = Math.max(1, outer - WAVE_H_INSET_LEFT - WAVE_H_INSET_RIGHT);
    setWaveW(inner);
    waveWShared.value = outer;
  }, [waveWShared]);

  const trackStart = waveLayout.trackStart;
  const trackW = Math.max(1, waveLayout.trackW);

  useEffect(() => {
    trackStartSV.value = trackStart;
    trackWSV.value = trackW;
  }, [trackStart, trackW, trackStartSV, trackWSV]);

  /**
   * Konum / süre / oynatma — React’ten gelen pozisyonu worklet’e yaz.
   * Oynatırken geriye giden güncellemeleri (gecikmeli native) yok say: monotonluk onWaveFrame’de.
   */
  useEffect(() => {
    const dur = playbackDuration;
    durationMsSV.value = dur;
    pendingMsSV.value = positionMillis;
    playingSV.value = isPlaying;
  }, [positionMillis, playbackDuration, isPlaying, messageId]);

  useEffect(() => {
    prevPendingSV.value = -1;
    anchorMsSV.value = 0;
    anchorTsSV.value = 0;
    forceSyncSV.value = 0;
  }, [messageId]);

  const elapsedAnimatedProps = useAnimatedProps(() => {
    const dur = durationMsSV.value;
    const r = progressSV.value;
    const ms = dur > 0 ? Math.min(dur, Math.max(0, r * dur)) : 0;
    return { text: formatAudioClockWorklet(ms) } as Record<string, unknown>;
  });

  const onWaveFrame = useCallback((frameInfo: FrameInfo) => {
    "worklet";
    const t = frameInfo.timestamp;
    const w = waveWShared.value;
    const ts = trackStartSV.value;
    const tw = trackWSV.value;
    const dur = durationMsSV.value;
    const drag = draggingSV.value;

    if (w <= 0 || tw <= 0) return;
    if (dur <= 0 && !drag) {
      // Keep anchor timestamp fresh — when duration first arrives, t - anchorTsSV won't be stale
      anchorTsSV.value = t;
      anchorMsSV.value = 0;
      prevPendingSV.value = pendingMsSV.value;
      return;
    }

    if (forceSyncSV.value === 1 && !drag) {
      const p0 = pendingMsSV.value;
      anchorMsSV.value = p0;
      anchorTsSV.value = t;
      prevPendingSV.value = p0;
      forceSyncSV.value = 0;
    }

    let ms: number;
    if (drag) {
      ms = dur > 0 ? progressSV.value * dur : 0;
    } else {
      const p = pendingMsSV.value;
      const playing = playingSV.value;

      if (playing && dur > 0) {
        /**
         * Native pozisyon ~32ms gelir; extrapolasyon ileri gider. Eski / gecikmeli `p`
         * değerleri anchor’ı geri çekmesin — sadece ileri kaydır (monoton, geri sıçrama yok).
         */
        const pChanged = Math.abs(p - prevPendingSV.value) > 0.5;
        if (pChanged) {
          const extrapBefore = anchorMsSV.value + (t - anchorTsSV.value);
          const anchorNext = Math.max(p, extrapBefore);
          anchorMsSV.value = Math.min(dur, anchorNext);
          anchorTsSV.value = t;
          prevPendingSV.value = p;
        }
        ms = Math.min(dur, Math.max(0, anchorMsSV.value + (t - anchorTsSV.value)));
      } else {
        ms = dur > 0 ? Math.min(dur, Math.max(0, p)) : 0;
        anchorMsSV.value = ms;
        anchorTsSV.value = t;
        prevPendingSV.value = p;
      }
    }

    const ratio = dur > 0 ? Math.min(1, Math.max(0, ms / dur)) : 0;
    progressSV.value = ratio;
    const maxX = w - SCRUBBER_SIZE;
    scrubberX.value = Math.min(
      maxX,
      Math.max(0, WAVE_H_INSET_LEFT + ts + ratio * tw - SCRUBBER_HALF),
    );
  }, []);

  const waveFrame = useFrameCallback(onWaveFrame, false);

  useEffect(() => {
    waveFrame.setActive(waveW > 0);
  }, [waveW, waveFrame]);

  const seekFromRatio = useCallback(
    (ratio: number) => {
      onSeek(Math.min(1, Math.max(0, ratio)));
    },
    [onSeek],
  );

  const onGestureBegin = useCallback(() => {
    didSeekThisGestureRef.current = false;
    onScrubbingBegin?.();
  }, [onScrubbingBegin]);

  const onSeekEndFromGesture = useCallback(
    (ratio: number) => {
      didSeekThisGestureRef.current = true;
      seekFromRatio(ratio);
    },
    [seekFromRatio],
  );

  const onGestureFinalize = useCallback(() => {
    if (!didSeekThisGestureRef.current) {
      onScrubbingCancel?.();
    }
  }, [onScrubbingCancel]);

  const panGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(0)
      .onBegin(() => {
        draggingSV.value = true;
        prevPendingSV.value = -1;
        runOnJS(onGestureBegin)();
      })
      .onStart((e) => {
        const w = waveWShared.value;
        const ts = trackStartSV.value;
        const tw = trackWSV.value;
        if (w <= 0 || tw <= 0) return;
        const ratio = clamp((e.x - WAVE_H_INSET_LEFT - ts) / tw, 0, 1);
        const x = WAVE_H_INSET_LEFT + ts + ratio * tw - SCRUBBER_HALF;
        const maxX = w - SCRUBBER_SIZE;
        scrubberX.value = clamp(x, 0, maxX);
        progressSV.value = ratio;
      })
      .onUpdate((e) => {
        const w = waveWShared.value;
        const ts = trackStartSV.value;
        const tw = trackWSV.value;
        if (w <= 0 || tw <= 0) return;
        const ratio = clamp((e.x - WAVE_H_INSET_LEFT - ts) / tw, 0, 1);
        const x = WAVE_H_INSET_LEFT + ts + ratio * tw - SCRUBBER_HALF;
        const maxX = w - SCRUBBER_SIZE;
        scrubberX.value = clamp(x, 0, maxX);
        progressSV.value = ratio;
      })
      .onEnd((e) => {
        const w = waveWShared.value;
        const ts = trackStartSV.value;
        const tw = trackWSV.value;
        if (w > 0 && tw > 0) {
          const ratio = clamp((e.x - WAVE_H_INSET_LEFT - ts) / tw, 0, 1);
          const dur = durationMsSV.value;
          if (dur > 0) {
            pendingMsSV.value = Math.min(dur, Math.max(0, ratio * dur));
            forceSyncSV.value = 1;
          }
          progressSV.value = ratio;
          const maxX = w - SCRUBBER_SIZE;
          scrubberX.value = clamp(
            WAVE_H_INSET_LEFT + ts + ratio * tw - SCRUBBER_HALF,
            0,
            maxX,
          );
          runOnJS(onSeekEndFromGesture)(ratio);
        }
      })
      .onFinalize(() => {
        draggingSV.value = false;
        runOnJS(onGestureFinalize)();
      });
    if (listScrollGesture) {
      pan.simultaneousWithExternalGesture(listScrollGesture);
    }
    return pan;
  }, [
    listScrollGesture,
    scrubberX,
    progressSV,
    waveWShared,
    trackStartSV,
    trackWSV,
    onGestureBegin,
    onSeekEndFromGesture,
    onGestureFinalize,
  ]);

  const scrubberAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scrubberX.value }],
  }));

  const playedOverlayStyle = useAnimatedStyle(() => ({
    width: Math.max(0, progressSV.value * trackWSV.value),
  }));

  const stripOffset = WAVE_H_INSET_LEFT + trackStart;
  const barW = waveLayout.barW;
  const barGap = waveLayout.gap;

  const incoming = waveformSurface === "incoming";
  const playedColor = incoming ? brandColor : "rgba(255,255,255,0.95)";
  const unplayedColor = incoming ? "rgba(100,116,139,0.32)" : "rgba(255,255,255,0.32)";
  const scrubberColor = incoming ? brandColor : "#ffffff";
  const timeElapsedColor = incoming ? mutedTextColor : "rgba(255,255,255,0.78)";
  const timeTotalColor = incoming ? sectionHeaderText : "rgba(255,255,255,0.92)";
  const playIconColor = incoming ? brandColor : "#ffffff";

  const fontFamily = Platform.OS === "ios" ? undefined : "CenturyGothic";

  /** Dalga alanının dikey ortası (çubuklar flex-end yerine center ile hizalı) */
  const scrubberTop = WAVE_TRACK_HEIGHT - BARS_LAYER_H / 2 - SCRUBBER_HALF;

  return (
    <View style={styles.outer}>
      <View style={styles.avatarWrap}>
        {avatarSlot}
        <View style={[styles.micBadge, { backgroundColor: brandColor, borderColor: bubbleBackgroundColor }]}>
          <Icon source="microphone" size={9} color="#fff" />
        </View>
      </View>

      <Pressable
        onPress={onTogglePlay}
        hitSlop={10}
        style={({ pressed }) => [styles.playBtn, { opacity: pressed ? 0.72 : 1 }]}
      >
        <Icon source={isPlaying ? "pause" : "play"} size={24} color={playIconColor} />
      </Pressable>

      <View style={styles.waveCol}>
        <GestureDetector gesture={panGesture}>
          <View style={[styles.waveHit, styles.waveHitClip]} onLayout={onWaveLayout}>
            <WaveformBarLayers
              messageId={messageId}
              heights={waveLayout.heights}
              barW={barW}
              barGap={barGap}
              stripOffset={stripOffset}
              unplayedColor={unplayedColor}
              playedColor={playedColor}
              hasRealPeaks={hasRealPeaks}
              playedOverlayStyle={playedOverlayStyle}
            />

            {playbackDuration > 0 && waveW > 0 ? (
              <Animated.View
                key={`scrub-${messageId}`}
                pointerEvents="none"
                style={[
                  styles.scrubber,
                  {
                    top: scrubberTop,
                    left: 0,
                    backgroundColor: scrubberColor,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: incoming ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.35)",
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                  },
                  scrubberAnimatedStyle,
                ]}
              />
            ) : null}
          </View>
        </GestureDetector>

        <View style={styles.timeRow}>
          <AnimatedText
            selectable={false}
            animatedProps={elapsedAnimatedProps}
            style={[styles.timeText, { color: timeElapsedColor, fontFamily }]}
            numberOfLines={1}
            allowFontScaling={false}
          />
          <Text
            selectable={false}
            style={[styles.timeText, { color: timeTotalColor, fontFamily }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {formatAudioClock(playbackDuration > 0 ? playbackDuration : durationMillis)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    width: "100%",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    position: "relative",
    flexShrink: 0,
    marginRight: 6,
  },
  micBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  playBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginRight: 2,
  },
  waveCol: {
    flex: 1,
    minWidth: MIN_WAVE_COL_W,
    overflow: "hidden",
    paddingRight: 12,
  },
  waveHit: {
    height: WAVE_TRACK_HEIGHT,
    width: "100%",
    position: "relative",
  },
  waveHitClip: {
    overflow: "hidden",
  },
  barsLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: BARS_LAYER_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  barShell: {
    overflow: "hidden",
  },
  scrubber: {
    position: "absolute",
    width: SCRUBBER_SIZE,
    height: SCRUBBER_SIZE,
    borderRadius: SCRUBBER_HALF,
    elevation: 3,
  },
  timeRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 6,
    paddingHorizontal: 4,
    minHeight: 18,
  },
  timeText: {
    fontSize: 12,
    flexShrink: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
});
