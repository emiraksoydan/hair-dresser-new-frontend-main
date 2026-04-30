import { Icon } from "react-native-paper";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Modal,
  Animated,
  Image,
  Linking,
  StyleSheet,
  Text as RNText,
  InteractionManager,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text } from "../common/Text";
import { KeyboardDismissExclusionView } from "../common/KeyboardDismissExclusionView";
import { ChatBubbleAudio } from "./ChatBubbleAudio";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useActionGuard } from "../../hook/useActionGuard";

import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  api,
  useGetChatMessagesByThreadQuery,
  useSendChatMessageMutation,
  useSendChatMessageByThreadMutation,
  useSendChatMediaMessageMutation,
  useDeleteChatMessageMutation,
  useUpdateChatMessageMutation,
  useDeleteChatThreadMutation,
  useMarkChatThreadReadMutation,
  useGetChatThreadsQuery,
  useNotifyTypingMutation,
  useToggleFavoriteMutation,
} from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import {
  ChatMessageItemDto,
  ChatMessageDto,
  ChatMessageType,
  ChatThreadParticipantDto,
  AppointmentStatus,
  UserType,
  BarberType,
  ImageOwnerType,
} from "../../types";
import { useAuth } from "../../hook/useAuth";
import { useSignalRV2 } from "../../hook/useSignalRV2";
import { useLanguage } from "../../hook/useLanguage";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { setActiveThreadId } from "../../lib/activeChatThread";
import { OwnerAvatar } from "../common/owneravatar";
import { useAlert } from "../../hook/useAlert";
import { useChatThreadAudio } from "../../hook/useChatThreadAudio";
import { useTheme } from "../../hook/useTheme";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { ensureJpegForUpload, normalizeImageFile } from "../../utils/form/pick-document";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { API_CONFIG } from "../../constants/api";
import { tokenStore } from "../../lib/tokenStore";
import { isExpired, attemptTokenRefresh } from "../../store/baseQuery";
import { downsampleWaveformPeaks, meteringDbToNorm } from "../../utils/audioWaveform";
import { File as ExpoFsFile, Directory as ExpoFsDirectory, Paths } from "expo-file-system";
import { parseChatClipboardPayload } from "../../utils/chat/clipboardPayload";
import { buildLocationMediaPayload, parseLocationMediaUrl } from "../../utils/chat/locationMediaUrl";
import {
  primaryConfirmButtonColors,
  softCancelSurface,
  SOFT_CANCEL_TEXT,
} from "../../theme/confirmDialogStyles";

/** Sohbette karşı tarafta profil fotoğrafı yokken */
const CHAT_AVATAR_PLACEHOLDER = require("../../../assets/images/profileempty.webp");

/**
 * F7: Sesli mesajlar için LOW_QUALITY preset + özelleştirilmiş bitrate.
 * Sohbet için HIGH_QUALITY (~128 kbps, stereo 44.1kHz) aşırı — dosya boyutu
 * 2-4x büyüyor, yükleme süresi ve mobil veri tüketimi artıyor. Monoral 22.05kHz
 * @ 32 kbps AAC konuşma kayıtları için yeterli (WhatsApp/Telegram da benzer seviyede).
 * Metering yine açık — waveform preview için gerekli.
 */
const VOICE_RECORD_OPTIONS: Audio.RecordingOptions = {
  ...Audio.RecordingOptionsPresets.LOW_QUALITY,
  isMeteringEnabled: true,
  android: {
    ...Audio.RecordingOptionsPresets.LOW_QUALITY.android,
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    ...Audio.RecordingOptionsPresets.LOW_QUALITY.ios,
    extension: ".m4a",
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 22050,
    numberOfChannels: 1,
    bitRate: 32000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

interface ChatDetailScreenProps {
  threadId: string;
}

/** API base sonuna tek slash ile birleştirir (api + AI/transcribe). */
function joinApiUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Whisper transcription — backend proxy; yanıt gövdesi camelCase / PascalCase / düz string olabilir. */
async function transcribeWithWhisper(
  uri: string,
  authToken: string,
  baseUrl: string,
  language?: string,
): Promise<{ text: string | null; serverMessage?: string; isEmpty?: boolean }> {
  try {
    const filename = uri.split("/").pop() || "audio.m4a";
    const lowered = filename.toLowerCase();
    const contentType =
      lowered.endsWith(".wav")
        ? "audio/wav"
        : lowered.endsWith(".mp3") || lowered.endsWith(".mpeg")
          ? "audio/mpeg"
          : lowered.endsWith(".ogg")
            ? "audio/ogg"
            : lowered.endsWith(".webm")
              ? "audio/webm"
              : "audio/mp4";
    const formData = new FormData();
    formData.append("file", { uri, name: filename, type: contentType } as any);

    const langQ =
      language && language.trim().length > 0
        ? `?language=${encodeURIComponent(language)}`
        : "";
    const res = await fetch(joinApiUrl(baseUrl, `AI/transcribe${langQ}`), {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    const rawBody = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = rawBody ? JSON.parse(rawBody) : {};
    } catch (parseErr) {
      console.warn("[transcribeWithWhisper] JSON parse failed", {
        status: res.status,
        bodyLen: rawBody.length,
        bodySample: rawBody.slice(0, 200),
        contentType: res.headers.get("content-type"),
        contentEncoding: res.headers.get("content-encoding"),
        parseErr: (parseErr as Error)?.message,
      });
    }
    console.log("[transcribeWithWhisper] response", {
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type"),
      contentEncoding: res.headers.get("content-encoding"),
      bodyLen: rawBody.length,
      bodySample: rawBody.slice(0, 200),
      jsonKeys: Object.keys(json),
    });
    const serverMessage =
      (typeof json.message === "string" && json.message) ||
      (typeof json.Message === "string" && json.Message) ||
      undefined;
    const successFlag = json.success ?? json.Success;

    if (!res.ok) {
      return { text: null, serverMessage };
    }
    if (successFlag === false) {
      return { text: null, serverMessage };
    }

    const rawData = json.data ?? json.Data;
    let extracted: string | null = null;
    if (typeof rawData === "string") {
      extracted = rawData.trim();
    } else if (rawData && typeof rawData === "object") {
      const o = rawData as Record<string, unknown>;
      const inner = o.text ?? o.Text;
      if (typeof inner === "string") extracted = inner.trim();
    }
    if (!extracted) {
      const root = json.text ?? json.Text;
      if (typeof root === "string") extracted = root.trim();
    }

    if (extracted === "") {
      return { text: "", isEmpty: true };
    }
    if (!extracted) {
      return { text: null, serverMessage };
    }
    return { text: extracted };
  } catch (err) {
    console.warn("[transcribeWithWhisper] network/catch", {
      name: (err as Error)?.name,
      message: (err as Error)?.message,
    });
    return { text: null, serverMessage: "__network__" };
  }
}

const UPLOAD_TIMEOUT_MS = 30_000;

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = UPLOAD_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

/** Backend upload returns image id (GUID string), not a public URL — resolve blob URL via GET Image/{id}. */
async function fetchImageUrlById(imageId: string, authToken: string, baseUrl: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}Image/${imageId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Backend returns { success, data: ImageGetDto } where data.imageUrl is the blob URL
    const d = json?.data;
    const u = d?.imageUrl ?? d?.ImageUrl ?? d?.url ?? d?.Url;
    return typeof u === "string" && u.length > 0 ? u : null;
  } catch {
    return null;
  }
}

async function resolveMediaUrlFromUploadJson(json: unknown, authToken: string, baseUrl: string): Promise<string | null> {
  const j = json as { data?: string | { imageUrl?: string; url?: string } };
  const d = j?.data;
  const directUrl =
    typeof d === "string"
      ? d
      : typeof d === "object" && d != null
        ? (d as { imageUrl?: string; url?: string }).imageUrl ?? (d as { url?: string }).url
        : undefined;
  if (typeof directUrl === "string" && directUrl.length > 0) {
    if (directUrl.startsWith("http://") || directUrl.startsWith("https://")) return directUrl;
    if (GUID_RE.test(directUrl)) return fetchImageUrlById(directUrl, authToken, baseUrl);
  }
  return null;
}

// Upload image to backend, return public blob URL for chat
async function uploadImageToBackend(
  uri: string,
  authToken: string,
  baseUrl: string,
  ownerId: string,
  mimeType = "image/jpeg",
  fileName?: string,
): Promise<string | null> {
  try {
    const filename = fileName || uri.split("/").pop() || "photo.jpg";
    const formData = new FormData();
    formData.append("File", { uri, name: filename, type: mimeType } as any);
    formData.append("OwnerId", ownerId);
    formData.append("OwnerType", "1");

    const res = await fetchWithTimeout(`${baseUrl}Image/upload?isProfileImage=false`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return resolveMediaUrlFromUploadJson(json, authToken, baseUrl);
  } catch {
    return null;
  }
}

// Upload any file to backend, returns public URL for chat
async function uploadFileToBackend(uri: string, name: string, mimeType: string, authToken: string, baseUrl: string, ownerId: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("File", { uri, name, type: mimeType } as any);
    formData.append("OwnerId", ownerId);
    formData.append("OwnerType", "1");
    const res = await fetchWithTimeout(`${baseUrl}Image/upload?isProfileImage=false`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return resolveMediaUrlFromUploadJson(json, authToken, baseUrl);
  } catch {
    return null;
  }
}

type ChatBubbleImageProps = {
  mediaUrl: string;
  brandColor: string;
  mutedTextColor: string;
  isDark: boolean;
  cardBg2: string;
  onOpen: (url: string) => void;
  t: (key: string) => string;
};

/**
 * Chat görseli: yükleme göstergesi, hata + yeniden dene.
 * F8: React.memo ile sarıldı — parent ChatDetailScreen her render olduğunda (ör. typing,
 * audio playback, input değişimi) her image bubble yeniden render olmasın.
 */
const ChatBubbleImageInner: React.FC<ChatBubbleImageProps> = ({
  mediaUrl,
  brandColor,
  mutedTextColor,
  isDark,
  cardBg2,
  onOpen,
  t,
}) => {
  const uri = mediaUrl.trim();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const handleRetry = useCallback(() => {
    setFailed(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }, []);

  if (!uri) {
    return (
      <View
        style={{
          width: 220,
          height: 120,
          borderRadius: 12,
          backgroundColor: cardBg2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: mutedTextColor, fontSize: 12 }}>{t("chat.photo")}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onOpen(uri)}>
      <View style={{ width: 220, height: 160, borderRadius: 12, overflow: "hidden", backgroundColor: cardBg2 }}>
        {/*
          F8: expo-image'a geçiş pahalı bir native rebuild gerektiriyor, bu yüzden RN Image
          üzerinde güvenli optimizasyonlar uygulandı:
          - `fadeDuration={0}` (android): 300ms fade-in flicker'ı kaldırır, thread içinde
            scroll ederken görsellerin tekrar tekrar solunup belirmesi önlenir.
          - `progressiveRenderingEnabled`: büyük görseller aşamalı olarak çizilir.
          - resizeMethod="resize" (android): decode aşamasında target size'a scale, bellek
            kullanımı ~%70 azalır.
          İleri optimizasyon için `expo-image` geçişi önerilir (disk cache + placeholder).
        */}
        <Image
          key={retryKey}
          source={{ uri }}
          style={{ width: 220, height: 160 }}
          resizeMode="cover"
          fadeDuration={0}
          progressiveRenderingEnabled
          resizeMethod="resize"
          onLoadStart={() => {
            setLoading(true);
            setFailed(false);
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
        />
        {/* Loading indicator removed — cardBg2 background acts as placeholder */}
        {failed ? (
          <Pressable
            onPress={handleRetry}
            style={[
              StyleSheet.absoluteFillObject,
              {
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.94)",
              },
            ]}
          >
            <Icon source="image-off-outline" size={28} color={brandColor} />
            <Text style={{ color: mutedTextColor, fontSize: 12, marginTop: 6 }}>{t("chat.retry")}</Text>
          </Pressable>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

// F8: React.memo — sadece mediaUrl / renk değiştiğinde yeniden render.
const ChatBubbleImage = React.memo(ChatBubbleImageInner);

// F3: Stabil keyExtractor — FlatList her render'da yeni fonksiyon almasın diye
// component dışına alındı; böylece dahili `_onCellLayout` cache'i temiz kalır.
const messageRowKeyExtractor = (item: { key: string }): string => item.key;

// F4: Yazıyor-indicator'ı kendi React.memo component'i olarak ayrıldı. Böylece
// parent re-render olduğunda (yeni mesaj, renk teması, input değişimi vb.) typing
// barı gereksiz re-render almaz; sadece `label` değiştiğinde render olur.
const TypingIndicatorBar: React.FC<{
  label: string | null;
  typingSuffix: string;
  mutedTextColor: string;
}> = React.memo(({ label, typingSuffix, mutedTextColor }) => {
  if (!label) return null;
  return (
    <View className="flex-row items-center px-4 py-2">
      <Text className="text-xs italic" style={{ color: mutedTextColor }}>
        {label} {typingSuffix}
      </Text>
    </View>
  );
});
TypingIndicatorBar.displayName = "TypingIndicatorBar";

export const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({
  threadId,
}) => {
  const { colors, isDark } = useTheme();
  const brandColor = "#f05e23";
  const mutedTextColor = isDark ? "#94a3b8" : "#64748b";
  const softBrandBg = isDark ? "rgba(240,94,35,0.18)" : "rgba(240,94,35,0.10)";
  /** Ses kaydı modalı: tema ile aynı renk kart üstünde kaybolabiliyor; sabit kontrast */
  const voiceModalTitleColor = isDark ? "#f8fafc" : "#0f172a";
  const voiceModalBodyColor = isDark ? "#94a3b8" : "#475569";
  const voiceModalCaptionOrange = brandColor;
  const voiceModalCaptionIndigo = isDark ? "#a5b4fc" : "#4338ca";
  const bubbleMeBg = isDark ? "rgba(240,94,35,0.52)" : "rgba(251, 146, 60, 0.78)";
  const bubbleOtherBg = isDark ? "rgba(71,85,105,0.48)" : "rgba(241, 245, 249, 0.94)";
  const bubbleOtherBorder = isDark ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.38)";
  const replyBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const confirmDialogPrimary = primaryConfirmButtonColors(isDark);
  const cancelDialogSurface = softCancelSurface(isDark);

  const router = useSafeNavigation();
  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  /** RN FlatList + Gesture.Native: waveform pan ile dikey kaydırmayı aynı jest sisteminde tanır */
  const chatListScrollGesture = useMemo(() => Gesture.Native(), []);
  const { userId: currentUserId, userType: currentUserType, token } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { t, currentLanguage } = useLanguage();
  const { alertError, alertWarning, confirm } = useAlert();
  const {
    playingAudioId,
    audioPlayback,
    scrubbingMessageId,
    handlePlayAudio,
    handleSeekAudio,
    handleScrubbingBegin,
    handleScrubbingCancel,
  } = useChatThreadAudio(alertError, t);
  const participantsSheetRef = useRef<BottomSheetModal>(null);
  type OptimisticMessage = ChatMessageItemDto & { isPending: true };
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessageItemDto | null>(null);

  // Context menu state
  const [contextMenuMessage, setContextMenuMessage] = useState<ChatMessageItemDto | null>(null);
  const contextMenuAnim = useRef(new Animated.Value(0)).current;

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  /** Kayıt bitince ses gönder / metne çevir seçim kartı */
  const [pendingVoiceUri, setPendingVoiceUri] = useState<string | null>(null);
  /** Kayıt boyunca toplanan metering → indirgenmiş tepe değerleri (gönderimde medya URL ile eşlenir) */
  const [pendingWaveformPeaks, setPendingWaveformPeaks] = useState<number[] | null>(null);
  const [waveformByMediaUrl, setWaveformByMediaUrl] = useState<Record<string, number[]>>({});
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingMeteringRef = useRef<number[]>([]);

  // Media sending state
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  // Attachment dots menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // In-app rich clipboard — stores full message data for copy/paste within chat
  type AppClipboard = {
    messageType: ChatMessageType;
    text?: string | null;
    mediaUrl?: string | null;
    fileName?: string | null;
    waveformPeaks?: number[] | null;
    /** Panodan yapıştırılan görsel: önce yükleme, sonra gönderim */
    localPastedFileUri?: string | null;
  };
  const [appClipboard, setAppClipboard] = useState<AppClipboard | null>(null);
  // What's pending in the input preview card (after user pastes)
  const [pendingPaste, setPendingPaste] = useState<AppClipboard | null>(null);
  const prevMessageCountRef = useRef(0);
  const prevOptimisticLenRef = useRef(0);

  // Edit state
  const [editingMessage, setEditingMessage] = useState<ChatMessageItemDto | null>(null);
  const [editText, setEditText] = useState("");
  const editInputRef = useRef<TextInput>(null);

  // Track which message IDs have already been animated (to avoid re-animating on re-render)
  const animatedMessageIds = useRef<Set<string>>(new Set());

  const { isConnected, connectionRef } = useSignalRV2();

  const {
    data: threads,
    isLoading: isLoadingThreads,
    refetch: refetchThreads,
  } = useGetChatThreadsQuery(undefined, { skip: !token });
  const currentThread = useMemo(() => {
    return threads?.find((t) => t.threadId === threadId);
  }, [threads, threadId]);

  const participants = currentThread?.participants ?? [];

  // Kısıtlı thread: bu kullanıcı karşı tarafı favoriye almamışsa erişim kısıtlı
  const isRestrictedThread = !!currentThread?.isRestrictedForCurrentUser;

  // Mesajlar thread listesiyle paralel yüklensin; liste gecikse bile geçmiş mesajlar çekilir.
  const skipChatMessages = !threadId;

  useEffect(() => {
    if (!isLoadingThreads && threads && !currentThread && threadId) {
      setTimeout(() => { refetchThreads(); }, 1000);
    }
  }, [isLoadingThreads, threads, currentThread, threadId, refetchThreads]);

  const MESSAGES_PAGE_SIZE = 30;
  /** RN `onEndReached` (özellikle inverted) ilk layout'ta yanlış tetiklenebilir — footer spinner flash'ını önler. */
  const CHAT_MESSAGES_END_REACHED_GRACE_MS = 450;
  const suppressChatEndReachedUntilMsRef = useRef(0);
  const bumpChatEndReachedGrace = useCallback(() => {
    suppressChatEndReachedUntilMsRef.current = Date.now() + CHAT_MESSAGES_END_REACHED_GRACE_MS;
  }, []);
  const {
    data: messages,
    isLoading,
    refetch,
  } = useGetChatMessagesByThreadQuery(
    { threadId, limit: MESSAGES_PAGE_SIZE },
    { skip: skipChatMessages },
  );

  const [messagesRefreshing, setMessagesRefreshing] = useState(false);
  const onMessagesRefresh = useCallback(async () => {
    setMessagesRefreshing(true);
    bumpChatEndReachedGrace();
    try {
      // Pull-to-refresh → pagination state'i sıfırla (tekrar en yeni sayfa + yeni eski sayfalar çekilebilsin).
      hasMoreRef.current = true;
      lastLoadedBeforeRef.current = null;
      await Promise.all([refetch(), refetchThreads()]);
    } catch {
      /* ignore */
    } finally {
      setMessagesRefreshing(false);
    }
  }, [refetch, refetchThreads, bumpChatEndReachedGrace]);

  // ---------------------------------------------------------------------------
  // Infinite scroll / older-page loader.
  //
  // Strateji:
  //  - RTK Query tarafında `serializeQueryArgs` sadece `threadId`e bakıyor ⇒ tek cache entry.
  //  - `loadOlder()` en eski mesajın `createdAt`ini `before` cursor olarak geçip dispatch eder;
  //    merge fonksiyonu sonucu cache'in BAŞINA prepend eder.
  //  - Inverted FlatList'te "en eski" = listenin sonu ⇒ `onEndReached` ile tetiklenir.
  //  - Sunucu `MESSAGES_PAGE_SIZE`den az dönerse başka sayfa yok demektir → `hasMore=false`.
  //  - Aynı cursor ile tekrar tetiklenmeyi önlemek için `lastLoadedBeforeRef` tutuluyor;
  //    scroll momentum sırasında birden fazla çağrıyı da `isLoadingOlderRef` bloklar.
  // ---------------------------------------------------------------------------
  const dispatch = useAppDispatch();
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const isLoadingOlderRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastLoadedBeforeRef = useRef<string | null>(null);

  useEffect(() => {
    hasMoreRef.current = true;
    lastLoadedBeforeRef.current = null;
    isLoadingOlderRef.current = false;
    setIsLoadingOlder(false);
    bumpChatEndReachedGrace();
  }, [threadId, bumpChatEndReachedGrace]);

  const loadOlderMessages = useCallback(async () => {
    if (!threadId) return;
    if (Date.now() < suppressChatEndReachedUntilMsRef.current) return;
    if (isLoadingOlderRef.current) return;
    if (!hasMoreRef.current) return;
    if (!messages || messages.length === 0) return;

    const oldest = messages[0];
    if (!oldest?.createdAt) return;
    const beforeIso = oldest.createdAt;
    // Tie-breaker: aynı CreatedAt'a sahip 2+ mesajda MessageId ile sıkı sıralama.
    const beforeMsgId = oldest.messageId;
    const cursorKey = `${beforeIso}|${beforeMsgId ?? ""}`;
    if (lastLoadedBeforeRef.current === cursorKey) return; // aynı cursor: skip

    isLoadingOlderRef.current = true;
    lastLoadedBeforeRef.current = cursorKey;
    setIsLoadingOlder(true);
    try {
      const result = await dispatch(
        api.endpoints.getChatMessagesByThread.initiate(
          { threadId, before: beforeIso, beforeId: beforeMsgId, limit: MESSAGES_PAGE_SIZE },
          { subscribe: false, forceRefetch: true },
        ),
      ).unwrap();
      const fetchedCount = Array.isArray(result) ? result.length : 0;
      if (fetchedCount < MESSAGES_PAGE_SIZE) {
        hasMoreRef.current = false;
      }
    } catch {
      // Hata: cursor'u geri al ki kullanıcı tekrar deneyebilsin.
      lastLoadedBeforeRef.current = null;
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [threadId, messages, dispatch]);

  const [toggleFavorite, { isLoading: isTogglingFavorite }] = useToggleFavoriteMutation();

  const canSendMessage = useMemo(() => {
    if (!currentThread) return false;
    if (!isConnected) return false;
    if (isRestrictedThread) return false;
    if (!currentThread.appointmentId) return true;
    if (currentThread.status === null || currentThread.status === undefined) return false;
    return (
      currentThread.status === AppointmentStatus.Pending ||
      currentThread.status === AppointmentStatus.Approved
    );
  }, [currentThread, isConnected, isRestrictedThread]);

  const guard = useActionGuard();
  const [sendMessageByAppointment, { isLoading: isSendingByAppt }] = useSendChatMessageMutation();
  const [sendMessageByThread, { isLoading: isSendingByThread }] = useSendChatMessageByThreadMutation();
  const [sendChatMedia] = useSendChatMediaMessageMutation();
  const [deleteChatMessage] = useDeleteChatMessageMutation();
  const [updateChatMessage] = useUpdateChatMessageMutation();
  const [deleteChatThread] = useDeleteChatThreadMutation();
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const isSending = isSendingByAppt || isSendingByThread;

  const [markRead] = useMarkChatThreadReadMutation();
  const [notifyTyping] = useNotifyTypingMutation();
  const markReadInFlightRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingNotificationRef = useRef(false);
  // F5: Önceki input length — paste-detection için (delta büyükse JSON.parse çalıştır).
  const prevMessageTextLenRef = useRef(0);
  const autoReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markThreadRead = useCallback(async () => {
    // Kısıtlı thread: kullanıcı favoriye almamışsa  read yapamaz, badge düşmesin
    if (!threadId || markReadInFlightRef.current || isRestrictedThread) return;
    markReadInFlightRef.current = true;
    await markRead(threadId);
    markReadInFlightRef.current = false;
  }, [threadId, markRead, isRestrictedThread]);

  useEffect(() => {
    if (threadId && currentThread && currentThread.unreadCount > 0) {
      markThreadRead();
    }
  }, [threadId, currentThread?.unreadCount, markThreadRead]);

  /**
   * F6: Tek bir clipboard cache dosyasını sessizce sil.
   * Kullanım: yapıştırma gönderildikten veya iptal edildikten sonra.
   */
  const deleteClipboardCacheFile = useCallback((fileUri: string | null | undefined) => {
    if (!fileUri) return;
    try {
      const f = new ExpoFsFile(fileUri);
      if (f.exists) f.delete();
    } catch {
      /* silme hatası sessiz — sweep bir sonraki mount'ta yakalar */
    }
  }, []);

  /**
   * F6: Mount'ta orphan clipboard-paste-*.jpg dosyalarını temizle.
   * Daha önce yapıştırılmış ama gönderilmeden/iptal edilmeden uygulama öldürülmüş olabilir;
   * cache'te birikip disk alanını yer. 1 saatten eski olanları sil.
   */
  useEffect(() => {
    try {
      const dir = new ExpoFsDirectory(Paths.cache);
      if (!dir.exists) return;
      const entries = dir.list();
      const ONE_HOUR_MS = 60 * 60 * 1000;
      const now = Date.now();
      for (const entry of entries) {
        if (!(entry instanceof ExpoFsFile)) continue;
        const name = entry.name ?? "";
        if (!name.startsWith("clipboard-paste-")) continue;
        const match = /clipboard-paste-(\d+)\.jpg$/.exec(name);
        const ts = match ? Number(match[1]) : NaN;
        if (Number.isFinite(ts) && now - ts > ONE_HOUR_MS) {
          try { entry.delete(); } catch { /* ignore */ }
        }
      }
    } catch {
      /* cache okunamazsa önemli değil */
    }
  }, []);

  useEffect(() => {
    if (!threadId) return;
    setActiveThreadId(threadId);
    return () => setActiveThreadId(null);
  }, [threadId]);

  useEffect(() => {
    const connection = connectionRef?.current;
    if (!connection || !threadId || !currentUserId) return;

    const handleNewMessage = (dto: ChatMessageDto) => {
      if (dto.threadId !== threadId) return;
      if (dto.senderUserId !== currentUserId) {
        if (autoReadTimeoutRef.current) clearTimeout(autoReadTimeoutRef.current);
        autoReadTimeoutRef.current = setTimeout(() => {
          markThreadRead().catch(() => { });
        }, 500);
      }
    };

    connection.on("chat.message", handleNewMessage);

    return () => {
      if (connection) {
        connection.off("chat.message", handleNewMessage);
      }
      if (autoReadTimeoutRef.current) {
        clearTimeout(autoReadTimeoutRef.current);
        autoReadTimeoutRef.current = null;
      }
    };
  }, [threadId, currentUserId, markThreadRead, connectionRef]);

  useEffect(() => {
    if (!editingMessage) return;
    const delay = Platform.OS === "android" ? 320 : 100;
    const id = setTimeout(() => editInputRef.current?.focus(), delay);
    return () => clearTimeout(id);
  }, [editingMessage]);

  useEffect(() => {
    if (typingUsers.size > 0) {
      const timeout = setTimeout(() => setTypingUsers(new Set()), 3000);
      return () => clearTimeout(timeout);
    }
  }, [typingUsers]);

  useEffect(() => {
    const connection = connectionRef?.current;
    if (!connection) return;
    const handleTyping = (data: { threadId: string; typingUserId: string; typingUserName: string; isTyping: boolean }) => {
      if (data.threadId !== threadId) return;
      if (data.typingUserId === currentUserId) return;
      if (data.isTyping) {
        setTypingUsers((prev) => new Set([...prev, data.typingUserId]));
      } else {
        setTypingUsers((prev) => { const s = new Set(prev); s.delete(data.typingUserId); return s; });
      }
    };
    connection.on("chat.typing", handleTyping);
    return () => { if (connection) connection.off("chat.typing", handleTyping); };
  }, [threadId, currentUserId]);

  const insets = useSafeAreaInsets();

  const handleTextChange = useCallback((text: string) => {
    let nextText = text;
    // F5: JSON clipboard payload parse'ı SADECE gerçek paste olduğunda çalıştır.
    // Paste detection: text uzunluğu bir anda büyük artış + `{` ile başlayıp `}` ile bitiyor.
    // Kullanıcı `{` karakteri yazarken her tuş vuruşunda JSON.parse çağrılmasın.
    const prevLen = prevMessageTextLenRef.current;
    const delta = text.length - prevLen;
    const trimmed = text.trim();
    const looksLikePayloadPaste =
      delta >= 8 &&
      trimmed.length >= 12 &&
      trimmed.startsWith("{") &&
      trimmed.endsWith("}") &&
      trimmed.includes("_chatClip");
    if (looksLikePayloadPaste) {
      const parsed = parseChatClipboardPayload(trimmed);
      if (parsed) {
        if (parsed.messageType === ChatMessageType.Text) {
          nextText = parsed.text ?? "";
        } else {
          setPendingPaste({
            messageType: parsed.messageType,
            text: parsed.text ?? null,
            mediaUrl: parsed.mediaUrl ?? null,
            fileName: parsed.fileName ?? null,
            waveformPeaks: parsed.waveformPeaks ?? null,
          });
          nextText = "";
        }
      }
    }
    prevMessageTextLenRef.current = nextText.length;
    setMessageText(nextText);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const shouldNotify = nextText.trim().length > 0 && canSendMessage && isConnected;
    if (shouldNotify && !lastTypingNotificationRef.current) {
      notifyTyping({ threadId, isTyping: true });
      lastTypingNotificationRef.current = true;
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (lastTypingNotificationRef.current) {
        notifyTyping({ threadId, isTyping: false });
        lastTypingNotificationRef.current = false;
      }
    }, 2000);
  }, [threadId, canSendMessage, isConnected, notifyTyping]);

  const stopTyping = useCallback(() => {
    if (lastTypingNotificationRef.current) {
      notifyTyping({ threadId, isTyping: false });
      lastTypingNotificationRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [threadId, notifyTyping]);

  const handleSend = useCallback(() => guard(async () => {
    setShowAttachMenu(false);
    if (!canSendMessage) {
      if (!isConnected) {
        alertError(t("chat.connectionError"), t("chat.connectionErrorMessage"));
      } else {
        alertError(t("chat.messageCannotBeSent"), t("chat.cannotSendToThread"));
      }
      return;
    }

    // F5: Medya yapıştırma — önizleme kartı veya girişe düz yapıştırılan _chatClip JSON.
    // `pendingPaste` dolu ise payload'ı tekrar parse etmeye gerek yok (gereksiz JSON.parse).
    const trimmedForSend = messageText.trim();
    const parsedFromInput =
      pendingPaste || !trimmedForSend.startsWith("{") || !trimmedForSend.includes("_chatClip")
        ? null
        : parseChatClipboardPayload(trimmedForSend);
    const effectiveMediaPaste: AppClipboard | null =
      pendingPaste && pendingPaste.messageType !== ChatMessageType.Text
        ? pendingPaste
        : parsedFromInput && parsedFromInput.messageType !== ChatMessageType.Text
          ? {
              messageType: parsedFromInput.messageType,
              text: parsedFromInput.text ?? null,
              mediaUrl: parsedFromInput.mediaUrl ?? null,
              fileName: parsedFromInput.fileName ?? null,
              waveformPeaks: parsedFromInput.waveformPeaks ?? null,
              localPastedFileUri: null,
            }
          : null;

    if (effectiveMediaPaste) {
      const paste = effectiveMediaPaste;
      setPendingPaste(null);
      setAppClipboard(null);
      setMessageText("");
      prevMessageTextLenRef.current = 0;
      let mediaUrl = paste.mediaUrl;
      if (!mediaUrl && paste.localPastedFileUri && token && currentUserId) {
        try {
          setIsSendingMedia(true);
          const uploaded = await uploadImageToBackend(
            paste.localPastedFileUri,
            token,
            API_CONFIG.BASE_URL,
            currentUserId,
            "image/jpeg",
            paste.fileName ?? "clipboard.jpg",
          );
          mediaUrl = uploaded;
        } catch {
          mediaUrl = null;
        } finally {
          setIsSendingMedia(false);
        }
      }
      if (mediaUrl) {
        try {
          setIsSendingMedia(true);
          await sendChatMedia({
            threadId,
            messageType: paste.messageType,
            mediaUrl,
            fileName: paste.fileName ?? undefined,
            replyToMessageId: replyingTo?.messageId ?? null,
          });
          setReplyingTo(null);
        } catch {
          alertError(t("common.error"), t("chat.messageSendFailed"));
        } finally {
          setIsSendingMedia(false);
        }
      } else {
        alertError(t("common.error"), paste.localPastedFileUri ? t("chat.imageUploadFailed") : t("chat.messageSendFailed"));
      }
      // F6: Yapıştırma gönderimi tamamlandı (başarı veya hata fark etmeksizin) —
      // cache'teki geçici clipboard dosyasını sil. Mount-sweep fallback olarak kalır.
      deleteClipboardCacheFile(paste.localPastedFileUri);
      return;
    }

    let textToSend = pendingPaste?.text?.trim() || messageText.trim();
    // F5: Üstte hesaplanan `parsedFromInput`'ı yeniden kullan. pendingPaste varsa zaten null,
    // o durumda da pendingPaste.text üzerinden devam ediyoruz. İkinci JSON.parse çağrısı yok.
    if (parsedFromInput && parsedFromInput.messageType === ChatMessageType.Text && (parsedFromInput.text ?? "").trim()) {
      textToSend = (parsedFromInput.text ?? "").trim();
    }
    if (!textToSend || !threadId || isSending) return;

    if (pendingPaste) {
      setPendingPaste(null);
      setAppClipboard(null);
    }

    stopTyping();
    const replyToId = replyingTo?.messageId ?? null;
    const tempId = `opt-${Date.now()}`;
    const optimisticMsg: OptimisticMessage = {
      messageId: tempId,
      senderUserId: currentUserId!,
      text: textToSend,
      createdAt: new Date().toISOString(),
      isPending: true,
      replyToMessageId: replyToId,
      replyToTextPreview: replyingTo?.text ?? null,
    };
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");
    prevMessageTextLenRef.current = 0;
    setReplyingTo(null);

    let sendResult;
    if (currentThread?.appointmentId) {
      sendResult = await sendMessageByAppointment({ appointmentId: currentThread.appointmentId, text: textToSend, replyToMessageId: replyToId });
    } else {
      sendResult = await sendMessageByThread({ threadId, text: textToSend, replyToMessageId: replyToId });
    }

    // Çift animasyon fix: mutation başarılıysa backend'den dönen confirmed messageId'yi
    // animated-set'e pre-emptively ekle. Optimistic (temp-<ts>) tick işaretlenirken zaten
    // animate edilmişti; confirmed mesaj farklı ID ile cache'e girdiği için normalde bubble
    // yeniden "ilk kez görüyormuş gibi" slide-in oynatıyordu. Render sırasında animatedSet'te
    // bulunduğu için `from` undefined kalır ve ikinci animasyon oynamaz.
    if (!("error" in sendResult)) {
      const confirmedId = (sendResult.data as any)?.data?.messageId as string | undefined;
      if (confirmedId) animatedMessageIds.current.add(confirmedId);
    }
    setOptimisticMessages((prev) => prev.filter((m) => m.messageId !== tempId));

    if ("error" in sendResult) {
      setMessageText(textToSend);
      prevMessageTextLenRef.current = textToSend.length;
      const errorMessage = (sendResult.error as any)?.data?.message || t("chat.messageSendFailed");
      alertError(t("common.error"), errorMessage);
    }
    // NOT: Başarı durumunda refetch çağrılmıyor; RTK Query `sendChatMessage*` mutation'ı
    // kendi `onQueryStarted` bloğunda mesajı cache'e yazıyor, ek olarak SignalR `chat.message`
    // eventi tüm istemcileri (sender dahil) canlı olarak güncelliyor. Gereksiz tam liste çağrısı.
  }), [
    guard, messageText, pendingPaste, threadId, isSending, canSendMessage, isConnected, currentUserId, token,
    currentThread, replyingTo, sendMessageByThread, sendMessageByAppointment,
    sendChatMedia, stopTyping, t, alertError,
  ]);

  // --- Image picker ---
  const handlePickImage = useCallback(async () => {
    if (!canSendMessage) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      alertError(t("common.error"), t("chat.galleryPermission"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const normalized = normalizeImageFile(asset.uri, asset.fileName, asset.mimeType);
    const ready = await ensureJpegForUpload(normalized);
    if (!currentUserId || !token) { alertError(t("common.error"), t("chat.imageUploadFailed")); return; }
    setIsSendingMedia(true);
    try {
      const url = await uploadImageToBackend(
        ready.uri,
        token,
        API_CONFIG.BASE_URL,
        currentUserId,
        ready.type,
        ready.name,
      );
      if (!url) { alertError(t("common.error"), t("chat.imageUploadFailed")); return; }
      await sendChatMedia({ threadId, messageType: ChatMessageType.Image, mediaUrl: url, replyToMessageId: replyingTo?.messageId ?? null });
      setReplyingTo(null);
    } catch {
      alertError(t("common.error"), t("chat.imageUploadFailed"));
    } finally {
      setIsSendingMedia(false);
    }
  }, [canSendMessage, threadId, token, currentUserId, replyingTo, sendChatMedia, t, alertError]);

  // --- Location sender ---
  const handleSendLocation = useCallback(async () => {
    if (!canSendMessage) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alertError(t("common.error"), t("chat.locationPermission"));
      return;
    }
    setIsSendingMedia(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 10000 });
      const { latitude, longitude } = loc.coords;
      const mediaUrl = buildLocationMediaPayload(latitude, longitude);
      const result = await sendChatMedia({
        threadId,
        messageType: ChatMessageType.Location,
        mediaUrl,
        replyToMessageId: replyingTo?.messageId ?? null,
      });
      if ("error" in result) {
        const errorMessage = (result.error as any)?.data?.message || t("chat.locationFailed");
        alertError(t("common.error"), errorMessage);
        return;
      }
      setReplyingTo(null);
    } catch {
      alertError(t("common.error"), t("chat.locationFailed"));
    } finally {
      setIsSendingMedia(false);
    }
  }, [canSendMessage, threadId, replyingTo, sendChatMedia, t, alertError]);

  // --- File picker ---
  const handlePickFile = useCallback(async () => {
    if (!canSendMessage) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const name = asset.name || uri.split("/").pop() || "file";
    const mimeType = asset.mimeType || "application/octet-stream";
    if (!currentUserId || !token) { alertError(t("common.error"), t("chat.fileUploadFailed")); return; }
    setIsSendingMedia(true);
    try {
      const url = await uploadFileToBackend(uri, name, mimeType, token, API_CONFIG.BASE_URL, currentUserId);
      if (!url) { alertError(t("common.error"), t("chat.fileUploadFailed")); return; }
      await sendChatMedia({ threadId, messageType: ChatMessageType.File, mediaUrl: url, fileName: name, replyToMessageId: replyingTo?.messageId ?? null });
      setReplyingTo(null);
    } catch {
      alertError(t("common.error"), t("chat.fileUploadFailed"));
    } finally {
      setIsSendingMedia(false);
    }
  }, [canSendMessage, threadId, token, currentUserId, replyingTo, sendChatMedia, t, alertError]);

  const openChatAttachmentUrl = useCallback(
    async (url: string | null | undefined) => {
      if (!url?.trim()) return;
      try {
        await Linking.openURL(url);
      } catch {
        try {
          await Clipboard.setStringAsync(url);
          alertWarning(t("chat.fileOpenFailed"), t("chat.fileLinkCopied"));
        } catch {
          alertWarning(t("common.error"), t("chat.fileOpenFailed"));
        }
      }
    },
    [alertWarning, t],
  );

  // --- Audio upload + send ---
  const handleSendAudioMessage = useCallback(
    async (uri: string, waveformPeaks?: number[] | null) => {
      if (!currentUserId || !token) return;
      setIsSendingMedia(true);
      try {
        const filename = uri.split("/").pop() || "audio.m4a";
        const url = await uploadFileToBackend(uri, filename, "audio/mp4", token, API_CONFIG.BASE_URL, currentUserId);
        if (!url) {
          alertError(t("common.error"), t("chat.audioUploadFailed"));
          return;
        }
        await sendChatMedia({
          threadId,
          messageType: ChatMessageType.Audio,
          mediaUrl: url,
          fileName: filename,
          replyToMessageId: replyingTo?.messageId ?? null,
        });
        if (waveformPeaks && waveformPeaks.length > 0) {
          setWaveformByMediaUrl((prev) => ({ ...prev, [url]: waveformPeaks }));
        }
        setReplyingTo(null);
      } catch {
        alertError(t("common.error"), t("chat.audioUploadFailed"));
      } finally {
        setIsSendingMedia(false);
      }
    },
    [currentUserId, token, threadId, replyingTo, sendChatMedia, alertError, t],
  );

  // --- Microphone recording ---
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      setIsRecording(false);
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;
        const raw = recordingMeteringRef.current;
        recordingMeteringRef.current = [];
        const peaks = downsampleWaveformPeaks(raw, 48);
        if (!uri) return;
        setPendingWaveformPeaks(peaks);
        setPendingVoiceUri(uri);
      } catch {
        alertError(t("common.error"), t("chat.recordingFailed"));
      }
      return;
    }

    try {
      const mic = await Audio.requestPermissionsAsync();
      if (mic.status !== "granted") {
        alertError(t("common.error"), t("chat.microphonePermission"));
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      recordingMeteringRef.current = [];
      const { recording } = await Audio.Recording.createAsync(
        VOICE_RECORD_OPTIONS,
        (status) => {
          if (status.isRecording && typeof status.metering === "number") {
            recordingMeteringRef.current.push(meteringDbToNorm(status.metering));
          }
        },
        50,
      );
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      alertError(t("common.error"), t("chat.recordingFailed"));
    }
  }, [isRecording, t, alertError]);

  const closeVoiceActionSheet = useCallback(() => {
    setPendingVoiceUri(null);
    setPendingWaveformPeaks(null);
  }, []);

  const handleInputLongPress = useCallback(async () => {
    if (!canSendMessage) return;
    if (appClipboard) {
      setPendingPaste(appClipboard);
      return;
    }
    try {
      if (await Clipboard.hasImageAsync()) {
        const img = await Clipboard.getImageAsync({ format: "jpeg", jpegQuality: 0.92 });
        if (img?.data) {
          const raw = img.data;
          const base64Payload = raw.includes(",") ? raw.split(",")[1]! : raw;
          const clipFile = new ExpoFsFile(Paths.cache, `clipboard-paste-${Date.now()}.jpg`);
          const bin = globalThis.atob(base64Payload);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
          clipFile.write(bytes);
          setPendingPaste({
            messageType: ChatMessageType.Image,
            text: null,
            mediaUrl: null,
            fileName: "clipboard.jpg",
            localPastedFileUri: clipFile.uri,
          });
          return;
        }
      }
      if (await Clipboard.hasStringAsync()) {
        const text = await Clipboard.getStringAsync();
        const trimmed = (text ?? "").trim();
        if (trimmed.startsWith("{")) {
          try {
            const j = JSON.parse(trimmed) as {
              _chatClip?: boolean;
              messageType?: number;
              text?: string | null;
              mediaUrl?: string | null;
              fileName?: string | null;
              waveformPeaks?: number[] | null;
            };
            if (j && j._chatClip === true && typeof j.messageType === "number") {
              setPendingPaste({
                messageType: j.messageType as ChatMessageType,
                text: j.text ?? null,
                mediaUrl: j.mediaUrl ?? null,
                fileName: j.fileName ?? null,
                waveformPeaks: j.waveformPeaks ?? null,
              });
              return;
            }
          } catch {
            /* düz metin */
          }
        }
        if (trimmed) {
          setPendingPaste({ messageType: ChatMessageType.Text, text: trimmed });
        }
      }
    } catch {
      /* ignore */
    }
  }, [canSendMessage, appClipboard]);

  const onVoiceSendAsAudio = useCallback(() => {
    if (!pendingVoiceUri) return;
    const u = pendingVoiceUri;
    const peaks = pendingWaveformPeaks;
    setPendingVoiceUri(null);
    setPendingWaveformPeaks(null);
    void handleSendAudioMessage(u, peaks);
  }, [pendingVoiceUri, pendingWaveformPeaks, handleSendAudioMessage]);

  const onVoiceTranscribe = useCallback(async () => {
    if (!pendingVoiceUri || !token) return;
    const u = pendingVoiceUri;
    setIsTranscribing(true);
    try {
      let activeToken = tokenStore.access ?? token;
      if (activeToken && isExpired(activeToken) && tokenStore.refresh) {
        const refreshed = await attemptTokenRefresh(tokenStore.refresh);
        if (refreshed) activeToken = refreshed.accessToken;
      }
      const { text, serverMessage, isEmpty } = await transcribeWithWhisper(
        u,
        activeToken,
        API_CONFIG.BASE_URL,
        currentLanguage,
      );
      if (text?.trim()) {
        setMessageText((prev) => (prev ? `${prev} ${text}` : text));
      } else if (isEmpty) {
        alertWarning(t("chat.transcriptionUnavailableTitle"), t("chat.transcriptionEmpty"));
      } else {
        const isNetwork = serverMessage === "__network__";
        alertWarning(
          t("chat.transcriptionUnavailableTitle"),
          isNetwork
            ? t("chat.transcriptionNetworkBody")
            : serverMessage?.trim()
              ? serverMessage
              : t("chat.transcriptionUnavailableBody"),
        );
      }
    } finally {
      setIsTranscribing(false);
      setPendingVoiceUri(null);
    }
  }, [pendingVoiceUri, token, t, alertWarning, currentLanguage]);

  // --- Context menu ---
  const showContextMenu = useCallback((msg: ChatMessageItemDto) => {
    setContextMenuMessage(msg);
    Animated.spring(contextMenuAnim, { toValue: 1, useNativeDriver: true, tension: 140, friction: 8 }).start();
  }, [contextMenuAnim]);

  const hideContextMenu = useCallback(() => {
    Animated.timing(contextMenuAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setContextMenuMessage(null);
    });
  }, [contextMenuAnim]);

  const handleReplyFromMenu = useCallback(() => {
    if (!contextMenuMessage) return;
    setReplyingTo(contextMenuMessage);
    hideContextMenu();
  }, [contextMenuMessage, hideContextMenu]);

  const handleDeleteFromMenu = useCallback(() => {
    if (!contextMenuMessage) return;
    hideContextMenu();
    const msgId = contextMenuMessage.messageId;
    confirm(
      t("chat.deleteMessage"),
      t("chat.deleteMessageConfirm"),
      async () => {
        await deleteChatMessage({ messageId: msgId, threadId });
      },
      undefined,
      t("common.delete"),
      t("common.cancel"),
    );
  }, [contextMenuMessage, threadId, hideContextMenu, deleteChatMessage, confirm, t]);

  const handleCopyFromMenu = useCallback(async () => {
    if (!contextMenuMessage) return;
    hideContextMenu();
    const type = contextMenuMessage.messageType ?? ChatMessageType.Text;
    // Uygulama içi clipboard'a kaydet (zengin yapıştırma için)
    setAppClipboard({
      messageType: type,
      text: contextMenuMessage.text ?? null,
      mediaUrl: contextMenuMessage.mediaUrl ?? null,
      fileName: (contextMenuMessage as any).fileName ?? null,
      waveformPeaks: contextMenuMessage.waveformPeaks ?? null,
    });
    if (type === ChatMessageType.Text && contextMenuMessage.text) {
      await Clipboard.setStringAsync(contextMenuMessage.text);
    } else {
      // Konum/medya: sistem panosuna JSON (girişe uzun basınca veya yapıştır ile aynı tipte açılır)
      await Clipboard.setStringAsync(
        JSON.stringify({
          _chatClip: true,
          messageType: type,
          text: contextMenuMessage.text ?? null,
          mediaUrl: contextMenuMessage.mediaUrl ?? null,
          fileName: (contextMenuMessage as any).fileName ?? null,
          waveformPeaks: contextMenuMessage.waveformPeaks ?? null,
        }),
      );
    }
  }, [contextMenuMessage, hideContextMenu]);

  const copyAvailable = !!contextMenuMessage;
  const editAvailable = !!contextMenuMessage
    && (contextMenuMessage.messageType ?? ChatMessageType.Text) === ChatMessageType.Text
    && contextMenuMessage.senderUserId === currentUserId;

  const handleEditFromMenu = useCallback(() => {
    if (!contextMenuMessage) return;
    const msg = contextMenuMessage;
    Animated.timing(contextMenuAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setContextMenuMessage(null);
      InteractionManager.runAfterInteractions(() => {
        setEditingMessage(msg);
        setEditText(msg.text ?? "");
      });
    });
  }, [contextMenuMessage, contextMenuAnim]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessage || !editText.trim()) return;
    const trimmed = editText.trim();
    try {
      await updateChatMessage({ messageId: editingMessage.messageId, threadId, text: trimmed });
    } catch {
      alertError(t("common.error"), t("chat.messageSendFailed"));
    }
    setEditingMessage(null);
    setEditText("");
  }, [editingMessage, editText, threadId, updateChatMessage, alertError, t]);

  const handleDeleteThread = useCallback(() => {
    setShowHeaderMenu(false);
    confirm(
      t("chat.deleteThread"),
      t("chat.deleteThreadConfirm"),
      async () => {
        await deleteChatThread({ threadId });
        router.back();
      },
      undefined,
      t("common.delete"),
      t("common.cancel"),
    );
  }, [threadId, deleteChatThread, confirm, router, t]);

  // --- Formatting ---
  const formatMessageTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("tr-TR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return ""; }
  };

  const getDateSeparatorLabel = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t("chat.today");
    if (diffDays === 1) return t("chat.yesterday");
    const localeMap: Record<string, string> = { tr: "tr-TR", en: "en-US", de: "de-DE", ar: "ar-SA" };
    return date.toLocaleDateString(localeMap[currentLanguage] || "en-US", { day: "2-digit", month: "long", year: "numeric" });
  }, [currentLanguage, t]);

  const sortedMessages = useMemo(() => {
    if (!messages || !Array.isArray(messages)) return [];
    try { return [...messages].reverse(); } catch { return []; }
  }, [messages]);

  /**
   * F4: Typing label'ı memo'da hesapla — typingUsers veya participants değişmedikçe
   * aynı string döner. Daha sonra `TypingIndicatorBar` içine prop olarak geçer, yani
   * normal mesaj geldiğinde bu component yeniden render olmaz.
   */
  const typingLabel = useMemo<string | null>(() => {
    if (typingUsers.size === 0) return null;
    const names: string[] = [];
    typingUsers.forEach((uid) => {
      const p = participants.find((x) => x.userId === uid);
      names.push(p?.displayName || t("chat.someone"));
    });
    return names.join(", ");
  }, [typingUsers, participants, t]);

  /** inverted FlatList: dizi başı = ekranın altı (en yeni); optimistic üstte */
  const displayMessages = useMemo<Array<ChatMessageItemDto | OptimisticMessage>>(() => {
    if (optimisticMessages.length === 0) return sortedMessages;
    const confirmedTexts = new Set(
      sortedMessages.filter((m) => m.senderUserId === currentUserId).map((m) => m.text),
    );
    // Çift-animasyon yedek güvence: SignalR `chat.message` eventi mutation response'tan
    // önce gelirse confirmed mesaj cache'e yazılır ve optimistic hâlâ listede olur. Bu
    // anda confirmed'in `messageId`'sini animated-set'e senkron ekleyerek bubble'ın
    // renderItem içinde `isNewMessage=true` dönmesini (ve slide-in'i tekrar oynatmasını)
    // engelliyoruz. Eşleşme senderUserId + metin üzerinden yapılıyor.
    for (const opt of optimisticMessages) {
      if (!confirmedTexts.has(opt.text)) continue;
      const confirmed = sortedMessages.find(
        (m) => m.senderUserId === currentUserId && m.text === opt.text,
      );
      if (confirmed) animatedMessageIds.current.add(confirmed.messageId);
    }
    const stillPending = optimisticMessages.filter((o) => !confirmedTexts.has(o.text));
    if (stillPending.length === 0) return sortedMessages;
    return [...[...stillPending].reverse(), ...sortedMessages];
  }, [optimisticMessages, sortedMessages, currentUserId]);

  type DisplayRow =
    | { rowType: "message"; key: string; item: ChatMessageItemDto | OptimisticMessage }
    | { rowType: "separator"; key: string; label: string };

  const messageRows = useMemo<DisplayRow[]>(() => {
    if (!displayMessages.length) return [];
    const rows: DisplayRow[] = [];
    for (let i = 0; i < displayMessages.length; i += 1) {
      const msg = displayMessages[i];
      rows.push({ rowType: "message", key: `msg-${msg.messageId}`, item: msg });
      const nextMsg = displayMessages[i + 1];
      const currentDateKey = new Date(msg.createdAt).toDateString();
      const nextDateKey = nextMsg ? new Date(nextMsg.createdAt).toDateString() : null;
      if (!nextMsg || currentDateKey !== nextDateKey) {
        const label = getDateSeparatorLabel(msg.createdAt);
        if (label) rows.push({ rowType: "separator", key: `sep-${currentDateKey}-${i}`, label });
      }
    }
    return rows;
  }, [displayMessages, getDateSeparatorLabel]);

  const participantsMap = useMemo(() => {
    const map = new Map<string, ChatThreadParticipantDto>();
    if (!participants.length) return map;
    participants.forEach((p) => {
      if (p.userId) {
        map.set(p.userId.trim().toLowerCase(), p);
        map.set(p.userId, p);
      }
    });
    return map;
  }, [participants]);

  const [hasRefetched, setHasRefetched] = useState(false);

  useEffect(() => {
    prevMessageCountRef.current = 0;
    prevOptimisticLenRef.current = 0;
  }, [threadId]);

  useEffect(() => {
    if (messages && messages.length > 0 && currentThread && !hasRefetched) {
      const messageSenderIds = new Set<string>(messages.map((m) => m.senderUserId));
      const participantIds = new Set(participants.map((p) => p.userId));
      const missing = Array.from(messageSenderIds).filter((id) => !participantIds.has(id));
      if (missing.length > 0) {
        setHasRefetched(true);
        refetchThreads().catch(() => setHasRefetched(false));
      }
    }
  }, [messages, currentThread, participants, refetchThreads, hasRefetched]);

  useEffect(() => {
    const count = sortedMessages.length;
    if (count > prevMessageCountRef.current) {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 80);
    }
    prevMessageCountRef.current = count;
  }, [sortedMessages]);

  useEffect(() => {
    const n = optimisticMessages.length;
    if (n > prevOptimisticLenRef.current) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
    prevOptimisticLenRef.current = n;
  }, [optimisticMessages]);

  const hasLoadedMessages = Array.isArray(messages) && messages.length > 0;
  if (isLoading && !hasLoadedMessages) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.screenBg }}>
        <ActivityIndicator size="large" color={brandColor} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ backgroundColor: colors.screenBg }}
    >
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: colors.headerBg }}>
        <View className="px-4 py-3 flex-row items-center" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-0 flex-row items-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon source="chevron-left" size={28} color={colors.sectionHeaderText} />
          </TouchableOpacity>
          {participants.length > 0 ? (
            <View className="flex-1 ml-2 flex-row items-center" pointerEvents="box-none">
              <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                {participants.slice(0, 2).map((participant, idx) => (
                  <View
                    key={participant.userId}
                    className="w-10 h-10 rounded-full overflow-hidden items-center justify-center"
                    style={{ marginLeft: idx > 0 ? -12 : 0, zIndex: 2 - idx, borderWidth: 2, borderColor: colors.borderColor, backgroundColor: colors.cardBg2 }}
                  >
                    <OwnerAvatar
                      ownerId={participant.userId}
                      ownerType={ImageOwnerType.User}
                      fallbackUrl={participant.imageUrl}
                      placeholderAsset={CHAT_AVATAR_PLACEHOLDER}
                      imageClassName="w-full h-full"
                      iconSource={participant.userType === UserType.BarberStore ? "store" : participant.userType === UserType.FreeBarber ? "account-supervisor" : "account"}
                      iconSize={20}
                      iconColor={isDark ? "white" : colors.sectionHeaderText}
                      iconContainerClassName="bg-transparent"
                    />
                  </View>
                ))}
                {participants.length > 2 && (
                  <View className="w-10 h-10 rounded-full items-center justify-center" style={{ marginLeft: -12, zIndex: 0, borderWidth: 2, borderColor: colors.borderColor, backgroundColor: colors.cardBg2 }}>
                    <Text className="text-xs font-century-gothic-sans-bold" style={{ color: colors.sectionHeaderText }}>
                      +{participants.length - 2}
                    </Text>
                  </View>
                )}
              </View>
              <View className="ml-3 flex-1" style={{ minWidth: 0 }}>
                <Text className="text-base font-century-gothic" numberOfLines={1} style={{ color: colors.sectionHeaderText }}>
                  {participants.map((p) => p.displayName).join(", ")}
                </Text>
                {currentThread != null && currentThread.status != null && currentThread.status !== undefined && (
                  <View className="self-start mt-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: softBrandBg, borderWidth: 1, borderColor: "rgba(240,94,35,0.35)" }}>
                    <Text className="text-[10px] font-century-gothic-sans-medium" style={{ color: brandColor }}>
                      {currentThread.status === AppointmentStatus.Approved ? t("appointment.status.approved")
                        : currentThread.status === AppointmentStatus.Pending ? t("appointment.status.pending")
                          : currentThread.status === AppointmentStatus.Completed ? t("appointment.status.completed")
                            : currentThread.status === AppointmentStatus.Cancelled ? t("appointment.status.cancelled")
                              : currentThread.status === AppointmentStatus.Rejected ? t("appointment.status.rejected")
                                : currentThread.status === AppointmentStatus.Unanswered ? t("appointment.status.unanswered")
                                  : ""}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View className="flex-1 ml-2 justify-center">
              <Text className="text-base font-century-gothic" numberOfLines={1} style={{ color: colors.sectionHeaderText }}>
                {t("chat.newMessage")}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={onMessagesRefresh}
            disabled={messagesRefreshing}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="ml-1 w-9 h-9 items-center justify-center rounded-full"
            accessibilityRole="button"
            accessibilityLabel={t("common.refresh")}
          >
            {messagesRefreshing ? (
              <ActivityIndicator size="small" color={brandColor} />
            ) : (
              <Icon source="refresh" size={22} color={brandColor} />
            )}
          </TouchableOpacity>
          {/* Three-dot header menu */}
          <TouchableOpacity
            onPress={() => setShowHeaderMenu(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="ml-1 w-9 h-9 items-center justify-center rounded-full"
          >
            <Icon source="dots-vertical" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Header dropdown menu */}
      {showHeaderMenu && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowHeaderMenu(false)}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowHeaderMenu(false)}>
            <View
              style={{
                position: "absolute",
                top: 80,
                right: 16,
                minWidth: 188,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 10,
                elevation: 8,
              }}
            >
              {participants.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setShowHeaderMenu(false);
                    participantsSheetRef.current?.present();
                  }}
                  className="flex-row items-center gap-3 px-4 py-3"
                  style={{ borderBottomWidth: 1, borderBottomColor: isDark ? "rgba(148,163,184,0.2)" : "rgba(226,232,240,0.9)" }}
                  activeOpacity={0.7}
                >
                  <Icon source="account-group-outline" size={20} color={colors.sectionHeaderText} />
                  <Text className="text-sm font-century-gothic-sans-medium" style={{ color: colors.sectionHeaderText }}>{t("chat.participants")}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleDeleteThread}
                className="flex-row items-center gap-3 px-4 py-3"
                activeOpacity={0.7}
              >
                <Icon source="chat-remove-outline" size={20} color="#ef4444" />
                <Text className="text-sm font-century-gothic-sans-medium" style={{ color: "#ef4444" }}>{t("chat.deleteThread")}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Messages — Gesture.Native ile sarılı: ses dalgası pan jesti eşzamanlı tanınır */}
      <GestureDetector gesture={chatListScrollGesture}>
        <FlatList
          ref={flatListRef}
          data={messageRows}
        keyExtractor={messageRowKeyExtractor}
        contentContainerStyle={{ flexGrow: 1, padding: 16, gap: 12, backgroundColor: colors.screenBg }}
        inverted
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        // F2: Performans propları — uzun thread'lerde scroll jank'ini azaltır
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={11}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === "android"}
        // Pagination: inverted listede "end" = en eski mesaj. Yukarı scroll'da tetiklenir.
        onEndReached={loadOlderMessages}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingOlder ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator size="small" color={brandColor} />
            </View>
          ) : null
        }
        onScrollToIndexFailed={() => {
          /* offset: 0 tüm listeyi alta sıçratıyordu; sessiz bırak */
        }}
        renderItem={({ item }: { item: DisplayRow }) => {
          if (item.rowType === "separator") {
            return (
              <View className="items-center my-1.5">
                <View className="px-3 py-1 rounded-full" style={{ backgroundColor: isDark ? "#1f2937" : "#e2e8f0", borderWidth: 1, borderColor: colors.borderColor }}>
                  <Text className="text-[11px] font-century-gothic-sans-medium" style={{ color: mutedTextColor }}>{item.label}</Text>
                </View>
              </View>
            );
          }

          const message = item.item;
          const isMe = message.senderUserId === currentUserId;
          const isPending = (message as OptimisticMessage).isPending === true;
          const msgType = (message.messageType ?? ChatMessageType.Text) as ChatMessageType;

          let senderParticipant: ChatThreadParticipantDto | null = null;
          if (message.senderUserId) {
            senderParticipant = participantsMap.get(message.senderUserId.trim().toLowerCase()) || participantsMap.get(message.senderUserId) || null;
          }
          const displayInfo = senderParticipant || {
            userId: message.senderUserId,
            displayName: message.senderUserId?.substring(0, 8) || t("favorites.unknown"),
            userType: UserType.Customer,
            imageUrl: null,
            barberType: null,
          };

          const isNewMessage = !animatedMessageIds.current.has(message.messageId);
          if (isNewMessage) animatedMessageIds.current.add(message.messageId);

          return (
            <Pressable
              onLongPress={() => !isPending && showContextMenu(message as ChatMessageItemDto)}
              delayLongPress={350}
            >
              <MotiView
                className={`flex-row items-start gap-2 mb-3 ${isMe ? "justify-end" : "justify-start"} ${isPending ? "opacity-70" : ""}`}
                style={{ flexShrink: 1 }}
                from={isNewMessage ? { opacity: 0, translateY: isMe ? 8 : -10 } : undefined}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 240 }}
              >
                {!isMe && (
                  <View className="w-10 h-10 rounded-full overflow-hidden items-center justify-center" style={{ flexShrink: 0, backgroundColor: colors.cardBg2 }}>
                    <OwnerAvatar
                      ownerId={displayInfo.userId}
                      ownerType={ImageOwnerType.User}
                      fallbackUrl={displayInfo.imageUrl}
                      placeholderAsset={CHAT_AVATAR_PLACEHOLDER}
                      imageClassName="w-full h-full"
                      iconSource={displayInfo.userType === UserType.BarberStore ? "store" : displayInfo.userType === UserType.FreeBarber ? "account-supervisor" : "account"}
                      iconSize={20}
                      iconColor={isDark ? "white" : colors.sectionHeaderText}
                      iconContainerClassName="bg-transparent"
                    />
                  </View>
                )}

                <View
                  className={`${msgType === ChatMessageType.Audio ? "max-w-[72%]" : "max-w-[82%]"} ${isMe ? "items-end" : "items-start"}`}
                  style={{
                    flexShrink: 1,
                    /** Ses: kenarlara yapışmayı azalt; dar ekranda yine okunur kalsın */
                    minWidth: msgType === ChatMessageType.Audio ? 240 : 0,
                  }}
                >
                  <View
                    className={`rounded-2xl ${msgType === ChatMessageType.Audio ? "px-3 py-2" : msgType === ChatMessageType.File ? "px-3 py-1.5" : "px-4 py-2.5"} ${isMe ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={[{
                      flexShrink: 1,
                      backgroundColor: isMe ? bubbleMeBg : bubbleOtherBg,
                      borderWidth: isMe
                        ? (msgType === ChatMessageType.Audio ? 1 : 0)
                        : 1,
                      borderColor: isMe
                        ? (msgType === ChatMessageType.Audio ? "rgba(255,255,255,0.28)" : "transparent")
                        : bubbleOtherBorder,
                      ...(msgType === ChatMessageType.Audio
                        ? { minWidth: 240, maxWidth: "100%", flexShrink: 0 }
                        : {}),
                      ...(isMe
                        ? Platform.select({
                          ios: {
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: msgType === ChatMessageType.Audio ? 0.16 : 0.12,
                            shadowRadius: msgType === ChatMessageType.Audio ? 8 : 6,
                          },
                          android: { elevation: 2 },
                        })
                        : {}),
                    }]}
                  >
                    {/* Sender name (others only) */}
                    {!isMe && (
                      <View className="flex-row items-center gap-1.5 mb-1.5 flex-wrap">
                        <Text className="text-xs font-century-gothic" style={{ color: mutedTextColor }}>
                          {displayInfo.displayName}
                          {senderParticipant && senderParticipant.userType !== currentUserType &&
                            ` • ${senderParticipant.userType === UserType.BarberStore ? t("labels.store") : senderParticipant.userType === UserType.FreeBarber ? t("labels.freeBarber") : t("card.customer")}`}
                        </Text>
                      </View>
                    )}

                    {/* Reply preview */}
                    {message.replyToMessageId && message.replyToTextPreview && (
                      <View
                        className="mb-2 px-2.5 py-1.5 rounded-xl"
                        style={{
                          backgroundColor: isMe ? "rgba(255,255,255,0.15)" : replyBg,
                          borderLeftWidth: 3,
                          borderLeftColor: isMe ? "rgba(255,255,255,0.6)" : brandColor,
                        }}
                      >
                        <Text className="text-xs font-century-gothic-sans-medium" style={{ color: isMe ? "rgba(255,255,255,0.75)" : brandColor }} numberOfLines={1}>
                          {t("chat.replyTo")}
                        </Text>
                        <Text className="text-xs font-century-gothic mt-0.5" style={{ color: isMe ? "rgba(255,255,255,0.65)" : mutedTextColor }} numberOfLines={2}>
                          {message.replyToTextPreview}
                        </Text>
                      </View>
                    )}

                    {/* Image message */}
                    {msgType === ChatMessageType.Image && message.mediaUrl ? (
                      <ChatBubbleImage
                        mediaUrl={message.mediaUrl}
                        brandColor={brandColor}
                        mutedTextColor={mutedTextColor}
                        isDark={isDark}
                        cardBg2={colors.cardBg2}
                        onOpen={openChatAttachmentUrl}
                        t={t}
                      />
                    ) : msgType === ChatMessageType.Location && message.mediaUrl ? (
                      /* Location message */
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={async () => {
                          const parsed = parseLocationMediaUrl(message.mediaUrl);
                          if (!parsed) return;
                          const { lat, lng } = parsed;
                          const nativeUrl = Platform.OS === "ios"
                            ? `maps://?q=${lat},${lng}`
                            : `geo:${lat},${lng}?q=${lat},${lng}`;
                          const webUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                          const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
                          Linking.openURL(canOpen ? nativeUrl : webUrl).catch(() => {
                            Linking.openURL(webUrl);
                          });
                        }}
                      >
                        <View className="flex-row items-center gap-2 px-1 py-1">
                          <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: isMe ? "rgba(255,255,255,0.2)" : softBrandBg }}>
                            <Icon source="map-marker" size={20} color={isMe ? "white" : brandColor} />
                          </View>
                          <Text className="text-sm font-century-gothic-sans-medium" style={{ color: isMe ? "white" : colors.sectionHeaderText }}>
                            {t("chat.locationShared")}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : msgType === ChatMessageType.File && message.mediaUrl ? (
                      /* File message — compact WhatsApp-style row */
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => openChatAttachmentUrl(message.mediaUrl)}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", columnGap: 10 }}>
                          <View
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isMe ? "rgba(255,255,255,0.22)" : softBrandBg,
                              flexShrink: 0,
                            }}
                          >
                            <Icon source="file-document-outline" size={20} color={isMe ? "white" : brandColor} />
                          </View>
                          <View style={{ flexShrink: 1, minWidth: 0 }}>
                            <RNText
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: isMe ? "white" : colors.sectionHeaderText,
                                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                              }}
                              numberOfLines={1}
                              ellipsizeMode="middle"
                            >
                              {(() => {
                                const raw = message.fileName || message.text || t("chat.file");
                                return raw.length > 30 ? raw.slice(0, 14) + "…" + raw.slice(-12) : raw;
                              })()}
                            </RNText>
                            <RNText
                              style={{
                                fontSize: 10,
                                marginTop: 2,
                                color: isMe ? "rgba(255,255,255,0.65)" : mutedTextColor,
                                ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                              }}
                            >
                              {t("chat.tapToOpen")}
                            </RNText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : msgType === ChatMessageType.Audio && message.mediaUrl ? (
                      <ChatBubbleAudio
                        messageId={message.messageId}
                        isMe={isMe}
                        isPlaying={
                          playingAudioId === message.messageId &&
                          scrubbingMessageId !== message.messageId
                        }
                        positionMillis={
                          audioPlayback?.messageId === message.messageId ? audioPlayback.positionMillis : 0
                        }
                        durationMillis={
                          audioPlayback?.messageId === message.messageId ? audioPlayback.durationMillis : 0
                        }
                        onTogglePlay={() => {
                          if (message.mediaUrl) handlePlayAudio(message.messageId, message.mediaUrl);
                        }}
                        onSeek={(ratio) => {
                          if (message.mediaUrl) handleSeekAudio(message.messageId, message.mediaUrl, ratio);
                        }}
                        onScrubbingBegin={() => handleScrubbingBegin(message.messageId)}
                        onScrubbingCancel={() => handleScrubbingCancel(message.messageId)}
                        bubbleBackgroundColor={isMe ? bubbleMeBg : bubbleOtherBg}
                        brandColor={brandColor}
                        mutedTextColor={mutedTextColor}
                        sectionHeaderText={colors.sectionHeaderText}
                        softBrandBg={softBrandBg}
                        waveformSurface={
                          isMe && msgType === ChatMessageType.Audio ? "outgoingOrange" : "incoming"
                        }
                        waveformPeaks={
                          (message.mediaUrl ? waveformByMediaUrl[message.mediaUrl] : undefined) ??
                          (message as ChatMessageItemDto).waveformPeaks ??
                          null
                        }
                        listScrollGesture={chatListScrollGesture}
                        avatarSlot={
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              overflow: "hidden",
                              backgroundColor: colors.cardBg2,
                            }}
                          >
                            <OwnerAvatar
                              ownerId={isMe ? (currentUserId ?? "") : displayInfo.userId}
                              ownerType={ImageOwnerType.User}
                              fallbackUrl={isMe ? currentThread?.currentUserImageUrl : displayInfo.imageUrl}
                              placeholderAsset={CHAT_AVATAR_PLACEHOLDER}
                              imageClassName="w-full h-full"
                              iconSource={
                                (isMe ? currentUserType : displayInfo.userType) === UserType.BarberStore
                                  ? "store"
                                  : (isMe ? currentUserType : displayInfo.userType) === UserType.FreeBarber
                                    ? "account-supervisor"
                                    : "account"
                              }
                              iconSize={18}
                              iconColor={isDark ? "white" : colors.sectionHeaderText}
                              iconContainerClassName="bg-transparent"
                            />
                          </View>
                        }
                      />
                    ) : (
                      /* Text message */
                      <View>
                        <Text
                          className={`text-sm ${isMe ? "text-right" : "text-left"} font-century-gothic`}
                          style={{ flexWrap: "wrap", flexShrink: 1, color: isMe ? "#ffffff" : colors.sectionHeaderText }}
                        >
                          {message.text}
                        </Text>
                        {(message as ChatMessageItemDto).isEdited && (
                          <Text style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.55)" : mutedTextColor, marginTop: 2, textAlign: isMe ? "right" : "left" }}>
                            {t("chat.edited")}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Time + read status */}
                  <View className={`flex-row items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"} px-2`}>
                    {isPending && <Icon source="clock-outline" size={11} color={colors.textSecondary} />}
                    {isMe && !isPending && (
                      <Icon
                        source={(message as ChatMessageItemDto).isFullyRead ? "check-all" : "check"}
                        size={13}
                        color={(message as ChatMessageItemDto).isFullyRead ? brandColor : colors.textSecondary}
                      />
                    )}
                    <Text className={`text-xs ${isMe ? "text-right" : "text-left"} ${isPending ? "opacity-60" : ""}`} style={{ color: mutedTextColor }}>
                      {formatMessageTime(message.createdAt)}
                    </Text>
                  </View>
                </View>

                {isMe && (
                  <View className="w-10 h-10 rounded-full overflow-hidden items-center justify-center" style={{ backgroundColor: colors.cardBg2 }}>
                    <OwnerAvatar
                      ownerId={currentUserId}
                      ownerType={ImageOwnerType.User}
                      fallbackUrl={currentThread?.currentUserImageUrl}
                      placeholderAsset={CHAT_AVATAR_PLACEHOLDER}
                      imageClassName="w-full h-full"
                      iconSource={currentUserType === UserType.BarberStore ? "store" : currentUserType === UserType.FreeBarber ? "account-supervisor" : "account"}
                      iconSize={20}
                      iconColor={isDark ? "white" : colors.sectionHeaderText}
                      iconContainerClassName="bg-transparent"
                    />
                  </View>
                )}
              </MotiView>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text style={{ color: mutedTextColor }}>{t("chat.noMessagesYet")}</Text>
            <Text className="text-xs mt-2" style={{ color: mutedTextColor }}>{t("chat.sendFirstMessage")}</Text>
          </View>
        }
        ListHeaderComponent={
          <TypingIndicatorBar
            label={typingLabel}
            typingSuffix={t("chat.typing")}
            mutedTextColor={mutedTextColor}
          />
        }
        />
      </GestureDetector>

      {/* Input area */}
      <View
        style={{ backgroundColor: colors.headerBg, borderTopWidth: 1, borderTopColor: colors.borderColor, paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {/* Connection error */}
        {!isConnected && (
          <View className="mx-4 mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: isDark ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.35)" }}>
            <Text className="text-xs text-center" style={{ color: isDark ? "#fca5a5" : "#b91c1c" }}>{t("chat.serverConnectionError")}</Text>
          </View>
        )}
        {isRestrictedThread && (
          <View
            className="mx-4 mt-3 rounded-xl px-3 py-2.5 flex-row items-center gap-2 flex-wrap"
            style={{
              backgroundColor: isDark ? "rgba(254,202,202,0.14)" : "rgba(254,226,226,0.95)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(248,113,113,0.4)" : "rgba(252,165,165,0.9)",
            }}
          >
            <Icon source="heart-outline" size={20} color={isDark ? "#fca5a5" : "#e11d48"} />
            <Text className="text-sm flex-1 min-w-[60%]" style={{ color: isDark ? "#fecaca" : "#9f1239" }}>{t("chat.restrictedThreadBanner")}</Text>
            {participants[0]?.userId ? (
              <TouchableOpacity
                onPress={() => {
                  const otherParticipant = participants.find((p) => p.userId !== currentUserId) ?? participants[0]!;
                  // Sadece karşı taraf BarberStore ise mağaza id'si ile favorile (çoklu mağaza bağlamı).
                  // Diğer durumlarda (Customer/FreeBarber) her zaman userId ile favorile.
                  const targetId =
                    otherParticipant.userType === UserType.BarberStore
                      ? currentThread?.favoriteStoreId ?? otherParticipant.userId
                      : otherParticipant.userId;
                  toggleFavorite({ targetId })
                    .unwrap()
                    .then(() => {
                      refetchThreads();
                      // Kısıtlıyken boş cache kalmış olabilir; favori sonrası mesajları hemen çek
                      refetch();
                    })
                    .catch(() => {});
                }}
                disabled={isTogglingFavorite}
                className="px-3 py-1.5 rounded-full flex-row items-center gap-1"
                style={{ backgroundColor: isDark ? "#be123c" : "#f43f5e", opacity: isTogglingFavorite ? 0.75 : 1 }}
              >
                {isTogglingFavorite ? <ActivityIndicator size="small" color="white" /> : <Icon source="heart" size={16} color="white" />}
                <Text className="text-white text-xs font-century-gothic-sans-bold" numberOfLines={1}>{t("chat.addToFavoritesToOpenChat")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        {!canSendMessage && !isRestrictedThread && isConnected && (
          <View className="mx-4 mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.35)" }}>
            <Text className="text-xs text-center" style={{ color: isDark ? "#fcd34d" : "#b45309" }}>{t("chat.cannotSendToThread")}</Text>
          </View>
        )}

        {/* Reply preview bar */}
        {replyingTo && (
          <View
            className="mx-4 mt-3 px-3 py-2 rounded-xl flex-row items-center"
            style={{ backgroundColor: isDark ? "rgba(240,94,35,0.12)" : "rgba(240,94,35,0.08)", borderWidth: 1, borderColor: "rgba(240,94,35,0.3)", borderLeftWidth: 3, borderLeftColor: brandColor }}
          >
            <View className="flex-1 mr-2">
              <Text className="text-xs font-century-gothic-sans-medium" style={{ color: brandColor }}>{t("chat.replyingTo")}</Text>
              <Text className="text-xs font-century-gothic mt-0.5" style={{ color: mutedTextColor }} numberOfLines={2}>
                {replyingTo.text || (replyingTo.messageType === ChatMessageType.Image ? t("chat.photo") : replyingTo.messageType === ChatMessageType.Location ? t("chat.location") : replyingTo.messageType === ChatMessageType.File ? t("chat.file") : replyingTo.messageType === ChatMessageType.Audio ? t("chat.audioMessage") : "")}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon source="close" size={18} color={mutedTextColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Yapıştırma — yanıt önizlemesi ile aynı çizgi (URL ham görünmez) */}
        {pendingPaste && (
          <View
            className="mx-4 mt-3 px-3 py-2 rounded-xl flex-row items-center"
            style={{
              backgroundColor: isDark ? "rgba(240,94,35,0.12)" : "rgba(240,94,35,0.08)",
              borderWidth: 1,
              borderColor: "rgba(240,94,35,0.3)",
              borderLeftWidth: 3,
              borderLeftColor: brandColor,
            }}
          >
            {pendingPaste.messageType === ChatMessageType.Image && (pendingPaste.mediaUrl || pendingPaste.localPastedFileUri) ? (
              <Image
                source={{ uri: pendingPaste.mediaUrl ?? pendingPaste.localPastedFileUri ?? "" }}
                style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10 }}
                resizeMode="cover"
              />
            ) : pendingPaste.messageType === ChatMessageType.Audio ? (
              <View style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10, backgroundColor: isDark ? "rgba(240,94,35,0.22)" : "rgba(240,94,35,0.14)", alignItems: "center", justifyContent: "center" }}>
                <Icon source="microphone" size={22} color={brandColor} />
              </View>
            ) : pendingPaste.messageType === ChatMessageType.File ? (
              <View style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10, backgroundColor: isDark ? "rgba(240,94,35,0.22)" : "rgba(240,94,35,0.14)", alignItems: "center", justifyContent: "center" }}>
                <Icon source="file-document-outline" size={22} color={brandColor} />
              </View>
            ) : pendingPaste.messageType === ChatMessageType.Location ? (
              <View style={{ width: 44, height: 44, borderRadius: 10, marginRight: 10, backgroundColor: isDark ? "rgba(240,94,35,0.22)" : "rgba(240,94,35,0.14)", alignItems: "center", justifyContent: "center" }}>
                <Icon source="map-marker" size={22} color={brandColor} />
              </View>
            ) : null}
            <View className="flex-1 mr-2" style={{ minWidth: 0 }}>
              <Text className="text-xs font-century-gothic-sans-medium" style={{ color: brandColor }}>
                {t("chat.clipboardTitle")}
              </Text>
              <Text className="text-xs font-century-gothic mt-0.5" style={{ color: mutedTextColor }} numberOfLines={3}>
                {pendingPaste.messageType === ChatMessageType.Text
                  ? (pendingPaste.text ?? "").slice(0, 220)
                  : pendingPaste.messageType === ChatMessageType.Image
                    ? t("chat.photo")
                    : pendingPaste.messageType === ChatMessageType.Location
                      ? t("chat.locationShared")
                      : pendingPaste.messageType === ChatMessageType.File
                        ? (pendingPaste.fileName || t("chat.file"))
                        : pendingPaste.messageType === ChatMessageType.Audio
                          ? t("chat.audioMessage")
                          : ""}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                // F6: İptal edilen yapıştırma için cache dosyasını sil.
                deleteClipboardCacheFile(pendingPaste?.localPastedFileUri ?? null);
                setPendingPaste(null);
                setAppClipboard(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon source="close" size={18} color={mutedTextColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Main input row — GlobalKeyboardDismisser bu satırı hariç tutar */}
        <KeyboardDismissExclusionView className="flex-row items-end gap-2 px-4 pt-3">
          {/* Text input */}
          <Pressable
            onLongPress={handleInputLongPress}
            delayLongPress={500}
            className="flex-1 flex-row items-end rounded-3xl px-4 py-1"
            style={{
              backgroundColor: colors.cardBg2,
              borderWidth: 1.5,
              borderColor: messageText.trim() ? brandColor : colors.borderColor,
              minHeight: 44,
              shadowColor: messageText.trim() ? brandColor : "transparent",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: messageText.trim() ? 2 : 0,
            }}
          >
            <TextInput
              value={messageText}
              onChangeText={handleTextChange}
              placeholder={isRestrictedThread ? t("chat.restrictedInputPlaceholder") : canSendMessage ? t("chat.messagePlaceholder") : t("chat.messageCannotBeSentPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              className="flex-1 font-century-gothic"
              multiline
              maxLength={500}
              editable={canSendMessage}
              style={{
                fontFamily: Platform.OS === "ios" ? "CenturyGothic" : "CenturyGothic",
                minHeight: 36,
                maxHeight: 110,
                paddingVertical: 6,
                color: colors.sectionHeaderText,
              }}
            />
          </Pressable>

          {/* Mic or Send button */}
          {(messageText.trim() || pendingPaste) ? (
            <Pressable
              onPress={handleSend}
              disabled={isSending || !canSendMessage}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{ backgroundColor: canSendMessage ? brandColor : colors.cardBg2, marginBottom: 1 }}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Icon source="send" size={20} color="white" />
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={handleMicPress}
              disabled={!canSendMessage || isTranscribing || isSendingMedia}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: isRecording ? "#ef4444" : canSendMessage ? (isDark ? "rgba(240,94,35,0.15)" : "rgba(240,94,35,0.1)") : colors.cardBg2,
                borderWidth: isRecording ? 0 : 1.5,
                borderColor: isRecording ? "transparent" : "rgba(240,94,35,0.35)",
                marginBottom: 1,
              }}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color={brandColor} />
              ) : (
                <Icon source={isRecording ? "stop" : "microphone"} size={22} color={isRecording ? "white" : brandColor} />
              )}
            </Pressable>
          )}

          {/* Dots attachment button — right of mic, with MotiView popup */}
          {canSendMessage && (
            <View style={{ position: "relative" }}>
              {/* Backdrop to close menu */}
              {showAttachMenu && (
                <TouchableOpacity
                  style={{ position: "absolute", top: -9999, left: -9999, right: -9999, bottom: -9999, zIndex: 98 }}
                  activeOpacity={1}
                  onPress={() => setShowAttachMenu(false)}
                />
              )}

              {/* MotiView dropdown — positioned above-right of button */}
              <MotiView
                from={{ opacity: 0, scale: 0.85, translateY: 10 }}
                animate={{
                  opacity: showAttachMenu ? 1 : 0,
                  scale: showAttachMenu ? 1 : 0.85,
                  translateY: showAttachMenu ? 0 : 10,
                }}
                transition={{ type: "timing", duration: 150 }}
                pointerEvents={showAttachMenu ? "auto" : "none"}
                style={{
                  position: "absolute",
                  bottom: 50,
                  right: 0,
                  borderRadius: 14,
                  paddingVertical: 6,
                  paddingHorizontal: 4,
                  minWidth: 170,
                  zIndex: 99,
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: 0.35,
                  shadowRadius: 10,
                  elevation: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => { setShowAttachMenu(false); handlePickImage(); }}
                  disabled={isSendingMedia}
                  className="flex-row items-center px-4 py-2.5 rounded-lg"
                  activeOpacity={0.7}
                >
                  <View style={{ marginRight: 10 }}>
                    <Icon source="image-outline" size={18} color={brandColor} />
                  </View>
                  <Text className="text-sm font-century-gothic-sans-medium" style={{ color: colors.sectionHeaderText }}>{t("chat.photo")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowAttachMenu(false); handlePickFile(); }}
                  disabled={isSendingMedia}
                  className="flex-row items-center px-4 py-2.5 rounded-lg"
                  activeOpacity={0.7}
                >
                  <View style={{ marginRight: 10 }}>
                    <Icon source="file-outline" size={18} color={brandColor} />
                  </View>
                  <Text className="text-sm font-century-gothic-sans-medium" style={{ color: colors.sectionHeaderText }}>{t("chat.file")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowAttachMenu(false); handleSendLocation(); }}
                  disabled={isSendingMedia}
                  className="flex-row items-center px-4 py-2.5 rounded-lg"
                  activeOpacity={0.7}
                >
                  <View style={{ marginRight: 10 }}>
                    <Icon source="map-marker-outline" size={18} color={brandColor} />
                  </View>
                  <Text className="text-sm font-century-gothic-sans-medium" style={{ color: colors.sectionHeaderText }}>{t("chat.location")}</Text>
                </TouchableOpacity>
              </MotiView>

              <Pressable
                onPress={() => setShowAttachMenu((v) => !v)}
                disabled={isSendingMedia}
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{
                  backgroundColor: showAttachMenu
                    ? (isDark ? "rgba(240,94,35,0.25)" : "rgba(240,94,35,0.18)")
                    : (isDark ? "rgba(240,94,35,0.15)" : "rgba(240,94,35,0.1)"),
                  borderWidth: 1.5,
                  borderColor: showAttachMenu ? brandColor : "rgba(240,94,35,0.35)",
                  marginBottom: 1,
                }}
              >
                <Icon source="dots-vertical" size={22} color={brandColor} />
              </Pressable>
            </View>
          )}
        </KeyboardDismissExclusionView>
        {isSendingMedia && (
          <View className="mx-4 mt-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color={brandColor} />
            <Text className="text-xs" style={{ color: mutedTextColor }}>{t("chat.uploadingMedia")}</Text>
          </View>
        )}
      </View>

      {/* Long-press context menu overlay — Zeego style */}
      {contextMenuMessage && (
        <Modal transparent animationType="none" statusBarTranslucent onRequestClose={hideContextMenu}>
          <Pressable style={{ flex: 1 }} onPress={hideContextMenu}>
            {/* Blurred backdrop */}
            <BlurView
              intensity={isDark ? 28 : 18}
              tint={isDark ? "dark" : "light"}
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
              }}
            />
            <Animated.View
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.28)",
                opacity: contextMenuAnim,
              }}
            />

            {/* Center container */}
            <Animated.View
              style={{
                position: "absolute",
                left: 0, right: 0,
                bottom: insets.bottom + 48,
                alignItems: "center",
                paddingHorizontal: 20,
                transform: [
                  { translateY: contextMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                ],
                opacity: contextMenuAnim,
              }}
            >
              {/* Message preview bubble — compact */}
              {contextMenuMessage.text ? (
                <Animated.View
                  style={{
                    maxWidth: 240,
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 10,
                    backgroundColor: contextMenuMessage.senderUserId === currentUserId ? bubbleMeBg : bubbleOtherBg,
                    borderWidth: contextMenuMessage.senderUserId === currentUserId ? 0 : 1,
                    borderColor: bubbleOtherBorder,
                    transform: [
                      { scale: contextMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                    ],
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.14,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  <Text
                    className="text-xs font-century-gothic leading-[18px]"
                    style={{ color: contextMenuMessage.senderUserId === currentUserId ? "#ffffff" : colors.sectionHeaderText }}
                    numberOfLines={3}
                  >
                    {contextMenuMessage.text}
                  </Text>
                </Animated.View>
              ) : null}

              {/* Action items — minimal rows */}
              <Animated.View
                style={{
                  width: "100%",
                  maxWidth: 248,
                  borderRadius: 12,
                  overflow: "hidden",
                  backgroundColor: isDark ? "#1e293b" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(148,163,184,0.12)" : "rgba(226,232,240,0.95)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.35 : 0.12,
                  shadowRadius: 12,
                  elevation: 8,
                  transform: [
                    { scale: contextMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                  ],
                }}
              >
                {/* Reply */}
                <TouchableOpacity
                  onPress={handleReplyFromMenu}
                  activeOpacity={0.72}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderBottomWidth: 0.5,
                    borderBottomColor: isDark ? "rgba(148,163,184,0.14)" : "rgba(226,232,240,0.85)",
                    gap: 10,
                  }}
                >
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: isDark ? "rgba(240,94,35,0.14)" : "rgba(240,94,35,0.09)", alignItems: "center", justifyContent: "center" }}>
                    <Icon source="reply" size={15} color={brandColor} />
                  </View>
                  <Text className="text-sm font-century-gothic-sans-medium" style={{ color: colors.sectionHeaderText, flex: 1 }}>{t("chat.reply")}</Text>
                </TouchableOpacity>

                {/* Kopyala — tüm mesaj tipleri (Konum hariç) */}
                {copyAvailable && (
                  <TouchableOpacity
                    onPress={handleCopyFromMenu}
                    activeOpacity={0.72}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderBottomWidth: 0.5,
                      borderBottomColor: isDark ? "rgba(148,163,184,0.14)" : "rgba(226,232,240,0.85)",
                      gap: 10,
                    }}
                  >
                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: isDark ? "rgba(99,102,241,0.14)" : "rgba(99,102,241,0.08)", alignItems: "center", justifyContent: "center" }}>
                      <Icon source="content-copy" size={15} color={isDark ? "#818cf8" : "#6366f1"} />
                    </View>
                    <Text className="text-sm font-century-gothic-sans-medium" style={{ color: colors.sectionHeaderText, flex: 1 }}>
                      {t("common.copy")}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Düzenle — yalnızca kendi metin mesajlarında */}
                {editAvailable && (
                  <TouchableOpacity
                    onPress={handleEditFromMenu}
                    activeOpacity={0.72}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderBottomWidth: 0.5,
                      borderBottomColor: isDark ? "rgba(148,163,184,0.14)" : "rgba(226,232,240,0.85)",
                      gap: 10,
                    }}
                  >
                    <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.09)", alignItems: "center", justifyContent: "center" }}>
                      <Icon source="pencil-outline" size={15} color={isDark ? "#4ade80" : "#16a34a"} />
                    </View>
                    <Text className="text-sm font-century-gothic-sans-medium" style={{ color: colors.sectionHeaderText, flex: 1 }}>{t("chat.editMessage")}</Text>
                  </TouchableOpacity>
                )}

                {/* Delete */}
                <TouchableOpacity
                  onPress={handleDeleteFromMenu}
                  activeOpacity={0.72}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    gap: 10,
                  }}
                >
                  <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center" }}>
                    <Icon source="delete-outline" size={15} color="#ef4444" />
                  </View>
                  <Text className="text-sm font-century-gothic-sans-medium" style={{ color: "#ef4444", flex: 1 }}>{t("chat.delete")}</Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </Pressable>
        </Modal>
      )}

      {/* Mesaj düzenleme modalı */}
      {editingMessage && (
        <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={() => { setEditingMessage(null); setEditText(""); }}>
          <Pressable
            style={{ flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)", justifyContent: "center", paddingHorizontal: 24 }}
            onPress={() => { setEditingMessage(null); setEditText(""); }}
          >
            <Pressable onPress={() => {}}>
              <View
                style={{
                  borderRadius: 18,
                  padding: 20,
                  backgroundColor: colors.cardBg,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(148,163,184,0.2)" : "rgba(226,232,240,0.95)",
                  ...(Platform.OS === "android" ? { elevation: 12 } : {}),
                }}
              >
                <RNText style={{ fontSize: 16, fontWeight: "700", color: colors.sectionHeaderText, marginBottom: 12 }}>
                  {t("chat.editMessage")}
                </RNText>
                <View
                  style={{
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: brandColor,
                    backgroundColor: colors.cardBg2,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 16,
                  }}
                >
                  <TextInput
                    ref={editInputRef}
                    value={editText}
                    onChangeText={setEditText}
                    multiline
                    maxLength={500}
                    style={{
                      fontSize: 14,
                      color: colors.sectionHeaderText,
                      minHeight: 60,
                      maxHeight: 140,
                    }}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { setEditingMessage(null); setEditText(""); }}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: cancelDialogSurface.borderColor,
                      backgroundColor: cancelDialogSurface.backgroundColor,
                      paddingVertical: 12,
                      alignItems: "center",
                    }}
                    activeOpacity={0.75}
                  >
                    <RNText style={{ fontSize: 14, fontWeight: "600", color: SOFT_CANCEL_TEXT }}>{t("common.cancel")}</RNText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={!editText.trim() || editText.trim() === editingMessage.text}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      backgroundColor: (!editText.trim() || editText.trim() === editingMessage.text)
                        ? colors.cardBg2
                        : confirmDialogPrimary.backgroundColor,
                      paddingVertical: 12,
                      alignItems: "center",
                      borderWidth: (!editText.trim() || editText.trim() === editingMessage.text) ? 0 : 1,
                      borderColor: (!editText.trim() || editText.trim() === editingMessage.text) ? "transparent" : "rgba(4,120,87,0.35)",
                    }}
                    activeOpacity={0.8}
                  >
                    <RNText
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: (!editText.trim() || editText.trim() === editingMessage.text)
                          ? colors.textSecondary
                          : confirmDialogPrimary.color,
                      }}
                    >
                      {t("common.save")}
                    </RNText>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Ses kaydı: gönder / metne çevir — dikey kart, taşan buton yok */}
      {pendingVoiceUri ? (
        <Modal
          transparent
          animationType="fade"
          statusBarTranslucent
          /** Yalnızca İptal ile kapanır; dışarı tıklama ve Android geri tuşu kapatmaz */
          onRequestClose={() => {}}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: isDark ? "rgba(0,0,0,0.62)" : "rgba(15,23,42,0.45)",
              justifyContent: "center",
              paddingHorizontal: 24,
              paddingBottom: insets.bottom + 16,
            }}
          >
            <View
              style={{
                alignSelf: "center",
                width: "100%",
                maxWidth: 360,
                zIndex: 1000,
                borderRadius: 18,
                paddingTop: 20,
                paddingHorizontal: 18,
                paddingBottom: 18,
                backgroundColor: colors.cardBg,
                borderWidth: 1,
                borderColor: isDark ? "rgba(148,163,184,0.2)" : "rgba(226,232,240,0.95)",
                ...(Platform.OS === "android" ? { elevation: 12 } : {}),
              }}
            >
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: isDark ? "rgba(240,94,35,0.22)" : "rgba(240,94,35,0.16)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(240,94,35,0.35)" : "rgba(240,94,35,0.25)",
                  }}
                >
                  <Icon source="microphone" size={28} color={brandColor} />
                </View>
                <RNText
                  style={{
                    marginTop: 12,
                    paddingHorizontal: 8,
                    textAlign: "center",
                    fontSize: 18,
                    fontWeight: "700",
                    color: voiceModalTitleColor,
                    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                  }}
                >
                  {t("chat.audioRecordedTitle")}
                </RNText>
                <RNText
                  style={{
                    marginTop: 6,
                    paddingHorizontal: 8,
                    textAlign: "center",
                    fontSize: 14,
                    lineHeight: 20,
                    color: voiceModalBodyColor,
                    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                  }}
                >
                  {t("chat.audioRecordedBody")}
                </RNText>
              </View>

              <View style={{ gap: 12 }}>
                {/* Sesli mesaj olarak gönder — Android: TouchableOpacity satırında flex:1 metin sütunu 0 genişlik alabiliyor; width:100% + minWidth:0 */}
                <Pressable
                  onPress={onVoiceSendAsAudio}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: isDark ? "rgba(240,94,35,0.35)" : "rgba(240,94,35,0.3)",
                    backgroundColor: isDark ? "rgba(240,94,35,0.1)" : "rgba(240,94,35,0.08)",
                    overflow: "hidden",
                    alignSelf: "stretch",
                    width: "100%",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 14,
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        backgroundColor: isDark ? "rgba(240,94,35,0.2)" : "rgba(240,94,35,0.14)",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon source="send" size={26} color={brandColor} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14, minWidth: 0, justifyContent: "center" }}>
                      <RNText
                        style={{
                          fontSize: 12,
                          marginBottom: 4,
                          color: voiceModalCaptionOrange,
                          fontWeight: "600",
                          ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                        }}
                      >
                        {t("chat.voiceModalSendCaption")}
                      </RNText>
                      <RNText
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: voiceModalTitleColor,
                          ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                        }}
                      >
                        {t("chat.voiceModalSendTitle")}
                      </RNText>
                      <RNText
                        style={{
                          fontSize: 12,
                          lineHeight: 18,
                          marginTop: 4,
                          color: voiceModalBodyColor,
                          ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                        }}
                      >
                        {t("chat.sendAsAudioHint")}
                      </RNText>
                    </View>
                  </View>
                </Pressable>

                {/* Metne çevir */}
                <Pressable
                  onPress={onVoiceTranscribe}
                  disabled={isTranscribing}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: isDark ? "rgba(129,140,248,0.35)" : "rgba(129,140,248,0.35)",
                    backgroundColor: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)",
                    opacity: isTranscribing ? 0.65 : 1,
                    overflow: "hidden",
                    alignSelf: "stretch",
                    width: "100%",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 14,
                      width: "100%",
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        backgroundColor: isDark ? "rgba(99,102,241,0.14)" : "rgba(99,102,241,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {isTranscribing ? (
                        <ActivityIndicator size="small" color={isDark ? "#a5b4fc" : "#6366f1"} />
                      ) : (
                        <Icon source="text-box-outline" size={26} color={isDark ? "#a5b4fc" : "#4f46e5"} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 14, minWidth: 0, justifyContent: "center" }}>
                      <RNText
                        style={{
                          fontSize: 12,
                          marginBottom: 4,
                          color: voiceModalCaptionIndigo,
                          fontWeight: "600",
                          ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                        }}
                      >
                        {t("chat.voiceModalTranscribeCaption")}
                      </RNText>
                      <RNText
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: voiceModalTitleColor,
                          ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                        }}
                      >
                        {t("chat.voiceModalTranscribeTitle")}
                      </RNText>
                      <RNText
                        style={{
                          fontSize: 12,
                          lineHeight: 18,
                          marginTop: 4,
                          color: voiceModalBodyColor,
                          ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                        }}
                      >
                        {t("chat.transcribeToTextHint")}
                      </RNText>
                    </View>
                  </View>
                </Pressable>
              </View>

              <Pressable onPress={closeVoiceActionSheet} style={{ paddingVertical: 14, alignItems: "center", marginTop: 4 }}>
                <RNText
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: isDark ? "#fca5a5" : "#b91c1c",
                    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
                  }}
                >
                  {t("common.cancel")}
                </RNText>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Participants Bottom Sheet */}
      <BottomSheetModal
        ref={participantsSheetRef}
        enablePanDownToClose
        enableDynamicSizing
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.7} />
        )}
      >
        <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}>
          <Text className="text-lg font-century-gothic-sans-bold mb-4" style={{ color: colors.sectionHeaderText }}>{t("chat.participants")}</Text>
          {participants.map((participant) => {
            const getLabel = () => {
              if (participant.userType === currentUserType) return null;
              if (participant.userType === UserType.BarberStore) return t("labels.store");
              if (participant.userType === UserType.FreeBarber) return t("labels.freeBarber");
              if (participant.userType === UserType.Customer) return t("card.customer");
              return null;
            };
            const getBarberLabel = () => {
              if (participant.barberType === undefined || participant.barberType === null) return null;
              if (participant.userType === UserType.FreeBarber) {
                return participant.barberType === BarberType.MaleHairdresser ? t("barberType.maleHairdresserShort") : t("barberType.femaleHairdresserShort");
              }
              if (participant.userType === UserType.BarberStore) {
                if (participant.barberType === BarberType.MaleHairdresser) return t("barberType.maleHairdresserOf");
                if (participant.barberType === BarberType.FemaleHairdresser) return t("barberType.femaleHairdresserOf");
                return t("barberType.beautySalon");
              }
              return null;
            };
            const label = getLabel();
            const barberLabel = getBarberLabel();
            const labelText = [label, barberLabel].filter(Boolean).join(" • ");
            return (
              <View key={participant.userId} className="flex-row items-center mb-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor }}>
                <View className="w-12 h-12 rounded-full overflow-hidden items-center justify-center" style={{ flexShrink: 0, backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor }}>
                  <OwnerAvatar
                    ownerId={participant.userId}
                    ownerType={ImageOwnerType.User}
                    fallbackUrl={participant.imageUrl}
                    placeholderAsset={CHAT_AVATAR_PLACEHOLDER}
                    imageClassName="w-full h-full"
                    iconSource={participant.userType === UserType.BarberStore ? "store" : participant.userType === UserType.FreeBarber ? "account-supervisor" : "account"}
                    iconSize={24}
                    iconColor={isDark ? "white" : colors.sectionHeaderText}
                    iconContainerClassName="bg-transparent"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-century-gothic-sans-bold" style={{ color: colors.sectionHeaderText }}>{participant.displayName}</Text>
                  {labelText ? <Text className="text-gray-400 text-sm font-century-gothic mt-0.5">{labelText}</Text> : null}
                </View>
              </View>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
};
