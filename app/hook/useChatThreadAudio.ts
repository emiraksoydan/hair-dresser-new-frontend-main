import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { Audio } from "expo-av";

export type ChatAudioPlayback = {
  messageId: string;
  positionMillis: number;
  durationMillis: number;
};

type TFunction = (key: string) => string;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Sohbet ses mesajı oynatma: tek sıra (mutex) ile seek/play çakışmasını önler;
 * hızlı pan sonrası çift createAsync / yarışan unload uyarıları ve yavaşlığı azaltır.
 */
export function useChatThreadAudio(alertError: (title: string, message: string) => void, t: TFunction) {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlayback, setAudioPlayback] = useState<ChatAudioPlayback | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const preparedAudioMessageIdRef = useRef<string | null>(null);
  const audioPlaybackRef = useRef<ChatAudioPlayback | null>(null);
  const playingAudioIdRef = useRef<string | null>(null);
  const lastSeekTargetRef = useRef<{ messageId: string; positionMillis: number } | null>(null);
  /** UI: waveform sürüklenirken play ikonu; seek sonrası temizlenir */
  const [scrubbingMessageId, setScrubbingMessageId] = useState<string | null>(null);
  const scrubbingMessageIdRef = useRef<string | null>(null);
  /** Sürükleme öncesi gerçekten oynatılıyorduysa seek bitince playAsync */
  const scrubResumeAfterSeekRef = useRef(false);

  useEffect(() => {
    scrubbingMessageIdRef.current = scrubbingMessageId;
  }, [scrubbingMessageId]);

  /** Tüm native ses işlemleri bu zincirde sırayla çalışır (seek spam → tek createAsync). */
  const chainRef = useRef(Promise.resolve());

  const enqueue = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = chainRef.current.then(fn);
    chainRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  /** Arka plan: sesi duraklat; tekrar açılınca kendiliğinden play olmasın (konum korunur, play ile devam) */
  useEffect(() => {
    const pauseForBackground = () => {
      void enqueue(async () => {
        scrubResumeAfterSeekRef.current = false;
        setScrubbingMessageId(null);
        const s = soundRef.current;
        if (!s) return;
        try {
          const st = await s.getStatusAsync();
          if (!st.isLoaded) return;
          const wasPlaying = st.isPlaying === true;
          if (wasPlaying) {
            await s.pauseAsync();
          }
          const mid =
            playingAudioIdRef.current ?? preparedAudioMessageIdRef.current ?? audioPlaybackRef.current?.messageId;
          if (!mid) return;
          if (wasPlaying) {
            preparedAudioMessageIdRef.current = mid;
          }
          playingAudioIdRef.current = null;
          setPlayingAudioId(null);
          const stAfter = await s.getStatusAsync();
          if (!stAfter.isLoaded) return;
          const pos = stAfter.positionMillis ?? 0;
          const dur =
            stAfter.durationMillis && stAfter.durationMillis > 0
              ? stAfter.durationMillis
              : audioPlaybackRef.current?.durationMillis ?? 0;
          const next: ChatAudioPlayback = { messageId: mid, positionMillis: pos, durationMillis: dur };
          audioPlaybackRef.current = next;
          setAudioPlayback(next);
        } catch {
          /* ignore */
        }
      });
    };

    const pauseIfNativePlayingWithoutUi = () => {
      void enqueue(async () => {
        const s = soundRef.current;
        if (!s) return;
        try {
          const st = await s.getStatusAsync();
          if (!st.isLoaded || !st.isPlaying) return;
          if (playingAudioIdRef.current != null) return;
          await s.pauseAsync();
          const mid =
            preparedAudioMessageIdRef.current ?? audioPlaybackRef.current?.messageId;
          if (mid) {
            preparedAudioMessageIdRef.current = mid;
          }
          const stAfter = await s.getStatusAsync();
          if (stAfter.isLoaded && mid) {
            const next: ChatAudioPlayback = {
              messageId: mid,
              positionMillis: stAfter.positionMillis ?? 0,
              durationMillis:
                stAfter.durationMillis && stAfter.durationMillis > 0
                  ? stAfter.durationMillis
                  : audioPlaybackRef.current?.durationMillis ?? 0,
            };
            audioPlaybackRef.current = next;
            setAudioPlayback(next);
          }
        } catch {
          /* ignore */
        }
      });
    };

    const onChange = (next: AppStateStatus) => {
      if (next === "background") {
        pauseForBackground();
      } else if (next === "active") {
        pauseIfNativePlayingWithoutUi();
      }
    };

    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [enqueue]);

  useEffect(() => {
    audioPlaybackRef.current = audioPlayback;
  }, [audioPlayback]);

  useEffect(() => {
    playingAudioIdRef.current = playingAudioId;
  }, [playingAudioId]);

  const mergeAudioDurationMillis = useCallback(
    (
      prev: ChatAudioPlayback | null | undefined,
      messageId: string,
      reported: number | undefined,
    ): number => {
      const d = reported ?? 0;
      if (d > 0) return d;
      if (prev?.messageId === messageId && prev.durationMillis > 0) return prev.durationMillis;
      return 0;
    },
    [],
  );

  const attachPlaybackStatus = useCallback(
    (sound: Audio.Sound, messageId: string) => {
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setAudioPlayback((prev) => {
            const rawDur = status.durationMillis ?? 0;
            const dur = mergeAudioDurationMillis(prev, messageId, rawDur);
            const reported = status.positionMillis ?? 0;
            const pos = dur > 0 ? Math.min(reported, dur) : reported;
            const lock = lastSeekTargetRef.current;
            if (lock && lock.messageId === messageId) {
              if (Math.abs(reported - lock.positionMillis) < 200) {
                lastSeekTargetRef.current = null;
                return {
                  messageId,
                  positionMillis: pos,
                  durationMillis: dur,
                };
              }
              return {
                messageId,
                positionMillis: lock.positionMillis,
                durationMillis: dur > 0 ? dur : (prev?.durationMillis ?? 0),
              };
            }
            return {
              messageId,
              positionMillis: pos,
              durationMillis: dur,
            };
          });
          if (status.didJustFinish) {
            soundRef.current = null;
            playingAudioIdRef.current = null;
            setPlayingAudioId(null);
            lastSeekTargetRef.current = null;
            setAudioPlayback((prev) =>
              prev?.messageId === messageId ? { ...prev, positionMillis: 0 } : null,
            );
          }
        }
      });
    },
    [mergeAudioDurationMillis],
  );

  const stopCurrentAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    preparedAudioMessageIdRef.current = null;
    playingAudioIdRef.current = null;
    setPlayingAudioId(null);
    audioPlaybackRef.current = null;
    lastSeekTargetRef.current = null;
    setAudioPlayback(null);
  }, []);

  const unloadSoundOnly = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    preparedAudioMessageIdRef.current = null;
    playingAudioIdRef.current = null;
    setPlayingAudioId(null);
  }, []);

  const loadPreparedSound = useCallback(
    async (messageId: string, url: string, ratio: number, keepDur: number): Promise<boolean> => {
      const r = Math.min(1, Math.max(0, ratio));
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });

      const tryCreate = async (): Promise<Audio.Sound> => {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false, progressUpdateIntervalMillis: 32 },
        );
        return sound;
      };

      let sound: Audio.Sound;
      try {
        sound = await tryCreate();
      } catch {
        await delay(85);
        try {
          sound = await tryCreate();
        } catch {
          return false;
        }
      }

      soundRef.current = sound;
      preparedAudioMessageIdRef.current = messageId;

      let status = await sound.getStatusAsync();
      let dur =
        status.isLoaded && status.durationMillis && status.durationMillis > 0
          ? status.durationMillis
          : keepDur;
      if (dur <= 0 && keepDur > 0) dur = keepDur;

      const pos = dur > 0 ? r * dur : 0;
      if (dur > 0) {
        lastSeekTargetRef.current = { messageId, positionMillis: pos };
        await sound.setPositionAsync(pos).catch(() => {});
      }

      const loaded: ChatAudioPlayback = { messageId, positionMillis: pos, durationMillis: dur };
      audioPlaybackRef.current = loaded;
      setAudioPlayback(loaded);
      attachPlaybackStatus(sound, messageId);
      return true;
    },
    [attachPlaybackStatus],
  );

  const resumePlaybackAfterScrubSeek = useCallback(async (messageId: string) => {
    const shouldResume = scrubResumeAfterSeekRef.current;
    scrubResumeAfterSeekRef.current = false;
    if (!shouldResume) return;
    if (AppState.currentState !== "active") return;
    const sound = soundRef.current;
    if (!sound) return;
    try {
      const st = await sound.getStatusAsync();
      if (st.isLoaded && !st.isPlaying) {
        await sound.playAsync();
        playingAudioIdRef.current = messageId;
        setPlayingAudioId(messageId);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleScrubbingBegin = useCallback(
    (messageId: string) => {
      setScrubbingMessageId(messageId);
      const likelyPlaying =
        playingAudioIdRef.current === messageId && soundRef.current != null;
      scrubResumeAfterSeekRef.current = likelyPlaying;
      void enqueue(async () => {
        const s = soundRef.current;
        if (!s || playingAudioIdRef.current !== messageId) {
          scrubResumeAfterSeekRef.current = false;
          return;
        }
        try {
          const st = await s.getStatusAsync();
          if (st.isLoaded && st.isPlaying) {
            scrubResumeAfterSeekRef.current = true;
            await s.pauseAsync();
          } else {
            scrubResumeAfterSeekRef.current = false;
          }
        } catch {
          scrubResumeAfterSeekRef.current = false;
        }
      });
    },
    [enqueue],
  );

  const handleScrubbingCancel = useCallback(
    (messageId: string) => {
      setScrubbingMessageId((prev) => (prev === messageId ? null : prev));
      const shouldResume = scrubResumeAfterSeekRef.current;
      scrubResumeAfterSeekRef.current = false;
      if (!shouldResume) return;
      void enqueue(async () => {
        if (AppState.currentState !== "active") return;
        const s = soundRef.current;
        if (!s || playingAudioIdRef.current !== messageId) return;
        try {
          const st = await s.getStatusAsync();
          if (st.isLoaded && !st.isPlaying) {
            await s.playAsync();
          }
        } catch {
          /* ignore */
        }
      });
    },
    [enqueue],
  );

  const handlePlayAudio = useCallback(
    (messageId: string, url: string) => {
      return enqueue(async () => {
        if (scrubbingMessageIdRef.current === messageId) {
          return;
        }
        /**
         * Aynı mesajda play: gerçekten çalıyorsa durdur; bitiş sonrası ref gecikmesinde soundRef yok → yeniden yükle.
         * Duraklatılmış (scrub vb.) ise oynatmayı sürdür.
         */
        if (
          playingAudioIdRef.current === messageId &&
          soundRef.current &&
          scrubbingMessageIdRef.current !== messageId
        ) {
          try {
            const st = await soundRef.current.getStatusAsync();
            if (st.isLoaded && st.isPlaying) {
              await stopCurrentAudio();
              return;
            }
            if (st.isLoaded && !st.isPlaying) {
              await soundRef.current.playAsync();
              playingAudioIdRef.current = messageId;
              setPlayingAudioId(messageId);
              try {
                const st2 = await soundRef.current.getStatusAsync();
                if (st2.isLoaded) {
                  const nextPlayback: ChatAudioPlayback = {
                    messageId,
                    positionMillis: st2.positionMillis ?? 0,
                    durationMillis: st2.durationMillis ?? 0,
                  };
                  audioPlaybackRef.current = nextPlayback;
                  setAudioPlayback(nextPlayback);
                }
              } catch {
                /* ignore */
              }
              return;
            }
          } catch {
            await stopCurrentAudio();
            return;
          }
        }

        if (preparedAudioMessageIdRef.current === messageId && soundRef.current) {
          try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
            const sound = soundRef.current;
            const snap = audioPlaybackRef.current;
            if (
              snap?.messageId === messageId &&
              snap.durationMillis > 0 &&
              Number.isFinite(snap.positionMillis)
            ) {
              const pos = Math.min(Math.max(0, snap.positionMillis), snap.durationMillis);
              const st = await sound.getStatusAsync();
              if (st.isLoaded) {
                lastSeekTargetRef.current = { messageId, positionMillis: pos };
                await sound.setPositionAsync(pos).catch(() => {});
              }
            }
            await sound.playAsync();
            playingAudioIdRef.current = messageId;
            setPlayingAudioId(messageId);
            preparedAudioMessageIdRef.current = null;
            try {
              const st = await sound.getStatusAsync();
              if (st.isLoaded) {
                const nextPlayback: ChatAudioPlayback = {
                  messageId,
                  positionMillis: st.positionMillis ?? 0,
                  durationMillis: st.durationMillis ?? 0,
                };
                audioPlaybackRef.current = nextPlayback;
                setAudioPlayback(nextPlayback);
              }
            } catch {
              /* ignore */
            }
          } catch {
            await stopCurrentAudio();
            alertError(t("common.error"), t("chat.audioPlayFailed"));
          }
          return;
        }

        await stopCurrentAudio();
        try {
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
          const { sound, status } = await Audio.Sound.createAsync(
            { uri: url },
            { shouldPlay: true, progressUpdateIntervalMillis: 32 },
          );
          soundRef.current = sound;
          playingAudioIdRef.current = messageId;
          setPlayingAudioId(messageId);
          let pos = status.isLoaded ? (status.positionMillis ?? 0) : 0;
          let dur = status.isLoaded ? (status.durationMillis ?? 0) : 0;
          try {
            const st = await sound.getStatusAsync();
            if (st.isLoaded) {
              pos = st.positionMillis ?? pos;
              dur = st.durationMillis ?? dur;
            }
          } catch {
            /* ignore */
          }
          const nextPlayback: ChatAudioPlayback = { messageId, positionMillis: pos, durationMillis: dur };
          audioPlaybackRef.current = nextPlayback;
          setAudioPlayback(nextPlayback);
          attachPlaybackStatus(sound, messageId);
        } catch {
          alertError(t("common.error"), t("chat.audioPlayFailed"));
        }
      });
    },
    [stopCurrentAudio, alertError, t, attachPlaybackStatus, enqueue],
  );

  const handleSeekAudio = useCallback(
    (messageId: string, url: string, ratio: number) => {
      const r = Math.min(1, Math.max(0, ratio));
      // Set lock before setAudioPlayback so any native status callbacks queued in the event loop
      // see the lock and don't flash the old position.
      const snapDurEarly =
        audioPlaybackRef.current?.messageId === messageId && audioPlaybackRef.current.durationMillis > 0
          ? audioPlaybackRef.current.durationMillis
          : 0;
      if (snapDurEarly > 0) {
        lastSeekTargetRef.current = { messageId, positionMillis: r * snapDurEarly };
      }
      setAudioPlayback((prev) => {
        const durOk =
          prev?.messageId === messageId && prev.durationMillis && prev.durationMillis > 0
            ? prev.durationMillis
            : audioPlaybackRef.current?.messageId === messageId &&
                audioPlaybackRef.current.durationMillis > 0
              ? audioPlaybackRef.current.durationMillis
              : 0;
        if (durOk > 0) {
          const pos = r * durOk;
          lastSeekTargetRef.current = { messageId, positionMillis: pos };
          const next: ChatAudioPlayback = {
            messageId,
            positionMillis: pos,
            durationMillis: durOk,
          };
          audioPlaybackRef.current = next;
          return next;
        }
        return prev;
      });

      /** Parmağı bırakır bırakmaz: play ikonu / isPlaying ile worklet hizalı; eski konuma flash azalır */
      setScrubbingMessageId(null);

      void enqueue(async () => {
        const loadedForMessage =
          !!soundRef.current &&
          (playingAudioIdRef.current === messageId || preparedAudioMessageIdRef.current === messageId);

        if (loadedForMessage && soundRef.current) {
          try {
            const st = await soundRef.current.getStatusAsync();
            if (st.isLoaded && st.durationMillis) {
              const pos = r * st.durationMillis;
              lastSeekTargetRef.current = { messageId, positionMillis: pos };
              const next: ChatAudioPlayback = {
                messageId,
                positionMillis: pos,
                durationMillis: st.durationMillis,
              };
              audioPlaybackRef.current = next;
              setAudioPlayback(next);
              await soundRef.current.setPositionAsync(pos);
            }
          } catch {
            /* ignore */
          }
          await resumePlaybackAfterScrubSeek(messageId);
          return;
        }

        const snap = audioPlaybackRef.current;
        const keepDur =
          snap?.messageId === messageId && snap.durationMillis && snap.durationMillis > 0
            ? snap.durationMillis
            : 0;

        await unloadSoundOnly();

        if (keepDur > 0) {
          const pos = r * keepDur;
          lastSeekTargetRef.current = { messageId, positionMillis: pos };
          const next: ChatAudioPlayback = {
            messageId,
            positionMillis: pos,
            durationMillis: keepDur,
          };
          audioPlaybackRef.current = next;
          setAudioPlayback(next);
        }

        const ok = await loadPreparedSound(messageId, url, r, keepDur);
        if (!ok) {
          preparedAudioMessageIdRef.current = null;
          alertError(t("common.error"), t("chat.audioPlayFailed"));
        } else {
          await resumePlaybackAfterScrubSeek(messageId);
        }
      });
    },
    [unloadSoundOnly, alertError, t, loadPreparedSound, enqueue, resumePlaybackAfterScrubSeek],
  );

  return {
    playingAudioId,
    audioPlayback,
    scrubbingMessageId,
    handlePlayAudio,
    handleSeekAudio,
    handleScrubbingBegin,
    handleScrubbingCancel,
    stopCurrentAudio,
  };
}
