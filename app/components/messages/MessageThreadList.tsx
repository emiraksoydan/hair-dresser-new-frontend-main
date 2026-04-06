/**
 * Shared message thread list component
 * Used across different user type message pages
 */

import { Icon } from "react-native-paper";
import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Text } from '../common/Text';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { AnimatedLegendList } from '../common/AnimatedLegendList';
import { ScrollStackItem } from '../common/ScrollStackItem';
import { useSafeNavigation } from '../../hook/useSafeNavigation';

import { useGetChatThreadsQuery } from '../../store/api';
import { ChatThreadListItemDto, ChatThreadParticipantDto, AppointmentStatus, UserType, BarberType, ImageOwnerType } from '../../types';
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

interface MessageThreadListProps {
    routePrefix: string; // e.g., '/(customertabs)/(messages)' or '/(barberstoretabs)/(messages)'
    iconSource: string; // Icon name for the avatar (react-native-paper icon name)
}

const THREAD_ROW_STRIDE = 152;

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
    const { data: threads, isLoading, refetch, isFetching, error, isError } = useGetChatThreadsQuery();
    const formatTime = useFormatTime();
    const { userType: currentUserType } = useAuth();
    const mutedTextColor = isDark ? '#94a3b8' : '#64748b';
    const tertiaryTextColor = isDark ? '#64748b' : '#94a3b8';
    const unreadAccent = '#f05e23';
    const cardShadowStyle = isDark
        ? { shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 }
        : { shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 };

    // Backend zaten filtreliyor - backend'den gelen thread'leri olduğu gibi kullan
    // Backend filtresi:
    // - Favori thread'ler: En az 1 aktif favori varsa görünür
    // - Randevu thread'leri: Sadece Pending/Approved durumunda görünür

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

        const handlePress = () => {
            if (item.isRestrictedForCurrentUser) {
                Alert.alert(
                    t('chat.restrictedThreadTitle'),
                    t('chat.restrictedThreadMessage'),
                    [{ text: t('common.ok') }]
                );
                return;
            }
            router.push(`/(screens)/chat/${item.threadId}`);
        };

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
                    className={`rounded-2xl mb-3 ${hasUnread ? "pt-3 px-4 pb-4" : "pt-2 p-4"}`}
                    activeOpacity={0.82}
                    style={{
                        backgroundColor: hasUnread ? threadBackground : colors.cardBg,
                        borderWidth: 1,
                        borderColor: hasUnread ? threadBorder : (isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.28)'),
                        ...cardShadowStyle,
                    }}
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

                            {item.lastMessagePreview && (
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
                                        {item.lastMessagePreview}
                                    </Text>
                                </View>
                            )}
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
                                        {t('chat.newMessage')} ({item.unreadCount > 99 ? '99+' : item.unreadCount})
                                    </Text>
                                </View>
                            )}
                            <View className="relative items-center justify-center mt-1">
                                {isRestricted ? (
                                    <Icon source="lock" size={20} color={mutedTextColor} />
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
    }, [router, routePrefix, iconSource, formatTime, currentUserType, t, isDark, colors, mutedTextColor, tertiaryTextColor, unreadAccent, cardShadowStyle, scrollY]);

    // Loading durumu
    if (isLoading) {
        return (
            <View className="flex-1 pt-4 px-4" style={{ backgroundColor: colors.screenBg }}>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    const hasNoThreads = !threads || (Array.isArray(threads) && threads.length === 0);

    return (
        <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
            <AnimatedLegendList
                data={threads ?? []}
                keyExtractor={((item: ChatThreadListItemDto) => item.threadId) as any}
                estimatedItemSize={100}
                scrollEventThrottle={16}
                onScroll={onThreadScroll}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28, gap: 4 }}
                recycleItems={true}
                drawDistance={250}
                renderItem={renderItem as any}
                ListEmptyComponent={
                    <UnifiedStateWrapper
                        loading={false}
                        error={isError ? error : undefined}
                        data={hasNoThreads && !isError ? [] : threads}
                        fetchedOnce={true}
                        onRetry={refetch}
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
                        refreshing={isFetching && !isLoading}
                        onRefresh={refetch}
                        tintColor="#f05e23"
                    />
                }
            />
        </View>
    );
};
