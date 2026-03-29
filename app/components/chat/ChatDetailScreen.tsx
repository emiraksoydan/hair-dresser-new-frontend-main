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
} from "react-native";
import { MotiView } from "moti";
import { Text } from "../common/Text";
import { useSafeNavigation } from "../../hook/useSafeNavigation";

import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  useGetChatMessagesByThreadQuery,
  useSendChatMessageMutation,
  useSendChatMessageByThreadMutation,
  useSendChatMediaMessageMutation,
  useDeleteChatMessageMutation,
  useDeleteChatThreadMutation,
  useMarkChatThreadReadMutation,
  useGetChatThreadsQuery,
  useNotifyTypingMutation,
} from "../../store/api";
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
import { useTheme } from "../../hook/useTheme";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { API_CONFIG } from "../../constants/api";

interface ChatDetailScreenProps {
  threadId: string;
}

// Whisper transcription — backend proxy üzerinden (API key backend'de)
async function transcribeWithWhisper(uri: string, authToken: string, baseUrl: string): Promise<string | null> {
  try {
    const filename = uri.split("/").pop() || "audio.m4a";
    const formData = new FormData();
    formData.append("file", { uri, name: filename, type: "audio/m4a" } as any);

    const res = await fetch(`${baseUrl}AI/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

const UPLOAD_TIMEOUT_MS = 30_000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = UPLOAD_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// Upload image to backend, return URL
async function uploadImageToBackend(uri: string, authToken: string, baseUrl: string, ownerId: string): Promise<string | null> {
  try {
    const filename = uri.split("/").pop() || "photo.jpg";
    const formData = new FormData();
    formData.append("File", { uri, name: filename, type: "image/jpeg" } as any);
    formData.append("OwnerId", ownerId);
    formData.append("OwnerType", "1");

    const res = await fetchWithTimeout(`${baseUrl}Image/upload?isProfileImage=false`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.url ?? json?.data ?? null;
  } catch {
    return null;
  }
}

// Upload any file to backend, returns URL
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
    return json?.data?.url ?? json?.data ?? null;
  } catch {
    return null;
  }
}

export const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({
  threadId,
}) => {
  const { colors, isDark } = useTheme();
  const brandColor = "#f05e23";
  const mutedTextColor = isDark ? "#94a3b8" : "#64748b";
  const softBrandBg = isDark ? "rgba(240,94,35,0.18)" : "rgba(240,94,35,0.10)";
  const bubbleMeBg = isDark ? "rgba(240,94,35,0.52)" : "rgba(251, 146, 60, 0.78)";
  const bubbleOtherBg = isDark ? "rgba(71,85,105,0.48)" : "rgba(241, 245, 249, 0.94)";
  const bubbleOtherBorder = isDark ? "rgba(148,163,184,0.22)" : "rgba(148,163,184,0.38)";
  const replyBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const router = useSafeNavigation();
  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const { userId: currentUserId, userType: currentUserType, token } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { t, currentLanguage } = useLanguage();
  const { alertError, confirm } = useAlert();
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
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Media sending state
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  // Attachment dots menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Track which message IDs have already been animated (to avoid re-animating on re-render)
  const animatedMessageIds = useRef<Set<string>>(new Set());

  const { isConnected, connectionRef } = useSignalRV2();

  const {
    data: threads,
    isLoading: isLoadingThreads,
    refetch: refetchThreads,
  } = useGetChatThreadsQuery();
  const currentThread = useMemo(() => {
    return threads?.find((t) => t.threadId === threadId);
  }, [threads, threadId]);

  useEffect(() => {
    if (!isLoadingThreads && threads && !currentThread && threadId) {
      setTimeout(() => { refetchThreads(); }, 1000);
    }
  }, [isLoadingThreads, threads, currentThread, threadId, refetchThreads]);

  const {
    data: messages,
    isLoading,
    refetch,
  } = useGetChatMessagesByThreadQuery({ threadId }, { skip: !threadId });

  const canSendMessage = useMemo(() => {
    if (!currentThread) return false;
    if (!isConnected) return false;
    if (!currentThread.appointmentId) return true;
    if (currentThread.status === null || currentThread.status === undefined) return false;
    return (
      currentThread.status === AppointmentStatus.Pending ||
      currentThread.status === AppointmentStatus.Approved
    );
  }, [currentThread, isConnected]);

  const [sendMessageByAppointment, { isLoading: isSendingByAppt }] = useSendChatMessageMutation();
  const [sendMessageByThread, { isLoading: isSendingByThread }] = useSendChatMessageByThreadMutation();
  const [sendChatMedia] = useSendChatMediaMessageMutation();
  const [deleteChatMessage] = useDeleteChatMessageMutation();
  const [deleteChatThread] = useDeleteChatThreadMutation();
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const isSending = isSendingByAppt || isSendingByThread;

  const [markRead] = useMarkChatThreadReadMutation();
  const [notifyTyping] = useNotifyTypingMutation();
  const markReadInFlightRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingNotificationRef = useRef(false);
  const autoReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const markThreadRead = useCallback(async () => {
    if (!threadId || markReadInFlightRef.current) return;
    markReadInFlightRef.current = true;
    await markRead(threadId);
    markReadInFlightRef.current = false;
  }, [threadId, markRead]);

  useEffect(() => {
    if (threadId && currentThread && currentThread.unreadCount > 0) {
      markThreadRead();
    }
  }, [threadId, currentThread?.unreadCount, markThreadRead]);

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
          markThreadRead().catch(() => {});
        }, 500);
      }
    };

    const handleMessageRemoved = (data: { threadId: string; messageId: string }) => {
      if (data.threadId !== threadId) return;
      refetch();
    };

    connection.on("chat.message", handleNewMessage);
    connection.on("chat.messageRemoved", handleMessageRemoved);

    return () => {
      if (connection) {
        connection.off("chat.message", handleNewMessage);
        connection.off("chat.messageRemoved", handleMessageRemoved);
      }
      if (autoReadTimeoutRef.current) {
        clearTimeout(autoReadTimeoutRef.current);
        autoReadTimeoutRef.current = null;
      }
    };
  }, [threadId, currentUserId, markThreadRead, connectionRef]);

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
    setMessageText(text);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const shouldNotify = text.trim().length > 0 && canSendMessage && isConnected;
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

  const handleSend = useCallback(async () => {
    setShowAttachMenu(false);
    if (!messageText.trim() || !threadId || isSending) return;
    if (!canSendMessage) {
      if (!isConnected) {
        alertError(t("chat.connectionError"), t("chat.connectionErrorMessage"));
      } else {
        alertError(t("chat.messageCannotBeSent"), t("chat.cannotSendToThread"));
      }
      return;
    }
    stopTyping();

    const text = messageText.trim();
    const replyToId = replyingTo?.messageId ?? null;
    const tempId = `opt-${Date.now()}`;
    const optimisticMsg: OptimisticMessage = {
      messageId: tempId,
      senderUserId: currentUserId!,
      text,
      createdAt: new Date().toISOString(),
      isPending: true,
      replyToMessageId: replyToId,
      replyToTextPreview: replyingTo?.text ?? null,
    };
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");
    setReplyingTo(null);

    let sendResult;
    if (currentThread?.appointmentId) {
      sendResult = await sendMessageByAppointment({ appointmentId: currentThread.appointmentId, text, replyToMessageId: replyToId });
    } else {
      sendResult = await sendMessageByThread({ threadId, text, replyToMessageId: replyToId });
    }

    setOptimisticMessages((prev) => prev.filter((m) => m.messageId !== tempId));

    if ("error" in sendResult) {
      setMessageText(text);
      const errorMessage = (sendResult.error as any)?.data?.message || t("chat.messageSendFailed");
      alertError(t("common.error"), errorMessage);
    }
  }, [
    messageText, threadId, isSending, canSendMessage, isConnected, currentUserId,
    currentThread, replyingTo, sendMessageByThread, sendMessageByAppointment,
    stopTyping, t, alertError,
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
    const uri = result.assets[0].uri;
    setIsSendingMedia(true);
    try {
      const url = await uploadImageToBackend(uri, token ?? "", API_CONFIG.BASE_URL, currentUserId ?? "");
      if (!url) { alertError(t("common.error"), t("chat.imageUploadFailed")); return; }
      await sendChatMedia({ threadId, messageType: ChatMessageType.Image, mediaUrl: url, replyToMessageId: replyingTo?.messageId ?? null });
      setReplyingTo(null);
    } catch {
      alertError(t("common.error"), t("chat.imageUploadFailed"));
    } finally {
      setIsSendingMedia(false);
    }
  }, [canSendMessage, threadId, token, replyingTo, sendChatMedia, t, alertError]);

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
      const mediaUrl = `geo:${latitude},${longitude}`;
      await sendChatMedia({ threadId, messageType: ChatMessageType.Location, mediaUrl, replyToMessageId: replyingTo?.messageId ?? null });
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
    setIsSendingMedia(true);
    try {
      const url = await uploadFileToBackend(uri, name, mimeType, token ?? "", API_CONFIG.BASE_URL, currentUserId ?? "");
      if (!url) { alertError(t("common.error"), t("chat.fileUploadFailed")); return; }
      await sendChatMedia({ threadId, messageType: ChatMessageType.File, mediaUrl: url, fileName: name, replyToMessageId: replyingTo?.messageId ?? null });
      setReplyingTo(null);
    } catch {
      alertError(t("common.error"), t("chat.fileUploadFailed"));
    } finally {
      setIsSendingMedia(false);
    }
  }, [canSendMessage, threadId, token, currentUserId, replyingTo, sendChatMedia, t, alertError]);

  // --- Microphone recording ---
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsTranscribing(true);
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;
        if (uri && token) {
          const text = await transcribeWithWhisper(uri, token, API_CONFIG.BASE_URL);
          if (text) {
            setMessageText((prev) => (prev ? `${prev} ${text}` : text));
          } else {
            alertError(t("common.error"), t("chat.transcriptionFailed"));
          }
        }
      } catch {
        alertError(t("common.error"), t("chat.recordingFailed"));
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    // Start recording
    try {
      const mic = await Audio.requestPermissionsAsync();
      if (mic.status !== "granted") {
        alertError(t("common.error"), t("chat.microphonePermission"));
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      alertError(t("common.error"), t("chat.recordingFailed"));
    }
  }, [isRecording, token, t, alertError]);

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
      async () => { await deleteChatMessage({ messageId: msgId, threadId }); },
      undefined,
      t("common.delete"),
      t("common.cancel"),
    );
  }, [contextMenuMessage, threadId, hideContextMenu, deleteChatMessage, confirm, t]);

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

  const displayMessages = useMemo<Array<ChatMessageItemDto | OptimisticMessage>>(() => {
    if (optimisticMessages.length === 0) return sortedMessages;
    const confirmedTexts = new Set(
      sortedMessages.filter((m) => m.senderUserId === currentUserId).map((m) => m.text),
    );
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
    if (!currentThread?.participants || !Array.isArray(currentThread.participants)) return map;
    currentThread.participants.forEach((p) => {
      if (p.userId) {
        map.set(p.userId.trim().toLowerCase(), p);
        map.set(p.userId, p);
      }
    });
    return map;
  }, [currentThread?.participants]);

  const [hasRefetched, setHasRefetched] = useState(false);
  useEffect(() => {
    if (messages && messages.length > 0 && currentThread && !hasRefetched) {
      const messageSenderIds = new Set<string>(messages.map((m) => m.senderUserId));
      const participantIds = new Set(currentThread.participants.map((p) => p.userId));
      const missing = Array.from(messageSenderIds).filter((id) => !participantIds.has(id));
      if (missing.length > 0) {
        setHasRefetched(true);
        refetchThreads().catch(() => setHasRefetched(false));
      }
    }
  }, [messages, currentThread?.participants, refetchThreads, hasRefetched]);

  useEffect(() => {
    if (sortedMessages && sortedMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
    }
  }, [sortedMessages]);

  useEffect(() => {
    if (optimisticMessages.length > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [optimisticMessages]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.screenBg }}>
        <ActivityIndicator size="large" color={brandColor} />
      </View>
    );
  }

  if (!currentThread) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.screenBg }}>
        <Text style={{ color: mutedTextColor }}>{t("chat.threadNotFound")}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text style={{ color: brandColor }}>{t("common.goBack")}</Text>
        </TouchableOpacity>
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
          {currentThread.participants.length > 0 ? (
            <View className="flex-1 ml-2 flex-row items-center" pointerEvents="box-none">
              <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                {currentThread.participants.slice(0, 2).map((participant, idx) => (
                  <View
                    key={participant.userId}
                    className="w-10 h-10 rounded-full overflow-hidden items-center justify-center"
                    style={{ marginLeft: idx > 0 ? -12 : 0, zIndex: 2 - idx, borderWidth: 2, borderColor: colors.borderColor, backgroundColor: colors.cardBg2 }}
                  >
                    <OwnerAvatar
                      ownerId={participant.userId}
                      ownerType={ImageOwnerType.User}
                      fallbackUrl={participant.imageUrl}
                      imageClassName="w-full h-full"
                      iconSource={participant.userType === UserType.BarberStore ? "store" : participant.userType === UserType.FreeBarber ? "account-supervisor" : "account"}
                      iconSize={20}
                      iconColor={isDark ? "white" : colors.sectionHeaderText}
                      iconContainerClassName="bg-transparent"
                    />
                  </View>
                ))}
                {currentThread.participants.length > 2 && (
                  <View className="w-10 h-10 rounded-full items-center justify-center" style={{ marginLeft: -12, zIndex: 0, borderWidth: 2, borderColor: colors.borderColor, backgroundColor: colors.cardBg2 }}>
                    <Text className="text-xs font-century-gothic-sans-bold" style={{ color: colors.sectionHeaderText }}>
                      +{currentThread.participants.length - 2}
                    </Text>
                  </View>
                )}
              </View>
              <View className="ml-3 flex-1" style={{ minWidth: 0 }}>
                <Text className="text-base font-century-gothic" numberOfLines={1} style={{ color: colors.sectionHeaderText }}>
                  {currentThread.participants.map((p) => p.displayName).join(", ")}
                </Text>
                {currentThread.status !== null && currentThread.status !== undefined && (
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
          {/* Three-dot header menu */}
          <TouchableOpacity
            onPress={() => setShowHeaderMenu(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="ml-2 w-9 h-9 items-center justify-center rounded-full"
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
              {currentThread.participants.length > 0 && (
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

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messageRows}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: 16, gap: 12, backgroundColor: colors.screenBg }}
        inverted
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onScrollToIndexFailed={() => {
          setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: false }), 100);
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
                      imageClassName="w-full h-full"
                      iconSource={displayInfo.userType === UserType.BarberStore ? "store" : displayInfo.userType === UserType.FreeBarber ? "account-supervisor" : "account"}
                      iconSize={20}
                      iconColor={isDark ? "white" : colors.sectionHeaderText}
                      iconContainerClassName="bg-transparent"
                    />
                  </View>
                )}

                <View className={`max-w-[82%] ${isMe ? "items-end" : "items-start"}`} style={{ flexShrink: 1, minWidth: 0 }}>
                  <View
                    className={`rounded-2xl px-4 py-2.5 ${isMe ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                    style={[{
                      flexShrink: 1,
                      backgroundColor: isMe ? bubbleMeBg : bubbleOtherBg,
                      borderWidth: isMe ? 0 : 1,
                      borderColor: isMe ? "transparent" : bubbleOtherBorder,
                      ...(isMe ? Platform.select({ ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 }, android: { elevation: 2 } }) : {}),
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
                      <TouchableOpacity activeOpacity={0.85} onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}>
                        <Image
                          source={{ uri: message.mediaUrl }}
                          style={{ width: 220, height: 160, borderRadius: 12 }}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : msgType === ChatMessageType.Location && message.mediaUrl ? (
                      /* Location message */
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={async () => {
                          const coords = message.mediaUrl!.replace("geo:", "").split(",");
                          if (coords.length === 2) {
                            const lat = coords[0];
                            const lng = coords[1];
                            const nativeUrl = Platform.OS === "ios"
                              ? `maps://?q=${lat},${lng}`
                              : `geo:${lat},${lng}?q=${lat},${lng}`;
                            const webUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                            const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
                            Linking.openURL(canOpen ? nativeUrl : webUrl).catch(() => {
                              Linking.openURL(webUrl);
                            });
                          }
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
                      /* File message */
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
                      >
                        <View className="flex-row items-center gap-2.5 px-1 py-1" style={{ maxWidth: 220 }}>
                          <View
                            className="w-10 h-10 rounded-xl items-center justify-center"
                            style={{ backgroundColor: isMe ? "rgba(255,255,255,0.2)" : softBrandBg, flexShrink: 0 }}
                          >
                            <Icon source="file-document-outline" size={22} color={isMe ? "white" : brandColor} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              className="text-sm font-century-gothic-sans-medium"
                              style={{ color: isMe ? "white" : colors.sectionHeaderText }}
                              numberOfLines={2}
                            >
                              {message.text}
                            </Text>
                            <Text className="text-[11px] font-century-gothic mt-0.5" style={{ color: isMe ? "rgba(255,255,255,0.65)" : mutedTextColor }}>
                              {t("chat.tapToOpen")}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      /* Text message */
                      <Text
                        className={`text-sm ${isMe ? "text-right" : "text-left"} font-century-gothic`}
                        style={{ flexWrap: "wrap", flexShrink: 1, color: isMe ? "#ffffff" : colors.sectionHeaderText }}
                      >
                        {message.text}
                      </Text>
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
          typingUsers.size > 0 ? (
            <View className="flex-row items-center px-4 py-2">
              <Text className="text-xs italic" style={{ color: mutedTextColor }}>
                {Array.from(typingUsers).map((uid) => currentThread.participants.find((p) => p.userId === uid)?.displayName || t("chat.someone")).join(", ")}{" "}
                {t("chat.typing")}
              </Text>
            </View>
          ) : null
        }
      />

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
        {!canSendMessage && isConnected && (
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
                {replyingTo.text || (replyingTo.messageType === ChatMessageType.Image ? t("chat.photo") : replyingTo.messageType === ChatMessageType.Location ? t("chat.location") : replyingTo.messageType === ChatMessageType.File ? t("chat.file") : "")}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon source="close" size={18} color={mutedTextColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* Main input row */}
        <View className="flex-row items-end gap-2 px-4 pt-3">
          {/* Text input */}
          <View
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
              placeholder={canSendMessage ? t("chat.messagePlaceholder") : t("chat.messageCannotBeSentPlaceholder")}
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
          </View>

          {/* Mic or Send button */}
          {messageText.trim() ? (
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
        </View>
        {isSendingMedia && (
          <View className="mx-4 mt-2 flex-row items-center gap-2">
            <ActivityIndicator size="small" color={brandColor} />
            <Text className="text-xs" style={{ color: mutedTextColor }}>{t("chat.uploadingMedia")}</Text>
          </View>
        )}
      </View>

      {/* Long-press context menu overlay */}
      {contextMenuMessage && (
        <Modal transparent animationType="none" onRequestClose={hideContextMenu}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={hideContextMenu}>
            <Animated.View
              style={{
                position: "absolute",
                bottom: insets.bottom + 80,
                alignSelf: "center",
                width: 220,
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: isDark ? "#1e293b" : "#ffffff",
                transform: [{ scale: contextMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                opacity: contextMenuAnim,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              {/* Reply option */}
              <TouchableOpacity
                onPress={handleReplyFromMenu}
                className="flex-row items-center gap-3 px-5 py-4"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
                activeOpacity={0.7}
              >
                <Icon source="reply" size={22} color={brandColor} />
                <Text className="text-base font-century-gothic-sans-medium" style={{ color: colors.sectionHeaderText }}>{t("chat.reply")}</Text>
              </TouchableOpacity>

              {/* Delete option (any participant can delete for themselves) */}
              <TouchableOpacity
                onPress={handleDeleteFromMenu}
                className="flex-row items-center gap-3 px-5 py-4"
                activeOpacity={0.7}
              >
                <Icon source="delete-outline" size={22} color="#ef4444" />
                <Text className="text-base font-century-gothic-sans-medium" style={{ color: "#ef4444" }}>{t("chat.delete")}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Modal>
      )}

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
          {currentThread?.participants.map((participant) => {
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
