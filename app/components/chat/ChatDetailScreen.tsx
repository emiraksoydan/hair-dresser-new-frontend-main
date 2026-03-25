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
} from "react-native";
import { Text } from "../common/Text";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { Icon } from "react-native-paper";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  useGetChatMessagesByThreadQuery,
  useSendChatMessageMutation,
  useSendChatMessageByThreadMutation,
  useMarkChatThreadReadMutation,
  useGetChatThreadsQuery,
  useNotifyTypingMutation,
} from "../../store/api";
import {
  ChatMessageItemDto,
  ChatMessageDto,
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

interface ChatDetailScreenProps {
  threadId: string; // ThreadId ile çalışıyoruz (hem randevu hem favori thread'leri için)
}

/**
 * Reusable chat detail screen component
 * Used by all user types (Customer, BarberStore, FreeBarber)
 * Works with both appointment and favorite threads
 */
export const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({
  threadId,
}) => {
  const { colors, isDark } = useTheme();
  const router = useSafeNavigation();
  const [messageText, setMessageText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const { userId: currentUserId, userType: currentUserType } = useAuth();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { t } = useLanguage();
  const { alertError } = useAlert();
  const participantsSheetRef = useRef<BottomSheetModal>(null);
  type OptimisticMessage = ChatMessageItemDto & { isPending: true };
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);

  // SignalR bağlantı kontrolü (V2 - optimized)
  const { isConnected, connectionRef } = useSignalRV2();

  const {
    data: threads,
    isLoading: isLoadingThreads,
    refetch: refetchThreads,
  } = useGetChatThreadsQuery();
  const currentThread = useMemo(() => {
    return threads?.find((t) => t.threadId === threadId);
  }, [threads, threadId]);

  // Thread bulunamadı hatası için kontrol
  useEffect(() => {
    if (!isLoadingThreads && threads && !currentThread && threadId) {
      // Thread bulunamadı, yeniden yükle
      setTimeout(() => {
        refetchThreads();
      }, 1000);
    }
  }, [isLoadingThreads, threads, currentThread, threadId, refetchThreads]);

  // Mesajları ThreadId ile getir
  const {
    data: messages,
    isLoading,
    refetch,
  } = useGetChatMessagesByThreadQuery({ threadId }, { skip: !threadId });

  // Mesaj gönderme kontrolleri
  const canSendMessage = useMemo(() => {
    if (!currentThread) return false;
    if (!isConnected) return false; // SignalR bağlantısı yoksa mesaj gönderilemez

    if (!currentThread.appointmentId) {
      return true;
    }

    if (currentThread.status === null || currentThread.status === undefined) {
      return false;
    }

    // Appointment thread: backend görünür kıldıysa gönderime izin ver (favori kontrolü backend'de)
    return (
      currentThread.status === AppointmentStatus.Pending ||
      currentThread.status === AppointmentStatus.Approved
    );
  }, [currentThread, isConnected]);

  // Mesaj gönderme mutation'ları
  const [sendMessageByAppointment, { isLoading: isSendingByAppt }] =
    useSendChatMessageMutation();
  const [sendMessageByThread, { isLoading: isSendingByThread }] =
    useSendChatMessageByThreadMutation();
  const isSending = isSendingByAppt || isSendingByThread;

  const [markRead] = useMarkChatThreadReadMutation();
  const [notifyTyping] = useNotifyTypingMutation();
  const markReadInFlightRef = useRef(false);

  // Typing indicator için debounce
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingNotificationRef = useRef(false);

  // Otomatik read için debounce
  const autoReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const markThreadRead = useCallback(async () => {
    if (!threadId || markReadInFlightRef.current) return;
    markReadInFlightRef.current = true;

    // NO optimistic update - backend SignalR events are source of truth
    // Backend will send badge.updated event with correct counts
    await markRead(threadId);
    // Error handling is silent - backend events are source of truth

    markReadInFlightRef.current = false;
  }, [threadId, markRead]);

  // Mark thread as read when opened
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

  // ÖNEMLİ: ChatDetailScreen açıkken yeni mesaj geldiğinde otomatik read yap
  // Eğer kullanıcı sohbet odasında ise, mesaj geldiğinde otomatik okundu işaretlenmeli
  // Debounce ile gereksiz istekleri önle (500ms gecikme ile)
  useEffect(() => {
    const connection = connectionRef?.current;
    if (!connection || !threadId || !currentUserId) return;

    const handleNewMessage = (dto: ChatMessageDto) => {
      // Bu thread için gelen mesaj mı?
      if (dto.threadId !== threadId) return;

      // Kendi gönderdiğimiz mesaj değilse (başkasından geldiyse) otomatik read yap (debounce ile)
      if (dto.senderUserId !== currentUserId) {
        // Önceki timeout'u temizle
        if (autoReadTimeoutRef.current) {
          clearTimeout(autoReadTimeoutRef.current);
        }
        // 500ms sonra read yap (birden fazla mesaj gelirse sadece son mesajdan sonra read yapılır)
        autoReadTimeoutRef.current = setTimeout(() => {
          markThreadRead().catch(() => {
            // Hata durumunda sessizce devam et
          });
        }, 500);
      }
    };

    connection.on("chat.message", handleNewMessage);

    const handleMessageRemoved = (data: { threadId: string; messageId: string }) => {
      if (data.threadId !== threadId) return;
      // Mesaj moderasyon tarafından silindi - listeyi yenile
      refetch();
    };

    connection.on("chat.messageRemoved", handleMessageRemoved);

    return () => {
      if (connection) {
        connection.off("chat.message", handleNewMessage);
        connection.off("chat.messageRemoved", handleMessageRemoved);
      }
      // Cleanup: timeout'u temizle
      if (autoReadTimeoutRef.current) {
        clearTimeout(autoReadTimeoutRef.current);
        autoReadTimeoutRef.current = null;
      }
    };
  }, [threadId, currentUserId, markThreadRead, connectionRef]);

  // Typing indicator timeout
  useEffect(() => {
    if (typingUsers.size > 0) {
      const timeout = setTimeout(() => {
        setTypingUsers(new Set());
      }, 3000); // 3 saniye sonra typing indicator'ü kaldır
      return () => clearTimeout(timeout);
    }
  }, [typingUsers]);

  // Typing indicator SignalR event handler
  useEffect(() => {
    const connection = connectionRef?.current;
    if (!connection) return;

    const handleTyping = (data: {
      threadId: string;
      typingUserId: string;
      typingUserName: string;
      isTyping: boolean;
    }) => {
      if (data.threadId !== threadId) return;
      if (data.typingUserId === currentUserId) return; // Kendi typing'ini gösterme

      if (data.isTyping) {
        setTypingUsers((prev) => new Set([...prev, data.typingUserId]));
      } else {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.typingUserId);
          return newSet;
        });
      }
    };

    connection.on("chat.typing", handleTyping);

    return () => {
      if (connection) {
        connection.off("chat.typing", handleTyping);
      }
    };
  }, [threadId, currentUserId]); // connectionRef bir ref olduğu için dependency'ye eklenmez

  // Mesaj yazarken typing indicator gönder
  const insets = useSafeAreaInsets();

  const handleTextChange = useCallback(
    (text: string) => {
      setMessageText(text);

      // Typing indicator gönder (debounce ile)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      const shouldNotifyTyping =
        text.trim().length > 0 && canSendMessage && isConnected;

      if (shouldNotifyTyping && !lastTypingNotificationRef.current) {
        // Typing başladı
        notifyTyping({ threadId, isTyping: true });
        lastTypingNotificationRef.current = true;
      }

      typingTimeoutRef.current = setTimeout(() => {
        // 2 saniye sonra typing bitti
        if (lastTypingNotificationRef.current) {
          notifyTyping({ threadId, isTyping: false });
          lastTypingNotificationRef.current = false;
        }
      }, 2000);
    },
    [threadId, canSendMessage, isConnected, notifyTyping],
  );

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !threadId || isSending) return;

    // Kontroller
    if (!canSendMessage) {
      if (!isConnected) {
        alertError(t("chat.connectionError"), t("chat.connectionErrorMessage"));
      } else {
        alertError(t("chat.messageCannotBeSent"), t("chat.cannotSendToThread"));
      }
      return;
    }

    // Typing indicator'ü kapat
    if (lastTypingNotificationRef.current) {
      notifyTyping({ threadId, isTyping: false });
      lastTypingNotificationRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const text = messageText.trim();
    const tempId = `opt-${Date.now()}`;

    // Optimistic update: show message immediately before backend confirms
    const optimisticMsg: OptimisticMessage = {
      messageId: tempId,
      senderUserId: currentUserId!,
      text,
      createdAt: new Date().toISOString(),
      isPending: true,
    };
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setMessageText("");

    // Randevu thread'i ise appointmentId ile gönder, favori thread ise threadId ile
    let sendResult;
    if (currentThread?.appointmentId) {
      sendResult = await sendMessageByAppointment({
        appointmentId: currentThread.appointmentId,
        text,
      });
    } else {
      sendResult = await sendMessageByThread({ threadId, text });
    }

    // Remove the optimistic message (real message now in RTK cache, or error)
    setOptimisticMessages((prev) => prev.filter((m) => m.messageId !== tempId));

    if ("error" in sendResult) {
      setMessageText(text); // Restore text on error
      const errorMessage =
        (sendResult.error as any)?.data?.message || t("chat.messageSendFailed");
      alertError(t("common.error"), errorMessage);
    }
    // RTK Query otomatik olarak cache'i güncelleyecek
  }, [
    messageText,
    threadId,
    isSending,
    canSendMessage,
    isConnected,
    currentUserId,
    currentThread,
    sendMessageByThread,
    sendMessageByAppointment,
    notifyTyping,
    t,
    alertError,
  ]);

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // Messages from backend are oldest first, newest last
  // Reverse for inverted FlatList: newest first (will appear at bottom visually)
  // WhatsApp style: oldest at top, newest at bottom, new messages added at bottom
  const sortedMessages = useMemo(() => {
    if (!messages) return [];
    // Array kontrolü ekle - iterator hatasını önlemek için
    if (!Array.isArray(messages)) return [];
    try {
      return [...messages].reverse();
    } catch {
      return [];
    }
  }, [messages]);

  // Combine optimistic (pending) messages with real messages for display
  // FlatList is inverted so index 0 = visual bottom; optimistic (newest) go first
  const displayMessages = useMemo<Array<ChatMessageItemDto | OptimisticMessage>>(() => {
    if (optimisticMessages.length === 0) return sortedMessages;
    return [...[...optimisticMessages].reverse(), ...sortedMessages];
  }, [optimisticMessages, sortedMessages]);

  // Participants'ı Map'e çevir - hızlı lookup için (senderParticipant undefined sorununu çözer)
  // Normalize edilmiş userId ile lookup yapıyoruz (trim, toLowerCase) - backend'den gelen verilerde farklılık olabilir
  const participantsMap = useMemo(() => {
    if (
      !currentThread?.participants ||
      !Array.isArray(currentThread.participants)
    ) {
      return new Map<string, ChatThreadParticipantDto>();
    }
    const map = new Map<string, ChatThreadParticipantDto>();
    currentThread.participants.forEach((p) => {
      if (p.userId) {
        // Normalize edilmiş key ile kaydet
        const normalizedKey = p.userId.trim().toLowerCase();
        map.set(normalizedKey, p);
        // Orijinal key ile de kaydet (her iki durumda da çalışsın)
        map.set(p.userId, p);
      }
    });
    return map;
  }, [currentThread?.participants]);

  // Thread participants'ı mesajlar geldiğinde güncelle (yeni mesaj gönderen kullanıcılar için)
  const [hasRefetched, setHasRefetched] = useState(false);

  useEffect(() => {
    if (messages && messages.length > 0 && currentThread && !hasRefetched) {
      // Mesajlardaki tüm unique senderUserId'leri topla
      const messageSenderIds = new Set<string>();
      messages.forEach((msg) => {
        if (msg.senderUserId) {
          messageSenderIds.add(msg.senderUserId);
        }
      });

      // Thread participants'ında olmayan sender'lar varsa thread'i refetch et
      const participantIds = new Set(
        currentThread.participants.map((p) => p.userId),
      );
      const missingSenders = Array.from(messageSenderIds).filter(
        (id) => !participantIds.has(id),
      );

      if (missingSenders.length > 0) {
        setHasRefetched(true);
        refetchThreads().catch(() => {
          setHasRefetched(false);
        });
      }
    }
  }, [messages, currentThread?.participants, refetchThreads, hasRefetched]);

  // Auto-scroll to bottom when new messages arrive (inverted FlatList: scroll to index 0 = visual bottom)
  useEffect(() => {
    if (sortedMessages && sortedMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [sortedMessages]);

  // Optimistic mesaj eklenince hemen scroll et (ilk mesaj pozisyon hatasını önler)
  useEffect(() => {
    if (optimisticMessages.length > 0) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [optimisticMessages]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!currentThread) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-gray-400">{t("chat.threadNotFound")}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-green-500">{t("common.goBack")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header with Participants */}
      <SafeAreaView style={{ backgroundColor: colors.headerBg }}>
        <View className="px-4 py-3 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-0 flex-row items-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon source="chevron-left" size={28} color={colors.sectionHeaderText} />
          </TouchableOpacity>
          {currentThread.participants.length > 0 && (
            <TouchableOpacity
              className="flex-1 ml-2 flex-row items-center"
              activeOpacity={0.7}
              onPress={() => participantsSheetRef.current?.present()}
            >
              {/* Overlapping avatarlar */}
              <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                {currentThread.participants.slice(0, 2).map((participant, idx) => (
                  <View
                    key={participant.userId}
                    className="w-10 h-10 rounded-full overflow-hidden items-center justify-center"
                    style={{
                      marginLeft: idx > 0 ? -12 : 0,
                      zIndex: 2 - idx,
                      borderWidth: 2,
                      borderColor: colors.borderColor,
                      backgroundColor: colors.cardBg2,
                    }}
                  >
                    <OwnerAvatar
                      ownerId={participant.userId}
                      ownerType={ImageOwnerType.User}
                      fallbackUrl={participant.imageUrl}
                      imageClassName="w-full h-full"
                      iconSource={
                        participant.userType === UserType.BarberStore
                          ? "store"
                          : participant.userType === UserType.FreeBarber
                            ? "account-supervisor"
                            : "account"
                      }
                      iconSize={20}
                      iconColor={isDark ? 'white' : colors.sectionHeaderText}
                      iconContainerClassName="bg-transparent"
                    />
                  </View>
                ))}
                {currentThread.participants.length > 2 && (
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ marginLeft: -12, zIndex: 0, borderWidth: 2, borderColor: colors.borderColor, backgroundColor: colors.cardBg2 }}
                  >
                    <Text className="text-xs font-century-gothic-sans-bold" style={{ color: colors.sectionHeaderText }}>
                      +{currentThread.participants.length - 2}
                    </Text>
                  </View>
                )}
              </View>

              {/* İsim ve durum */}
              <View className="ml-3 flex-1" style={{ minWidth: 0 }}>
                <Text
                  className="text-base font-century-gothic"
                  numberOfLines={1}
                  style={{ color: colors.sectionHeaderText }}
                >
                  {currentThread.participants.map(p => p.displayName).join(', ')}
                </Text>
                {currentThread.status !== null &&
                  currentThread.status !== undefined && (
                    <Text className="text-gray-400 text-xs mt-0.5">
                      {currentThread.status === AppointmentStatus.Approved
                        ? t("appointment.status.approved")
                        : currentThread.status === AppointmentStatus.Pending
                          ? t("appointment.status.pending")
                          : currentThread.status === AppointmentStatus.Completed
                            ? t("appointment.status.completed")
                            : currentThread.status === AppointmentStatus.Cancelled
                              ? t("appointment.status.cancelled")
                              : currentThread.status === AppointmentStatus.Rejected
                                ? t("appointment.status.rejected")
                                : currentThread.status === AppointmentStatus.Unanswered
                                  ? t("appointment.status.unanswered")
                                  : ""}
                    </Text>
                  )}
              </View>
              <Icon source="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Messages List - WhatsApp style: inverted FlatList for bottom-aligned messages */}
      <FlatList
        ref={flatListRef}
        data={displayMessages}
        keyExtractor={(item) => item.messageId}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        inverted={true}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to end if index scroll fails
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
          }, 100);
        }}
        renderItem={({ item }: { item: ChatMessageItemDto | OptimisticMessage }) => {
          const isMe = item.senderUserId === currentUserId;
          const isPending = (item as OptimisticMessage).isPending === true;

          // Participants Map'inden lookup
          let senderParticipant: ChatThreadParticipantDto | null = null;
          if (item.senderUserId) {
            const normalizedKey = item.senderUserId.trim().toLowerCase();
            senderParticipant =
              participantsMap.get(normalizedKey) ||
              participantsMap.get(item.senderUserId) ||
              null;
          }

          // Fallback: Eğer participant bulunamadıysa, mesajdan bilgi oluştur
          const displayInfo = senderParticipant || {
            userId: item.senderUserId,
            displayName: item.senderUserId?.substring(0, 8) || t("favorites.unknown"),
            userType: UserType.Customer, // Default
            imageUrl: null,
            barberType: null,
          };

          return (
            <View
              className={`flex-row items-start gap-2 mb-3 ${isMe ? "justify-end" : "justify-start"} ${isPending ? "opacity-70" : ""}`}
              style={{ flexShrink: 1 }}
            >
              {!isMe && (
                <View
                  className="w-10 h-10 rounded-full overflow-hidden items-center justify-center"
                  style={{ flexShrink: 0, backgroundColor: colors.cardBg2 }}
                >
                  <OwnerAvatar
                    ownerId={displayInfo.userId}
                    ownerType={ImageOwnerType.User}
                    fallbackUrl={displayInfo.imageUrl}
                    imageClassName="w-full h-full"
                    iconSource={
                      displayInfo.userType === UserType.BarberStore
                        ? "store"
                        : displayInfo.userType === UserType.FreeBarber
                          ? "account-supervisor"
                          : "account"
                    }
                    iconSize={20}
                    iconColor={isDark ? 'white' : colors.sectionHeaderText}
                    iconContainerClassName="bg-transparent"
                  />
                </View>
              )}

              <View
                className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}
                style={{ flexShrink: 1, minWidth: 0 }}
              >
                <View
                  className={`rounded-2xl px-4 py-2.5 ${isMe ? "bg-green-600 rounded-tr-sm" : "rounded-tl-sm"}`}
                  style={[{ flexShrink: 1 }, !isMe ? { backgroundColor: colors.cardBg2 } : undefined]}
                >
                  {!isMe && (
                    <View className="flex-row items-center gap-1.5 mb-1.5 flex-wrap">
                      <Text className="text-gray-300 text-xs font-century-gothic">
                        {displayInfo.displayName}
                        {senderParticipant &&
                          senderParticipant.userType !== currentUserType &&
                          ` • ${senderParticipant.userType === UserType.BarberStore
                            ? t("labels.store")
                            : senderParticipant.userType === UserType.FreeBarber
                              ? t("labels.freeBarber")
                              : t("card.customer")}`}
                      </Text>
                      {!senderParticipant && (
                        <Text className="text-gray-500 text-xs">
                          ({t("common.loading")})
                        </Text>
                      )}
                    </View>
                  )}
                  <Text
                    className={`text-white text-sm ${isMe ? "text-right" : "text-left"} font-century-gothic`}
                    style={{ flexWrap: "wrap", flexShrink: 1 }}
                  >
                    {item.text}
                  </Text>
                </View>
                <View className={`flex-row items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"} px-2`}>
                  {isPending && (
                    <Icon source="clock-outline" size={11} color={colors.textSecondary} />
                  )}
                  {isMe && !isPending && (
                    <Icon
                      source={(item as ChatMessageItemDto).isFullyRead ? "check-all" : "check"}
                      size={13}
                      color={(item as ChatMessageItemDto).isFullyRead ? "#22c55e" : colors.textSecondary}
                    />
                  )}
                  <Text
                    className={`text-gray-500 text-xs ${isMe ? "text-right" : "text-left"} ${isPending ? "opacity-60" : ""}`}
                  >
                    {formatMessageTime(item.createdAt)}
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
                    iconSource={
                      currentUserType === UserType.BarberStore
                        ? "store"
                        : currentUserType === UserType.FreeBarber
                          ? "account-supervisor"
                          : "account"
                    }
                    iconSize={20}
                    iconColor={isDark ? 'white' : colors.sectionHeaderText}
                    iconContainerClassName="bg-transparent"
                  />
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400">{t("chat.noMessagesYet")}</Text>
            <Text className="text-gray-500 text-xs mt-2">
              {t("chat.sendFirstMessage")}
            </Text>
          </View>
        }
        ListHeaderComponent={
          typingUsers.size > 0 ? (
            <View className="flex-row items-center px-4 py-2">
              <Text className="text-gray-500 text-xs italic">
                {Array.from(typingUsers)
                  .map((userId) => {
                    const user = currentThread.participants.find(
                      (p) => p.userId === userId,
                    );
                    return user?.displayName || t("chat.someone");
                  })
                  .join(", ")}{" "}
                {t("chat.typing")}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View
        className="px-4 py-3"
        style={{ backgroundColor: colors.headerBg, borderTopWidth: 1, borderTopColor: colors.borderColor, paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {!isConnected && (
          <View className="bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2 mb-2">
            <Text className="text-red-400 text-xs text-center">
              {t("chat.serverConnectionError")}
            </Text>
          </View>
        )}
        {!canSendMessage && isConnected && (
          <View className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2 mb-2">
            <Text className="text-yellow-400 text-xs text-center">
              {t("chat.cannotSendToThread")}
            </Text>
          </View>
        )}
        <View className="flex-row items-center gap-2">
          <TextInput
            value={messageText}
            onChangeText={handleTextChange}
            placeholder={
              canSendMessage
                ? t("chat.messagePlaceholder")
                : t("chat.messageCannotBeSentPlaceholder")
            }
            placeholderTextColor={colors.textSecondary}
            className="flex-1 rounded-full px-4 py-2 font-century-gothic"
            multiline
            maxLength={500}
            editable={canSendMessage}
            style={{
              fontFamily: Platform.OS === "ios" ? "CenturyGothic" : "CenturyGothic",
              backgroundColor: colors.cardBg2,
              color: colors.sectionHeaderText,
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() || isSending || !canSendMessage}
            className={`w-10 h-10 rounded-full items-center justify-center ${messageText.trim() && canSendMessage ? "bg-green-600" : ""}`}
            style={!(messageText.trim() && canSendMessage) ? { backgroundColor: colors.cardBg2 } : undefined}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Icon source="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

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
          <Text className="text-lg font-century-gothic-sans-bold mb-4" style={{ color: colors.sectionHeaderText }}>
            {t('chat.participants')}
          </Text>
          {currentThread?.participants.map((participant) => {
            const getLabel = () => {
              if (participant.userType === currentUserType) return null;
              if (participant.userType === UserType.BarberStore) return t('labels.store');
              if (participant.userType === UserType.FreeBarber) return t('labels.freeBarber');
              if (participant.userType === UserType.Customer) return t('card.customer');
              return null;
            };
            const getBarberLabel = () => {
              if (participant.barberType === undefined || participant.barberType === null) return null;
              if (participant.userType === UserType.FreeBarber) {
                return participant.barberType === BarberType.MaleHairdresser
                  ? t('barberType.maleHairdresserShort')
                  : t('barberType.femaleHairdresserShort');
              }
              if (participant.userType === UserType.BarberStore) {
                if (participant.barberType === BarberType.MaleHairdresser) return t('barberType.maleHairdresserOf');
                if (participant.barberType === BarberType.FemaleHairdresser) return t('barberType.femaleHairdresserOf');
                return t('barberType.beautySalon');
              }
              return null;
            };
            const label = getLabel();
            const barberLabel = getBarberLabel();
            const labelText = [label, barberLabel].filter(Boolean).join(' • ');

            return (
              <View key={participant.userId} className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-full overflow-hidden items-center justify-center" style={{ flexShrink: 0, backgroundColor: colors.cardBg2 }}>
                  <OwnerAvatar
                    ownerId={participant.userId}
                    ownerType={ImageOwnerType.User}
                    fallbackUrl={participant.imageUrl}
                    imageClassName="w-full h-full"
                    iconSource={
                      participant.userType === UserType.BarberStore
                        ? "store"
                        : participant.userType === UserType.FreeBarber
                          ? "account-supervisor"
                          : "account"
                    }
                    iconSize={24}
                    iconColor={isDark ? 'white' : colors.sectionHeaderText}
                    iconContainerClassName="bg-transparent"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-base font-century-gothic-sans-bold" style={{ color: colors.sectionHeaderText }}>
                    {participant.displayName}
                  </Text>
                  {labelText ? (
                    <Text className="text-gray-400 text-sm font-century-gothic mt-0.5">
                      {labelText}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
};
