/**
 * Shared message thread list component
 * Used across different user type message pages
 */

import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { Text } from '../common/Text';
import { LegendList } from '@legendapp/list';
import { useRouter } from 'expo-router';
import { Icon } from 'react-native-paper';
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

export const MessageThreadList: React.FC<MessageThreadListProps> = ({ routePrefix, iconSource }) => {
    const router = useRouter();
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const { data: threads, isLoading, refetch, isFetching, error, isError } = useGetChatThreadsQuery();
    const formatTime = useFormatTime();
    const { userType: currentUserType } = useAuth();

    // Backend zaten filtreliyor - backend'den gelen thread'leri olduğu gibi kullan
    // Backend filtresi:
    // - Favori thread'ler: En az 1 aktif favori varsa görünür
    // - Randevu thread'leri: Sadece Pending/Approved durumunda görünür

    const renderItem = useCallback(({ item }: { item: ChatThreadListItemDto }) => {
        const hasUnread = item.unreadCount > 0;
        const statusColor = item.status ? getAppointmentStatusColor(item.status) : undefined;
        const statusText = item.status === AppointmentStatus.Approved
            ? MESSAGES.APPOINTMENT_STATUS.APPROVED
            : item.status === AppointmentStatus.Pending
                ? MESSAGES.APPOINTMENT_STATUS.PENDING
                : null;

        const handlePress = () => {
            // Screens klasöründeki chat sayfasına yönlendir
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
                                <Text className="text-gray-400 text-xs font-century-gothic-sans-medium" style={{ flexShrink: 0 }}>
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
                        <Text className="text-gray-400 text-xs font-century-gothic-sans-medium" numberOfLines={1}>
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
            <TouchableOpacity
                onPress={handlePress}
                className="rounded-xl pt-2 p-4 mb-3"
                style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor }}
            >
                {statusText && statusColor && (
                    <View className="flex-row items-center mb-2 justify-end">
                        <View
                            className="px-2 py-1 rounded"
                            style={{ backgroundColor: statusColor + COLORS.OPACITY.LIGHT }}
                        >
                            <Text
                                className="text-xs font-century-gothic-sans-medium"
                                style={{ color: statusColor }}
                            >
                                {statusText}
                            </Text>
                        </View>
                    </View>
                )}
                <View className="flex-row items-start" style={{ minWidth: 0 }}>
                    <View className="flex-1 pr-4" style={{ minWidth: 0, flexShrink: 1 }}>
                        {item.participants.length > 1 ? (
                            renderOverlappingParticipants(item.participants)
                        ) : item.participants.length === 1 ? (
                            renderSingleParticipant(item.participants[0])
                        ) : (
                            <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: colors.cardBg2 }}>
                                <Icon source={iconSource} size={24} color="white" />
                            </View>
                        )}

                        {item.lastMessagePreview && (
                            <View className="flex-row items-center gap-2 mt-2.5" style={{ marginLeft: item.participants.length > 0 ? 42 : 0, minWidth: 0, maxWidth: '100%' }}>
                                <Icon source="message-text" size={12} color={hasUnread ? "#22c55e" : "#6b7280"} />
                                <Text
                                    className={`text-sm mb-0 ${hasUnread ? 'font-century-gothic-sans-medium' : 'text-gray-400 font-century-gothic-sans-regular'}`}
                                    style={hasUnread ? { color: colors.sectionHeaderText, flexShrink: 1, minWidth: 0, maxWidth: '100%' } : { flexShrink: 1, minWidth: 0, maxWidth: '100%' }}
                                    numberOfLines={2}
                                >
                                    {item.lastMessagePreview}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View className="items-end ml-3" style={{ minWidth: 70 }}>
                        {item.lastMessageAt && (
                            <Text className="text-gray-500 text-xs mb-1">
                                {new Date(item.lastMessageAt).toLocaleString('tr-TR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        )}
                        <View className="relative items-center justify-center">
                            <Icon source="message-text" size={18} color={hasUnread ? "#22c55e" : "#6b7280"} />
                            {hasUnread && item.unreadCount > 0 && (
                                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                                    <Text className="text-white text-[8px] font-bold">
                                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [router, routePrefix, iconSource, formatTime]);

    // Loading durumu
    if (isLoading) {
        return (
            <View className="flex-1 pt-4 px-4" style={{ backgroundColor: colors.screenBg }}>
                {Array.from({ length: 3 }).map((_, i) => <SkeletonComponent key={i} />)}
            </View>
        );
    }

    // Error veya Empty durumu - UnifiedStateWrapper ile
    const hasNoThreads = !threads || (Array.isArray(threads) && threads.length === 0);

    if (isError || hasNoThreads) {
        return (
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ flexGrow: 1 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isFetching && !isLoading}
                        onRefresh={refetch}
                        tintColor="#f05e23"
                    />
                }
            >
                <UnifiedStateWrapper
                    loading={isLoading}
                    error={error}
                    data={threads}
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
            </ScrollView>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
            <LegendList
                data={threads ?? []}
                keyExtractor={(item) => item.threadId}
                estimatedItemSize={100}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                // Performance optimizations
                recycleItems={true} // Item recycling için
                drawDistance={250} // Render mesafesi
                renderItem={renderItem}
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
