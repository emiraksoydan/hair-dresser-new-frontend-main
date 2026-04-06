import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useAiAssistantMutation } from "../store/api";
import { useLanguage } from "./useLanguage";
import { useAuth } from "./useAuth";
import { API_CONFIG } from "../constants/api";
import type { AIAssistantResponseDto } from "../types";

type Phase =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "done"
  | "error";

export interface AIAssistantState {
  phase: Phase;
  transcript: string;
  response: AIAssistantResponseDto | null;
  errorMessage: string;
  startRecording: () => Promise<void>;
  stopAndProcess: () => Promise<void>;
  reset: () => void;
  cancelRecording: () => Promise<void>;
}

export function useAIAssistant(): AIAssistantState {
  const { currentLanguage } = useLanguage();
  const { token } = useAuth();

  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState<AIAssistantResponseDto | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const [sendToAI] = useAiAssistantMutation();

  const reset = useCallback(() => {
    setPhase("idle");
    setTranscript("");
    setResponse(null);
    setErrorMessage("");
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setPhase("error");
        setErrorMessage("recording_permission_denied");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setPhase("recording");
    } catch {
      setPhase("error");
      setErrorMessage("recording_failed");
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    reset();
  }, [reset]);

  const stopAndProcess = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      const status = await recordingRef.current.getStatusAsync();
      const durationMs = (status as any).durationMillis ?? 0;

      setPhase("transcribing");
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("recording_failed");

      // durationMillis bazı cihazlarda 0 / undefined dönebilir; ancak gerçekten kısa
      // kayıtları (< 500ms) reddet — kota harcamamak için.
      if (durationMs > 0 && durationMs < 500) {
        setPhase("error");
        setErrorMessage("transcription_empty");
        return;
      }

      // --- Whisper transcription (backend proxy — API key backend'de tutulur) ---
      if (!token) throw new Error("whisper_failed");

      const formData = new FormData();
      formData.append("file", { uri, name: "audio.m4a", type: "audio/mp4" } as any);

      const whisperRes = await fetch(`${API_CONFIG.BASE_URL}AI/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const whisperJson = await whisperRes.json().catch(() => ({}));
      if (!whisperRes.ok) {
        const serverMsg = typeof whisperJson?.message === "string" ? whisperJson.message : "";
        setPhase("error");
        setErrorMessage(
          /kotası|yoğun|quota|rate.?limit|limit|exceeded|dolmuş|ücretsiz/i.test(serverMsg) ? "whisper_rate_limit" : "whisper_failed",
        );
        return;
      }
      let text = (whisperJson.data as string) ?? "";

      if (!text.trim()) {
        setPhase("error");
        setErrorMessage("transcription_empty");
        return;
      }

      setTranscript(text);
      setPhase("thinking");

      // --- Get current location (best-effort, non-blocking) ---
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      } catch {}

      // --- Backend AI endpoint (uses app JWT, sends appointments context) ---
      const langShort = currentLanguage ?? "tr";
      const result = await sendToAI({ message: text, language: langShort, latitude, longitude }).unwrap();

      if (result.success && result.data) {
        setResponse(result.data);
        setPhase("done");
      } else {
        setPhase("error");
        setErrorMessage(result.message ?? "ai_error");
      }
    } catch (err: any) {
      const msg: string = err?.message ?? "unknown_error";
      setPhase("error");
      setErrorMessage(msg);
    }
  }, [currentLanguage, token, sendToAI]);

  return {
    phase,
    transcript,
    response,
    errorMessage,
    startRecording,
    stopAndProcess,
    reset,
    cancelRecording,
  };
}
