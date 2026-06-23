/**
 * Shared message thread list component
 * Used across different user type message pages
 */

import { Icon } from "react-native-paper";
import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Text } from '../common/Text';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useFavoriteHeartPulse } from '../common/useFavoriteHeartPulse';
import { AnimatedLegendList } from '../common/AnimatedLegendList';
import { ScrollStackItem } from '../common/ScrollStackItem';
import { useSafeNavigation } from '../../hook/useSafeNavigation';

import { api, useGetChatThreadsQuery, useToggleFavoriteMutation } from '../../store/api';
import { useAppDispatch } from '../../store/hook';
import { ChatThreadListItemDto, ChatThreadParticipantDto, AppointmentStatus, UserType, BarberType, ImageOwnerType, FavoriteTargetType } from '../../types';
import { SkeletonComponent } from '../common/skeleton';
import { UnifiedStateWrapper } from '../common/UnifiedStateManager';
import { OwnerAvatar } from '../common/owneravatar';
import { useFormatTime } from '../../utils/time/time-formatter';
import { getAppointmentStatusColor } from '../../utils/appointment/appointment-helpers';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';
import { useAuth } from '../../hook/useAuth';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';
import { badgeCountLabel } from '../../utils/badgeDisplay';
import { getChatAccent, getChatListRowStyle } from '../../constants/chatTheme';
import { CHAT_THREADS_PAGE_SIZE, CHAT_THREADS_QUERY, isThreadVisibleInMainList } from '../../utils/chat/chatThreadStrip';

const CHAT_AVATAR_PLACEHOLDER = require('../../../assets/images/profileempty.webp');

/** Kısıtlı favori satırında: kalp tıklanınca her zaman “favoriye ekle” animasyonu. */
const RestrictedFavoriteHeartAction = React.memo(function RestrictedFavoriteHeartAction({
  busy,
  hasUnread,
  mutedTextColor,
  unreadAccent,
  onPress,
}: {
  busy: boolean;
  hasUnread: boolean;
  mutedTextColor: string;
  unreadAccent: string;
  onPress: () => void;
}) {
  const { animatedStyle, bump } = useFavoriteHeartPulse();
  return (
    <TouchableOpacity
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      disabled={busy}
      onPress={() => {
        bump(true);
        onPress();
      }}
      className="items-center justify-center"
    >
      {busy ? (
        <ActivityIndicator size="small" color={unreadAccent} />
      ) : (
        <Animated.View style={animatedStyle}>
          <Icon source="heart-outline" size={22} color={hasUnread ? unreadAccent : mutedTextColor} />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
});

interface MessageThreadListProps {
    routePrefix: string; // e.g., '/(customertabs)/(messages)' or '/(barberstoretabs)/(messages)'
    iconSource: string; // Icon name for the avatar (react-native-paper icon name)
}

const THREAD_ROW_STRIDE = 152;
/** RN `onEndReached` ilk layout'ta yanlış tetiklenebilir — footer spinner flash'ını önler. */
const END_REACHED_GRACE_MS = 450;

export const MessageThreadList: React.FC<MessageThreadListProps> = ({ routePrefix, iconSource }) => {
    const router = useSafeNavigation();
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const scrollY = useSharedValue(0);
    const onThreadScroll = useAnimatedScrollHandler({
        onScroll: (e) => {
            scrollY.value = e.contentOffset.y / THREAD_ROW_STRIDE;
        },
    });
    const { token: authToken, userType: currentUserType } = useAuth();
    const dispatch = useAppDispatch();
    const { data: threads, isLoading, refetch, error, isError } = useGetChatThreadsQuery(
        CHAT_THREADS_QUERY,
        { skip: !authToken },
    );
    const [toggleFavorite, { isLoading: favoriteToggleBusy }] = useToggleFavoriteMutation();
    const formatTime = useFormatTime();
    const [isPullRefreshing, setIsPullRefreshing] = useState(false);

    // Infinite scroll state
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const hasMoreRef = useRef(true);
    const lastLoadedBeforeRef = useRef<string | null>(null);
    const suppressEndReachedUntilMsRef = useRef(0);
    const bumpEndReachedGrace = useCallback(() => {
        suppressEndReachedUntilMsRef.current = Date.now() + END_REACHED_GRACE_MS;
    }, []);

    useEffect(() => {
        bumpEndReachedGrace();
    }, [bumpEndReachedGrace]);

    const loadOlderThreads = useCallback(async () => {
        if (Date.now() < suppressEndReachedUntilMsRef.current) return;
        if (isLoadingOlder || !hasMoreRef.current) return;
        if (!threads || threads.length === 0) return;

        // Cursor: en eski thread'in (LastMessageAt, ThreadId) çifti — tie-breaker için beforeId.
        const withTs = threads.filter((t) => !!t.lastMessageAt);
        if (withTs.length === 0) { hasMoreRef.current = false; return; }
        const oldest = withTs[withTs.length - 1];
        const before = oldest.lastMessageAt as string | undefined;
        const beforeId = oldest.threadId as string | undefined;
        if (!before) return;
        const cursorKey = `${before}|${beforeId ?? ""}`;
        if (lastLoadedBeforeRef.current === cursorKey) return;
        lastLoadedBeforeRef.current = cursorKey;

        setIsLoadingOlder(true);
        try {
            const result = await dispatch(
                api.endpoints.getChatThreads.initiate(
                    { before, beforeId, limit: CHAT_THREADS_PAGE_SIZE },
                    // subscribe:false — pagination dispatch'leri yeni subscriber yaratmasın.
                    // Aksi takdirde her sayfa için kalıcı anonim subscriber birikir; SignalR
                    // updateQueryData veya tag invalidation hepsini refetch tetikler.
                    { subscribe: false, forceRefetch: true },
                ),
            ).unwrap();
            if (!Array.isArray(result) || result.length < CHAT_THREADS_PAGE_SIZE) {
                hasMoreRef.current = false;
            }
        } catch {
            lastLoadedBeforeRef.current = null;
        } finally {
            setIsLoadingOlder(false);
        }
    }, [dispatch, threads, isLoadingOlder]);
    const mutedTextColor = isDark ? '#94a3b8' : '#64748b';
    const tertiaryTextColor = isDark ? '#64748b' : '#94a3b8';
    const unreadAccent = getChatAccent(false);

    // Backend zaten filtreliyor - backend'den gelen thread'leri olduğu gibi kullan
    // Backend filtresi:
    // - Favori thread'ler: En az 1 aktif favori varsa görünür
    // - Randevu thread'leri: Sadece Pending/Approved durumunda görünür

    // Backend zaten filtreliyor; SignalR sızıntısına karşı sosyal thread'leri client'ta da ayır.
    const visibleThreads = useMemo(
        () => (threads ?? []).filter(isThreadVisibleInMainList),
        [threads],
    );

    const renderItem = useCallback(({ item, index }: { item: ChatThreadListItemDto; index: number }) => {
        const hasUnread = item.unreadCount > 0;
        const isRestricted = item.isRestrictedForCurrentUser;
        const statusColor = item.status ? getAppointmentStatusColor(item.status) : undefined;
        const statusText = item.status === AppointmentStatus.Approved
            ? MESSAGES.APPOINTMENT_STATUS.APPROVED
            : item.status === AppointmentStatus.Pending
                ? MESSAGES.APPOINTMENT_STATUS.PENDING
                : null;
        const threadBackground = hasUnread ? (isDark ? '#1f2937' : '#f8fafc') : colors.cardBg;
        const threadBorder = hasUnread ? unreadAccent : colors.borderColor;
        const rowSurface = getChatListRowStyle(isDark, hasUnread, unreadAccent, colors.cardBg);

        const handlePress = () => {
            router.push(`/(screens)/chat/${item.threadId}`);
        };

        const previewHint = item.isFavoriteThread && isRestricted;
        const previewText = previewHint ? t('chat.favoriteThreadListHint') : (item.lastMessagePreview ?? '');
        const showPreviewBubble = !previewHint && !!item.lastMessagePreview;

        // Participant etiketlerini hesapla
        const getParticipantLabel = (participant: ChatThreadParticipantDto) => {
            if (participant.userType === currentUserType) return '';
            if (participant.userType === UserType.BarberStore) return t('labels.store');
            if (participant.userType === UserType.FreeBarber) return t('labels.freeBarber');
            if (participant.userType === UserType.Customer) return t('card.customer');
            return '';
        };

        const getBarberTypeLabel = (participant: ChatThreadParticipantDto) => {
            if (participant.barberType === undefined || participant.barberType === null) return null;
            if (participant.userType === UserType.FreeBarber) {
                return participant.barberType === BarberType.MaleHairdresser
                    ? t('barberType.maleHairdresserShort')
                    : t('barberType.femaleHairdresserShort');
            } else if (participant.userType === UserType.BarberStore) {
                if (participant.barberType === BarberType.MaleHairdresser) return t('barberType.maleHairdresserOf');
                if (participant.barberType === BarberType.FemaleHairdresser) return t('barberType.femaleHairdresserOf');
                return t('barberType.beautySalon');
            }
            return null;
        };

        const getIconForParticipant = (participant: ChatThreadParticipantDto) => {
            return participant.userType === UserType.BarberStore
                ? "store"
                : participant.userType === UserType.FreeBarber
                    ? "account-supervisor"
                    : "account";
        };

        // Tek participant: klasik düzen
        const renderSingleParticipant = (participant: ChatThreadParticipantDto) => {
            const participantLabel = getParticipantLabel(participant);
            const barberTypeLabel = getBarberTypeLabel(participant);
            const labelText = [participantLabel, barberTypeLabel].filter(Boolean).join(' • ');

            return (
                <View className="flex-row items-start" style={{ maxWidth: '100%' }}>
                    <View className="w-10 h-10 rounded-full overflow-hidden items-center justify-center" style={{ flexShrink: 0, backgroundColor: colors.cardBg2 }}>
                        <OwnerAvatar
                            ownerId={participant.userId}
                            ownerType={ImageOwnerType.User}
                            fallbackUrl={participant.imageUrl}
                            placeholderAsset={CHAT_AVATAR_PLACEHOLDER}
                            imageClassName="w-full h-full"
                            iconSource={getIconForParticipant(participant)}
                            iconSize={20}
                            iconColor={isDark ? 'white' : colors.sectionHeaderText}
                            iconContainerClassName="bg-transparent"
                        />
                    </View>
                    <View className="ml-3 gap-1 flex-1" style={{ minWidth: 0, maxWidth: '100%', flexShrink: 1 }}>
                        <Text className="font-century-gothic-sans-bold text-base" numberOfLines={1} style={{ flexShrink: 1, minWidth: 0, maxWidth: '100%', color: colors.sectionHeaderText }}>
                            {participant.displayName}
                        </Text>
                        <View className="flex-row items-center gap-1.5" style={{ minWidth: 0 }}>
                            {labelText ? (
                                <Text className="text-xs font-century-gothic-sans-medium" style={{ flexShrink: 0, color: mutedTextColor }}>
                                    {labelText}
                                </Text>
                            ) : null}
                            {item.isFavoriteThread && (
                                <Icon source="heart" size={11} color="#fbbf24" />
                            )}
                        </View>
                    </View>
                </View>
            );
        };

        // Çoklu participant: overlapping avatarlar + isimler
        const renderOverlappingParticipants = (participants: ChatThreadParticipantDto[]) => {
            const visibleAvatars = participants.slice(0, 2);
            const extraCount = participants.length - 2;

            return (
                <View className="flex-row items-center" style={{ maxWidth: '100%' }}>
                    {/* Overlapping avatarlar */}
                    <View className="flex-row items-center" style={{ flexShrink: 0 }}>
                        {visibleAvatars.map((participant, idx) => (
                            <View
                                key={participant.userId}
                                className="w-10 h-10 rounded-full overflow-hidden items-center justify-center"
                                style={{
                                    marginLeft: idx > 0 ? -12 : 0,
                                    zIndex: visibleAvatars.length - idx,
                                    borderWidth: 2,
                                    borderColor: colors.borderColor,
                                    backgroundColor: colors.cardBg2,
                                }}
                            >
                                <OwnerAvatar
                                    ownerId={participant.userId}
                                    ownerType={ImageOwnerType.User}
                                    fallbackUrl={participant.imageUrl}
                                    placeholderAsset={CHAT_AVATAR_PLACEHOLDER}
                                    imageClassName="w-full h-full"
                                    iconSource={getIconForParticipant(participant)}
                                    iconSize={20}
                                    iconColor={isDark ? 'white' : colors.sectionHeaderText}
                                    iconContainerClassName="bg-transparent"
                                />
                            </View>
                        ))}
                        {extraCount > 0 && (
                            <View
                                className="w-10 h-10 rounded-full items-center justify-center"
                                style={{ marginLeft: -12, zIndex: 0, borderWidth: 2, borderColor: colors.borderColor, backgroundColor: colors.cardBg2 }}
                            >
                                <Text className="text-xs font-century-gothic-sans-bold" style={{ color: colors.sectionHeaderText }}>+{extraCount}</Text>
                            </View>
                        )}
                    </View>

                    {/* İsimler ve etiketler */}
                    <View className="ml-3 gap-0.5 flex-1" style={{ minWidth: 0, flexShrink: 1 }}>
                        <View className="flex-row items-center gap-1.5">
                            <Text className="font-century-gothic-sans-bold text-sm" numberOfLines={1} style={{ flexShrink: 1, minWidth: 0, color: colors.sectionHeaderText }}>
                                {participants.map(p => p.displayName).join(', ')}
                            </Text>
                            {item.isFavoriteThread && (
                                <Icon source="heart" size={11} color="#fbbf24" />
                            )}
                        </View>
                        <Text className="text-xs font-century-gothic-sans-medium" numberOfLines={1} style={{ color: mutedTextColor }}>
                            {participants.map(p => {
                                const label = getParticipantLabel(p);
                                const barberLabel = getBarberTypeLabel(p);
                                return [label, barberLabel].filter(Boolean).join(' • ');
                            }).filter(Boolean).join(' — ')}
                        </Text>
                    </View>
                </View>
            );
        };

        return (
            <ScrollStackItem index={index} scroll={scrollY} vanish>
                <TouchableOpacity
                    onPress={handlePress}
                    className={`mb-3 ${hasUnread ? "pt-3 px-4 pb-4" : "pt-2 p-4"}`}
                    activeOpacity={0.82}
                    style={rowSurface}
                >
                    {statusText && statusColor ? (
                        <View className="flex-row items-center mb-2 justify-end gap-2">
                            <View
                                className="px-2.5 py-1 rounded-full"
                                style={{ backgroundColor: statusColor + COLORS.OPACITY.LIGHT, borderWidth: 1, borderColor: statusColor + COLORS.OPACITY.MEDIUM }}
                            >
                                <Text
                                    className="text-xs font-century-gothic-sans-medium"
                                    style={{ color: statusColor }}
                                >
                                    {statusText}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                    <View className="flex-row items-start" style={{ minWidth: 0 }}>
                        <View className="flex-1 pr-3" style={{ minWidth: 0, flexShrink: 1 }}>
                            {item.participants.length > 1 ? (
                                renderOverlappingParticipants(item.participants)
                            ) : item.participants.length === 1 ? (
                                renderSingleParticipant(item.participants[0])
                            ) : (
                                <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: colors.cardBg2 }}>
                                    <Icon source={iconSource} size={24} color={isDark ? "white" : colors.sectionHeaderText} />
                                </View>
                            )}

                            {previewHint ? (
                                <View
                                    className="mt-2.5 flex-row items-center gap-2 px-3 py-2 rounded-xl"
                                    style={{
                                        marginLeft: item.participants.length > 0 ? 42 : 0,
                                        maxWidth: '100%',
                                        backgroundColor: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
                                        borderWidth: 1,
                                        borderColor: isDark ? 'rgba(165,180,252,0.35)' : 'rgba(79,70,229,0.22)',
                                    }}
                                >
                                    <Icon source="heart-outline" size={16} color={isDark ? '#a5b4fc' : '#4f46e5'} />
                                    <Text
                                        className="text-sm flex-1 font-century-gothic-sans-medium"
                                        style={{ color: isDark ? '#c7d2fe' : '#3730a3' }}
                                        numberOfLines={2}
                                    >
                                        {t('chat.favoriteThreadListHint')}
                                    </Text>
                                </View>
                            ) : showPreviewBubble ? (
                                <View
                                    className={`flex-row items-start rounded-xl ${hasUnread ? "mt-3 gap-3 px-3 py-3" : "mt-2.5 gap-2 px-2.5 py-2 rounded-lg"}`}
                                    style={{
                                        marginLeft: item.participants.length > 0 ? 42 : 0,
                                        minWidth: 0,
                                        maxWidth: '100%',
                                        backgroundColor: hasUnread
                                            ? (isDark ? 'rgba(240,94,35,0.08)' : 'rgba(254,243,199,0.45)')
                                            : (isDark ? '#111827' : '#f1f5f9'),
                                        borderWidth: 1,
                                        borderColor: hasUnread ? `${unreadAccent}40` : colors.borderColor,
                                    }}
                                >
                                    <View style={{ paddingTop: hasUnread ? 2 : 0 }}>
                                        <Icon
                                            source="message-text"
                                            size={hasUnread ? 14 : 12}
                                            color={hasUnread ? unreadAccent : mutedTextColor}
                                        />
                                    </View>
                                    <Text
                                        className={`mb-0 ${hasUnread ? 'text-[15px] leading-5 font-century-gothic-sans-medium' : 'text-sm font-century-gothic-sans-regular'}`}
                                        style={hasUnread ? { color: colors.sectionHeaderText, flex: 1, minWidth: 0 } : { color: mutedTextColor, flexShrink: 1, minWidth: 0, maxWidth: '100%' }}
                                        numberOfLines={hasUnread ? 4 : 2}
                                    >
                                        {previewText}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        <View className="items-end shrink-0" style={{ minWidth: 72, paddingLeft: 4 }}>
                            {item.lastMessageAt && (
                                <Text className="text-xs mb-2" style={{ color: tertiaryTextColor }}>
                                    {formatTime(item.lastMessageAt)}
                                </Text>
                            )}
                            {hasUnread && (
                                <View
                                    className="px-2.5 py-1.5 rounded-full mb-2"
                                    style={{ backgroundColor: unreadAccent + COLORS.OPACITY.LIGHT, borderWidth: 1, borderColor: unreadAccent + COLORS.OPACITY.MEDIUM }}
                                >
                                    <Text className="text-[11px] font-century-gothic-sans-bold" style={{ color: unreadAccent }}>
                                        {t('chat.newMessage')} ({badgeCountLabel(item.unreadCount)})
                                    </Text>
                                </View>
                            )}
                            <View className="relative items-center justify-center mt-1">
                                {isRestricted && item.isFavoriteThread && item.participants[0]?.userId ? (
                                    <RestrictedFavoriteHeartAction
                                        busy={favoriteToggleBusy}
                                        hasUnread={hasUnread}
                                        mutedTextColor={mutedTextColor}
                                        unreadAccent={unreadAccent}
                                        onPress={() => {
                                            const otherParticipant = item.participants[0];
                                            const targetId =
                                                otherParticipant?.userType === UserType.BarberStore
                                                    ? (item.favoriteStoreId ?? otherParticipant.userId)
                                                    : otherParticipant.userId;
                                            const targetType =
                                                otherParticipant?.userType === UserType.BarberStore
                                                    ? FavoriteTargetType.Store
                                                    : otherParticipant?.userType === UserType.FreeBarber
                                                      ? FavoriteTargetType.FreeBarber
                                                      : FavoriteTargetType.Customer;
                                            toggleFavorite({ targetId, targetType })
                                                .unwrap()
                                                .then(() => refetch())
                                                .catch(() => {});
                                        }}
                                    />
                                ) : (
                                    <Icon source="message-text" size={20} color={hasUnread ? unreadAccent : mutedTextColor} />
                                )}
                                {hasUnread && item.unreadCount > 0 && (
                                    <View className="absolute -top-1.5 -right-1.5 rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center" style={{ backgroundColor: unreadAccent }}>
                                        <Text className="text-white text-[9px] font-bold">
                                            {item.unreadCount > 9 ? '9+' : item.unreadCount}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </ScrollStackItem>
        );
    }, [router, routePrefix, iconSource, formatTime, currentUserType, t, isDark, colors, mutedTextColor, tertiaryTextColor, unreadAccent, scrollY, toggleFavorite, refetch, favoriteToggleBusy]);

    const hasNoThreads = visibleThreads.length === 0;
    const [retryBusy, setRetryBusy] = useState(false);
    const handleRetry = useCallback(async () => {
        setRetryBusy(true);
        try {
            await refetch();
        } finally {
            setRetryBusy(false);
        }
    }, [refetch]);
    const handleRefresh = useCallback(async () => {
        setIsPullRefreshing(true);
        bumpEndReachedGrace();
        hasMoreRef.current = true;
        lastLoadedBeforeRef.current = null;
        try {
            await refetch();
        } finally {
            setIsPullRefreshing(false);
        }
    }, [refetch, bumpEndReachedGrace]);

    // Loading durumu — hook'ların hepsi yukarıda; erken return sadece JSX için (Rules of Hooks)
    if (isLoading) {
        return (
            <View className="flex-1 pt-4 px-4" style={{ backgroundColor: colors.screenBg }}>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
            <AnimatedLegendList
                data={visibleThreads}
                keyExtractor={((item: ChatThreadListItemDto) => item.threadId) as any}
                estimatedItemSize={100}
                scrollEventThrottle={16}
                onScroll={onThreadScroll}
                style={{ flex: 1, backgroundColor: colors.screenBg }}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 28,
                    gap: 4,
                    flexGrow: 1,
                    backgroundColor: colors.screenBg,
                }}
                recycleItems={true}
                drawDistance={250}
                renderItem={renderItem as any}
                ListEmptyComponent={
                    <UnifiedStateWrapper
                        loading={false}
                        error={isError ? error : undefined}
                        data={hasNoThreads && !isError ? [] : threads}
                        fetchedOnce={true}
                        onRetry={handleRetry}
                        refetching={!!isError && retryBusy}
                        customMessages={{
                            empty: t('empty.noMessages'),
                        }}
                        customAnimations={{
                            empty: require("../../../assets/animations/messages-empty.json"),
                        }}
                    >
                        <View />
                    </UnifiedStateWrapper>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={isPullRefreshing}
                        onRefresh={handleRefresh}
                        tintColor="#f05e23"
                        colors={["#f05e23"]}
                        progressBackgroundColor={isDark ? colors.cardBg2 : colors.screenBg}
                    />
                }
                onEndReached={loadOlderThreads as any}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    isLoadingOlder ? (
                        <View style={{ paddingVertical: 12 }}>
                            <ActivityIndicator size="small" color="#f05e23" />
                        </View>
                    ) : null
                }
            />
        </View>
    );
};
