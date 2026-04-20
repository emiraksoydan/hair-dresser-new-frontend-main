import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useAiAssistantMutation } from "../store/api";
import { useLanguage } from "./useLanguage";
import { useAuth } from "./useAuth";
import { API_CONFIG } from "../constants/api";
import { tokenStore } from "../lib/tokenStore";
import { isExpired, attemptTokenRefresh } from "../store/baseQuery";
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

/**
 * Backend artık Türkçe düz metin yerine sabit error code dönüyor
 * (ör. "ai_rate_limit", "whisper_failed", "transcription_empty").
 * Bu fonksiyon, i18n altında `ai.error_<kod>` key'i varsa kodu aynen döner,
 * yoksa serbest metin geldiyse heuristik ile uygun koda eşler; ikisi de tutmazsa
 * "unknown" dönerek `ai.error_unknown` fallback'ini tetikler.
 */
const KNOWN_ERROR_CODES = new Set<string>([
  "recording_permission_denied",
  "recording_failed",
  "transcription_empty",
  "whisper_failed",
  "whisper_rate_limit",
  "whisper_timeout",
  "whisper_unavailable",
  "ai_error",
  "ai_rate_limit",
  "ai_unavailable",
  "ai_invalid_response",
  "empty_message",
  "unknown",
]);

function normalizeAIErrorCode(raw: unknown): string {
  if (!raw) return "unknown";
  const s = String(raw).trim();
  if (!s) return "unknown";
  if (KNOWN_ERROR_CODES.has(s)) return s;
  // Serbest metin geldiyse heuristik eşleme
  if (/kotası|yoğun|quota|rate.?limit|exceeded|rate limit|RESOURCE_EXHAUSTED/i.test(s))
    return /whisper|ses|transcrib/i.test(s) ? "whisper_rate_limit" : "ai_rate_limit";
  if (/algılanamadı|algilan|no.?speech|empty|boş/i.test(s)) return "transcription_empty";
  if (/whisper|ses.*metne|metne çevir/i.test(s)) return "whisper_failed";
  if (/timeout|zaman aşımı|zaman asim/i.test(s)) return "whisper_timeout";
  if (/kullanılamıyor|kullanilam|unavailable/i.test(s)) return "ai_unavailable";
  return "unknown";
}

function resolveAudioUploadMeta(uri: string): { name: string; type: string } {
  const rawName = uri.split("/").pop() || "audio.m4a";
  const lower = rawName.toLowerCase();
  if (lower.endsWith(".wav")) return { name: rawName, type: "audio/wav" };
  if (lower.endsWith(".mp3") || lower.endsWith(".mpeg")) return { name: rawName, type: "audio/mpeg" };
  if (lower.endsWith(".ogg")) return { name: rawName, type: "audio/ogg" };
  if (lower.endsWith(".webm")) return { name: rawName, type: "audio/webm" };
  // expo-av kaydı iOS/Android'de çoğunlukla .m4a/.mp4 olur
  return { name: rawName, type: "audio/mp4" };
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
      setPhase("transcribing");
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("recording_failed");

      // --- Whisper transcription (backend proxy — API key backend'de tutulur) ---
      let activeToken = tokenStore.access ?? token;
      if (!activeToken) throw new Error("whisper_failed");
      if (isExpired(activeToken) && tokenStore.refresh) {
        const refreshed = await attemptTokenRefresh(tokenStore.refresh);
        if (refreshed) activeToken = refreshed.accessToken;
      }

      const formData = new FormData();
      const { name, type } = resolveAudioUploadMeta(uri);
      formData.append("file", { uri, name, type } as any);

      const langParam = encodeURIComponent(currentLanguage ?? "tr");
      const whisperRes = await fetch(`${API_CONFIG.BASE_URL}AI/transcribe?language=${langParam}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
        body: formData,
      });
      const rawBody = await whisperRes.text();
      let whisperJson: Record<string, unknown> = {};
      try {
        whisperJson = rawBody ? JSON.parse(rawBody) : {};
      } catch (parseErr) {
        console.warn("[useAIAssistant] whisper JSON parse failed", {
          status: whisperRes.status,
          bodyLen: rawBody.length,
          bodySample: rawBody.slice(0, 200),
          contentType: whisperRes.headers.get("content-type"),
          contentEncoding: whisperRes.headers.get("content-encoding"),
          parseErr: (parseErr as Error)?.message,
        });
      }
      console.log("[useAIAssistant] whisper response", {
        status: whisperRes.status,
        ok: whisperRes.ok,
        contentType: whisperRes.headers.get("content-type"),
        contentEncoding: whisperRes.headers.get("content-encoding"),
        bodyLen: rawBody.length,
        bodySample: rawBody.slice(0, 200),
        jsonKeys: Object.keys(whisperJson),
      });
      if (!whisperRes.ok) {
        // Backend artık error code döndüğü için önce message (kod) alanına bak
        const serverMsg = typeof whisperJson?.message === "string" ? whisperJson.message : "";
        setPhase("error");
        setErrorMessage(normalizeAIErrorCode(serverMsg || `whisper_failed`));
        return;
      }
      const rawData = whisperJson.data ?? (whisperJson as { Data?: unknown }).Data;
      let text =
        typeof rawData === "string"
          ? rawData
          : rawData && typeof rawData === "object" && "text" in rawData && typeof (rawData as { text?: string }).text === "string"
            ? (rawData as { text: string }).text
            : "";
      text = text.trim();

      if (!text) {
        console.warn("[useAIAssistant] transcription_empty", {
          rawDataType: typeof rawData,
          rawDataSample: typeof rawData === "string" ? rawData.slice(0, 120) : JSON.stringify(rawData)?.slice(0, 120),
        });
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
        setErrorMessage(normalizeAIErrorCode(result.message));
      }
    } catch (err: any) {
      // RTK Query FetchBaseQueryError: { status, data: { message, success, data } }
      // Backend bundan böyle message alanında kararlı kod dönüyor.
      const apiMsg =
        err?.data?.message ??
        err?.error?.data?.message ??
        err?.message ??
        undefined;
      console.warn("[useAIAssistant] mutation error", {
        status: err?.status ?? err?.originalStatus,
        apiMsg,
      });
      setPhase("error");
      setErrorMessage(normalizeAIErrorCode(apiMsg));
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
