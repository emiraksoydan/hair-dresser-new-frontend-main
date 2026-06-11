import { View, ScrollView, TouchableOpacity, StatusBar, Platform, Linking } from 'react-native';
import { Text } from '../../components/common/Text';
import { Icon, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
    useGetSubscriptionStatusQuery,
    useGetMeQuery,
    useVerifyAppleIapMutation,
    useVerifyGoogleIapMutation,
} from '../../store/api';
import { useAppDispatch } from '../../store/hook';
import { showSnack } from '../../store/snackbarSlice';
import { useMemo, useCallback } from 'react';
import { Button } from '../../components/common/Button';
import { useIap, IAP_SKUS, type IapPlanKey } from '../../hook/useIap';
import { useAuth } from '../../hook/useAuth';

const formatDate = (iso: string | undefined | null, lang: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    try {
        return d.toLocaleDateString(
            lang === 'tr' ? 'tr-TR' : lang === 'ar' ? 'ar-SA' : lang === 'de' ? 'de-DE' : 'en-US',
            { day: 'numeric', month: 'long', year: 'numeric' },
        );
    } catch {
        return d.toLocaleDateString();
    }
};

type FeatureItem = { key: string; free: boolean };

const FREE_BARBER_FEATURES: FeatureItem[] = [
    { key: 'feature_free_panel', free: true },
    { key: 'feature_profile_visible', free: true },
    { key: 'feature_discovery', free: true },
    { key: 'feature_messaging', free: false },
    { key: 'feature_appointments', free: false },
    { key: 'feature_ratings', free: false },
    { key: 'feature_ai_assistant', free: false },
];

const BARBER_STORE_FEATURES: FeatureItem[] = [
    { key: 'feature_free_store', free: true },
    { key: 'feature_profile_visible', free: true },
    { key: 'feature_discovery', free: true },
    { key: 'feature_extra_stores', free: false },
    { key: 'feature_messaging', free: false },
    { key: 'feature_appointments', free: false },
    { key: 'feature_ratings', free: false },
    { key: 'feature_ai_assistant', free: false },
];

export default function SubscriptionPage() {
    const { colors, isDark } = useTheme();
    const { t, currentLanguage } = useLanguage();
    const router = useSafeNavigation();
    const dispatch = useAppDispatch();

    const { data: subscriptionData, refetch: refetchSub } = useGetSubscriptionStatusQuery();
    const { data: userData } = useGetMeQuery();
    const [verifyApple] = useVerifyAppleIapMutation();
    const [verifyGoogle] = useVerifyGoogleIapMutation();
    const { userId } = useAuth();

    const sub = subscriptionData?.data;
    const userType = (userData?.data as any)?.userType as number | undefined;
    // 1 = FreeBarber, 2 = BarberStore
    const isFreeBarber = userType === 1;
    const isBarberStore = userType === 2;
    const planKey: IapPlanKey = isBarberStore ? 'BarberStore' : 'FreeBarber';

    const isActive = sub?.status === 'Active';
    const openStoreSubscriptions = useCallback(() => {
        if (Platform.OS === 'ios') {
            Linking.openURL('itms-apps://apps.apple.com/account/subscriptions');
        } else {
            // Play Store abonelik sayfası — package parametresi doğrudan bu uygulamanın aboneliğine götürür
            const androidUrl = `https://play.google.com/store/account/subscriptions?sku=${IAP_SKUS[planKey]}&package=com.hairdresser.app`;
            Linking.openURL(androidUrl).catch(() =>
                Linking.openURL('https://play.google.com/store/account/subscriptions')
            );
        }
    }, [planKey]);
    const isExpired = sub?.status === 'Expired';
    const isBanned = sub?.status === 'Banned';
    const showPurchaseButton = !isActive && !isBanned && (isFreeBarber || isBarberStore);

    const endDate = useMemo(
        () => formatDate(sub?.subscriptionEndDate, currentLanguage),
        [sub?.subscriptionEndDate, currentLanguage],
    );
    const daysLeft = sub?.subscriptionDaysLeft ?? 0;
    const features: FeatureItem[] = isFreeBarber ? FREE_BARBER_FEATURES : BARBER_STORE_FEATURES;
    const planName = isFreeBarber ? t('subscription.freeBarberPlanName') : t('subscription.barberStorePlanName');
    const planPrice = isFreeBarber ? t('subscription.freeBarberPrice') : t('subscription.barberStorePrice');

    const statusColor = isBanned ? '#ef4444' : isActive ? '#10B981' : '#f59e0b';
    const statusIcon = isBanned ? 'account-cancel' : isActive ? 'crown' : 'crown-outline';
    const statusBg = isBanned ? 'rgba(239,68,68,0.10)' : isActive ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)';

    const handleVerifyApple = useCallback(async (transactionId: string) => {
        const result = await verifyApple({ transactionId }).unwrap();
        if (!result.success) throw new Error(result.message);
    }, [verifyApple]);

    const handleVerifyGoogle = useCallback(async (productId: string, purchaseToken: string) => {
        const result = await verifyGoogle({ productId, purchaseToken }).unwrap();
        if (!result.success) throw new Error(result.message);
    }, [verifyGoogle]);

    const handlePurchaseSuccess = useCallback(() => {
        dispatch(showSnack({ message: t('subscription.statusActive'), isError: false }));
        refetchSub();
    }, [dispatch, t, refetchSub]);

    const handlePurchaseError = useCallback((message: string) => {
        dispatch(showSnack({ message, isError: true }));
    }, [dispatch]);

    const { product, localizedPrice, isPurchasing, purchase, isConnected } = useIap({
        planKey,
        userId: userId ?? '',
        onVerifyApple: handleVerifyApple,
        onVerifyGoogle: handleVerifyGoogle,
        onSuccess: handlePurchaseSuccess,
        onError: handlePurchaseError,
    });

    // Ürün fiyatı store'dan gelirse onu, yoksa hardcoded değeri göster
    const displayPrice = localizedPrice ?? `₺${planPrice}`;

    return (
        <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={colors.cardBg}
                translucent={false}
            />
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.cardBg }} edges={['top']}>
                {/* Header */}
                <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: colors.borderColor,
                    backgroundColor: colors.cardBg,
                }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        activeOpacity={0.7}
                        style={{
                            width: 36, height: 36, borderRadius: 18,
                            backgroundColor: colors.screenBg,
                            alignItems: 'center', justifyContent: 'center', marginRight: 12,
                        }}
                    >
                        <Icon source="arrow-left" size={22} color={colors.sectionHeaderText} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.sectionHeaderText, fontSize: 18, fontFamily: 'CenturyGothic-Bold', flex: 1 }}>
                        {t('subscription.plansTitle')}
                    </Text>
                    <View style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: '#fea60e22',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Icon source="crown-outline" size={20} color="#fea60e" />
                    </View>
                </View>

                <ScrollView
                    style={{ flex: 1, backgroundColor: colors.screenBg }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── STATUS KARTI ── */}
                    {sub && (
                        <View style={{
                            backgroundColor: colors.cardBg,
                            borderRadius: 16, padding: 20,
                            borderWidth: 1.5, borderColor: statusColor + '44',
                            marginBottom: 16,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{
                                    width: 48, height: 48, borderRadius: 24,
                                    backgroundColor: statusBg,
                                    alignItems: 'center', justifyContent: 'center', marginRight: 14,
                                }}>
                                    <Icon source={statusIcon} size={26} color={statusColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: statusColor, fontSize: 16, fontFamily: 'CenturyGothic-Bold' }}>
                                        {t(`subscription.status${sub.status}`)}
                                    </Text>
                                    {isActive && daysLeft > 0 && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'CenturyGothic', marginTop: 2 }}>
                                            {t('subscription.activeStatusDesc').replace('{{days}}', String(daysLeft))}
                                        </Text>
                                    )}
                                    {isExpired && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'CenturyGothic', marginTop: 2 }}>
                                            {t('subscription.expiredStatusDesc')}
                                        </Text>
                                    )}
                                    {isBanned && (
                                        <Text style={{ color: '#fca5a5', fontSize: 12, fontFamily: 'CenturyGothic', marginTop: 2 }}>
                                            {sub.banReason || t('subscription.bannedInfo')}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {isActive && sub.subscriptionEndDate && (
                                <View style={{
                                    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                                    borderRadius: 10, padding: 12,
                                    flexDirection: 'row', alignItems: 'center', gap: 8,
                                }}>
                                    <Icon source="calendar-clock" size={18} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'CenturyGothic', flex: 1 }}>
                                        {t('subscription.subscriptionEnds').replace('{{date}}', endDate)}
                                    </Text>
                                </View>
                            )}

                            {isActive && sub.cancelAtPeriodEnd && sub.subscriptionEndDate && (
                                <View style={{
                                    backgroundColor: 'rgba(245,158,11,0.10)',
                                    borderRadius: 10, padding: 10, marginTop: 8,
                                    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                                }}>
                                    <Icon source="alert-outline" size={16} color="#f59e0b" />
                                    <Text style={{ color: '#f59e0b', fontSize: 11, fontFamily: 'CenturyGothic', flex: 1, lineHeight: 16 }}>
                                        {t('subscription.cancelAtPeriodEndNote').replace('{{date}}', endDate)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* ── PLAN KARTI ── */}
                    {(isFreeBarber || isBarberStore) && (
                        <View style={{
                            backgroundColor: colors.cardBg,
                            borderRadius: 16, marginBottom: 16,
                            borderWidth: 1, borderColor: colors.borderColor,
                            overflow: 'hidden',
                        }}>
                            {/* Plan başlık */}
                            <View style={{
                                padding: 20,
                                borderBottomWidth: 1, borderBottomColor: colors.borderColor,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.sectionHeaderText, fontSize: 17, fontFamily: 'CenturyGothic-Bold' }}>
                                            {planName}
                                        </Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'CenturyGothic', marginTop: 2 }}>
                                            {isFreeBarber ? t('subscription.freeBarberPlanDesc') : t('subscription.barberStorePlanDesc')}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                                            <Text style={{ color: '#fea60e', fontSize: 26, fontFamily: 'CenturyGothic-Bold' }}>
                                                {displayPrice}
                                            </Text>
                                            {!localizedPrice && (
                                                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'CenturyGothic' }}>
                                                    {t('subscription.perMonth')}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Ücretsiz özellikler */}
                            <View style={{ padding: 16, paddingBottom: 8 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                    <Icon source="check-circle-outline" size={16} color="#10B981" />
                                    <Text style={{ color: '#10B981', fontSize: 13, fontFamily: 'CenturyGothic-Bold' }}>
                                        {t('subscription.freeFeatures')}
                                    </Text>
                                </View>
                                {features.filter(f => f.free).map((f) => (
                                    <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <View style={{
                                            width: 22, height: 22, borderRadius: 11,
                                            backgroundColor: 'rgba(16,185,129,0.12)',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon source="check" size={13} color="#10B981" />
                                        </View>
                                        <Text style={{ color: colors.sectionHeaderText, fontSize: 13, fontFamily: 'CenturyGothic', flex: 1 }}>
                                            {t(`subscription.${f.key}`)}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            <View style={{ height: 1, backgroundColor: colors.borderColor, marginHorizontal: 16 }} />

                            {/* Premium özellikler */}
                            <View style={{ padding: 16, paddingTop: 12 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                    <Icon source="crown" size={16} color="#fea60e" />
                                    <Text style={{ color: '#fea60e', fontSize: 13, fontFamily: 'CenturyGothic-Bold' }}>
                                        {t('subscription.premiumFeatures')}
                                    </Text>
                                </View>
                                {features.filter(f => !f.free).map((f) => (
                                    <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <View style={{
                                            width: 22, height: 22, borderRadius: 11,
                                            backgroundColor: 'rgba(254,166,14,0.12)',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon source="star" size={12} color="#fea60e" />
                                        </View>
                                        <Text style={{ color: colors.sectionHeaderText, fontSize: 13, fontFamily: 'CenturyGothic', flex: 1 }}>
                                            {t(`subscription.${f.key}`)}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* ── SATIN AL BUTONU ── */}
                            {showPurchaseButton && (
                                <View style={{ padding: 16, paddingTop: 4 }}>
                                    <Button
                                        mode="contained"
                                        onPress={purchase}
                                        loading={isPurchasing}
                                        disabled={isPurchasing || !isConnected || !product}
                                        buttonColor="#fea60e"
                                        textColor={isDark ? '#000000' : '#000000'}
                                        style={{ borderRadius: 12 }}
                                        contentStyle={{ paddingVertical: 4 }}
                                    >
                                        {isPurchasing ? (
                                            t('subscription.upgradeButton') + '...'
                                        ) : !isConnected ? (
                                            'Mağazaya bağlanıyor...'
                                        ) : !product ? (
                                            'Ürün yükleniyor...'
                                        ) : (
                                            `${t('subscription.upgradeButton')} — ${displayPrice}`
                                        )}
                                    </Button>
                                    <Text style={{
                                        color: colors.textSecondary, fontSize: 10,
                                        fontFamily: 'CenturyGothic', textAlign: 'center', marginTop: 8,
                                    }}>
                                        {Platform.OS === 'ios'
                                            ? 'Apple ID hesabınız üzerinden faturalandırılır.'
                                            : 'Google Play hesabınız üzerinden faturalandırılır.'}
                                    </Text>
                                </View>
                            )}

                            {/* Bağlantı bekleniyor göstergesi */}
                            {showPurchaseButton && !isConnected && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 16 }}>
                                    <ActivityIndicator size={14} color={colors.textSecondary} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'CenturyGothic' }}>
                                        Mağaza bağlantısı kuruluyor...
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* ── ABONELİK YÖNETİMİ (Aktif ise) ── */}
                    {isActive && !isBanned && (
                        <View style={{
                            backgroundColor: colors.cardBg,
                            borderRadius: 16, padding: 20, marginBottom: 16,
                            borderWidth: 1, borderColor: colors.borderColor,
                        }}>
                            <Text style={{ color: colors.sectionHeaderText, fontSize: 14, fontFamily: 'CenturyGothic-Bold', marginBottom: 14 }}>
                                {t('subscription.subscriptionManage')}
                            </Text>

                            {/* Otomatik yenileme durumu */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <Icon
                                    source={sub?.cancelAtPeriodEnd ? 'refresh-off' : 'refresh'}
                                    size={16}
                                    color={sub?.cancelAtPeriodEnd ? '#f59e0b' : '#10B981'}
                                />
                                <Text style={{
                                    color: sub?.cancelAtPeriodEnd ? '#f59e0b' : '#10B981',
                                    fontSize: 12, fontFamily: 'CenturyGothic', flex: 1,
                                }}>
                                    {sub?.cancelAtPeriodEnd
                                        ? t('subscription.autoRenewOff')
                                        : t('subscription.autoRenewOn')}
                                </Text>
                            </View>

                            {/* Mağaza üzerinden yönet — Apple/Google iptali kendi sisteminde yapıyor */}
                            <View style={{
                                backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                                borderRadius: 10, padding: 12, marginBottom: 12,
                                flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                            }}>
                                <Icon source="information-outline" size={16} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'CenturyGothic', flex: 1, lineHeight: 17 }}>
                                    {t('subscription.manageViaStoreDesc')}
                                </Text>
                            </View>
                            <Button
                                mode="outlined"
                                icon={Platform.OS === 'ios' ? 'apple' : 'google-play'}
                                onPress={openStoreSubscriptions}
                                textColor={colors.sectionHeaderText}
                                style={{ borderColor: colors.borderColor, borderRadius: 10 }}
                            >
                                {t('subscription.openStoreSubscriptions')}
                            </Button>
                        </View>
                    )}

                    {/* ── BAN BİLGİSİ ── */}
                    {isBanned && (
                        <View style={{
                            backgroundColor: 'rgba(239,68,68,0.08)',
                            borderRadius: 16, padding: 20, marginBottom: 16,
                            borderWidth: 1, borderColor: '#ef444455',
                            flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                        }}>
                            <Icon source="shield-alert-outline" size={22} color="#ef4444" />
                            <Text style={{ color: '#fca5a5', fontSize: 13, fontFamily: 'CenturyGothic', flex: 1, lineHeight: 20 }}>
                                {t('subscription.bannedInfo')}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>

        </View>
    );
}
